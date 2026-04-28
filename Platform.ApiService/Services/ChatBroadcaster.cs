using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using StackExchange.Redis;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天消息广播器实现（基于 Redis Pub/Sub 的分布式分发）
/// 通过 Redis 频道广播消息，所有副本订阅后推送给本地连接的用户
/// </summary>
public class ChatBroadcaster : IChatBroadcaster
{
    private readonly IChatSseConnectionManager _sseConnectionManager;
    private readonly ILogger<ChatBroadcaster> _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly IConnectionMultiplexer _redis;

    /// <summary>
    /// 初始化聊天广播器
    /// </summary>
    public ChatBroadcaster(
        IChatSseConnectionManager sseConnectionManager,
        ILogger<ChatBroadcaster> logger,
        IConnectionMultiplexer redis)
    {
        _sseConnectionManager = sseConnectionManager ?? throw new ArgumentNullException(nameof(sseConnectionManager));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));

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
    /// 向参与者列表广播 SSE 消息（通过 Redis Pub/Sub 分发到所有副本）
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

            // 发布到 Redis 频道，所有副本都会收到
            var pub = _redis.GetSubscriber();
            var broadcastData = new
            {
                Participants = activeParticipants,
                Message = message,
                EventType = eventType
            };
            
            var serializedData = JsonSerializer.Serialize(broadcastData, _jsonOptions);
            await pub.PublishAsync(RedisChannel.Literal("sse:broadcast"), serializedData);
            
            _logger.LogDebug("消息已发布到 Redis: 事件 {EventType}, 参与者数 {Count}", 
                eventType, activeParticipants.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSE 广播失败: 事件 {EventType}", eventType);
        }
    }
}