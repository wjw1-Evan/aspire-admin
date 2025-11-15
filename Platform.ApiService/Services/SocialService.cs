using System.Linq;
using MongoDB.Driver;
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
    Task UpdateLocationAsync(UpdateLocationBeaconRequest request);

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

    private readonly IDatabaseOperationFactory<UserLocationBeacon> _beaconFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
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
        IDatabaseOperationFactory<UserLocationBeacon> beaconFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
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
    public async Task UpdateLocationAsync(UpdateLocationBeaconRequest request)
    {
        request.EnsureNotNull(nameof(request));
        ValidateCoordinates(request.Latitude, request.Longitude);

        var currentUserId = _beaconFactory.GetRequiredUserId();
        var companyId = _beaconFactory.GetRequiredCompanyId();
        var now = DateTime.UtcNow;
        var lastSeenAt = ResolveLastSeenAt(request, now);

        // ✅ 先保存位置（city 和 country 为 null），立即返回响应，不等待地理编码
        // 这样可以避免地理编码 API 慢导致请求超时
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

        var createdBeacon = await _beaconFactory.CreateAsync(beacon);
        
        // ✅ 保存关键信息，供后台任务使用（后台任务无法访问 HttpContext）
        var beaconId = createdBeacon.Id;

        // ✅ 在后台异步执行地理编码，完成后更新 city 和 country 字段
        // 使用 Task.Run 在后台线程执行，不阻塞当前请求
        _ = Task.Run(async () =>
        {
            try
            {
                // 创建新的 Scope，确保 Scoped 服务正常工作
                using var scope = _serviceProvider.CreateScope();
                var scopedBeaconFactory = scope.ServiceProvider.GetRequiredService<IDatabaseOperationFactory<UserLocationBeacon>>();
                
                // 执行地理编码（设置超时，避免无限等待）
                var geocodeResult = await ReverseGeocodeAsync(request.Latitude, request.Longitude);
                
                if (geocodeResult != null && (!string.IsNullOrEmpty(geocodeResult.City) || !string.IsNullOrEmpty(geocodeResult.Country)))
                {
                    // ✅ 使用 beacon 的 Id 直接更新，避免在后台任务中无法获取用户信息
                    var filter = scopedBeaconFactory.CreateFilterBuilder()
                        .Equal(b => b.Id, beaconId) // 直接使用 Id 匹配，不依赖 HttpContext
                        .Build();

                    var updateBuilder = scopedBeaconFactory.CreateUpdateBuilder();
                    if (!string.IsNullOrEmpty(geocodeResult.City))
                    {
                        updateBuilder = updateBuilder.Set(b => b.City, geocodeResult.City);
                    }
                    if (!string.IsNullOrEmpty(geocodeResult.Country))
                    {
                        updateBuilder = updateBuilder.Set(b => b.Country, geocodeResult.Country);
                    }
                    var update = updateBuilder.Build();

                    var updatedCount = await scopedBeaconFactory.UpdateManyAsync(filter, update);
                    
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

        var filter = Builders<UserLocationBeacon>.Filter.And(
            Builders<UserLocationBeacon>.Filter.Gte(beacon => beacon.LastSeenAt, staleThreshold),
            Builders<UserLocationBeacon>.Filter.Ne(beacon => beacon.UserId, currentUserId),
            Builders<UserLocationBeacon>.Filter.Ne(beacon => beacon.UserId, AiAssistantConstants.AssistantUserId),
            Builders<UserLocationBeacon>.Filter.Gte(beacon => beacon.Latitude, minLat),
            Builders<UserLocationBeacon>.Filter.Lte(beacon => beacon.Latitude, maxLat),
            Builders<UserLocationBeacon>.Filter.Gte(beacon => beacon.Longitude, minLon),
            Builders<UserLocationBeacon>.Filter.Lte(beacon => beacon.Longitude, maxLon));

        var sort = _beaconFactory.CreateSortBuilder()
            .Descending(beacon => beacon.LastSeenAt)
            .Build();

        var rawBeacons = await _beaconFactory.FindAsync(filter, sort, limit: 500);
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
            var userFilter = _userFactory.CreateFilterBuilder()
                .In(user => user.Id, userIds)
                .Build();
            var users = await _userFactory.FindAsync(userFilter);
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

        var filter = Builders<ChatSession>.Filter.And(
            Builders<ChatSession>.Filter.Size(session => session.Participants, 2),
            Builders<ChatSession>.Filter.All(session => session.Participants, new[] { currentUserId, targetUserId }));

        var sessions = await _sessionFactory.FindAsync(filter, limit: 1);
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
        var companyId = _beaconFactory.GetRequiredCompanyId();

        var filter = _beaconFactory.CreateFilterBuilder()
            .Equal(b => b.UserId, currentUserId)
            .Equal(b => b.CompanyId, companyId)
            .Build();

        // 按最后上报时间降序排序，获取最后一次保存的位置信息
        var sort = _beaconFactory.CreateSortBuilder()
            .Descending(b => b.LastSeenAt)
            .Build();

        var beacons = await _beaconFactory.FindAsync(filter, sort, limit: 1);
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
            
            // 获取城市（locality）
            if (json.TryGetProperty("locality", out var locality) && !string.IsNullOrEmpty(locality.GetString()))
            {
                result.City = locality.GetString();
            }
            // 如果没有城市，尝试使用区县（principalSubdivision）作为城市
            else if (json.TryGetProperty("principalSubdivision", out var subdivision) && !string.IsNullOrEmpty(subdivision.GetString()))
            {
                result.City = subdivision.GetString();
            }
            
            // 获取国家（countryName）
            if (json.TryGetProperty("countryName", out var countryName) && !string.IsNullOrEmpty(countryName.GetString()))
            {
                result.Country = countryName.GetString();
            }
            
            // 如果城市和国家都为空，返回 null
            if (string.IsNullOrEmpty(result.City) && string.IsNullOrEmpty(result.Country))
            {
                return null;
            }
            
            return result;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码超时，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "BigDataCloud 逆地理编码 HTTP 请求失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
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
            
            var result = new GeocodeResult();
            
            if (json.TryGetProperty("geonames", out var geonames) && geonames.ValueKind == JsonValueKind.Array && geonames.GetArrayLength() > 0)
            {
                var firstPlace = geonames[0];
                
                // 获取城市名称（name）
                if (firstPlace.TryGetProperty("name", out var name) && !string.IsNullOrEmpty(name.GetString()))
                {
                    result.City = name.GetString();
                }
                // 如果没有名称，尝试使用行政区划名称（adminName1）作为城市
                else if (firstPlace.TryGetProperty("adminName1", out var adminName1) && !string.IsNullOrEmpty(adminName1.GetString()))
                {
                    result.City = adminName1.GetString();
                }
                
                // 获取国家名称（countryName）
                if (firstPlace.TryGetProperty("countryName", out var countryName) && !string.IsNullOrEmpty(countryName.GetString()))
                {
                    result.Country = countryName.GetString();
                }
            }
            
            // 如果城市和国家都为空，返回 null
            if (string.IsNullOrEmpty(result.City) && string.IsNullOrEmpty(result.Country))
            {
                return null;
            }
            
            return result;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码超时，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码 HTTP 请求失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GeoNames 逆地理编码失败，坐标 ({Latitude}, {Longitude})", latitude, longitude);
            return null;
        }
    }
}

