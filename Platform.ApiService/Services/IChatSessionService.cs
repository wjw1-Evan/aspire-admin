using Platform.ApiService.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天会话服务，负责管理会话与消息
/// </summary>
public interface IChatSessionService
{
    /// <summary>
    /// 获取聊天会话列表
    /// </summary>
    Task<(List<ChatSession> sessions, long total)> GetSessionsAsync(ChatSessionListRequest request);

    /// <summary>
    /// 获取某个会话下的聊天消息列表
    /// </summary>
    Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request);

    /// <summary>
    /// 获取或创建与指定用户的直接会话
    /// </summary>
    Task<ChatSession> GetOrCreateDirectSessionAsync(string participantUserId);

    /// <summary>
    /// 将会话标记为已读
    /// </summary>
    Task MarkSessionReadAsync(string sessionId, string lastMessageId);

    /// <summary>
    /// 确保会话对当前用户可访问
    /// </summary>
    Task<ChatSession> EnsureSessionAccessibleAsync(string sessionId);

    /// <summary>
    /// 在发送消息后更新会话状态及未读数
    /// </summary>
    Task UpdateSessionAfterMessageAsync(ChatSession session, ChatMessage message, string userId);

    /// <summary>
    /// 在发送消息后仅更新最后一条消息（不增加未读数）
    /// </summary>
    Task UpdateSessionLastMessageOnlyAsync(ChatSession session, ChatMessage message, string userId);

    /// <summary>
    /// 为会话填充参与者的元数据（如用户名、头像）
    /// </summary>
    Task EnrichParticipantMetadataAsync(ChatSession session);

    /// <summary>
    /// 处理用户发送消息（包含附件处理和广播分发）
    /// </summary>
    Task<ChatMessage> SendMessageAsync(SendChatMessageRequest request, ChatAttachmentInfo? attachmentInfo);

    /// <summary>
    /// 删除指定消息（软删除）
    /// </summary>
    Task DeleteMessageAsync(string sessionId, string messageId);
}
