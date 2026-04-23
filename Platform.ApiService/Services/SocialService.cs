using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Extensions;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Authentication;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;

namespace Platform.ApiService.Services;

/// <summary>
/// 定义附近的人与定位上报相关的业务能力。
/// </summary>
public interface ISocialService
{
    Task UpdateLocationAsync(UpdateLocationBeaconRequest request, string? userIdOverride = null, string? companyIdOverride = null);
    Task<NearbyUsersResponse> GetNearbyUsersAsync(NearbyUsersRequest request);
    Task<UserLocationBeacon?> GetCurrentUserLocationAsync();
    Task<UserLocationInfo?> GetCurrentUserLocationInfoAsync();
}

/// <summary>
/// 附近的人与定位业务实现。
/// </summary>
public class SocialService : ISocialService
{
    private readonly DbContext _context;
    private readonly ILogger<SocialService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ITenantContext _tenantContext;

    private const double DefaultRadiusMeters = 2000d;
    private const int DefaultLimit = 20;
    private const double EarthRadiusMeters = 6371000d;
    private static readonly TimeSpan BeaconTtl = TimeSpan.FromMinutes(30);

    public SocialService(DbContext context,
        ILogger<SocialService> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ITenantContext tenantContext)
    {
        _context = context;
        _logger = logger;
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _tenantContext = tenantContext;
    }

    /// <inheritdoc />
    public async Task UpdateLocationAsync(UpdateLocationBeaconRequest request, string? userIdOverride = null, string? companyIdOverride = null)
    {
        ValidateCoordinates(request.Latitude, request.Longitude);

        var currentUserId = userIdOverride ?? _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("未找到当前用户信息");
        string? companyId = companyIdOverride;
        if (string.IsNullOrEmpty(companyId))
        {
            if (!string.IsNullOrEmpty(userIdOverride))
            {
                var user = await _context.Set<AppUser>().IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == currentUserId);
                companyId = user?.CurrentCompanyId;
            }
            else companyId =  _tenantContext.GetCurrentCompanyId();
        }

        var beacon = new UserLocationBeacon
        {
            UserId = currentUserId, CompanyId = companyId ?? string.Empty,
            Latitude = request.Latitude, Longitude = request.Longitude,
            Accuracy = request.Accuracy, Altitude = request.Altitude,
            Heading = request.Heading, Speed = request.Speed,
            LastSeenAt = ResolveLastSeenAt(request, DateTime.UtcNow)
        };

        await _context.Set<UserLocationBeacon>().AddAsync(beacon);
        await _context.SaveChangesAsync();

