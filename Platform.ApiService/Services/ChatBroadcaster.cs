using Platform.ApiService.Models;
using System.Text;
using System.Text.Json;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天消息广播器实现（简化版）
/// 使用 SSE 直接向用户发送消息
/// </summary>
public class ChatBroadcaster : IChatBroadcaster
{
    private readonly IChatSseConnectionManager _sseConnectionManager;
    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly ILogger<ChatBroadcaster> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    /// <summary>
    /// 初始化聊天广播器
    /// </summary>
    /// <param name="sseConnectionManager">SSE 连接管理器</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    public ChatBroadcaster(
        IChatSseConnectionManager sseConnectionManager,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        ILogger<ChatBroadcaster> logger)
    {
        _sseConnectionManager = sseConnectionManager ?? throw new ArgumentNullException(nameof(sseConnectionManager));
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
    }

    /// <summary>
    /// 广播新消息
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="payload">消息负载</param>
    public async Task BroadcastMessageAsync(string sessionId, ChatMessageRealtimePayload payload)
    {
        // SSE 广播
        await BroadcastToSseAsync(sessionId, "ReceiveMessage", payload);
    }

    /// <summary>
    /// 广播会话更新
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="payload">会话负载</param>
    public async Task BroadcastSessionUpdatedAsync(string sessionId, ChatSessionRealtimePayload payload)
    {
        // SSE 广播到会话的所有参与者
        await BroadcastToSseAsync(sessionId, "SessionUpdated", payload);
    }

    /// <summary>
    /// 广播消息删除
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="payload">删除消息负载</param>
    public async Task BroadcastMessageDeletedAsync(string sessionId, ChatMessageDeletedPayload payload)
    {
        // SSE 广播
        await BroadcastToSseAsync(sessionId, "MessageDeleted", payload);
    }

    /// <summary>
    /// 广播会话已读状态
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="userId">用户ID</param>
    /// <param name="payload">已读负载</param>
    public async Task BroadcastSessionReadAsync(string sessionId, string userId, ChatSessionReadPayload payload)
    {
        // SSE 广播
        await BroadcastToSseAsync(sessionId, "SessionRead", payload);
    }

    /// <summary>
    /// 广播流式消息块（增量内容）
    /// </summary>
    public async Task BroadcastMessageChunkAsync(string sessionId, string messageId, string delta)
    {
        var payload = new { sessionId, messageId, delta, timestamp = DateTime.UtcNow };
        await BroadcastToSseAsync(sessionId, "MessageChunk", payload);
    }

    /// <summary>
    /// 广播流式消息完成
    /// </summary>
    public async Task BroadcastMessageCompleteAsync(string sessionId, ChatMessage message)
    {
        var payload = new ChatMessageRealtimePayload
        {
            SessionId = sessionId,
            Message = message,
            BroadcastAtUtc = DateTime.UtcNow
        };
        await BroadcastToSseAsync(sessionId, "MessageComplete", payload);
    }

    /// <summary>
    /// 向用户发送 SSE 消息（简化版：直接通过用户ID发送）
    /// </summary>
    private async Task SendToUserAsync(string userId, string eventType, object payload)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var message = $"event: {eventType}\ndata: {json}\n\n";

            await _sseConnectionManager.SendToUserAsync(userId, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE 发送消息失败: 用户 {UserId} 事件 {EventType}", userId, eventType);
        }
    }

    /// <summary>
    /// 广播到会话的所有参与者（简化版：通过用户ID发送）
    /// </summary>
    private async Task BroadcastToSseAsync(string sessionId, string eventType, object payload)
    {
        try
        {
            // 获取会话的参与者
            var session = await _sessionFactory.GetByIdAsync(sessionId);
            if (session == null || session.Participants == null || session.Participants.Count == 0)
            {
                _logger.LogWarning("SSE 广播：会话 {SessionId} 事件 {EventType} 没有参与者", sessionId, eventType);
                return;
            }

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var message = $"event: {eventType}\ndata: {json}\n\n";

            var tasks = session.Participants.Select(async userId =>
            {
                try
                {
                    await _sseConnectionManager.SendToUserAsync(userId, message);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "SSE 发送消息失败: 用户 {UserId} 会话 {SessionId} 事件 {EventType}", 
                        userId, sessionId, eventType);
                }
            });

            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE 广播失败: 会话 {SessionId} 事件 {EventType}", sessionId, eventType);
        }
    }
}
