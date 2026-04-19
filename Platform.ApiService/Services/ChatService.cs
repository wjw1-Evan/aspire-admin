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
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天服务实现（外观模式，代理到各个子服务）
/// </summary>
public class ChatService : IChatService
{
    private readonly IChatSessionService _sessionService;
    private readonly IChatAiService _aiService;
    private readonly IChatAttachmentService _attachmentService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IChatSessionService sessionService,
        IChatAiService aiService,
        IChatAttachmentService attachmentService,
        IServiceScopeFactory scopeFactory,
        ILogger<ChatService> logger)
    {
        _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
        _aiService = aiService ?? throw new ArgumentNullException(nameof(aiService));
        _attachmentService = attachmentService ?? throw new ArgumentNullException(nameof(attachmentService));
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
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

// 触发小科异步回复
        if (session.Participants.Contains(AiAssistantConstants.AssistantUserId) && userMessage.Type == ChatMessageType.Text)
        {
            var (sessionId, messageId, companyId, userId) = (session.Id, userMessage.Id, session.CompanyId, userMessage.SenderId);
            _logger.LogInformation("【小科】准备触发异步回复 | 会话={SessionId} | 消息={MessageId}", sessionId, messageId);
            _ = Task.Run(async () =>
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var tenantSetter = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
                tenantSetter.SetContext(companyId, userId);

                var aiService = scope.ServiceProvider.GetRequiredService<IChatAiService>();
                var context = scope.ServiceProvider.GetRequiredService<DbContext>();

                var freshSession = await context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
                if (freshSession == null)
                {
                    _logger.LogError(
                        "【小科】会话加载失败 | SessionId={SessionId} | CompanyId={CompanyId} | UserId={UserId} | 可能原因：租户上下文未正确设置或会话不属于当前企业",
                        sessionId, companyId, userId);
                    return;
                }

                var freshMessage = await context.Set<ChatMessage>().FirstOrDefaultAsync(m => m.Id == messageId);
                if (freshMessage == null)
                {
                    _logger.LogWarning("【小科】消息加载失败 | MessageId={MessageId}", messageId);
                    return;
                }

                _logger.LogInformation("【小科】开始生成回复 | 会话={SessionId}", sessionId);
                await aiService.RespondAsAssistantAsync(freshSession, freshMessage, CancellationToken.None);
            });
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