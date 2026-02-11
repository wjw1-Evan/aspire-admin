using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Platform.ApiService.Services;

/// <summary>
/// 定义附近的人与定位上报相关的业务能力。
/// </summary>
public interface ISocialService
{
    /// <summary>
    /// 上报或更新当前位置。
    /// </summary>
    /// <param name="request">位置上报请求。</param>
    /// <param name="userIdOverride">用户ID覆盖值，用于在无HttpContext时指定用户。</param>
    /// <param name="companyIdOverride">企业ID覆盖值，用于在无HttpContext时指定企业。</param>
    Task UpdateLocationAsync(UpdateLocationBeaconRequest request, string? userIdOverride = null, string? companyIdOverride = null);

    /// <summary>
    /// 获取附近的用户列表。
    /// </summary>
    /// <param name="request">搜索条件。</param>
    /// <returns>符合条件的附近用户。</returns>
    Task<NearbyUsersResponse> GetNearbyUsersAsync(NearbyUsersRequest request);

    /// <summary>
    /// 获取当前用户的位置信标。
    /// </summary>
    /// <returns>当前用户的位置信标，如果不存在则返回 null。</returns>
    Task<UserLocationBeacon?> GetCurrentUserLocationAsync();

    /// <summary>
    /// 获取当前用户的位置信息（仅包含城市，不包含详细坐标）。
    /// </summary>
    /// <returns>用户位置信息，如果不存在则返回 null。</returns>
    Task<UserLocationInfo?> GetCurrentUserLocationInfoAsync();
}

/// <summary>
/// 附近的人与定位业务实现。
/// </summary>
public class SocialService : ISocialService
{
    private const double DefaultRadiusMeters = 2000d;
    private const int DefaultLimit = 20;
    private const double EarthRadiusMeters = 6371000d;
    private static readonly TimeSpan BeaconTtl = TimeSpan.FromMinutes(30);

    private readonly IDataFactory<UserLocationBeacon> _beaconFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly ILogger<SocialService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;

    /// <summary>
    /// 初始化社交服务。
    /// </summary>
    /// <param name="beaconFactory">定位信标数据工厂。</param>
    /// <param name="userFactory">用户数据工厂。</param>
    /// <param name="sessionFactory">会话数据工厂。</param>
    /// <param name="logger">日志记录器。</param>
    /// <param name="serviceProvider">服务提供者（用于创建后台任务的作用域）。</param>
    /// <param name="configuration">配置对象（用于读取地理编码 API Key）。</param>
    public SocialService(
        IDataFactory<UserLocationBeacon> beaconFactory,
        IDataFactory<AppUser> userFactory,
        IDataFactory<ChatSession> sessionFactory,
        ILogger<SocialService> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _beaconFactory = beaconFactory;
        _userFactory = userFactory;
        _sessionFactory = sessionFactory;
        _logger = logger;
        _serviceProvider = serviceProvider;
        _configuration = configuration;
    }