        var beaconId = beacon.Id!;
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<DbContext>();
                var geocodeResult = await ReverseGeocodeAsync(request.Latitude, request.Longitude);
                if (geocodeResult != null && (!string.IsNullOrEmpty(geocodeResult.City) || !string.IsNullOrEmpty(geocodeResult.Country)))
                {
                    var beacon = await db.Set<UserLocationBeacon>().FirstOrDefaultAsync(b => b.Id == beaconId);
                    if (beacon != null)
                    {
                        if (!string.IsNullOrEmpty(geocodeResult.City)) beacon.City = geocodeResult.City;
                        if (!string.IsNullOrEmpty(geocodeResult.Country)) beacon.Country = geocodeResult.Country;
                        await db.SaveChangesAsync();
                    }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "后台逆地理编码失败: {Id}", beaconId); }
        });
    }

    /// <inheritdoc />
    public async Task<NearbyUsersResponse> GetNearbyUsersAsync(NearbyUsersRequest request)
    {
        ValidateCoordinates(request.Center.Latitude, request.Center.Longitude);

        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
        var radius = Math.Clamp(request.RadiusMeters ?? DefaultRadiusMeters, 100, 20000);
        var limit = Math.Clamp(request.Limit ?? DefaultLimit, 1, 50);
        var staleThreshold = DateTime.UtcNow - BeaconTtl;

        var lat = request.Center.Latitude;
        var lon = request.Center.Longitude;
        var latDelta = radius / EarthRadiusMeters * (180.0 / Math.PI);
        var lonDelta = radius / (EarthRadiusMeters * Math.Cos(lat * Math.PI / 180.0)) * (180.0 / Math.PI);

        var rawBeacons = await _context.Set<UserLocationBeacon>()
            .Where(b => b.LastSeenAt >= staleThreshold && b.UserId != currentUserId && b.UserId != AiAssistantConstants.AssistantUserId
                     && b.Latitude >= lat - latDelta && b.Latitude <= lat + latDelta
                     && b.Longitude >= lon - lonDelta && b.Longitude <= lon + lonDelta)
            .OrderByDescending(b => b.LastSeenAt)
            .Take(500)
            .ToListAsync();

        var uniqueBeacons = rawBeacons.GroupBy(b => b.UserId).Select(g => g.First()).ToList();
        var beaconDistances = uniqueBeacons
            .Select(b => new { Beacon = b, Distance = CalculateDistanceMeters(lat, lon, b.Latitude, b.Longitude) })
            .Where(x => x.Distance <= radius)
            .OrderBy(x => x.Distance)
            .Take(limit)
            .ToList();

        if (!beaconDistances.Any()) return new NearbyUsersResponse();

        var userIds = beaconDistances.Select(x => x.Beacon.UserId).ToList();
        var userMap = (await _context.Set<AppUser>().Where(u => userIds.Contains(u.Id)).ToListAsync()).ToDictionary(u => u.Id, u => u);

        var interestFilters = request.Interests?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim().ToLowerInvariant()).Distinct().ToList();
        var sessionCache = new Dictionary<string, string?>();
        var items = new List<NearbyUserDto>();

        foreach (var x in beaconDistances)
        {
            var u = userMap.GetValueOrDefault(x.Beacon.UserId);
            var interests = u?.Tags?.Where(t => !string.IsNullOrWhiteSpace(t?.Label)).Select(t => t!.Label!.Trim()).ToList();

            if (interestFilters?.Any() == true && (interests == null || !interests.Any(l => interestFilters.Contains(l.ToLowerInvariant())))) continue;

            items.Add(new NearbyUserDto
            {
                UserId = x.Beacon.UserId, DisplayName = u?.Name ?? u?.Username ?? "访客", AvatarUrl = u?.Avatar,
                DistanceMeters = x.Distance, LastActiveAt = u?.LastLoginAt ?? x.Beacon.LastSeenAt,
                Location = new GeoPoint { Latitude = x.Beacon.Latitude, Longitude = x.Beacon.Longitude, Accuracy = x.Beacon.Accuracy, Altitude = x.Beacon.Altitude, Heading = x.Beacon.Heading, Speed = x.Beacon.Speed },
                Interests = interests, SessionId = await ResolveSessionIdAsync(currentUserId, x.Beacon.UserId, sessionCache)
            });
        }

        return new NearbyUsersResponse { Items = items, Total = items.Count, NextRefreshAfter = 60 };
    }

    private async Task<string?> ResolveSessionIdAsync(string cur, string target, IDictionary<string, string?> cache)
    {
        if (cache.TryGetValue(target, out var id)) return id;
        var s = await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Participants.Count == 2 && x.Participants.Contains(cur) && x.Participants.Contains(target));
        cache[target] = s?.Id;
        return s?.Id;
    }

    public async Task<UserLocationBeacon?> GetCurrentUserLocationAsync()
    {
        var uid = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
        var cid =  _tenantContext.GetCurrentCompanyId() ?? throw new UnauthorizedAccessException(ErrorCode.CurrentCompanyNotFound);
        return await _context.Set<UserLocationBeacon>().Where(b => b.UserId == uid && b.CompanyId == cid).OrderByDescending(b => b.LastSeenAt).FirstOrDefaultAsync();
    }

    public async Task<UserLocationInfo?> GetCurrentUserLocationInfoAsync()
    {
        var b = await GetCurrentUserLocationAsync();
        return b == null ? null : new UserLocationInfo { City = b.City, Country = b.Country };
    }

    private static void ValidateCoordinates(double lat, double lon)
    {
        if (lat is < -90 or > 90) throw new ArgumentOutOfRangeException(nameof(lat));
        if (lon is < -180 or > 180) throw new ArgumentOutOfRangeException(nameof(lon));
    }

    private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var r1 = lat1 * Math.PI / 180d; var r2 = lat2 * Math.PI / 180d;
        var dlat = (lat2 - lat1) * Math.PI / 180d; var dlon = (lon2 - lon1) * Math.PI / 180d;
        var a = Math.Sin(dlat / 2) * Math.Sin(dlat / 2) + Math.Cos(r1) * Math.Cos(r2) * Math.Sin(dlon / 2) * Math.Sin(dlon / 2);
        return EarthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private DateTime ResolveLastSeenAt(UpdateLocationBeaconRequest req, DateTime fallback)
    {
        if (!req.Timestamp.HasValue) return fallback;
        try
        {
            var c = DateTimeOffset.FromUnixTimeMilliseconds(req.Timestamp.Value).UtcDateTime;
            return c > DateTime.UtcNow.AddMinutes(5) ? fallback : c;
        }
        catch { return fallback; }
    }

    private async Task<GeocodeResult?> ReverseGeocodeAsync(double lat, double lon)
    {
        try { return await ReverseGeocodeWithBigDataCloudAsync(lat, lon); } catch { }
        try { return await ReverseGeocodeWithGeoNamesAsync(lat, lon); } catch { }
        return null;
    }

    private async Task<GeocodeResult?> ReverseGeocodeWithBigDataCloudAsync(double lat, double lon)
    {
        var url = $"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=zh";
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        var res = await client.GetStringAsync(url);
        var json = JsonSerializer.Deserialize<JsonElement>(res);
        var r = new GeocodeResult();
        if (json.TryGetProperty("locality", out var loc)) r.City = loc.GetString();
        else if (json.TryGetProperty("city", out var city)) r.City = city.GetString();
        if (json.TryGetProperty("countryName", out var cn)) r.Country = cn.GetString();
        return (string.IsNullOrEmpty(r.City) && string.IsNullOrEmpty(r.Country)) ? null : r;
    }

    private async Task<GeocodeResult?> ReverseGeocodeWithGeoNamesAsync(double lat, double lon)
    {
        var user = _configuration["Geocoding:GeoNamesUsername"] ?? "demo";
        var url = $"http://api.geonames.org/findNearbyPlaceNameJSON?lat={lat}&lng={lon}&username={user}&lang=zh";
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        var res = await client.GetStringAsync(url);
        var json = JsonSerializer.Deserialize<JsonElement>(res);
        if (json.TryGetProperty("geonames", out var gs) && gs.EnumerateArray().Any())
        {
            var p = gs.EnumerateArray().First();
            return new GeocodeResult { City = p.TryGetProperty("name", out var n) ? n.GetString() : null, Country = p.TryGetProperty("countryName", out var c) ? c.GetString() : null };
        }
        return null;
    }
}

public class GeocodeResult { public string? City { get; set; } public string? Country { get; set; } }
