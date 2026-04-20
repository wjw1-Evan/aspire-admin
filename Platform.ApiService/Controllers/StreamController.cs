using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 流式事件控制器
/// 提供 Server-Sent Events 实时消息推送（通用 SSE 连接）
/// </summary>
[ApiController]
[Route("api/stream")]
[AllowAnonymous]
public class StreamController : BaseApiController
{
    private readonly IChatSseConnectionManager _connectionManager;
    private readonly IJwtService _jwtService;
    private readonly ILogger<StreamController> _logger;
    private readonly INotificationService _notificationService;

    /// <summary>
    /// 初始化流式事件控制器
    /// </summary>
    /// <param name="connectionManager">连接管理器</param>
    /// <param name="jwtService">JWT 服务</param>
    /// <param name="logger">日志记录器</param>
    /// <param name="notificationService">通知服务</param>
    public StreamController(
        IChatSseConnectionManager connectionManager,
        IJwtService jwtService,
        ILogger<StreamController> logger,
        INotificationService? notificationService = null)
    {
        _connectionManager = connectionManager ?? throw new ArgumentNullException(nameof(connectionManager));
        _jwtService = jwtService ?? throw new ArgumentNullException(nameof(jwtService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _notificationService = notificationService!;
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
        // 验证 token
        string? userId = null;
        if (!string.IsNullOrWhiteSpace(token))
        {
            userId = _jwtService.GetUserIdFromToken(token);
        }
        else
        {
            // 如果没有通过查询参数传递，尝试从 Authorization header 获取
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var bearerToken = authHeader.Substring("Bearer ".Length).Trim();
                userId = _jwtService.GetUserIdFromToken(bearerToken);
            }
        }

        if (string.IsNullOrWhiteSpace(userId))
        {
            _logger.LogWarning("SSE 连接失败: 未提供有效的 token");
            throw new UnauthorizedAccessException("未授权访问");
        }

        // 设置 SSE 响应头
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache, no-transform";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no"; // 禁用 Nginx 缓冲

        // 禁用响应缓冲，确保消息即时下发
        var originalBodyFeature = HttpContext.Features.Get<IHttpResponseBodyFeature>();
        if (originalBodyFeature != null)
        {
            originalBodyFeature.DisableBuffering();
        }

        var connectionId = Guid.NewGuid().ToString();

        try
        {
            // 注册用户连接（简化版：直接关联用户ID）
            await _connectionManager.RegisterUserConnectionAsync(userId, connectionId, Response, cancellationToken);

            // 发送连接确认
            var connectedData = new { connectionId, userId };
            await WriteSseEventAsync("connected", connectedData, cancellationToken);

            // 连接成功后立即推送当前未读通知统计
            if (_notificationService != null)
            {
                try
                {
                    await (_notificationService as INotificationService).PushStatsUpdateAsync(userId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "推送初始通知统计失败: 用户 {UserId}", userId);
                }
            }
            else
            {
                _logger.LogWarning("NotificationService 未注入，跳过推送初始通知统计");
            }

            // 心跳：每15秒发送ping保持连接活跃
            try
            {
                while (!cancellationToken.IsCancellationRequested)
                {
                    await Task.Delay(15000, cancellationToken);
                    try
                    {
                    await WriteSseEventAsync("ping", null, cancellationToken);
                    }
                    catch { break; }
                }
            }
            catch (OperationCanceledException)
            {
                // 连接正常关闭（客户端断开或服务器重启）
                _logger.LogInformation("SSE 连接正常关闭, connectionId: {ConnectionId}", connectionId);
            }
            finally
            {
                // 清理连接
                _logger.LogInformation("SSE 连接关闭, connectionId: {ConnectionId}, userId: {UserId}", connectionId, userId);
                await _connectionManager.UnregisterConnectionAsync(connectionId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE 连接异常: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);
            await _connectionManager.UnregisterConnectionAsync(connectionId);
        }

        return new EmptyResult();
    }

    private async Task WriteSseEventAsync(string eventType, object? data, CancellationToken cancellationToken)
    {
        try
        {
            var json = data != null ? JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }) : "null";

            var message = $"event: {eventType}\ndata: {json}\n\n";
            var bytes = Encoding.UTF8.GetBytes(message);

            await Response.Body.WriteAsync(bytes, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // 连接已关闭，忽略
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SSE 写入事件失败: 事件 {EventType}", eventType);
            throw;
        }
    }
}