    /// <inheritdoc />
    public async Task UpdateLocationAsync(UpdateLocationBeaconRequest request, string? userIdOverride = null, string? companyIdOverride = null)
    {
        request.EnsureNotNull(nameof(request));
        ValidateCoordinates(request.Latitude, request.Longitude);

        // 允许在无 HttpContext（如后台任务）时通过 override 传入
        var currentUserId = userIdOverride ?? _beaconFactory.GetCurrentUserId() ?? throw new UnauthorizedAccessException("未找到当前用户信息");
        string? companyId = companyIdOverride;
        if (string.IsNullOrEmpty(companyId))
        {
            // 若通过 override 提供了 userId，则从数据库读取其当前企业，避免依赖 HttpContext
            if (!string.IsNullOrEmpty(userIdOverride))
            {
                var user = await _userFactory.GetByIdWithoutTenantFilterAsync(currentUserId);
                companyId = user?.CurrentCompanyId;
                if (string.IsNullOrEmpty(companyId))
                {
                    throw new UnauthorizedAccessException("未找到当前企业信息");
                }
            }
            else
            {
                companyId = await _beaconFactory.GetRequiredCompanyIdAsync();
            }
        }
        var now = DateTime.UtcNow;
        var lastSeenAt = ResolveLastSeenAt(request, now);

        // ✅ 每次上报位置都创建新记录，保留历史位置数据
        // ID 由 MongoDB 自动生成（BaseEntity 的默认值 ObjectId.GenerateNewId().ToString()）
        // 这样可以保留用户的位置历史记录，用于轨迹分析等功能
        var beacon = new UserLocationBeacon
        {
            UserId = currentUserId,
            CompanyId = companyId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Accuracy = request.Accuracy,
            Altitude = request.Altitude,
            Heading = request.Heading,
            Speed = request.Speed,
            LastSeenAt = lastSeenAt,
            City = null, // 先不设置城市，在后台任务中更新
            Country = null // 先不设置国家，在后台任务中更新
        };

        // 创建新记录（ID 会自动生成）
        var createdBeacon = await _beaconFactory.CreateAsync(beacon);

        // ✅ 保存关键信息，供后台任务使用（后台任务无法访问 HttpContext）
        var beaconId = createdBeacon?.Id ?? throw new InvalidOperationException("位置信标创建失败：无法获取信标ID");

        // ✅ 在后台异步执行地理编码，完成后更新 city 和 country 字段
        // 使用 Task.Run 在后台线程执行，不阻塞当前请求
        _ = Task.Run(async () =>
        {
            try
            {
                // 创建新的 Scope，确保 Scoped 服务正常工作
                using var scope = _serviceProvider.CreateScope();
                var scopedBeaconFactory = scope.ServiceProvider.GetRequiredService<IDataFactory<UserLocationBeacon>>();

                // 执行地理编码（设置超时，避免无限等待）
                var geocodeResult = await ReverseGeocodeAsync(request.Latitude, request.Longitude);

                if (geocodeResult != null && (!string.IsNullOrEmpty(geocodeResult.City) || !string.IsNullOrEmpty(geocodeResult.Country)))
                {
                    // ✅ 使用 beacon 的 Id 直接更新，避免在后台任务中无法获取用户信息
                    var updatedCount = await scopedBeaconFactory.UpdateManyAsync(
                        b => b.Id == beaconId,
                        b =>
                        {
                            if (!string.IsNullOrEmpty(geocodeResult.City)) b.City = geocodeResult.City;
                            if (!string.IsNullOrEmpty(geocodeResult.Country)) b.Country = geocodeResult.Country;
                        });

#if DEBUG
                    if (updatedCount > 0)
                    {
                        _logger.LogInformation("位置上报：后台更新位置信息成功 City: {City}, Country: {Country}，坐标 ({Latitude}, {Longitude})，BeaconId: {BeaconId}",
                            geocodeResult.City, geocodeResult.Country, request.Latitude, request.Longitude, beaconId);
                    }
                    else
                    {
                        _logger.LogWarning("位置上报：后台更新位置信息失败，未找到匹配的记录，BeaconId: {BeaconId}", beaconId);
                    }
#endif
                }
                else
                {
#if DEBUG
                    _logger.LogWarning("位置上报：地理编码返回空值，坐标 ({Latitude}, {Longitude})",
                        request.Latitude, request.Longitude);
#endif
                }
            }
            catch (Exception ex)
            {
                // 地理编码失败不影响位置保存，只记录警告
                _logger.LogWarning(ex, "位置上报：后台逆地理编码失败，坐标 ({Latitude}, {Longitude})，BeaconId: {BeaconId}",
                    request.Latitude, request.Longitude, beaconId);
            }
        });
    }

