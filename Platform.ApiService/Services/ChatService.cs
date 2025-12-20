using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using OpenAI;
using OpenAI.Chat;
using System.Collections;
using Platform.ApiService.Constants;
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
    private readonly IUserService _userService;
    private readonly ILogger<ChatService> _logger;
    private readonly IChatBroadcaster _broadcaster;
    private readonly GridFSBucket _gridFsBucket;
    private readonly IAiAssistantCoordinator _aiAssistantCoordinator;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly IMcpService? _mcpService;
    private readonly IXiaokeConfigService? _xiaokeConfigService;


    /// <summary>
    /// 初始化聊天服务。
    /// </summary>
    public ChatService(
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<ChatMessage> messageFactory,
        IDatabaseOperationFactory<ChatAttachment> attachmentFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IUserService userService,
        IMongoDatabase database,
        IChatBroadcaster broadcaster,
        IAiAssistantCoordinator aiAssistantCoordinator,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        IMcpService? mcpService,
        IXiaokeConfigService? xiaokeConfigService,
        ILogger<ChatService> logger)
    {
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
        _attachmentFactory = attachmentFactory ?? throw new ArgumentNullException(nameof(attachmentFactory));
        _userFactory = userFactory ?? throw new ArgumentNullException(nameof(userFactory));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _broadcaster = broadcaster ?? throw new ArgumentNullException(nameof(broadcaster));
        _aiAssistantCoordinator = aiAssistantCoordinator ?? throw new ArgumentNullException(nameof(aiAssistantCoordinator));
        _openAiClient = openAiClient ?? throw new ArgumentNullException(nameof(openAiClient));
        _aiOptions = aiOptions?.Value ?? throw new ArgumentNullException(nameof(aiOptions));
        _mcpService = mcpService;
        _xiaokeConfigService = xiaokeConfigService;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var mongoDatabase = database ?? throw new ArgumentNullException(nameof(database));
        _gridFsBucket = new GridFSBucket(mongoDatabase, new GridFSBucketOptions
        {
            BucketName = "chat_attachments"
        });
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

        // 计算每条消息的已读状态并添加到 metadata
        var currentUserId = _sessionFactory.GetRequiredUserId();
        var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();
        
        // 批量查询所有最后已读消息，避免在循环中逐个查询（性能优化）
        var lastReadMessages = new Dictionary<string, ChatMessage>();
        var uniqueLastReadIds = lastReadMessageIds.Values
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();
        
        if (uniqueLastReadIds.Count > 0)
        {
            var lastReadFilter = _messageFactory.CreateFilterBuilder()
                .In(message => message.Id, uniqueLastReadIds)
                .Build();
            
            var lastReadMessagesList = await _messageFactory.FindAsync(lastReadFilter, null, uniqueLastReadIds.Count);
            foreach (var msg in lastReadMessagesList)
            {
                lastReadMessages[msg.Id] = msg;
            }
        }
        
        // 为每条消息添加已读状态信息
        foreach (var message in messages)
        {
            // 只处理当前用户发送的消息
            if (message.SenderId == currentUserId)
            {
                // 检查每个参与者的已读状态
                var readStatuses = new Dictionary<string, bool>();
                var messageTimestamp = message.CreatedAt;
                
                foreach (var participant in session.Participants)
                {
                    // 跳过发送者自己
                    if (participant == currentUserId)
                    {
                        continue;
                    }
                    
                    // 检查该参与者是否已读此消息
                    if (lastReadMessageIds.TryGetValue(participant, out var lastReadId) && 
                        lastReadMessages.TryGetValue(lastReadId, out var lastReadMessage))
                    {
                        // 如果消息时间戳小于等于最后已读消息的时间戳，则已读
                        readStatuses[participant] = messageTimestamp <= lastReadMessage.CreatedAt;
                    }
                    else
                    {
                        // 如果没有最后已读消息ID或找不到消息，默认为未读
                        readStatuses[participant] = false;
                    }
                }
                
                // 将已读状态添加到消息的 metadata 中
                if (!message.Metadata.ContainsKey("readStatuses"))
                {
                    message.Metadata["readStatuses"] = readStatuses;
                }
                
                // 计算是否所有参与者都已读（用于前端显示"对方已读"）
                // 注意：群聊场景下，需要所有参与者都已读；私聊场景下，只需要对方已读
                var allRead = readStatuses.Count > 0 && readStatuses.Values.All(r => r);
                if (allRead)
                {
                    message.Metadata["isRead"] = true;
                }
            }
        }

        // 如果获取的是最新消息（没有cursor），自动标记为已读
        if (string.IsNullOrWhiteSpace(request.Cursor) && messages.Count > 0)
        {
            try
            {
                var lastMessage = messages[^1]; // 最后一条消息（最新的）
                
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

        // 规范化元数据（失败不应影响消息发送，使用空字典作为后备）
        Dictionary<string, object> metadata;
        try
        {
            metadata = NormalizeMetadata(request.Metadata);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "规范化元数据失败，使用空元数据: 会话 {SessionId}", request.SessionId);
            metadata = new Dictionary<string, object>();
        }

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

        // 检查接收方（必须在消息保存之前进行，避免无效消息）
        if (!string.IsNullOrWhiteSpace(request.RecipientId) && !session.Participants.Contains(request.RecipientId))
        {
            throw new InvalidOperationException("接收方不属于该会话");
        }

        // 保存消息到数据库（这是关键操作，成功后应该返回成功）
        ChatMessage savedMessage;
        try
        {
            savedMessage = await _messageFactory.CreateAsync(message);
        }
        catch (Exception ex)
        {
            // 消息保存失败，记录详细错误并重新抛出异常
            _logger.LogError(
                ex,
                "保存消息失败: 会话 {SessionId}, 发送者 {SenderId}, 类型 {Type}, 内容长度 {ContentLength}",
                request.SessionId,
                currentUserId,
                request.Type,
                request.Content?.Length ?? 0);
            throw;
        }

        message = savedMessage;

        // 更新附件关联（失败不应影响消息发送成功）
        if (attachment != null)
        {
            try
            {
                var attachmentUpdate = _attachmentFactory.CreateUpdateBuilder()
                    .Set(a => a.MessageId, message.Id)
                    .SetCurrentTimestamp();

                var attachmentFilter = _attachmentFactory.CreateFilterBuilder()
                    .Equal(a => a.Id, attachment.Id)
                    .Build();

                await _attachmentFactory.FindOneAndUpdateAsync(attachmentFilter, attachmentUpdate.Build());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新附件关联失败: 附件 {AttachmentId} 消息 {MessageId}", attachment.Id, message.Id);
                // 附件更新失败不影响消息发送成功，继续执行
            }
        }

        // 更新会话（失败不应影响消息发送成功）
        try
        {
            await UpdateSessionAfterMessageAsync(session, message, currentUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新会话失败: 会话 {SessionId} 消息 {MessageId}", session.Id, message.Id);
        }

        // 通知消息创建（失败不应影响消息发送成功，NotifyMessageCreatedAsync 内部已有 try-catch）
        try
        {
            await NotifyMessageCreatedAsync(session, message);
        }
        catch (Exception ex)
        {
            // 即使通知失败也不影响消息发送成功（NotifyMessageCreatedAsync 内部已有 try-catch，这里是双重保护）
            _logger.LogWarning(ex, "通知消息创建失败: 会话 {SessionId} 消息 {MessageId}", session.Id, message.Id);
        }

        // AI 响应不阻塞消息发送的返回，错误不应影响消息发送成功
        // 使用 fire-and-forget 模式，捕获异常但不抛出，确保消息发送成功返回
        try
        {
            _ = RespondAsAssistantAsync(session, message).ContinueWith(
                task =>
                {
                    if (task.IsFaulted && task.Exception != null)
                    {
                        _logger.LogError(
                            task.Exception.GetBaseException(),
                            "AI 助手响应失败: 会话 {SessionId} 消息 {MessageId}",
                            session.Id,
                            message.Id);
                    }
                },
                TaskContinuationOptions.OnlyOnFaulted);
        }
        catch (Exception ex)
        {
            // 启动 AI 响应任务失败不应影响消息发送成功
            _logger.LogWarning(ex, "启动 AI 助手响应任务失败: 会话 {SessionId} 消息 {MessageId}", session.Id, message.Id);
        }

        return message;
    }

    /// <inheritdoc />
    public async Task<(ChatMessage userMessage, ChatMessage? assistantMessage)> SendMessageWithStreamingReplyAsync(
        SendChatMessageRequest request,
        Func<string, string, string, Task>? onChunk,
        Func<ChatMessage, Task>? onComplete,
        CancellationToken cancellationToken)
    {
        // 1. 检查用户消息是否已存在（通过 ClientMessageId 或内容匹配）
        // 如果已存在，直接使用；否则创建新消息
        var currentUserId = _messageFactory.GetRequiredUserId();
        var session = await EnsureSessionAccessibleAsync(request.SessionId);

        if (!session.Participants.Contains(currentUserId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        ChatMessage savedMessage;
        
        // 尝试查找已存在的消息（通过 ClientMessageId）
        if (!string.IsNullOrWhiteSpace(request.ClientMessageId))
        {
            var filter = _messageFactory.CreateFilterBuilder()
                .Equal(m => m.SessionId, request.SessionId)
                .Equal(m => m.ClientMessageId, request.ClientMessageId)
                .Equal(m => m.SenderId, currentUserId)
                .Build();
            
            var existingMessages = await _messageFactory.FindAsync(filter, null, 1);
            var existingMessage = existingMessages.FirstOrDefault();
            
            if (existingMessage != null)
            {
                savedMessage = existingMessage;
                // 消息已存在，但仍需要更新会话状态和通知（用于重试场景）
                // 这确保会话的 LastMessageAt、未读计数和其他参与者通知得到更新
            }
            else
            {
                // 创建新消息
                if (request.Type == ChatMessageType.Text && string.IsNullOrWhiteSpace(request.Content))
                {
                    throw new ArgumentException("文本消息内容不能为空", nameof(request.Content));
                }

                var sender = await _userFactory.GetByIdAsync(currentUserId);

                var message = new ChatMessage
                {
                    SessionId = session.Id,
                    CompanyId = session.CompanyId,
                    SenderId = currentUserId,
                    SenderName = sender?.Username,
                    RecipientId = request.RecipientId,
                    Type = request.Type,
                    Content = request.Content,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Metadata = NormalizeMetadata(request.Metadata ?? new Dictionary<string, object>()),
                    ClientMessageId = request.ClientMessageId
                };

                savedMessage = await _messageFactory.CreateAsync(message);
            }
        }
        else
        {
            // 没有 ClientMessageId，创建新消息
            if (request.Type == ChatMessageType.Text && string.IsNullOrWhiteSpace(request.Content))
            {
                throw new ArgumentException("文本消息内容不能为空", nameof(request.Content));
            }

            var sender = await _userFactory.GetByIdAsync(currentUserId);

            var message = new ChatMessage
            {
                SessionId = session.Id,
                CompanyId = session.CompanyId,
                SenderId = currentUserId,
                SenderName = sender?.Username,
                RecipientId = request.RecipientId,
                Type = request.Type,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Metadata = NormalizeMetadata(request.Metadata ?? new Dictionary<string, object>()),
                ClientMessageId = request.ClientMessageId
            };

            savedMessage = await _messageFactory.CreateAsync(message);
        }

        // 无论消息是新创建还是已存在，都需要更新会话状态和通知
        // 这确保会话的 LastMessageAt、未读计数和其他参与者通知得到正确更新
        await UpdateSessionAfterMessageAsync(session, savedMessage, currentUserId);
        await NotifyMessageCreatedAsync(session, savedMessage);

        ChatMessage? assistantMessage = null;

        // 2. 如果需要 AI 回复，流式生成
        // 注意：如果用户消息已存在（通过 SendMessageAsync 创建），这里会跳过创建，只生成 AI 回复
        if (session.Participants.Contains(AiAssistantConstants.AssistantUserId) &&
            savedMessage.SenderId != AiAssistantConstants.AssistantUserId &&
            savedMessage.Type == ChatMessageType.Text &&
            !ShouldSkipAutomaticAssistantReply(savedMessage))
        {
            // 使用流式生成，传入回调函数
            assistantMessage = await GenerateAssistantReplyStreamAsync(
                session, 
                savedMessage, 
                cancellationToken, 
                onChunk, 
                onComplete);
        }

        return (savedMessage, assistantMessage);
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

        var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();
        lastReadMessageIds[currentUserId] = lastMessageId;

        var update = _sessionFactory.CreateUpdateBuilder()
            .Set(session => session.UnreadCounts, unreadCounts)
            .Set(session => session.LastReadMessageIds, lastReadMessageIds)
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

        var companyId = await _sessionFactory.GetRequiredCompanyIdAsync();

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

            await _broadcaster.BroadcastMessageAsync(session.Id, payload);
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

            await _broadcaster.BroadcastSessionReadAsync(sessionId, userId, payload);
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

            await _broadcaster.BroadcastMessageDeletedAsync(sessionId, payload);
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

            await _broadcaster.BroadcastSessionUpdatedAsync(sessionId, payload);
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

        if (triggerMessage.Type == ChatMessageType.Text)
        {
            // 使用流式生成（不提供回调，使用默认广播方式）
            await GenerateAssistantReplyStreamAsync(session, triggerMessage, CancellationToken.None, null, null);
        }
        else
        {
            // 非文本消息使用传统方式
            var replyContent = "我已收到您的附件，目前仅支持文本对话，欢迎告诉我想要讨论的内容。";
            await CreateAssistantMessageAsync(
                session,
                replyContent,
                triggerMessage.SenderId,
                clientMessageId: null,
                CancellationToken.None);
        }
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

    /// <summary>
    /// 创建流式助手消息并实时更新
    /// </summary>
    private async Task<ChatMessage> CreateAssistantMessageStreamingAsync(
        ChatSession session,
        string initialContent,
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
            Content = initialContent,
            Metadata = new Dictionary<string, object>
            {
                ["isAssistant"] = true,
                ["streaming"] = true
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
        
        // 通知消息已创建
        var refreshedSession = await _sessionFactory.GetByIdAsync(session.Id) ?? session;
        await UpdateSessionAfterMessageAsync(refreshedSession, assistantMessage, AiAssistantConstants.AssistantUserId);
        
        // 立即广播初始消息，让前端知道有新消息开始流式传输
        var payload = new ChatMessageRealtimePayload
        {
            SessionId = session.Id,
            Message = assistantMessage,
            BroadcastAtUtc = DateTime.UtcNow
        };
        
        _logger.LogInformation("广播流式消息初始状态，会话：{SessionId}，消息ID：{MessageId}", 
            session.Id, assistantMessage.Id);
        await _broadcaster.BroadcastMessageAsync(session.Id, payload);

        return assistantMessage;
    }

    /// <summary>
    /// 更新流式消息内容
    /// </summary>
    private async Task UpdateStreamingMessageAsync(string messageId, string newContent, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var update = _messageFactory.CreateUpdateBuilder()
            .Set(message => message.Content, newContent)
            .Set(message => message.UpdatedAt, DateTime.UtcNow)
            .Build();

        await _messageFactory.FindOneAndUpdateAsync(
            _messageFactory.CreateFilterBuilder()
                .Equal(message => message.Id, messageId)
                .Build(),
            update);
    }

    /// <summary>
    /// 完成流式消息（移除流式标记）
    /// </summary>
    private async Task CompleteStreamingMessageAsync(string messageId, string finalContent, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var message = await _messageFactory.GetByIdAsync(messageId);
        if (message == null)
        {
            return;
        }

        // 创建新的 Metadata 副本，避免直接修改原对象
        var metadata = message.Metadata != null 
            ? new Dictionary<string, object>(message.Metadata) 
            : new Dictionary<string, object>();
        
        if (metadata.ContainsKey("streaming"))
        {
            metadata.Remove("streaming");
        }

        var update = _messageFactory.CreateUpdateBuilder()
            .Set(message => message.Content, finalContent)
            .Set(message => message.UpdatedAt, DateTime.UtcNow)
            .Set(message => message.Metadata, metadata)
            .Build();

        await _messageFactory.FindOneAndUpdateAsync(
            _messageFactory.CreateFilterBuilder()
                .Equal(message => message.Id, messageId)
                .Build(),
            update);
    }

    /// <summary>
    /// 流式生成助手回复
    /// </summary>
    /// <param name="session">会话</param>
    /// <param name="triggerMessage">触发消息</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <param name="onChunk">可选的增量内容回调（sessionId, messageId, delta）</param>
    /// <param name="onComplete">可选的完成回调（完整消息）</param>
    /// <returns>生成的 AI 消息</returns>
    private async Task<ChatMessage?> GenerateAssistantReplyStreamAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        CancellationToken cancellationToken,
        Func<string, string, string, Task>? onChunk = null,
        Func<ChatMessage, Task>? onComplete = null)
    {
        // 优先使用小科配置管理的配置
        XiaokeConfigDto? xiaokeConfig = null;
        if (_xiaokeConfigService != null)
        {
            try
            {
                xiaokeConfig = await _xiaokeConfigService.GetDefaultConfigAsync();
                if (xiaokeConfig != null && !xiaokeConfig.IsEnabled)
                {
                    xiaokeConfig = null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "获取小科配置失败，使用默认配置");
            }
        }

        // 确定使用的模型
        var model = xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.Model)
            ? xiaokeConfig.Model
            : (string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model);

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

        var currentUserId = triggerMessage.SenderId;

        // 构建系统提示词
        string systemPrompt;
        const string defaultRoleDefinition = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        
        try
        {
            var userRoleDefinition = await _userService.GetAiRoleDefinitionAsync(currentUserId);
            if (!string.IsNullOrWhiteSpace(userRoleDefinition) && userRoleDefinition != defaultRoleDefinition)
            {
                systemPrompt = userRoleDefinition;
            }
            else
            {
                if (xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.SystemPrompt))
                {
                    systemPrompt = xiaokeConfig.SystemPrompt;
                }
                else if (!string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt))
                {
                    systemPrompt = _aiOptions.SystemPrompt;
                }
                else
                {
                    systemPrompt = defaultRoleDefinition;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取用户角色定义失败，使用默认值");
            systemPrompt = defaultRoleDefinition;
        }

        // 构建对话消息
        var conversationMessages = await BuildAssistantConversationMessagesAsync(session, triggerMessage, cancellationToken);
        if (conversationMessages.Count == 0)
        {
            _logger.LogWarning("构建的对话消息为空，会话：{SessionId}，触发消息：{MessageId}", session.Id, triggerMessage.Id);
            return null;
        }

        // 如果启用了 MCP 服务，先检测用户意图并主动调用工具
        string? toolResultContext = null;
        if (_mcpService != null)
        {
            toolResultContext = await DetectAndCallMcpToolsAsync(triggerMessage, currentUserId, cancellationToken);
        }

        var instructionBuilder = new StringBuilder();
        instructionBuilder.AppendLine(systemPrompt.Trim());
        instructionBuilder.AppendLine($"当前用户语言标识：zh-CN");
        instructionBuilder.Append("请结合完整的历史聊天记录，使用自然、真诚且有温度的语气回复对方。");
        
        // 如果启用了 MCP 服务，告知 AI 可以使用工具，并添加工具调用结果
        if (_mcpService != null && !string.IsNullOrWhiteSpace(toolResultContext))
        {
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("【已查询的数据】");
            instructionBuilder.AppendLine(toolResultContext);
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("请基于以上查询结果，用自然、友好的语言向用户回复。");
        }

        var messages = new List<OpenAIChatMessage>
        {
            new SystemChatMessage(instructionBuilder.ToString())
        };
        messages.AddRange(conversationMessages);

        // 配置完成选项
        var completionOptions = new ChatCompletionOptions();
        if (xiaokeConfig != null)
        {
            if (xiaokeConfig.Temperature >= 0 && xiaokeConfig.Temperature <= 2)
            {
                completionOptions.Temperature = (float)xiaokeConfig.Temperature;
            }
            if (xiaokeConfig.MaxTokens > 0)
            {
                completionOptions.MaxOutputTokenCount = xiaokeConfig.MaxTokens;
            }
            if (xiaokeConfig.TopP >= 0 && xiaokeConfig.TopP <= 1)
            {
                completionOptions.TopP = (float)xiaokeConfig.TopP;
            }
            if (xiaokeConfig.FrequencyPenalty >= -2 && xiaokeConfig.FrequencyPenalty <= 2)
            {
                completionOptions.FrequencyPenalty = (float)xiaokeConfig.FrequencyPenalty;
            }
            if (xiaokeConfig.PresencePenalty >= -2 && xiaokeConfig.PresencePenalty <= 2)
            {
                completionOptions.PresencePenalty = (float)xiaokeConfig.PresencePenalty;
            }
        }
        else
        {
            if (_aiOptions.MaxTokens > 0)
            {
                completionOptions.MaxOutputTokenCount = _aiOptions.MaxTokens;
            }
        }

        ChatMessage? assistantMessage = null;
        var accumulatedContent = new StringBuilder();

        try
        {
            // 创建初始消息（空内容）
            assistantMessage = await CreateAssistantMessageStreamingAsync(
                session,
                string.Empty,
                triggerMessage.SenderId,
                clientMessageId: null,
                cancellationToken);

            // 流式生成 AI 回复：每个增量立即发送到前端
            var streamingResult = chatClient.CompleteChatStreamingAsync(messages, completionOptions, cancellationToken);
            
            await foreach (var update in streamingResult)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (update.ContentUpdate == null || assistantMessage == null) continue;

                foreach (var contentPart in update.ContentUpdate)
                {
                    if (contentPart.Kind == ChatMessageContentPartKind.Text && !string.IsNullOrWhiteSpace(contentPart.Text))
                    {
                        var delta = contentPart.Text;
                        accumulatedContent.Append(delta);

                        // 立即发送到前端（不等待其他操作）
                        if (onChunk != null)
                        {
                            await onChunk(session.Id, assistantMessage.Id, delta);
                        }
                        
                        // 后台更新数据库（每50字符，不阻塞流式输出）
                        if (accumulatedContent.Length % 50 == 0)
                        {
                            var messageId = assistantMessage.Id;
                            var content = accumulatedContent.ToString();
                            _ = Task.Run(async () =>
                            {
                                try
                                {
                                    await UpdateStreamingMessageAsync(messageId, content, cancellationToken);
                                }
                                catch { /* 忽略后台更新错误 */ }
                            }, cancellationToken);
                        }
                    }
                }
            }

            // 流式完成，保存最终内容并移除流式标记
            var finalContent = accumulatedContent.ToString().Trim();
            if (assistantMessage != null && !string.IsNullOrEmpty(finalContent))
            {
                // 确保最终内容已保存到数据库（即使长度不足50的倍数）
                await UpdateStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);
                
                // 完成流式消息（移除流式标记）
                await CompleteStreamingMessageAsync(assistantMessage.Id, finalContent, cancellationToken);
                
                // 获取更新后的消息并广播完成事件
                var completedMessage = await _messageFactory.GetByIdAsync(assistantMessage.Id);
                if (completedMessage != null)
                {
                    // 如果提供了完成回调，调用它
                    if (onComplete != null)
                    {
                        await onComplete(completedMessage);
                    }
                    
                    // 广播完成事件
                    await _broadcaster.BroadcastMessageCompleteAsync(session.Id, completedMessage);
                }
                
                return completedMessage;
            }
            else if (assistantMessage != null)
            {
                // 如果内容为空，删除消息
                await _messageFactory.FindOneAndSoftDeleteAsync(
                    _messageFactory.CreateFilterBuilder()
                        .Equal(message => message.Id, assistantMessage.Id)
                        .Build());
                
                _logger.LogWarning("AI 助手流式回复生成失败或返回空，会话：{SessionId}，触发消息：{MessageId}", 
                    session.Id, triggerMessage.Id);
            }
            
            return null;
        }
        catch (OperationCanceledException)
        {
            // 流式生成被取消
            if (assistantMessage != null)
            {
                await _messageFactory.FindOneAndSoftDeleteAsync(
                    _messageFactory.CreateFilterBuilder()
                        .Equal(message => message.Id, assistantMessage.Id)
                        .Build());
            }
            return null;
        }
        catch (ClientResultException ex)
        {
            _logger.LogWarning(
                ex,
                "OpenAI Chat 流式请求失败，模型：{Model}，会话：{SessionId}，错误：{Error}",
                model,
                session.Id,
                ex.Message);
            
            if (assistantMessage != null)
            {
                await _messageFactory.FindOneAndSoftDeleteAsync(
                    _messageFactory.CreateFilterBuilder()
                        .Equal(message => message.Id, assistantMessage.Id)
                        .Build());
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "调用 OpenAI Chat 流式接口时发生未预期的异常，模型：{Model}，会话：{SessionId}",
                model,
                session.Id);
            
            if (assistantMessage != null)
            {
                await _messageFactory.FindOneAndSoftDeleteAsync(
                    _messageFactory.CreateFilterBuilder()
                        .Equal(message => message.Id, assistantMessage.Id)
                        .Build());
            }
            return null;
        }
    }

    private async Task<string?> GenerateAssistantReplyAsync(
        ChatSession session,
        ChatMessage triggerMessage,
        string? locale,
        CancellationToken cancellationToken = default)
    {
        
        // 优先使用小科配置管理的配置
        XiaokeConfigDto? xiaokeConfig = null;
        if (_xiaokeConfigService != null)
        {
            try
            {
                xiaokeConfig = await _xiaokeConfigService.GetDefaultConfigAsync();
                // 如果配置存在但未启用，则忽略它，使用默认配置
                if (xiaokeConfig != null && !xiaokeConfig.IsEnabled)
                {
                    xiaokeConfig = null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "获取小科配置失败，使用默认配置");
            }
        }

        // 确定使用的模型：优先使用小科配置，其次使用 _aiOptions，最后使用默认值
        var model = xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.Model)
            ? xiaokeConfig.Model
            : (string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model);

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
        var currentUserId = triggerMessage.SenderId;

        // 优先使用用户自定义的角色定义，其次使用小科配置的系统提示词，再次使用 _aiOptions，最后使用默认值
        string systemPrompt;
        const string defaultRoleDefinition = "你是小科，请使用简体中文提供简洁、专业且友好的回复。";
        
        try
        {
            var userRoleDefinition = await _userService.GetAiRoleDefinitionAsync(currentUserId);
            // 检查用户是否有自定义角色定义（不是默认值）
            if (!string.IsNullOrWhiteSpace(userRoleDefinition) && userRoleDefinition != defaultRoleDefinition)
            {
                // 用户有自定义角色定义，优先使用
                systemPrompt = userRoleDefinition;
            }
            else
            {
                // 用户没有自定义角色定义，优先使用小科配置的系统提示词
                if (xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.SystemPrompt))
                {
                    systemPrompt = xiaokeConfig.SystemPrompt;
                }
                else if (!string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt))
                {
                    systemPrompt = _aiOptions.SystemPrompt;
                }
                else
                {
                    systemPrompt = defaultRoleDefinition;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取用户角色定义失败，使用配置的默认值");
            // 优先使用小科配置的系统提示词
            if (xiaokeConfig != null && !string.IsNullOrWhiteSpace(xiaokeConfig.SystemPrompt))
            {
                systemPrompt = xiaokeConfig.SystemPrompt;
            }
            else if (!string.IsNullOrWhiteSpace(_aiOptions.SystemPrompt))
            {
                systemPrompt = _aiOptions.SystemPrompt;
            }
            else
            {
                systemPrompt = defaultRoleDefinition;
            }
        }

        var conversationMessages = await BuildAssistantConversationMessagesAsync(
            session,
            triggerMessage,
            cancellationToken);

        if (conversationMessages.Count == 0)
        {
            return null;
        }

        // 如果启用了 MCP 服务，先检测用户意图并主动调用工具
        string? toolResultContext = null;
        if (_mcpService != null)
        {
            toolResultContext = await DetectAndCallMcpToolsAsync(triggerMessage, currentUserId, cancellationToken);
        }

        var instructionBuilder = new StringBuilder();
        instructionBuilder.AppendLine(systemPrompt.Trim());
        instructionBuilder.AppendLine($"当前用户语言标识：{effectiveLocale}");
        instructionBuilder.Append("请结合完整的历史聊天记录，使用自然、真诚且有温度的语气回复对方。");
        
        // 如果启用了 MCP 服务，告知 AI 可以使用工具，并添加工具调用结果
        if (_mcpService != null)
        {
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("你可以通过以下工具查询系统数据：");
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("【用户管理模块】");
            instructionBuilder.AppendLine("- get_user_info: 获取用户信息（通过用户ID、用户名或邮箱）");
            instructionBuilder.AppendLine("- search_users: 搜索用户列表（支持关键词、状态筛选、分页）");
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("【角色管理模块】");
            instructionBuilder.AppendLine("- get_all_roles: 获取所有角色列表（可选包含统计信息：用户数量、菜单数量）");
            instructionBuilder.AppendLine("- get_role_info: 获取角色详细信息（包括权限、菜单等）");
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("【企业管理模块】");
            instructionBuilder.AppendLine("- get_company_info: 获取企业信息（当前企业或指定企业）");
            instructionBuilder.AppendLine("- search_companies: 搜索企业列表（按关键词搜索）");
            instructionBuilder.AppendLine();
            instructionBuilder.AppendLine("【我的活动模块】");
            instructionBuilder.AppendLine("- get_my_activity_logs: 获取我的活动日志（支持按操作类型、时间范围筛选、分页）");
            instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("【聊天模块】");
                instructionBuilder.AppendLine("- get_chat_sessions: 获取聊天会话列表");
                instructionBuilder.AppendLine("- get_chat_messages: 获取聊天消息列表");
                instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("【社交模块】");
                instructionBuilder.AppendLine("- get_nearby_users: 获取附近的用户（基于地理位置）");
                instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("【小科配置管理模块】");
                instructionBuilder.AppendLine("- get_xiaoke_configs: 获取小科配置列表（支持按名称、启用状态筛选、分页）");
                instructionBuilder.AppendLine("- get_xiaoke_config: 获取小科配置详情（通过配置ID查询）");
                instructionBuilder.AppendLine("- get_default_xiaoke_config: 获取当前企业的默认小科配置");
                instructionBuilder.AppendLine();
            
            // 如果已经调用了工具，将结果添加到上下文中
            if (!string.IsNullOrWhiteSpace(toolResultContext))
            {
                instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("【已查询的数据】");
                instructionBuilder.AppendLine(toolResultContext);
                instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("请基于以上查询结果，用自然、友好的语言向用户回复。");
            }
            else
            {
                instructionBuilder.AppendLine();
                instructionBuilder.AppendLine("当用户询问相关信息时，系统会自动调用相应的工具查询数据，然后基于查询结果回复用户。");
            }
        }

        var messages = new List<OpenAIChatMessage>
        {
            new SystemChatMessage(instructionBuilder.ToString())
        };
        messages.AddRange(conversationMessages);

        var completionOptions = new ChatCompletionOptions
        {
            EndUserId = triggerMessage.SenderId
        };

        // 使用小科配置的参数，如果不存在则使用 _aiOptions
        if (xiaokeConfig != null)
        {
            // MaxTokens
            if (xiaokeConfig.MaxTokens > 0)
            {
                completionOptions.MaxOutputTokenCount = xiaokeConfig.MaxTokens;
            }
            else if (_aiOptions.MaxTokens > 0)
            {
                completionOptions.MaxOutputTokenCount = _aiOptions.MaxTokens;
            }

            // Temperature
            if (xiaokeConfig.Temperature >= 0 && xiaokeConfig.Temperature <= 2)
            {
                completionOptions.Temperature = (float)xiaokeConfig.Temperature;
            }

            // TopP
            if (xiaokeConfig.TopP >= 0 && xiaokeConfig.TopP <= 1)
            {
                completionOptions.TopP = (float)xiaokeConfig.TopP;
            }

            // FrequencyPenalty
            if (xiaokeConfig.FrequencyPenalty >= -2 && xiaokeConfig.FrequencyPenalty <= 2)
            {
                completionOptions.FrequencyPenalty = (float)xiaokeConfig.FrequencyPenalty;
            }

            // PresencePenalty
            if (xiaokeConfig.PresencePenalty >= -2 && xiaokeConfig.PresencePenalty <= 2)
            {
                completionOptions.PresencePenalty = (float)xiaokeConfig.PresencePenalty;
            }
        }
        else
        {
            // 回退到 _aiOptions
            if (_aiOptions.MaxTokens > 0)
            {
                completionOptions.MaxOutputTokenCount = _aiOptions.MaxTokens;
            }
        }

        try
        {
            
            var completionResult = await chatClient.CompleteChatAsync(messages, completionOptions);
            var completion = completionResult.Value;
            if (completion == null || completion.Content == null || completion.Content.Count == 0)
            {
                _logger.LogWarning("OpenAI API 返回空结果，模型：{Model}，会话：{SessionId}", model, session.Id);
                return null;
            }

            foreach (var part in completion.Content)
            {
                if (part.Kind == ChatMessageContentPartKind.Text && !string.IsNullOrWhiteSpace(part.Text))
                {
                    var replyText = part.Text.Trim();
                    return replyText;
                }
            }

            var fallbackText = completion.Content[0].Text?.Trim();
            if (string.IsNullOrWhiteSpace(fallbackText))
            {
                _logger.LogWarning("OpenAI API 返回的内容为空，模型：{Model}，会话：{SessionId}", model, session.Id);
            }
            return fallbackText;
        }
        catch (ClientResultException ex)
        {
            _logger.LogWarning(
                ex,
                "OpenAI Chat 完成请求失败，模型：{Model}，会话：{SessionId}，错误：{Error}",
                model,
                session.Id,
                ex.Message);
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

    /// <summary>
    /// 检测用户意图并主动调用 MCP 工具
    /// </summary>
    private async Task<string?> DetectAndCallMcpToolsAsync(
        ChatMessage triggerMessage,
        string currentUserId,
        CancellationToken cancellationToken)
    {
        if (_mcpService == null)
        {
            return null;
        }

        var content = NormalizeAssistantMessageContent(triggerMessage);
        if (string.IsNullOrWhiteSpace(content))
        {
            return null;
        }

        var contentLower = content.ToLowerInvariant();
        var toolResults = new List<string>();

        try
        {
            // 检测用户查询意图并调用相应的工具
            if (contentLower.Contains("用户") && (contentLower.Contains("admin") || contentLower.Contains("信息") || contentLower.Contains("查询") || contentLower.Contains("查")))
            {
                
                // 提取用户名（如果提到）
                string? username = null;
                if (contentLower.Contains("admin"))
                {
                    username = "admin";
                }
                else if (contentLower.Contains("用户"))
                {
                    // 尝试提取用户名（简单实现）
                    var parts = content.Split(new[] { ' ', '，', ',', '：', ':' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var part in parts)
                    {
                        if (part.Length > 2 && part.Length < 50 && !part.Contains("@"))
                        {
                            username = part.Trim();
                            break;
                        }
                    }
                }

                var userInfoArgs = new Dictionary<string, object>();
                if (!string.IsNullOrWhiteSpace(username))
                {
                    userInfoArgs["username"] = username;
                }

                var userInfoRequest = new McpCallToolRequest
                {
                    Name = "get_user_info",
                    Arguments = userInfoArgs
                };


                var userInfoResponse = await _mcpService.CallToolAsync(userInfoRequest, currentUserId);
                
                if (userInfoResponse.IsError)
                {
                    var errorMessage = userInfoResponse.Content.Count > 0 
                        ? userInfoResponse.Content[0].Text 
                        : "未知错误";
                    _logger.LogWarning("MCP 工具调用失败: {Error}", errorMessage);
                    toolResults.Add($"用户信息查询失败: {errorMessage}");
                }
                else if (userInfoResponse.Content.Count > 0)
                {
                    toolResults.Add($"用户信息查询结果：{userInfoResponse.Content[0].Text}");
                }
                else
                {
                    _logger.LogWarning("MCP 工具调用成功但返回内容为空");
                    toolResults.Add("用户信息查询成功，但未找到匹配的用户");
                }
            }
            else if (contentLower.Contains("用户") && (contentLower.Contains("列表") || contentLower.Contains("所有") || contentLower.Contains("搜索") || contentLower.Contains("活跃")))
            {
                var searchArgs = new Dictionary<string, object>();
                if (contentLower.Contains("活跃"))
                {
                    searchArgs["status"] = "active";
                }

                var searchRequest = new McpCallToolRequest
                {
                    Name = "search_users",
                    Arguments = searchArgs
                };

                var searchResponse = await _mcpService.CallToolAsync(searchRequest, currentUserId);
                if (!searchResponse.IsError && searchResponse.Content.Count > 0)
                {
                    toolResults.Add($"用户列表查询结果：{searchResponse.Content[0].Text}");
                }
            }
            else if (contentLower.Contains("角色") && (contentLower.Contains("所有") || contentLower.Contains("列表") || contentLower.Contains("哪些")))
            {
                var rolesRequest = new McpCallToolRequest
                {
                    Name = "get_all_roles",
                    Arguments = new Dictionary<string, object>()
                };

                var rolesResponse = await _mcpService.CallToolAsync(rolesRequest, currentUserId);
                if (!rolesResponse.IsError && rolesResponse.Content.Count > 0)
                {
                    toolResults.Add($"角色列表查询结果：{rolesResponse.Content[0].Text}");
                }
            }
            else if (contentLower.Contains("活动") || contentLower.Contains("日志") || contentLower.Contains("记录"))
            {
                
                var activityRequest = new McpCallToolRequest
                {
                    Name = "get_my_activity_logs",
                    Arguments = new Dictionary<string, object>
                    {
                        ["page"] = 1,
                        ["pageSize"] = 20
                    }
                };


                var activityResponse = await _mcpService.CallToolAsync(activityRequest, currentUserId);
                
                if (activityResponse.IsError)
                {
                    var errorMessage = activityResponse.Content.Count > 0 
                        ? activityResponse.Content[0].Text 
                        : "未知错误";
                    _logger.LogWarning("MCP 工具调用失败: {Error}", errorMessage);
                    toolResults.Add($"活动日志查询失败: {errorMessage}");
                }
                else if (activityResponse.Content.Count > 0)
                {
                    toolResults.Add($"活动日志查询结果：{activityResponse.Content[0].Text}");
                }
                else
                {
                    _logger.LogWarning("MCP 工具调用成功但返回内容为空");
                    toolResults.Add("活动日志查询成功，但未找到活动记录");
                }
            }
            else if (contentLower.Contains("企业") && (contentLower.Contains("信息") || contentLower.Contains("查询") || contentLower.Contains("搜索")))
            {
                var companyRequest = new McpCallToolRequest
                {
                    Name = "get_company_info",
                    Arguments = new Dictionary<string, object>()
                };

                var companyResponse = await _mcpService.CallToolAsync(companyRequest, currentUserId);
                if (!companyResponse.IsError && companyResponse.Content.Count > 0)
                {
                    toolResults.Add($"企业信息查询结果：{companyResponse.Content[0].Text}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检测用户意图并调用 MCP 工具时发生错误");
            // 不抛出异常，继续正常流程
        }

        return toolResults.Count > 0 ? string.Join("\n\n", toolResults) : null;
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
            // ✅ 优化：使用字段投影，只返回参与者元数据需要的字段
            var filter = _userFactory.CreateFilterBuilder()
                .In(user => user.Id, participantIds)
                .Build();
            var userProjection = _userFactory.CreateProjectionBuilder()
                .Include(u => u.Id)
                .Include(u => u.Username)
                .Include(u => u.Name)
                .Include(u => u.Avatar)  // 用于头像显示
                .Build();

            var users = await _userFactory.FindAsync(filter, projection: userProjection);
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

}

