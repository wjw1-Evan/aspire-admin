using Platform.ApiService.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System.Text;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 通知 SSE 控制器
/// 提供通知相关的 Server-Sent Events 实时消息推送
/// </summary>
[ApiController]
[Route("api/notification")]
[SkipGlobalAuthentication("SSE端点通过查询参数自主验证Token")]
public class NotificationSseController : BaseApiController
{
    private readonly IChatSseConnectionManager _connectionManager;
    private readonly IJwtService _jwtService;
    private readonly ILogger<NotificationSseController> _logger;

    public NotificationSseController(
        IChatSseConnectionManager connectionManager,
        IJwtService jwtService,
        ILogger<NotificationSseController> logger)
    {
        _connectionManager = connectionManager ?? throw new ArgumentNullException(nameof(connectionManager));
        _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// SSE 事件流端点
    /// </summary>
    /// <param name="token">JWT token（通过查询参数传递，因为 EventSource 不支持自定义请求头）</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>SSE 事件流</returns>
    [HttpGet("sse")]
    [Produces("text/event-stream")]
    public async Task<IActionResult> StreamEvents(
        [FromQuery] string? token,
        CancellationToken cancellationToken)
    {
        string? userId = null;
        
        if (!string.IsNullOrWhiteSpace(token))
        {
            userId = _jwtService.GetUserIdFromToken(token);
        }
        else
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var bearerToken = authHeader.Substring("Bearer ".Length).Trim();
                userId = _jwtService.GetUserIdFromToken(bearerToken);
            }
        }

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogWarning("通知 SSE 连接失败: 未提供有效的 token");
            throw new UnauthorizedAccessException("未授权访问");
        }

        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        var connectionId = Guid.NewGuid().ToString();
        
        await _connectionManager.RegisterUserConnectionAsync(userId, connectionId, Response, cancellationToken);

        _logger.LogInformation("通知 SSE 连接建立: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);

        try
        {
            var heartbeatInterval = TimeSpan.FromSeconds(30);
            var lastHeartbeat = DateTime.UtcNow;

            while (!cancellationToken.IsCancellationRequested)
            {
                if (DateTime.UtcNow - lastHeartbeat >= heartbeatInterval)
                {
                    try
                    {
                        var heartbeatMessage = "event: keepalive\ndata: \n\n";
                        await _connectionManager.SendToUserAsync(userId, heartbeatMessage);
                        lastHeartbeat = DateTime.UtcNow;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "通知 SSE 心跳发送失败: 连接 {ConnectionId}", connectionId);
                    }
                }

                await Task.Delay(1000, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("通知 SSE 连接关闭: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "通知 SSE 连接异常: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);
        }
        finally
        {
            await _connectionManager.UnregisterConnectionAsync(connectionId);
        }

        return new EmptyResult();
    }
}