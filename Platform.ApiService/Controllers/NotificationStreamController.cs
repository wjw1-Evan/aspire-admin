using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 新版通知 SSE 连接控制器
/// </summary>
[Authorize]
[ApiController]
[Route("api/notifications/stream")]
public class NotificationStreamController : BaseApiController
{
    private readonly INotificationStreamManager _streamManager;
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationStreamController> _logger;

    public NotificationStreamController(
        INotificationStreamManager streamManager,
        INotificationService notificationService,
        ILogger<NotificationStreamController> logger)
    {
        _streamManager = streamManager;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// 建立 SSE 连接
    /// </summary>
    [HttpGet]
    public async Task Subscribe()
    {
        var userId = RequiredUserId;
        var connectionId = Guid.NewGuid().ToString("N");

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        // 注册连接到管理器
        await _streamManager.RegisterUserConnectionAsync(userId, connectionId, Response, HttpContext.RequestAborted);

        // 推送初始统计信息
        var stats = await _notificationService.GetStatisticsAsync(userId);
        await _streamManager.SendToUserAsync(userId, new {
            Type = "Connected",
            ConnectionId = connectionId,
            Statistics = stats
        });

        _logger.LogInformation("用户 {UserId} 通知流已启动", userId);

        // 保持连接直到请求取消
        try
        {
            await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted);
        }
        catch (OperationCanceledException)
        {
            // 正常断开
        }
        finally
        {
            await _streamManager.UnregisterConnectionAsync(connectionId);
        }
    }
}
