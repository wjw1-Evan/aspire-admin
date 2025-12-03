using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Platform.ApiService.Services;
using Platform.ApiService.Models;
using System.Security.Claims;

namespace Platform.ApiService.Hubs;

/// <summary>
/// 位置上报 Hub
/// 实时接收和处理用户地理位置信息
/// </summary>
[Authorize]
public class LocationHub : Hub
{
    /// <summary>
    /// 位置更新事件名称
    /// </summary>
    public const string LocationUpdatedEvent = "LocationUpdated";

    private readonly ISocialService _socialService;
    private readonly ILogger<LocationHub> _logger;

    /// <summary>
    /// 初始化位置上报 Hub
    /// </summary>
    /// <param name="socialService">社交服务（包含位置上报能力）</param>
    /// <param name="logger">日志记录器</param>
    public LocationHub(
        ISocialService socialService,
        ILogger<LocationHub> logger)
    {
        _socialService = socialService ?? throw new ArgumentNullException(nameof(socialService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 连接成功时自动加入用户组
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserIdFromClaims() ?? "anonymous";
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        _logger.LogInformation("用户 {UserId} 连接到位置上报 Hub: {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// 连接断开时清理
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserIdFromClaims() ?? "anonymous";
        _logger.LogInformation("用户 {UserId} 断开位置上报 Hub 连接: {ConnectionId}", userId, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// 上报用户位置（沿用现有 REST 接口的数据模型）
    /// </summary>
    /// <param name="request">位置上报请求</param>
    public async Task ReportLocationAsync(UpdateLocationBeaconRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        var userId = GetUserIdFromClaims();
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("无法获取用户信息");
        }

        try
        {
            var userIdOverride = GetUserIdFromClaims();
            await _socialService.UpdateLocationAsync(request, userIdOverride: userIdOverride);

            _logger.LogInformation(
                "位置上报成功: 用户 {UserId}, 坐标 ({Latitude}, {Longitude}), 精度 {Accuracy}m",
                userId,
                request.Latitude,
                request.Longitude,
                request.Accuracy);

            await Clients.Caller.SendAsync(LocationUpdatedEvent, new
            {
                success = true,
                timestamp = DateTime.UtcNow,
                message = "位置上报成功"
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "位置数据验证失败: 用户 {UserId}", userId);
            await Clients.Caller.SendAsync(LocationUpdatedEvent, new
            {
                success = false,
                timestamp = DateTime.UtcNow,
                message = ex.Message
            });
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "位置上报失败: 用户 {UserId}", userId);
            await Clients.Caller.SendAsync(LocationUpdatedEvent, new
            {
                success = false,
                timestamp = DateTime.UtcNow,
                message = "位置上报失败"
            });
            throw;
        }
    }

    /// <summary>
    /// 获取用户组名称
    /// </summary>
    /// <param name="userId">用户标识</param>
    /// <returns>组名称</returns>
    public static string GetUserGroupName(string userId) => $"user:{userId}";

    private string? GetUserIdFromClaims()
    {
        var user = Context?.User;
        var uid = user?.FindFirst("userId")?.Value
                  ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? user?.FindFirst("sub")?.Value;

        if (!string.IsNullOrEmpty(uid)) return uid;

        // 兜底：从 HttpContext 读取（在 LongPolling 情况下可用）
        var httpUser = Context?.GetHttpContext()?.User;
        return httpUser?.FindFirst("userId")?.Value
            ?? httpUser?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? httpUser?.FindFirst("sub")?.Value;
    }
}
