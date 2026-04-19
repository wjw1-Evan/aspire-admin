#pragma warning disable CS1591
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq.Dynamic.Core;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天服务实现（外观模式，代理到各个子服务）
/// </summary>
public class ChatService : IChatService
{
    private readonly IChatSessionService _sessionService;
    private readonly IChatAiService _aiService;
    private readonly IChatAttachmentService _attachmentService;
    private readonly IChatSseConnectionManager? _sseConnectionManager;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IChatSessionService sessionService,
        IChatAiService aiService,
        IChatAttachmentService attachmentService,
        IChatSseConnectionManager? sseConnectionManager,
        ILogger<ChatService> logger)
    {
        _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        _aiService = aiService ?? throw new ArgumentNullException(nameof(aiService));
        _attachmentService = attachmentService ?? throw new ArgumentNullException(nameof(attachmentService));
        _sseConnectionManager = sseConnectionManager;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<System.Linq.Dynamic.Core.PagedResult<ChatSession>> GetSessionsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
        => _sessionService.GetSessionsAsync(request);

    public Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request)
        => _sessionService.GetMessagesAsync(sessionId, request);

    public async Task<ChatMessage> SendMessageAsync(SendChatMessageRequest request)
    {
        ChatAttachmentInfo? attachmentInfo = null;
        if (!string.IsNullOrWhiteSpace(request.AttachmentId))
        {
            attachmentInfo = await _attachmentService.GetAttachmentInfoAsync(request.AttachmentId, request.SessionId);
            if (attachmentInfo == null) throw new KeyNotFoundException("附件不存在或不属于当前会话");
        }

        var userMessage = await _sessionService.SendMessageAsync(request, attachmentInfo);

        var session = await _sessionService.EnsureSessionAccessibleAsync(request.SessionId);

        // 通过 SSE 推送用户消息给前端
        if (_sseConnectionManager != null)
        {
            try
            {
                var userMessageJson = JsonSerializer.Serialize(new { Type = "chat-response", message = userMessage, sessionId = session.Id });
                var sseMessage = $"event: chat-response\ndata: {userMessageJson}\n\n";
                await _sseConnectionManager.SendToUserAsync(session.CreatedBy, sseMessage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SSE 推送用户消息失败");
            }
        }

        // 如果是给小科的文本消息，触发异步 AI 回复
        if (session.Participants.Contains(AiAssistantConstants.AssistantUserId) &&
            userMessage.Type == ChatMessageType.Text &&
            !_aiService.ShouldSkipAutomaticAssistantReply(userMessage))
        {
            _ = _aiService.RespondAsAssistantAsync(session, userMessage, CancellationToken.None);
        }

        return userMessage;
    }

    public async Task<(ChatMessage userMessage, ChatMessage? assistantMessage)> SendMessageWithStreamingReplyAsync(
        SendChatMessageRequest request,
        Func<string, string, string, Task>? onChunk,
        Func<ChatMessage, Task>? onComplete,
        CancellationToken cancellationToken)
    {
        ChatAttachmentInfo? attachmentInfo = null;
        if (!string.IsNullOrWhiteSpace(request.AttachmentId))
        {
            attachmentInfo = await _attachmentService.GetAttachmentInfoAsync(request.AttachmentId, request.SessionId);
            if (attachmentInfo == null) throw new KeyNotFoundException("附件不存在或不属于当前会话");
        }

        var userMessage = await _sessionService.SendMessageAsync(request, attachmentInfo);

        var session = await _sessionService.EnsureSessionAccessibleAsync(request.SessionId);
        var assistantMessage = await _aiService.GetOrGenerateAssistantReplyStreamAsync(
            session,
            userMessage,
            onChunk,
            onComplete,
            cancellationToken);

        return (userMessage, assistantMessage);
    }

    public Task<ChatAttachmentInfo> UploadAttachmentAsync(string sessionId, IFormFile file)
        => _attachmentService.UploadAttachmentAsync(sessionId, file);

    public Task<ChatAttachmentDownloadResult> DownloadAttachmentAsync(string sessionId, string storageObjectId)
        => _attachmentService.DownloadAttachmentAsync(sessionId, storageObjectId);

    public Task MarkSessionReadAsync(string sessionId, string lastMessageId)
        => _sessionService.MarkSessionReadAsync(sessionId, lastMessageId);

    public Task DeleteMessageAsync(string sessionId, string messageId)
        => _sessionService.DeleteMessageAsync(sessionId, messageId);

    public Task<ChatSession> GetOrCreateDirectSessionAsync(string participantUserId)
        => _sessionService.GetOrCreateDirectSessionAsync(participantUserId);

    public Task<ChatSession?> GetSessionByIdAsync(string sessionId)
        => _sessionService.GetSessionByIdAsync(sessionId);
}