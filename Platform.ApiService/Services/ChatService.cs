using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Constants;
using Platform.ApiService.Hubs;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.ClientModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ChatMessage = Platform.ApiService.Models.ChatMessage;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace Platform.ApiService.Services;

/// <summary>
/// 聊天服务实现
/// </summary>
public class ChatService : IChatService
{
    private const int MaxPageSize = 200;
    private const int AssistantContextMessageLimit = 24;

    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IDatabaseOperationFactory<ChatMessage> _messageFactory;
    private readonly IDatabaseOperationFactory<ChatAttachment> _attachmentFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly ILogger<ChatService> _logger;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly GridFSBucket _gridFsBucket;
    private readonly IAiAssistantCoordinator _aiAssistantCoordinator;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;


    /// <summary>
    /// 初始化聊天服务。
    /// </summary>
    /// <param name="dependencies">聊天服务所需的依赖项聚合。</param>
    /// <param name="logger">日志记录器</param>
    public ChatService(ChatServiceDependencies dependencies, ILogger<ChatService> logger)
    {
        ArgumentNullException.ThrowIfNull(dependencies);

        _sessionFactory = dependencies.SessionFactory;
        _messageFactory = dependencies.MessageFactory;
        _attachmentFactory = dependencies.AttachmentFactory;
        _hubContext = dependencies.HubContext;
        _userFactory = dependencies.UserFactory;
        _aiAssistantCoordinator = dependencies.AiAssistantCoordinator;
        _gridFsBucket = dependencies.GridFsBucket;
        _openAiClient = dependencies.OpenAiClient;
        _aiOptions = dependencies.AiOptions.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<(List<ChatSession> sessions, long total)> GetSessionsAsync(ChatSessionListRequest request)
    {
        await _aiAssistantCoordinator.EnsureAssistantSessionForCurrentUserAsync();

        request ??= new ChatSessionListRequest();

        var currentUserId = _sessionFactory.GetRequiredUserId();

        var filterBuilder = _sessionFactory.CreateFilterBuilder()
            .Custom(Builders<ChatSession>.Filter.AnyEq(session => session.Participants, currentUserId));

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            filterBuilder = filterBuilder.Custom(
                Builders<ChatSession>.Filter.Regex("topicTags", new MongoDB.Bson.BsonRegularExpression(request.Keyword, "i")));
        }

        var filter = filterBuilder.Build();

        var sort = _sessionFactory.CreateSortBuilder()
            .Descending(session => session.UpdatedAt)
            .Build();

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Min(Math.Max(request.PageSize, 1), MaxPageSize);

        var (sessions, total) = await _sessionFactory.FindPagedAsync(filter, sort, page, pageSize);
        await EnrichParticipantMetadataAsync(sessions);
        return (sessions, total);
    }