    /// <inheritdoc />
    public async Task<NearbyUsersResponse> GetNearbyUsersAsync(NearbyUsersRequest request)
    {
        request.EnsureNotNull(nameof(request));
        request.Center.EnsureNotNull(nameof(request.Center));
        ValidateCoordinates(request.Center.Latitude, request.Center.Longitude);

        var currentUserId = _beaconFactory.GetRequiredUserId();
        var radius = Math.Clamp(request.RadiusMeters ?? DefaultRadiusMeters, 100, 20000);
        var limit = Math.Clamp(request.Limit ?? DefaultLimit, 1, 50);
        var now = DateTime.UtcNow;
        var staleThreshold = now - BeaconTtl;

        var lat = request.Center.Latitude;
        var lon = request.Center.Longitude;
        var latRadians = DegreesToRadians(lat);
        var latDelta = radius / EarthRadiusMeters * (180.0 / Math.PI);
        var lonDelta = radius / (EarthRadiusMeters * Math.Cos(latRadians)) * (180.0 / Math.PI);

        var minLat = Math.Max(-90, lat - latDelta);
        var maxLat = Math.Min(90, lat + latDelta);
        var minLon = Math.Max(-180, lon - lonDelta);
        var maxLon = Math.Min(180, lon + lonDelta);

        var rawBeacons = await _beaconFactory.FindAsync(beacon =>
            beacon.LastSeenAt >= staleThreshold &&
            beacon.UserId != currentUserId &&
            beacon.UserId != AiAssistantConstants.AssistantUserId &&
            beacon.Latitude >= minLat && beacon.Latitude <= maxLat &&
            beacon.Longitude >= minLon && beacon.Longitude <= maxLon,
            q => q.OrderByDescending(b => b.LastSeenAt), limit: 500);
        if (rawBeacons.Count == 0)
        {
            return new NearbyUsersResponse();
        }

        var uniqueBeacons = new Dictionary<string, UserLocationBeacon>();
        foreach (var beacon in rawBeacons)
        {
            if (string.IsNullOrEmpty(beacon.UserId))
            {
                continue;
            }

            if (!uniqueBeacons.ContainsKey(beacon.UserId))
            {
                uniqueBeacons[beacon.UserId] = beacon;
            }
        }

        if (uniqueBeacons.Count == 0)
        {
            return new NearbyUsersResponse();
        }

        var centerLat = request.Center.Latitude;
        var centerLon = request.Center.Longitude;
        var beaconDistances = uniqueBeacons.Values
            .Select(beacon => new
            {
                Beacon = beacon,
                Distance = CalculateDistanceMeters(centerLat, centerLon, beacon.Latitude, beacon.Longitude)
            })
            .Where(entry => entry.Distance <= radius)
            .OrderBy(entry => entry.Distance)
            .ToList();

        if (beaconDistances.Count == 0)
        {
            return new NearbyUsersResponse();
        }

        var selectedEntries = beaconDistances.Take(limit).ToList();
        var userIds = selectedEntries.Select(entry => entry.Beacon.UserId).Distinct().ToList();

        var userMap = new Dictionary<string, AppUser>();
        if (userIds.Count > 0)
        {
            var users = await _userFactory.FindAsync(user => userIds.Contains(user.Id));
            foreach (var user in users)
            {
                if (!string.IsNullOrEmpty(user.Id))
                {
                    userMap[user.Id] = user;
                }
            }
        }

        var interestFilters = request.Interests?
            .Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Select(tag => tag.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();

        var sessionCache = new Dictionary<string, string?>();
        var responseItems = new List<NearbyUserDto>();
        foreach (var entry in selectedEntries)
        {
            var beacon = entry.Beacon;
            if (interestFilters?.Count > 0)
            {
                // 当前用户模型尚未持久化兴趣标签，如后续扩展可在此处比对。
                // 目前若缺少标签信息则跳过过滤。
            }

            var appUser = userMap.GetValueOrDefault(beacon.UserId);
            var userInterests = appUser?.Tags?
                .Where(tag => !string.IsNullOrWhiteSpace(tag?.Label))
                .Select(tag => tag!.Label!.Trim())
                .Where(label => label.Length > 0)
                .ToList();

            if (interestFilters?.Count > 0)
            {
                if (userInterests == null ||
                    !userInterests.Any(label => interestFilters.Contains(label.ToLowerInvariant())))
                {
                    continue;
                }
            }
            var nearbyUser = new NearbyUserDto
            {
                UserId = beacon.UserId,
                DisplayName = appUser?.Name ?? appUser?.Username ?? "访客",
                AvatarUrl = appUser?.Avatar,
                DistanceMeters = entry.Distance,
                LastActiveAt = appUser?.LastLoginAt ?? beacon.LastSeenAt,
                Location = new GeoPoint
                {
                    Latitude = beacon.Latitude,
                    Longitude = beacon.Longitude,
                    Accuracy = beacon.Accuracy,
                    Altitude = beacon.Altitude,
                    Heading = beacon.Heading,
                    Speed = beacon.Speed
                },
                Interests = userInterests,
                SessionId = await ResolveSessionIdAsync(currentUserId, beacon.UserId, sessionCache)
            };

            responseItems.Add(nearbyUser);
        }

        return new NearbyUsersResponse
        {
            Items = responseItems,
            Total = responseItems.Count,
            NextRefreshAfter = 60
        };
    }

    private async Task<string?> ResolveSessionIdAsync(
        string currentUserId,
        string targetUserId,
        IDictionary<string, string?> cache)
    {
        if (cache.TryGetValue(targetUserId, out var cached))
        {
            return cached;
        }

        var sessions = await _sessionFactory.FindAsync(session =>
            session.Participants.Count == 2 &&
            session.Participants.Contains(currentUserId) &&
            session.Participants.Contains(targetUserId), limit: 1);
        var sessionId = sessions.FirstOrDefault()?.Id;
        cache[targetUserId] = sessionId;
        return sessionId;
    }

    private static void ValidateCoordinates(double latitude, double longitude)
    {
        if (latitude is < -90 or > 90)
        {
            throw new ArgumentOutOfRangeException(nameof(latitude), "纬度必须在 -90 到 90 度之间");
        }

        if (longitude is < -180 or > 180)
        {
            throw new ArgumentOutOfRangeException(nameof(longitude), "经度必须在 -180 到 180 度之间");
        }
    }

    private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var lat1Rad = DegreesToRadians(lat1);
        var lat2Rad = DegreesToRadians(lat2);
        var deltaLat = DegreesToRadians(lat2 - lat1);
        var deltaLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(deltaLat / 2) * Math.Sin(deltaLat / 2) +
                Math.Cos(lat1Rad) * Math.Cos(lat2Rad) *
                Math.Sin(deltaLon / 2) * Math.Sin(deltaLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

    private DateTime ResolveLastSeenAt(UpdateLocationBeaconRequest request, DateTime fallback)
    {
        if (!request.Timestamp.HasValue)
        {
            return fallback;
        }

        try
        {
            var candidate = DateTimeOffset.FromUnixTimeMilliseconds(request.Timestamp.Value).UtcDateTime;
            if (candidate > DateTime.UtcNow.AddMinutes(5))
            {
                return fallback;
            }

            return candidate;
        }
        catch (ArgumentOutOfRangeException ex)
        {
            _logger.LogWarning(ex, "定位上报时间戳无效，使用服务器时间作为 LastSeenAt。");
            return fallback;
        }
    }

    /// <inheritdoc />
    public async Task<UserLocationBeacon?> GetCurrentUserLocationAsync()
    {
        var currentUserId = _beaconFactory.GetRequiredUserId();
        var companyId = await _beaconFactory.GetRequiredCompanyIdAsync();

        var beacons = await _beaconFactory.FindAsync(
            b => b.UserId == currentUserId && b.CompanyId == companyId,
            q => q.OrderByDescending(b => b.LastSeenAt), limit: 1);
        return beacons.FirstOrDefault();
    }

    /// <inheritdoc />
    public async Task<UserLocationInfo?> GetCurrentUserLocationInfoAsync()
    {
        // 获取最后一次保存的位置信标（按 LastSeenAt 降序排序）
        var beacon = await GetCurrentUserLocationAsync();
        if (beacon == null)
        {
            return null;
        }

        // 直接返回数据库中最后一次保存的城市和国家信息，无需实时解析
        // 城市和国家信息在保存位置时已通过 ReverseGeocodeAsync 自动解析并保存
        return new UserLocationInfo
        {
            City = beacon.City,
            Country = beacon.Country
        };
    }

    /// <summary>
    /// 逆地理编码：将经纬度转换为城市和国家名称
    /// 使用免费的 BigDataCloud Reverse Geocoding API（不需要 API Key，全球支持）
    /// </summary>
    private async Task<GeocodeResult?> ReverseGeocodeAsync(double latitude, double longitude)
    {
        // 优先尝试 BigDataCloud API（免费，不需要 API Key，全球支持）
        try
        {
            var result = await ReverseGeocodeWithBigDataCloudAsync(latitude, longitude);
            if (result != null)
            {
                return result;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码失败，尝试 GeoNames，坐标 ({Latitude}, {Longitude})",
                latitude, longitude);
            // 继续尝试 GeoNames
        }

        // 回退方案：尝试使用 GeoNames（免费，不需要 API Key，但需要注册）
        try
        {
            var result = await ReverseGeocodeWithGeoNamesAsync(latitude, longitude);
            if (result != null)
            {
                return result;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码失败，坐标 ({Latitude}, {Longitude})",
                latitude, longitude);
        }

        return null;
    }

    /// <summary>
    /// 使用 BigDataCloud Reverse Geocoding API 进行逆地理编码（免费，不需要 API Key）
    /// </summary>
    private async Task<GeocodeResult?> ReverseGeocodeWithBigDataCloudAsync(double latitude, double longitude)
    {
        try
        {
            // BigDataCloud Reverse Geocoding API
            // 文档：https://www.bigdatacloud.com/docs/api/reverse-geocoding-api
            // 免费额度：每天 10,000 次，不需要 API Key
            var url = $"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={latitude}&longitude={longitude}&localityLanguage=zh";

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(5);

            var response = await httpClient.GetStringAsync(url);
            var json = JsonSerializer.Deserialize<JsonElement>(response);

            var result = new GeocodeResult();

            // ✅ 改进城市解析逻辑：按优先级尝试多个字段
            // 1. 优先使用 locality（城市/地区）
            if (json.TryGetProperty("locality", out var locality) && !string.IsNullOrWhiteSpace(locality.GetString()))
            {
                result.City = locality.GetString()!.Trim();
            }
            // 2. 如果没有 locality，尝试使用 city（城市）
            else if (json.TryGetProperty("city", out var city) && !string.IsNullOrWhiteSpace(city.GetString()))
            {
                result.City = city.GetString()!.Trim();
            }
            // 3. 如果没有 city，尝试使用 principalSubdivision（省/州）
            else if (json.TryGetProperty("principalSubdivision", out var subdivision) && !string.IsNullOrWhiteSpace(subdivision.GetString()))
            {
                result.City = subdivision.GetString()!.Trim();
            }
            // 4. 如果没有 principalSubdivision，尝试使用 localityInfo.administrative[0].name（行政区划）
            else if (json.TryGetProperty("localityInfo", out var localityInfo) &&
                     localityInfo.TryGetProperty("administrative", out var administrative) &&
                     administrative.ValueKind == JsonValueKind.Array &&
                     administrative.GetArrayLength() > 0)
            {
                var firstAdmin = administrative[0];
                if (firstAdmin.TryGetProperty("name", out var adminName) && !string.IsNullOrWhiteSpace(adminName.GetString()))
                {
                    result.City = adminName.GetString()!.Trim();
                }
            }

            // ✅ 改进国家解析逻辑：按优先级尝试多个字段
            // 1. 优先使用 countryName（国家名称）
            if (json.TryGetProperty("countryName", out var countryName) && !string.IsNullOrWhiteSpace(countryName.GetString()))
            {
                result.Country = countryName.GetString()!.Trim();
            }
            // 2. 如果没有 countryName，尝试使用 countryCode（国家代码，如 CN、US）
            else if (json.TryGetProperty("countryCode", out var countryCode) && !string.IsNullOrWhiteSpace(countryCode.GetString()))
            {
                // 将国家代码转换为国家名称（简化处理，实际可以使用映射表）
                result.Country = countryCode.GetString()!.Trim().ToUpper();
            }
            // 3. 如果没有 countryCode，尝试使用 localityInfo.administrative 中的国家信息
            else if (json.TryGetProperty("localityInfo", out var localityInfo2) &&
                     localityInfo2.TryGetProperty("administrative", out var administrative2) &&
                     administrative2.ValueKind == JsonValueKind.Array)
            {
                // 查找最后一个 administrative 元素（通常是国家级别）
                var adminArray = administrative2.EnumerateArray().ToList();
                if (adminArray.Count > 0)
                {
                    var lastAdmin = adminArray[adminArray.Count - 1];
                    if (lastAdmin.TryGetProperty("name", out var countryName2) && !string.IsNullOrWhiteSpace(countryName2.GetString()))
                    {
                        result.Country = countryName2.GetString()!.Trim();
                    }
                }
            }

            // 如果城市和国家都为空，记录警告并返回 null
            if (string.IsNullOrEmpty(result.City) && string.IsNullOrEmpty(result.Country))
            {
                _logger.LogWarning("BigDataCloud 逆地理编码返回空结果，坐标 ({Latitude}, {Longitude})，响应: {Response}",
                    latitude, longitude, response);
                return null;
            }

            // 记录解析结果（仅在开发环境）
#if DEBUG
            _logger.LogInformation("BigDataCloud 逆地理编码成功，坐标 ({Latitude}, {Longitude})，City: {City}, Country: {Country}",
                latitude, longitude, result.City, result.Country);
#endif

            return result;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码超时，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码 HTTP 请求失败，坐标 ({Latitude}, {Longitude})，状态码: {StatusCode}",
                latitude, longitude, ex.Data.Contains("StatusCode") ? ex.Data["StatusCode"] : "未知");
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码 JSON 解析失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
    }

    /// <summary>
    /// 使用 GeoNames API 进行逆地理编码（免费，不需要 API Key，但需要注册用户名）
    /// </summary>
    private async Task<GeocodeResult?> ReverseGeocodeWithGeoNamesAsync(double latitude, double longitude)
    {
        try
        {
            // GeoNames Reverse Geocoding API
            // 文档：http://www.geonames.org/export/web-services.html#findNearbyPlaceName
            // 免费额度：每天 20,000 次，需要注册用户名（但不需要 API Key）
            // 注意：使用默认用户名 "demo"，但建议注册自己的用户名
            var username = _configuration["Geocoding:GeoNamesUsername"] ?? "demo";
            var url = $"http://api.geonames.org/findNearbyPlaceNameJSON?lat={latitude}&lng={longitude}&username={username}&lang=zh";

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(5);

            var response = await httpClient.GetStringAsync(url);
            var json = JsonSerializer.Deserialize<JsonElement>(response);

            // 检查是否有错误
            if (json.TryGetProperty("status", out var status))
            {
                var statusObj = status.GetProperty("message");
                _logger.LogWarning("GeoNames API 返回错误，坐标 ({Latitude}, {Longitude})，错误: {Error}",
                    latitude, longitude, statusObj.GetString());
                return null;
            }

            var result = new GeocodeResult();

            if (json.TryGetProperty("geonames", out var geonames) && geonames.ValueKind == JsonValueKind.Array && geonames.GetArrayLength() > 0)
            {
                // ✅ 改进：遍历所有结果，寻找最合适的城市信息
                var places = geonames.EnumerateArray().ToList();

                foreach (var place in places)
                {
                    // 获取 fcode（特征代码），优先选择城市类型的地点
                    var fcode = place.TryGetProperty("fcode", out var fcodeProp) ? fcodeProp.GetString() : null;
                    var isCity = fcode != null && (fcode.StartsWith("PPL") || fcode.StartsWith("ADM")); // PPL=人口聚集地, ADM=行政区划

                    // ✅ 改进城市解析逻辑：按优先级尝试多个字段
                    if (string.IsNullOrEmpty(result.City))
                    {
                        // 1. 优先使用 name（地点名称）
                        if (place.TryGetProperty("name", out var name) && !string.IsNullOrWhiteSpace(name.GetString()))
                        {
                            result.City = name.GetString()!.Trim();
                            if (isCity) break; // 如果是城市类型，直接使用
                        }
                        // 2. 如果没有 name，尝试使用 adminName1（省/州）
                        else if (place.TryGetProperty("adminName1", out var adminName1) && !string.IsNullOrWhiteSpace(adminName1.GetString()))
                        {
                            result.City = adminName1.GetString()!.Trim();
                        }
                        // 3. 如果没有 adminName1，尝试使用 adminName2（市/县）
                        else if (place.TryGetProperty("adminName2", out var adminName2) && !string.IsNullOrWhiteSpace(adminName2.GetString()))
                        {
                            result.City = adminName2.GetString()!.Trim();
                        }
                    }

                    // ✅ 改进国家解析逻辑
                    if (string.IsNullOrEmpty(result.Country))
                    {
                        // 1. 优先使用 countryName（国家名称）
                        if (place.TryGetProperty("countryName", out var countryName) && !string.IsNullOrWhiteSpace(countryName.GetString()))
                        {
                            result.Country = countryName.GetString()!.Trim();
                        }
                        // 2. 如果没有 countryName，尝试使用 countryCode（国家代码）
                        else if (place.TryGetProperty("countryCode", out var countryCode) && !string.IsNullOrWhiteSpace(countryCode.GetString()))
                        {
                            result.Country = countryCode.GetString()!.Trim().ToUpper();
                        }
                    }

                    // 如果已经获取到城市和国家，可以提前退出
                    if (!string.IsNullOrEmpty(result.City) && !string.IsNullOrEmpty(result.Country))
                    {
                        break;
                    }
                }
            }

            // 如果城市和国家都为空，记录警告并返回 null
            if (string.IsNullOrEmpty(result.City) && string.IsNullOrEmpty(result.Country))
            {
                _logger.LogWarning("GeoNames 逆地理编码返回空结果，坐标 ({Latitude}, {Longitude})，响应: {Response}",
                    latitude, longitude, response);
                return null;
            }

            // 记录解析结果（仅在开发环境）
#if DEBUG
            _logger.LogInformation("GeoNames 逆地理编码成功，坐标 ({Latitude}, {Longitude})，City: {City}, Country: {Country}",
                latitude, longitude, result.City, result.Country);
#endif

            return result;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码超时，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码 HTTP 请求失败，坐标 ({Latitude}, {Longitude})，状态码: {StatusCode}",
                latitude, longitude, ex.Data.Contains("StatusCode") ? ex.Data["StatusCode"] : "未知");
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码 JSON 解析失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
    }
}

