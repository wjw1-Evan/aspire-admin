using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天消息广播器实现（纯 SSE 分发层）
/// 不依赖 DbContext，由调用方传入参与者列表
/// </summary>
public class ChatBroadcaster : IChatBroadcaster
{
    private readonly IChatSseConnectionManager _sseConnectionManager;
    private readonly ILogger<ChatBroadcaster> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    /// <summary>
    /// 初始化聊天广播器
    /// </summary>
    /// <param name="sseConnectionManager">SSE 连接管理器</param>
    /// <param name="logger">日志记录器</param>
    public ChatBroadcaster(
        IChatSseConnectionManager sseConnectionManager,
        ILogger<ChatBroadcaster> logger
    ) {
        _sseConnectionManager = sseConnectionManager ?? throw new ArgumentNullException(nameof(sseConnectionManager));
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
    public async Task BroadcastMessageAsync(List<string> participants, ChatMessageRealtimePayload payload)
    {
        await BroadcastToParticipantsAsync(participants, "ReceiveMessage", payload);
    }

    /// <summary>
    /// 广播会话更新
    /// </summary>
    public async Task BroadcastSessionUpdatedAsync(List<string> participants, ChatSessionRealtimePayload payload)
    {
        await BroadcastToParticipantsAsync(participants, "SessionUpdated", payload);
    }

    /// <summary>
    /// 广播消息删除
    /// </summary>
    public async Task BroadcastMessageDeletedAsync(List<string> participants, ChatMessageDeletedPayload payload)
    {
        await BroadcastToParticipantsAsync(participants, "MessageDeleted", payload);
    }

    /// <summary>
    /// 广播会话已读状态
    /// </summary>
    public async Task BroadcastSessionReadAsync(List<string> participants, string userId, ChatSessionReadPayload payload)
    {
        await BroadcastToParticipantsAsync(participants, "SessionRead", payload);
    }

    /// <summary>
    /// 广播流式消息块（增量内容）
    /// </summary>
    public async Task BroadcastMessageChunkAsync(List<string> participants, string sessionId, string messageId, string delta)
    {
        _logger.LogDebug("BroadcastMessageChunkAsync: messageId={MessageId}, participants={Participants}", messageId, string.Join(",", participants));
        var payload = new { sessionId, messageId, delta, timestamp = DateTime.UtcNow };
        await BroadcastToParticipantsAsync(participants, "MessageChunk", payload);
    }

    /// <summary>
    /// 广播流式消息完成
    /// </summary>
    public async Task BroadcastMessageCompleteAsync(List<string> participants, ChatMessage message)
    {
        var payload = new ChatMessageRealtimePayload
        {
            SessionId = message.SessionId,
            Message = message,
            BroadcastAtUtc = DateTime.UtcNow
        };
        await BroadcastToParticipantsAsync(participants, "MessageComplete", payload);
    }

    /// <summary>
    /// 向参与者列表广播 SSE 消息（纯分发，不访问数据库）
    /// </summary>
    private async Task BroadcastToParticipantsAsync(List<string> participants, string eventType, object payload)
    {
        if (participants == null || participants.Count == 0)
        {
            _logger.LogWarning("SSE 广播：事件 {EventType} 没有参与者", eventType);
            return;
        }

        try
        {
            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var message = $"event: {eventType}\ndata: {json}\n\n";

            // 过滤掉 AI 助手，因为它是虚拟机器人，不需要 SSE 连接
            var activeParticipants = participants
                .Where(uid => !string.Equals(uid, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal))
                .ToList();

            if (activeParticipants.Count == 0) return;

            var tasks = activeParticipants.Select(async userId =>
            {
                try
                {
                    await _sseConnectionManager.SendToUserAsync(userId, message);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "SSE 发送消息失败: 用户 {UserId} 事件 {EventType}",
                        userId, eventType);
                }
            });

            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE 广播失败: 事件 {EventType}", eventType);
        }
    }
}