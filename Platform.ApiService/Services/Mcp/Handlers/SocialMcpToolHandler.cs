using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 社交 MCP 工具处理器（附近的人、位置服务）
/// </summary>
public class SocialMcpToolHandler : McpToolHandlerBase
{
    private readonly ISocialService _socialService;
    private readonly ILogger<SocialMcpToolHandler> _logger;

    public SocialMcpToolHandler(
        ISocialService socialService,
        ILogger<SocialMcpToolHandler> logger)
    {
        _socialService = socialService;
        _logger = logger;

        RegisterTool("update_my_location", "更新当前用户的位置信息。关键词：更新位置,上报位置",
            ObjectSchema(new Dictionary<string, object>
            {
                ["latitude"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "纬度" },
                ["longitude"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "经度" },
                ["accuracy"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "定位精度(米)" }
            }, ["latitude", "longitude"]),
            async (args, uid) =>
            {
                var lat = args.GetValueOrDefault("latitude")?.ToString();
                var lon = args.GetValueOrDefault("longitude")?.ToString();
                if (!double.TryParse(lat, out var latitude) || !double.TryParse(lon, out var longitude))
                    return new { error = "latitude 和 longitude 必填且为有效数字" };
                var accuracy = double.TryParse(args.GetValueOrDefault("accuracy")?.ToString(), out var a) ? a : 10.0;
                await _socialService.UpdateLocationAsync(new UpdateLocationBeaconRequest
                {
                    Latitude = latitude,
                    Longitude = longitude,
                    Accuracy = accuracy
                });
                return new { message = "位置更新成功" };
            });

        RegisterTool("get_my_location", "获取当前用户的位置信息。关键词：我的位置,当前位置",
            async (args, uid) =>
            {
                var location = await _socialService.GetCurrentUserLocationInfoAsync();
                return location ?? (object)new { message = "未获取到位置信息" };
            });

        RegisterTool("get_nearby_users", "获取附近的人列表。关键词：附近的人,附近用户",
            ObjectSchema(new Dictionary<string, object>
            {
                ["latitude"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "中心纬度" },
                ["longitude"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "中心经度" },
                ["radius"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "搜索半径(米)，默认2000" },
                ["limit"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "返回数量，默认20" }
            }),
            async (args, uid) =>
            {
                var latStr = args.GetValueOrDefault("latitude")?.ToString();
                var lonStr = args.GetValueOrDefault("longitude")?.ToString();
                var radius = double.TryParse(args.GetValueOrDefault("radius")?.ToString(), out var r) ? r : 2000;
                var limit = int.TryParse(args.GetValueOrDefault("limit")?.ToString(), out var l) ? l : 20;
                double? latitude = double.TryParse(latStr, out var lat) ? lat : null;
                double? longitude = double.TryParse(lonStr, out var lon) ? lon : null;
                if (latitude == null || longitude == null)
                {
                    var myLoc = await _socialService.GetCurrentUserLocationAsync();
                    if (myLoc == null) return new { error = "请提供有效的 latitude 和 longitude 参数" };
                    latitude = myLoc.Latitude;
                    longitude = myLoc.Longitude;
                }
                return await _socialService.GetNearbyUsersAsync(new NearbyUsersRequest
                {
                    Center = new GeoPoint { Latitude = latitude.Value, Longitude = longitude.Value },
                    RadiusMeters = radius,
                    Limit = limit
                });
            });
    }
}