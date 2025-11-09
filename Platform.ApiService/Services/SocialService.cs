using System.Linq;
using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

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

    /// <summary>
    /// 初始化社交服务。
    /// </summary>
    /// <param name="beaconFactory">定位信标数据工厂。</param>
    /// <param name="userFactory">用户数据工厂。</param>
    /// <param name="sessionFactory">会话数据工厂。</param>
    /// <param name="logger">日志记录器。</param>
    public SocialService(
        IDatabaseOperationFactory<UserLocationBeacon> beaconFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        ILogger<SocialService> logger)
    {
        _beaconFactory = beaconFactory;
        _userFactory = userFactory;
        _sessionFactory = sessionFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task UpdateLocationAsync(UpdateLocationBeaconRequest request)
    {
        request.EnsureNotNull(nameof(request));
        ValidateCoordinates(request.Latitude, request.Longitude);

        var currentUserId = _beaconFactory.GetRequiredUserId();
        var companyId = _beaconFactory.GetRequiredCompanyId();
        var now = DateTime.UtcNow;

        var filter = Builders<UserLocationBeacon>.Filter.And(
            Builders<UserLocationBeacon>.Filter.Eq(beacon => beacon.UserId, currentUserId),
            Builders<UserLocationBeacon>.Filter.Eq(beacon => beacon.CompanyId, companyId));

        var update = Builders<UserLocationBeacon>.Update
            .Set(beacon => beacon.Latitude, request.Latitude)
            .Set(beacon => beacon.Longitude, request.Longitude)
            .Set(beacon => beacon.Accuracy, request.Accuracy)
            .Set(beacon => beacon.Altitude, request.Altitude)
            .Set(beacon => beacon.Heading, request.Heading)
            .Set(beacon => beacon.Speed, request.Speed)
            .Set(beacon => beacon.LastSeenAt, now)
            .SetOnInsert(beacon => beacon.UserId, currentUserId)
            .SetOnInsert(beacon => beacon.CompanyId, companyId)
            .SetOnInsert(beacon => beacon.CreatedAt, now)
            .SetOnInsert(beacon => beacon.UpdatedAt, now)
            .SetOnInsert(beacon => beacon.IsDeleted, false);

        var options = new FindOneAndUpdateOptions<UserLocationBeacon>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };

        await _beaconFactory.FindOneAndUpdateAsync(filter, update, options);
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

        var rawBeacons = await _beaconFactory.FindAsync(filter, limit: 200);
        if (rawBeacons.Count == 0)
        {
            return new NearbyUsersResponse();
        }

        var centerLat = request.Center.Latitude;
        var centerLon = request.Center.Longitude;
        var beaconDistances = rawBeacons
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
}

