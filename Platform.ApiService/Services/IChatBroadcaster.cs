using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天消息广播器接口
/// 使用 SSE（Server-Sent Events）进行实时消息广播
/// </summary>
public interface IChatBroadcaster
{
    /// <summary>
    /// 广播新消息
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="payload">消息负载</param>
    Task BroadcastMessageAsync(string sessionId, ChatMessageRealtimePayload payload);

    /// <summary>
    /// 广播会话更新
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="payload">会话负载</param>
    Task BroadcastSessionUpdatedAsync(string sessionId, ChatSessionRealtimePayload payload);

    /// <summary>
    /// 广播消息删除
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="payload">删除负载</param>
    Task BroadcastMessageDeletedAsync(string sessionId, ChatMessageDeletedPayload payload);

    /// <summary>
    /// 广播会话已读状态
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="userId">用户标识</param>
    /// <param name="payload">已读负载</param>
    Task BroadcastSessionReadAsync(string sessionId, string userId, ChatSessionReadPayload payload);

    /// <summary>
    /// 广播流式消息块（增量内容）
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="messageId">消息标识</param>
    /// <param name="delta">增量文本内容</param>
    Task BroadcastMessageChunkAsync(string sessionId, string messageId, string delta);

    /// <summary>
    /// 广播流式消息完成
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="message">完整消息</param>
    Task BroadcastMessageCompleteAsync(string sessionId, ChatMessage message);
}

