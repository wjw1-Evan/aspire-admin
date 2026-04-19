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

        // 如果是给小科的文本消息，触发异步 AI 回复
        var isAiParticipant = session.Participants.Contains(AiAssistantConstants.AssistantUserId);
        var isTextMsg = userMessage.Type == ChatMessageType.Text;
        var shouldSkip = _aiService.ShouldSkipAutomaticAssistantReply(userMessage);

        _logger.LogInformation("检查 AI 回复触发条件: 会话={SessionId}, 是助手会话={IsAi}, 是文本={IsText}, 是否跳过={ShouldSkip}", 
            session.Id, isAiParticipant, isTextMsg, shouldSkip);

        if (isAiParticipant && isTextMsg && !shouldSkip)
        {
            var sessionId = session.Id;
            var messageId = userMessage.Id;
            var companyId = userMessage.CompanyId;
            var userId = userMessage.SenderId;

            _logger.LogInformation("准备启动后台 AI 回复任务: 会话={SessionId}, 消息={MessageId}", sessionId, messageId);

            _ = Task.Run(async () =>
            {
                try
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    
                    _logger.LogDebug("后台作用域已创建，正在恢复租户上下文: 企业={CompanyId}, 用户={UserId}", companyId, userId);
                    
                    // 设置后台任务的租户上下文
                    var tenantSetter = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
                    tenantSetter.SetContext(companyId, userId);

var scopedAiService = scope.ServiceProvider.GetRequiredService<IChatAiService>();
                    var context = scope.ServiceProvider.GetRequiredService<DbContext>();

                    _logger.LogDebug("正在重新加载会话 {SessionId}...", sessionId);
                    var freshSession = await context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId && x.CompanyId == companyId);
                    if (freshSession == null)
                    {
                        _logger.LogWarning("后台任务无法加载会话 {SessionId}，可能已删除。", sessionId);
                        return;
                    }

                    var freshMessage = await context.Set<ChatMessage>().FirstOrDefaultAsync(m => m.Id == messageId);
                    if (freshMessage != null)
                    {
                        _logger.LogInformation("正在调用 AI 服务生成回复: 会话={SessionId}", sessionId);
                        await scopedAiService.RespondAsAssistantAsync(freshSession, freshMessage, CancellationToken.None);
                    }
                    else
                    {
                        _logger.LogWarning("后台任务无法加载原始消息 {MessageId}", messageId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "AI 自动回复过程发生未捕获异常: 会话 {SessionId}", sessionId);
                }
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