    /// <inheritdoc />
    public async Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(sessionId));
        }

        request ??= new ChatMessageListRequest();

        if (!ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }

        // 确保会话存在且当前用户有权限
        var session = await EnsureSessionAccessibleAsync(sessionId);

        var filterBuilder = _messageFactory.CreateFilterBuilder()
            .Equal(message => message.SessionId, session.Id);

        DateTime? cursorCreatedAt = null;
        if (!string.IsNullOrWhiteSpace(request.Cursor))
        {
            var cursorMessage = await _messageFactory.GetByIdAsync(request.Cursor);
            if (cursorMessage == null || cursorMessage.SessionId != session.Id)
            {
                throw new KeyNotFoundException("游标消息不存在或不属于当前会话");
            }

            cursorCreatedAt = cursorMessage.CreatedAt;
            filterBuilder = filterBuilder.LessThan(message => message.CreatedAt, cursorMessage.CreatedAt);
        }

        var filter = filterBuilder.Build();

        var sort = _messageFactory.CreateSortBuilder()
            .Descending(message => message.CreatedAt)
            .Build();

        var limit = Math.Min(Math.Max(request.Limit, 1), MaxPageSize);

        var messages = await _messageFactory.FindAsync(filter, sort, limit + 1);

        var hasMore = messages.Count > limit;
        if (hasMore)
        {
            messages = messages.Take(limit).ToList();
        }

        var nextCursor = hasMore ? messages.LastOrDefault()?.Id : null;

        // 将结果按时间正序返回给调用者
        messages.Reverse();

        // 如果获取的是最新消息（没有cursor），自动标记为已读
        if (string.IsNullOrWhiteSpace(request.Cursor) && messages.Count > 0)
        {
            try
            {
                var lastMessage = messages[^1]; // 最后一条消息（最新的）
                var currentUserId = _sessionFactory.GetRequiredUserId();
                
                // 检查会话的未读数量，如果已经有未读数，才标记为已读
                var unreadCounts = session.UnreadCounts ?? new Dictionary<string, int>();
                var currentUnreadCount = unreadCounts.GetValueOrDefault(currentUserId, 0);
                
                // 只有当有未读消息时才标记为已读（避免不必要的更新）
                if (currentUnreadCount > 0)
                {
                    await MarkSessionReadAsync(sessionId, lastMessage.Id);
                }
            }
            catch (Exception ex)
            {
                // 标记已读失败不影响获取消息，只记录日志
                _logger.LogWarning(ex, "自动标记会话已读失败: 会话 {SessionId}", sessionId);
            }
        }

        return (messages, hasMore, nextCursor);
    }

    /// <inheritdoc />
    public async Task<ChatMessage> SendMessageAsync(SendChatMessageRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(request.SessionId));
        }

        if (!ObjectId.TryParse(request.SessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(request.SessionId));
        }

        var currentUserId = _messageFactory.GetRequiredUserId();
        var session = await EnsureSessionAccessibleAsync(request.SessionId);

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        if (request.Type == ChatMessageType.Text && string.IsNullOrWhiteSpace(request.Content))
        {
            throw new ArgumentException("文本消息内容不能为空", nameof(request.Content));
        }

        ChatAttachment? attachment = null;
        if (!string.IsNullOrWhiteSpace(request.AttachmentId))
        {
            attachment = await _attachmentFactory.GetByIdAsync(request.AttachmentId);
            if (attachment == null || attachment.SessionId != session.Id)
            {
                throw new KeyNotFoundException("附件不存在或不属于当前会话");
            }
        }

        var sender = await _userFactory.GetByIdAsync(currentUserId);

        var attachmentInfo = attachment == null
            ? null
            : new ChatAttachmentInfo
            {
                Id = attachment.Id,
                Name = attachment.Name,
                Size = attachment.Size,
                MimeType = attachment.MimeType,
                Url = attachment.DownloadUrl,
                ThumbnailUrl = attachment.ThumbnailUrl,
                UploadedAt = attachment.CreatedAt
            };

        var metadata = NormalizeMetadata(request.Metadata);

        if (request.AssistantStreaming)
        {
            metadata["assistantStreaming"] = true;
        }

        if (!string.IsNullOrWhiteSpace(request.ClientMessageId))
        {
            metadata["clientMessageId"] = request.ClientMessageId!;
        }

        var message = new ChatMessage
        {
            SessionId = session.Id,
            CompanyId = session.CompanyId,
            SenderId = currentUserId,
            SenderName = sender?.Username,
            RecipientId = request.RecipientId,
            Type = request.Type,
            Content = request.Content,
            Attachment = attachmentInfo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Metadata = metadata,
            ClientMessageId = request.ClientMessageId
        };

        if (!string.IsNullOrWhiteSpace(request.RecipientId) && !session.Participants.Contains(request.RecipientId))
        {
            throw new InvalidOperationException("接收方不属于该会话");
        }

        message = await _messageFactory.CreateAsync(message);

        if (attachment != null)
        {
            var attachmentUpdate = _attachmentFactory.CreateUpdateBuilder()
                .Set(a => a.MessageId, message.Id)
                .SetCurrentTimestamp();

            var attachmentFilter = _attachmentFactory.CreateFilterBuilder()
                .Equal(a => a.Id, attachment.Id)
                .Build();

            await _attachmentFactory.FindOneAndUpdateAsync(attachmentFilter, attachmentUpdate.Build());
        }

        await UpdateSessionAfterMessageAsync(session, message, currentUserId);

        await NotifyMessageCreatedAsync(session, message);

        await RespondAsAssistantAsync(session, message);

        return message;
    }

    /// <inheritdoc />
    public async Task<ChatAttachmentInfo> UploadAttachmentAsync(string sessionId, IFormFile file)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(sessionId));
        }

        if (!ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }

        ArgumentNullException.ThrowIfNull(file);

        if (file.Length <= 0)
        {
            throw new ArgumentException("附件内容为空", nameof(file));
        }

        var session = await EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _attachmentFactory.GetRequiredUserId();

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        string checksum;
        using (var sha256 = SHA256.Create())
        {
            checksum = Convert.ToHexString(sha256.ComputeHash(memoryStream));
        }

        memoryStream.Position = 0;

        var fileName = string.IsNullOrWhiteSpace(file.FileName)
            ? $"attachment-{Guid.NewGuid():N}"
            : file.FileName;

        var gridFsId = await _gridFsBucket.UploadFromStreamAsync(
            fileName,
            memoryStream,
            new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "sessionId", session.Id },
                    { "uploaderId", currentUserId },
                    { "mimeType", file.ContentType ?? "application/octet-stream" },
                    { "size", file.Length },
                    { "checksum", checksum }
                }
            });

        var attachment = new ChatAttachment
        {
            SessionId = session.Id,
            UploaderId = currentUserId,
            Name = fileName,
            Size = file.Length,
            MimeType = file.ContentType ?? "application/octet-stream",
            StorageObjectId = gridFsId.ToString(),
            DownloadUrl = $"/api/chat/messages/{session.Id}/attachments/{gridFsId}",
            Checksum = checksum,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        attachment = await _attachmentFactory.CreateAsync(attachment);

        return new ChatAttachmentInfo
        {
            Id = attachment.Id,
            Name = attachment.Name,
            Size = attachment.Size,
            MimeType = attachment.MimeType,
            Url = attachment.DownloadUrl,
            ThumbnailUrl = attachment.ThumbnailUrl,
            UploadedAt = attachment.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task<ChatAttachmentDownloadResult> DownloadAttachmentAsync(string sessionId, string storageObjectId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(sessionId));
        }

        if (string.IsNullOrWhiteSpace(storageObjectId))
        {
            throw new ArgumentException("附件标识不能为空", nameof(storageObjectId));
        }

        if (!ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }

        if (!ObjectId.TryParse(storageObjectId, out var gridFsId))
        {
            throw new ArgumentException("附件标识格式不正确", nameof(storageObjectId));
        }

        var session = await EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _attachmentFactory.GetRequiredUserId();

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        var filter = _attachmentFactory.CreateFilterBuilder()
            .Equal(attachment => attachment.SessionId, session.Id)
            .Equal(attachment => attachment.StorageObjectId, storageObjectId)
            .Build();

        var attachments = await _attachmentFactory.FindAsync(filter, null, 1);
        var attachment = attachments.FirstOrDefault();
        if (attachment == null)
        {
            throw new KeyNotFoundException("附件不存在或不属于当前会话");
        }

        try
        {
            var downloadStream = await _gridFsBucket.OpenDownloadStreamAsync(gridFsId);
            if (downloadStream.CanSeek)
            {
                downloadStream.Seek(0, SeekOrigin.Begin);
            }

            return new ChatAttachmentDownloadResult
            {
                Content = downloadStream,
                FileName = attachment.Name,
                ContentType = string.IsNullOrWhiteSpace(attachment.MimeType)
                    ? "application/octet-stream"
                    : attachment.MimeType,
                ContentLength = downloadStream.FileInfo.Length
            };
        }
        catch (GridFSFileNotFoundException)
        {
            throw new KeyNotFoundException("附件内容不存在或已被删除");
        }
    }

    /// <inheritdoc />
    public async Task MarkSessionReadAsync(string sessionId, string lastMessageId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(sessionId));
        }

        if (!ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }

        if (string.IsNullOrWhiteSpace(lastMessageId) || !ObjectId.TryParse(lastMessageId, out _))
        {
            throw new ArgumentException("消息标识格式不正确", nameof(lastMessageId));
        }

        var session = await EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _sessionFactory.GetRequiredUserId();

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        var message = await _messageFactory.GetByIdAsync(lastMessageId);
        if (message == null || message.SessionId != session.Id)
        {
            throw new KeyNotFoundException("消息不存在或不属于当前会话");
        }

        var unreadCounts = session.UnreadCounts ?? new Dictionary<string, int>();
        unreadCounts[currentUserId] = 0;

        var update = _sessionFactory.CreateUpdateBuilder()
            .Set(session => session.UnreadCounts, unreadCounts)
            .SetCurrentTimestamp();

        var filter = _sessionFactory.CreateFilterBuilder()
            .Equal(s => s.Id, session.Id)
            .Build();

        await _sessionFactory.FindOneAndUpdateAsync(filter, update.Build());

        await NotifySessionReadAsync(session.Id, currentUserId, message.Id);
        await NotifySessionSummaryAsync(session.Id);
    }

    /// <inheritdoc />
    public async Task DeleteMessageAsync(string sessionId, string messageId)
    {
        if (string.IsNullOrWhiteSpace(sessionId) || !ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }

        if (string.IsNullOrWhiteSpace(messageId) || !ObjectId.TryParse(messageId, out _))
        {
            throw new ArgumentException("消息标识格式不正确", nameof(messageId));
        }

        var session = await EnsureSessionAccessibleAsync(sessionId);
        var message = await _messageFactory.GetByIdAsync(messageId);

        if (message == null || message.SessionId != session.Id)
        {
            throw new KeyNotFoundException("消息不存在或不属于当前会话");
        }

        var currentUserId = _messageFactory.GetRequiredUserId();
        if (message.SenderId != currentUserId)
        {
            throw new UnauthorizedAccessException("只能删除自己发送的消息");
        }

        var filter = _messageFactory.CreateFilterBuilder()
            .Equal(m => m.Id, message.Id)
            .Build();

        var update = _messageFactory.CreateUpdateBuilder()
            .Set(m => m.IsRecalled, true)
            .SetCurrentTimestamp();

        await _messageFactory.FindOneAndUpdateAsync(filter, update.Build());

        await _messageFactory.FindOneAndSoftDeleteAsync(filter);

        await NotifyMessageDeletedAsync(session.Id, message.Id);
    }

    /// <inheritdoc />
    public async Task<ChatSession> GetOrCreateDirectSessionAsync(string participantUserId)
    {
        if (string.IsNullOrWhiteSpace(participantUserId))
        {
            throw new ArgumentException("参与者标识不能为空", nameof(participantUserId));
        }

        if (!ObjectId.TryParse(participantUserId, out _))
        {
            throw new ArgumentException("参与者标识格式不正确", nameof(participantUserId));
        }

        var currentUserId = _sessionFactory.GetRequiredUserId();
        if (currentUserId == participantUserId)
        {
            throw new InvalidOperationException("无法与自己创建会话");
        }

        var companyId = _sessionFactory.GetRequiredCompanyId();

        var participants = new[] { currentUserId, participantUserId };

        var existingFilter = Builders<ChatSession>.Filter.And(
            Builders<ChatSession>.Filter.Eq(s => s.CompanyId, companyId),
            Builders<ChatSession>.Filter.Size(s => s.Participants, 2),
            Builders<ChatSession>.Filter.All(s => s.Participants, participants));

        var existingSessions = await _sessionFactory.FindAsync(existingFilter, limit: 1);
        var existing = existingSessions.FirstOrDefault();
        if (existing != null)
        {
            return existing;
        }

        var participantUsers = await _userFactory.FindAsync(
            _userFactory.CreateFilterBuilder()
                .In(u => u.Id, participants)
                .Build());

        var participantNames = participants.ToDictionary(
            id => id,
            id =>
            {
                var user = participantUsers.FirstOrDefault(u => u.Id == id);
                return user?.Name ?? user?.Username ?? id;
            });

        var participantAvatars = participants
            .Select(id =>
            {
                var user = participantUsers.FirstOrDefault(u => u.Id == id);
                var avatarUrl = user?.Avatar;
                return (id, avatarUrl);
            })
            .Where(tuple => !string.IsNullOrWhiteSpace(tuple.avatarUrl))
            .ToDictionary(tuple => tuple.id, tuple => tuple.avatarUrl!);

        var unreadCounts = participants.ToDictionary(id => id, _ => 0);

        var session = new ChatSession
        {
            CompanyId = companyId,
            Participants = participants.ToList(),
            ParticipantNames = participantNames,
            ParticipantAvatars = participantAvatars,
            UnreadCounts = unreadCounts,
            TopicTags = new List<string> { "direct" }
        };

        session = await _sessionFactory.CreateAsync(session);

        _logger.LogInformation("创建新的私聊会话 {SessionId}，参与者：{Participants}", session.Id, string.Join(",", participants));

        return session;
    }

    private async Task<ChatSession> EnsureSessionAccessibleAsync(string sessionId)
    {
        var session = await _sessionFactory.GetByIdAsync(sessionId);
        if (session == null)
        {
            throw new KeyNotFoundException("会话不存在");
        }

        var currentUserId = _sessionFactory.GetRequiredUserId();
        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        return session;
    }

    private async Task UpdateSessionAfterMessageAsync(ChatSession session, ChatMessage message, string senderId)
    {
        var unreadCounts = session.UnreadCounts ?? new Dictionary<string, int>();
        foreach (var participant in session.Participants)
        {
            if (participant == senderId)
            {
                unreadCounts[participant] = 0;
            }
            else
            {
                unreadCounts.TryGetValue(participant, out var currentCount);
                unreadCounts[participant] = currentCount + 1;
            }
        }

        var excerpt = message.Type switch
        {
            ChatMessageType.Text => string.IsNullOrWhiteSpace(message.Content) ? "[文本]" : message.Content,
            ChatMessageType.Image => "[图片]",
            ChatMessageType.File => message.Attachment?.Name ?? "[文件]",
            ChatMessageType.System => string.IsNullOrWhiteSpace(message.Content) ? "[系统消息]" : message.Content,
            _ => "[消息]"
        };

        var update = _sessionFactory.CreateUpdateBuilder()
            .Set(s => s.LastMessageId, message.Id)
            .Set(s => s.LastMessageExcerpt, excerpt.Length > 120 ? excerpt[..120] : excerpt)
            .Set(s => s.LastMessageAt, message.CreatedAt)
            .Set(s => s.UnreadCounts, unreadCounts)
            .SetCurrentTimestamp();

        var filter = _sessionFactory.CreateFilterBuilder()
            .Equal(s => s.Id, session.Id)
            .Build();

        await _sessionFactory.FindOneAndUpdateAsync(filter, update.Build());
    }

    private async Task NotifyMessageCreatedAsync(ChatSession session, ChatMessage message)
    {
        try
        {
            var payload = new ChatMessageRealtimePayload
            {
                SessionId = session.Id,
                Message = message
            };

            await _hubContext.Clients.Group(ChatHub.GetSessionGroupName(session.Id))
                .SendAsync(ChatHub.ReceiveMessageEvent, payload);

            await NotifySessionSummaryAsync(session.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "广播聊天消息失败: {MessageId} 会话: {SessionId}", message.Id, session.Id);
        }
    }

    private async Task NotifySessionReadAsync(string sessionId, string userId, string lastMessageId)
    {
        try
        {
            var payload = new ChatSessionReadPayload
            {
                SessionId = sessionId,
                UserId = userId,
                LastMessageId = lastMessageId,
                ReadAtUtc = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(ChatHub.GetSessionGroupName(sessionId))
                .SendAsync(ChatHub.SessionReadEvent, payload);

            await _hubContext.Clients.Group(ChatHub.GetUserGroupName(userId))
                .SendAsync(ChatHub.SessionReadEvent, payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "广播会话已读状态失败: 会话 {SessionId} 用户 {UserId}", sessionId, userId);
        }
    }

    private async Task NotifyMessageDeletedAsync(string sessionId, string messageId)
    {
        try
        {
            var payload = new ChatMessageDeletedPayload
            {
                SessionId = sessionId,
                MessageId = messageId,
                DeletedAtUtc = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(ChatHub.GetSessionGroupName(sessionId))
                .SendAsync(ChatHub.MessageDeletedEvent, payload);

            await NotifySessionSummaryAsync(sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "广播消息删除失败: 会话 {SessionId} 消息 {MessageId}", sessionId, messageId);
        }
    }

    private async Task NotifySessionSummaryAsync(string sessionId)
    {
        try
        {
            var latestSession = await _sessionFactory.GetByIdAsync(sessionId);
            if (latestSession == null)
            {
                return;
            }

            var payload = new ChatSessionRealtimePayload
            {
                Session = latestSession
            };

            var participantGroups = latestSession.Participants
                .Where(participant => !string.IsNullOrWhiteSpace(participant))
                .Select(ChatHub.GetUserGroupName)
                .Distinct()
                .ToArray();

            if (participantGroups.Length == 0)
            {
                return;
            }

            await _hubContext.Clients.Groups(participantGroups)
                .SendAsync(ChatHub.SessionUpdatedEvent, payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "广播会话摘要失败: {SessionId}", sessionId);
        }
    }

    private async Task RespondAsAssistantAsync(ChatSession session, ChatMessage triggerMessage)
    {
        if (!session.Participants.Contains(AiAssistantConstants.AssistantUserId))
        {
            return;
        }

        if (triggerMessage.SenderId == AiAssistantConstants.AssistantUserId)
        {
            return;
        }

        if (ShouldSkipAutomaticAssistantReply(triggerMessage))
        {
            return;
        }

        string replyContent;
        if (triggerMessage.Type == ChatMessageType.Text)
        {
            var generated = await GenerateAssistantReplyAsync(session, triggerMessage, null);

            if (string.IsNullOrWhiteSpace(generated))
            {
                return;
            }

            replyContent = generated.Trim();
        }
        else
        {
            replyContent = "我已收到您的附件，目前仅支持文本对话，欢迎告诉我想要讨论的内容。";
        }

        if (string.IsNullOrWhiteSpace(replyContent))
        {
            return;
        }

        await CreateAssistantMessageAsync(
            session,
            replyContent,
            triggerMessage.SenderId,
            clientMessageId: null,
            CancellationToken.None);
    }

    private static bool ShouldSkipAutomaticAssistantReply(ChatMessage triggerMessage)
    {
        if (triggerMessage.Metadata == null)
        {
            return false;
        }

        if (!triggerMessage.Metadata.TryGetValue("assistantStreaming", out var value))
        {
            return false;
        }

        return value switch
        {
            bool boolValue => boolValue,
            JsonElement json when json.ValueKind == JsonValueKind.True => true,
            _ => false
        };
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<AssistantReplyStreamChunk> StreamAssistantReplyAsync(
        AssistantReplyStreamRequest request,
        string currentUserId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            throw new ArgumentException("会话标识不能为空", nameof(request.SessionId));
        }

        if (string.IsNullOrWhiteSpace(request.ClientMessageId))
        {
            throw new ArgumentException("客户端消息标识不能为空", nameof(request.ClientMessageId));
        }

        ChatSession? session = null;
        AssistantReplyStreamChunk? errorChunk = null;
        try
        {
            session = await EnsureSessionAccessibleAsync(request.SessionId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "校验助手回复请求会话失败：{SessionId}", request.SessionId);
            errorChunk = new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "无法访问指定的会话，请稍后重试。"
            };
        }

        if (errorChunk != null)
        {
            yield return errorChunk;
            yield break;
        }


        if (session == null || !session.Participants.Contains(AiAssistantConstants.AssistantUserId))
        {
            yield return new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "该会话未启用小科助手。"
            };
            yield break;
        }

        var resolvedSession = session;
        if (resolvedSession == null)
        {
            yield return new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "会话信息缺失，请稍后重试。"
            };
            yield break;
        }

        ChatMessage? triggerMessage = null;
        errorChunk = null;
        try
        {
            triggerMessage = await ResolveTriggerMessageAsync(session, request, currentUserId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "解析助手触发消息失败：{SessionId}", request.SessionId);
            errorChunk = new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = ex is UnauthorizedAccessException
                    ? "仅允许对自己发送的消息请求小科回复。"
                    : "未能定位触发消息，请稍后重试。"
            };
        }

        if (errorChunk != null)
        {
            yield return errorChunk;
            yield break;
        }

        if (triggerMessage == null)
        {
            yield return new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "未找到触发消息，请稍后重试。"
            };
            yield break;
        }

        string replyContent;
        if (triggerMessage.Type == ChatMessageType.Text)
        {
            replyContent = await GenerateAssistantReplyAsync(
                resolvedSession,
                triggerMessage,
                request.Locale,
                cancellationToken) ?? string.Empty;
        }
        else
        {
            replyContent = "我已收到您的附件，目前仅支持文本对话，欢迎告诉我想要讨论的内容。";
        }

        if (string.IsNullOrWhiteSpace(replyContent))
        {
            yield return new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "小科暂时没有合适的回复，请稍后再试。"
            };
            yield break;
        }

        var trimmedReply = replyContent.Trim();
        var aggregated = new StringBuilder();

        foreach (var segment in ChunkAssistantReply(trimmedReply))
        {
            cancellationToken.ThrowIfCancellationRequested();

            aggregated.Append(segment);
            yield return new AssistantReplyStreamChunk
            {
                Type = "delta",
                Text = segment,
                Timestamp = DateTime.UtcNow
            };

            try
            {
                await Task.Delay(TimeSpan.FromMilliseconds(35), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
        }

        var finalContent = aggregated.ToString().Trim();

        ChatMessage? assistantMessage = null;
        errorChunk = null;
        try
        {
            assistantMessage = await CreateAssistantMessageAsync(
                resolvedSession,
                finalContent,
                triggerMessage.SenderId,
                request.ClientMessageId,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "持久化助手回复失败：Session={SessionId}, Trigger={TriggerMessageId}",
                session.Id,
                triggerMessage.Id);

            errorChunk = new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "助手回复保存失败，请稍后重试。"
            };
        }

        if (errorChunk != null)
        {
            yield return errorChunk;
            yield break;
        }

        if (assistantMessage == null)
        {
            yield return new AssistantReplyStreamChunk
            {
                Type = "error",
                Error = "助手回复生成失败，请稍后重试。"
            };
            yield break;
        }

        yield return new AssistantReplyStreamChunk
        {
            Type = "complete",
            Message = assistantMessage,
            Timestamp = DateTime.UtcNow
        };
    }

    private async Task<ChatMessage?> ResolveTriggerMessageAsync(
        ChatSession session,
        AssistantReplyStreamRequest request,
        string currentUserId)
    {
        ChatMessage? triggerMessage = null;

        if (!string.IsNullOrWhiteSpace(request.TriggerMessageId))
        {
            triggerMessage = await _messageFactory.GetByIdAsync(request.TriggerMessageId);
        }

        if (triggerMessage == null && !string.IsNullOrWhiteSpace(request.TriggerClientMessageId))
        {
            var filter = _messageFactory.CreateFilterBuilder()
                .Equal(message => message.SessionId, session.Id)
                .Equal(message => message.ClientMessageId, request.TriggerClientMessageId!)
                .Build();

            var matches = await _messageFactory.FindAsync(filter, limit: 1);
            triggerMessage = matches.FirstOrDefault();
        }

        if (triggerMessage == null)
        {
            return null;
        }

        if (!string.Equals(triggerMessage.SessionId, session.Id, StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("消息不属于当前会话。");
        }

        if (!string.Equals(triggerMessage.SenderId, currentUserId, StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("仅允许对自己发送的消息请求小科回复。");
        }

        return triggerMessage;
    }

    private async Task<ChatMessage> CreateAssistantMessageAsync(
        ChatSession session,
        string content,
        string recipientUserId,
        string? clientMessageId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var assistantMessage = new ChatMessage
        {
            SessionId = session.Id,
            CompanyId = session.CompanyId,
            SenderId = AiAssistantConstants.AssistantUserId,
            SenderName = AiAssistantConstants.AssistantDisplayName,
            RecipientId = recipientUserId,
            Type = ChatMessageType.Text,
            Content = content,
            Metadata = new Dictionary<string, object>
            {
                ["isAssistant"] = true
            },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ClientMessageId = clientMessageId
        };

        if (!string.IsNullOrWhiteSpace(clientMessageId))
        {
            assistantMessage.Metadata["clientMessageId"] = clientMessageId!;
        }

        assistantMessage = await _messageFactory.CreateAsync(assistantMessage);

        var refreshedSession = await _sessionFactory.GetByIdAsync(session.Id) ?? session;
        await UpdateSessionAfterMessageAsync(refreshedSession, assistantMessage, AiAssistantConstants.AssistantUserId);
        await NotifyMessageCreatedAsync(refreshedSession, assistantMessage);

        return assistantMessage;
    }

    private static IEnumerable<string> ChunkAssistantReply(string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            yield break;
        }

        var buffer = new StringBuilder();
        const int minChunkLength = 12;
        const int maxChunkLength = 48;

        foreach (var ch in content)
        {
            buffer.Append(ch);

            if (buffer.Length >= maxChunkLength ||
                (buffer.Length >= minChunkLength && IsSentenceBoundary(ch)))
            {
                yield return buffer.ToString();
                buffer.Clear();
            }
        }

        if (buffer.Length > 0)
        {
            yield return buffer.ToString();
        }
    }

    private static bool IsSentenceBoundary(char ch)
    {
        return ch is '。' or '！' or '？' or '!' or '?' or '.' or '；' or ';' or '…' or '\n' or '\r';
    }

    private async Task<string?> GenerateAssistantReplyAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        string? locale,
        CancellationToken cancellationToken = default)
    {
        var model = string.IsNullOrWhiteSpace(_aiOptions.Model)
            ? "gpt-4o-mini"
            : _aiOptions.Model;

        ChatClient chatClient;
        try
        {
            chatClient = _openAiClient.GetChatClient(model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "初始化 OpenAI ChatClient 失败，模型：{Model}", model);
            return null;
        }

        var effectiveLocale = string.IsNullOrWhiteSpace(locale) ? "zh-CN" : locale!;

        var systemPrompt = string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt)
            ? "你是小科，请使用简体中文提供简洁、专业且友好的回复。"
            : _aiOptions.SystemPrompt;

        var conversationMessages = await BuildAssistantConversationMessagesAsync(
            session,
            triggerMessage,
            cancellationToken);

        if (conversationMessages.Count == 0)
        {
            return null;
        }

        var instructionBuilder = new StringBuilder();
        instructionBuilder.AppendLine(systemPrompt.Trim());
        instructionBuilder.AppendLine($"当前用户语言标识：{effectiveLocale}");
        instructionBuilder.Append("请结合完整的历史聊天记录，使用自然、真诚且有温度的语气回复对方。");

        var messages = new List<OpenAIChatMessage>
        {
            new SystemChatMessage(instructionBuilder.ToString())
        };
        messages.AddRange(conversationMessages);

        var completionOptions = new ChatCompletionOptions
        {
            EndUserId = triggerMessage.SenderId
        };

        if (_aiOptions.MaxTokens > 0)
        {
            completionOptions.MaxOutputTokenCount = _aiOptions.MaxTokens;
        }

        try
        {
            var completionResult = await chatClient.CompleteChatAsync(messages, completionOptions);
            var completion = completionResult.Value;
            if (completion == null || completion.Content == null || completion.Content.Count == 0)
            {
                return null;
            }

            foreach (var part in completion.Content)
            {
                if (part.Kind == ChatMessageContentPartKind.Text && !string.IsNullOrWhiteSpace(part.Text))
                {
                    return part.Text.Trim();
                }
            }

            return completion.Content[0].Text?.Trim();
        }
        catch (ClientResultException ex)
        {
            _logger.LogWarning(
                ex,
                "OpenAI Chat 完成请求失败，模型：{Model}，会话：{SessionId}",
                model,
                session.Id);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "调用 OpenAI Chat 完成接口时发生未预期的异常，模型：{Model}，会话：{SessionId}",
                model,
                session.Id);
            return null;
        }
    }

    private async Task<List<OpenAIChatMessage>> BuildAssistantConversationMessagesAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        CancellationToken cancellationToken)
    {
        var conversation = new List<OpenAIChatMessage>();

        try
        {
            var filter = _messageFactory.CreateFilterBuilder()
                .Equal(message => message.SessionId, session.Id)
                .Build();

            var sort = _messageFactory.CreateSortBuilder()
                .Descending(message => message.CreatedAt)
                .Build();

            var history = await _messageFactory.FindAsync(filter, sort, AssistantContextMessageLimit);
            history.Reverse();

            foreach (var message in history)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (message.IsDeleted || message.IsRecalled)
                {
                    continue;
                }

                var normalized = NormalizeAssistantMessageContent(message);
                if (string.IsNullOrWhiteSpace(normalized))
                {
                    continue;
                }

                if (string.Equals(message.SenderId, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal))
                {
                    conversation.Add(new AssistantChatMessage(normalized));
                    continue;
                }

                var content = normalized;
                if (!string.Equals(message.SenderId, triggerMessage.SenderId, StringComparison.Ordinal))
                {
                    var displayName = GetParticipantDisplayName(session, message);
                    content = $"{displayName}：{normalized}";
                }

                conversation.Add(new UserChatMessage(content));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "构建会话 {SessionId} 的助手上下文失败", session.Id);
        }

        if (conversation.Count == 0)
        {
            var fallbackContent = NormalizeAssistantMessageContent(triggerMessage);
            if (!string.IsNullOrWhiteSpace(fallbackContent))
            {
                conversation.Add(new UserChatMessage(fallbackContent));
            }
        }

        return conversation;
    }

    private static string GetParticipantDisplayName(ChatSession session, ChatMessage message)
    {
        if (string.Equals(message.SenderId, AiAssistantConstants.AssistantUserId, StringComparison.Ordinal))
        {
            return AiAssistantConstants.AssistantDisplayName;
        }

        if (session.ParticipantNames != null &&
            session.ParticipantNames.TryGetValue(message.SenderId, out var namedParticipant) &&
            !string.IsNullOrWhiteSpace(namedParticipant))
        {
            return namedParticipant;
        }

        if (!string.IsNullOrWhiteSpace(message.SenderName))
        {
            return message.SenderName;
        }

        return "对方";
    }

    private static string? NormalizeAssistantMessageContent(ChatMessage message)
    {
        var text = message.Content?.Trim();
        if (!string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        if (message.Attachment != null)
        {
            var mimeType = message.Attachment.MimeType ?? string.Empty;
            if (mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return "[图片]";
            }

            if (!string.IsNullOrWhiteSpace(message.Attachment.Name))
            {
                return $"[附件: {message.Attachment.Name}]";
            }

            return "[附件]";
        }

        return null;
    }

    private static Dictionary<string, object> NormalizeMetadata(Dictionary<string, object>? metadata)
    {
        if (metadata == null || metadata.Count == 0)
        {
            return new Dictionary<string, object>();
        }

        var normalized = new Dictionary<string, object>();
        foreach (var kvp in metadata)
        {
            var value = NormalizeMetadataValue(kvp.Value);
            if (value is null)
            {
                continue;
            }

            normalized[kvp.Key] = value;
        }

        return normalized;
    }

    private static object? NormalizeMetadataValue(object? value)
    {
        if (value is JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.String:
                    return element.GetString() ?? string.Empty;
                case JsonValueKind.Number:
                    if (element.TryGetInt64(out var longValue))
                    {
                        return longValue;
                    }

                    if (element.TryGetDouble(out var doubleValue))
                    {
                        return doubleValue;
                    }

                    return element.GetDouble();
                case JsonValueKind.True:
                    return true;
                case JsonValueKind.False:
                    return false;
                case JsonValueKind.Array:
                {
                    var list = new List<object>();
                    foreach (var item in element.EnumerateArray())
                    {
                        var normalizedItem = NormalizeMetadataValue(item);
                        if (normalizedItem is not null)
                        {
                            list.Add(normalizedItem);
                        }
                    }

                    return list;
                }
                case JsonValueKind.Object:
                {
                    var dictionary = new Dictionary<string, object>();
                    foreach (var property in element.EnumerateObject())
                    {
                        var normalizedProperty = NormalizeMetadataValue(property.Value);
                        if (normalizedProperty is not null)
                        {
                            dictionary[property.Name] = normalizedProperty;
                        }
                    }

                    return dictionary;
                }
                case JsonValueKind.Null:
                case JsonValueKind.Undefined:
                    return null;
            }
        }

        return value;
    }

    private async Task EnrichParticipantMetadataAsync(IReadOnlyCollection<ChatSession> sessions)
    {
        if (sessions.Count == 0)
        {
            return;
        }

        var participantIds = sessions
            .SelectMany(session => session.Participants ?? Enumerable.Empty<string>())
            .Where(id => !string.IsNullOrWhiteSpace(id) && id != AiAssistantConstants.AssistantUserId)
            .Distinct()
            .ToList();

        Dictionary<string, AppUser> participantMap = new();
        if (participantIds.Count > 0)
        {
            var filter = _userFactory.CreateFilterBuilder()
                .In(user => user.Id, participantIds)
                .Build();

            var users = await _userFactory.FindAsync(filter);
            participantMap = users.ToDictionary(user => user.Id, user => user);
        }

        foreach (var session in sessions)
        {
            if (session.Participants == null || session.Participants.Count == 0)
            {
                continue;
            }

            session.ParticipantAvatars ??= new Dictionary<string, string>();

            foreach (var participantId in session.Participants)
            {
                string? avatarUrl = null;

                if (participantId == AiAssistantConstants.AssistantUserId)
                {
                    avatarUrl = AiAssistantConstants.AssistantAvatarUrl;
                }
                else if (participantMap.TryGetValue(participantId, out var user) && !string.IsNullOrWhiteSpace(user.Avatar))
                {
                    avatarUrl = user.Avatar;
                }

                if (!string.IsNullOrWhiteSpace(avatarUrl))
                {
                    session.ParticipantAvatars[participantId] = avatarUrl;
                }
                else if (session.ParticipantAvatars.ContainsKey(participantId))
                {
                    session.ParticipantAvatars.Remove(participantId);
                }
            }
        }
    }

    /// <summary>
    /// 聊天服务的依赖项聚合。
    /// </summary>
    public sealed class ChatServiceDependencies
    {
        /// <summary>
        /// 初始化 <see cref="ChatServiceDependencies"/> 的新实例。
        /// </summary>
        /// <param name="sessionFactory">会话数据操作工厂。</param>
        /// <param name="messageFactory">消息数据操作工厂。</param>
        /// <param name="attachmentFactory">附件数据操作工厂。</param>
        /// <param name="userFactory">用户数据操作工厂。</param>
        /// <param name="database">MongoDB 数据库实例。</param>
        /// <param name="hubContext">SignalR Hub 上下文。</param>
        /// <param name="aiAssistantCoordinator">AI 助手协调器。</param>
        /// <param name="openAiClient">OpenAI 客户端实例。</param>
        /// <param name="aiOptions">AI 配置项。</param>
        public ChatServiceDependencies(
            IDatabaseOperationFactory<ChatSession> sessionFactory,
            IDatabaseOperationFactory<ChatMessage> messageFactory,
            IDatabaseOperationFactory<ChatAttachment> attachmentFactory,
            IDatabaseOperationFactory<AppUser> userFactory,
            IMongoDatabase database,
            IHubContext<ChatHub> hubContext,
            IAiAssistantCoordinator aiAssistantCoordinator,
            OpenAIClient openAiClient,
            IOptions<AiCompletionOptions> aiOptions)
        {
            SessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
            MessageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
            AttachmentFactory = attachmentFactory ?? throw new ArgumentNullException(nameof(attachmentFactory));
            UserFactory = userFactory ?? throw new ArgumentNullException(nameof(userFactory));
            HubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            AiAssistantCoordinator = aiAssistantCoordinator ?? throw new ArgumentNullException(nameof(aiAssistantCoordinator));
            OpenAiClient = openAiClient ?? throw new ArgumentNullException(nameof(openAiClient));
            AiOptions = aiOptions ?? throw new ArgumentNullException(nameof(aiOptions));

            var mongoDatabase = database ?? throw new ArgumentNullException(nameof(database));
            GridFsBucket = new GridFSBucket(mongoDatabase, new GridFSBucketOptions
            {
                BucketName = "chat_attachments"
            });
        }

        /// <summary>
        /// 获取会话数据操作工厂。
        /// </summary>
        public IDatabaseOperationFactory<ChatSession> SessionFactory { get; }

        /// <summary>
        /// 获取消息数据操作工厂。
        /// </summary>
        public IDatabaseOperationFactory<ChatMessage> MessageFactory { get; }

        /// <summary>
        /// 获取附件数据操作工厂。
        /// </summary>
        public IDatabaseOperationFactory<ChatAttachment> AttachmentFactory { get; }

        /// <summary>
        /// 获取用户数据操作工厂。
        /// </summary>
        public IDatabaseOperationFactory<AppUser> UserFactory { get; }

        /// <summary>
        /// 获取 SignalR Hub 上下文。
        /// </summary>
        public IHubContext<ChatHub> HubContext { get; }

        /// <summary>
        /// 获取 AI 助手协调器。
        /// </summary>
        public IAiAssistantCoordinator AiAssistantCoordinator { get; }

        /// <summary>
        /// 获取 AI 生成回复服务。
        /// </summary>
        public OpenAIClient OpenAiClient { get; }

        /// <summary>
        /// 获取 AI 完成配置。
        /// </summary>
        public IOptions<AiCompletionOptions> AiOptions { get; }

        /// <summary>
        /// 获取附件使用的 GridFS 存储桶。
        /// </summary>
        public GridFSBucket GridFsBucket { get; }
    }
}

