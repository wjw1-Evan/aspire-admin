using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天 SSE 控制器（简化版）
/// 提供基础的 Server-Sent Events 实时消息推送
/// </summary>
[ApiController]
[Route("api/chat")]
public class ChatSseController : BaseApiController
{
    private readonly IChatSseConnectionManager _connectionManager;
    private readonly IJwtService _jwtService;
    private readonly ILogger<ChatSseController> _logger;

    /// <summary>
    /// 初始化聊天 SSE 控制器
    /// </summary>
    /// <param name="connectionManager">连接管理器</param>
    /// <param name="jwtService">JWT 服务</param>
    /// <param name="logger">日志记录器</param>
    public ChatSseController(
        IChatSseConnectionManager connectionManager,
        IJwtService jwtService,
        ILogger<ChatSseController> logger)
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
            var errorResponse = ApiResponse<object>.ErrorResult("UNAUTHORIZED", "未提供有效的认证令牌", HttpContext.TraceIdentifier);
            return Unauthorized(errorResponse);
        }

        // 设置 SSE 响应头
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no"; // 禁用 Nginx 缓冲

        var connectionId = Guid.NewGuid().ToString();
        _logger.LogInformation("SSE 连接建立: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);

        try
        {
            // 注册用户连接（简化版：直接关联用户ID）
            await _connectionManager.RegisterUserConnectionAsync(userId, connectionId, Response, cancellationToken);

            // 发送连接确认
            var connectedData = new { connectionId, userId };
            await WriteSseEventAsync("connected", connectedData, cancellationToken);

            // 启动心跳任务
            var heartbeatTask = Task.Run(async () =>
            {
                while (!cancellationToken.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(30000, cancellationToken); // 30 秒心跳
                        if (!cancellationToken.IsCancellationRequested)
                        {
                            await WriteSseEventAsync("keepalive", null, cancellationToken);
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "SSE 心跳发送失败: 连接 {ConnectionId}", connectionId);
                        break;
                    }
                }
            }, cancellationToken);

            // 等待连接关闭
            try
            {
                await Task.Delay(Timeout.Infinite, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // 连接正常关闭
            }
            finally
            {
                // 清理连接
                await _connectionManager.UnregisterConnectionAsync(connectionId);
                _logger.LogInformation("SSE 连接关闭: 连接 {ConnectionId} 用户 {UserId}", connectionId, userId);
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
