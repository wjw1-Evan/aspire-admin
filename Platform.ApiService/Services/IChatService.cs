using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天服务接口定义
/// </summary>
public interface IChatService
{
    /// <summary>
    /// 获取当前企业下的会话列表
    /// </summary>
    /// <param name="request">查询参数</param>
    /// <returns>会话集合与总数</returns>
    Task<(List<ChatSession> sessions, long total)> GetSessionsAsync(ChatSessionListRequest request);

    /// <summary>
    /// 获取指定会话的消息时间线
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="request">分页参数</param>
    /// <returns>消息集合、是否还有更多以及下一游标</returns>
    Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request);

    /// <summary>
    /// 发送消息
    /// </summary>
    /// <param name="request">发送请求体</param>
    /// <returns>已持久化的消息</returns>
    Task<ChatMessage> SendMessageAsync(SendChatMessageRequest request);

    /// <summary>
    /// 上传附件并返回元数据
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="file">上传文件</param>
    /// <returns>附件信息</returns>
    Task<ChatAttachmentInfo> UploadAttachmentAsync(string sessionId, IFormFile file);

    /// <summary>
    /// 下载附件内容
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="storageObjectId">附件存储标识</param>
    /// <returns>附件流及元数据</returns>
    Task<ChatAttachmentDownloadResult> DownloadAttachmentAsync(string sessionId, string storageObjectId);

    /// <summary>
    /// 将指定会话标记为已读
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="lastMessageId">最后读取的消息标识</param>
    Task MarkSessionReadAsync(string sessionId, string lastMessageId);

    /// <summary>
    /// 删除指定消息（软删除）
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="messageId">消息标识</param>
    Task DeleteMessageAsync(string sessionId, string messageId);

    /// <summary>
    /// 获取或创建私聊会话
    /// </summary>
    /// <param name="participantUserId">参与者用户标识</param>
    /// <returns>会话实体</returns>
    Task<ChatSession> GetOrCreateDirectSessionAsync(string participantUserId);
}

