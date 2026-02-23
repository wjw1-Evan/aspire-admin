#pragma warning disable CS1591
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class ChatSessionService : IChatSessionService
{
    private const int MaxPageSize = 200;

    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly IDataFactory<ChatMessage> _messageFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly ITenantContext _tenantContext;
    private readonly IAiAssistantCoordinator _aiAssistantCoordinator;
    private readonly IChatBroadcaster _broadcaster;
    private readonly ILogger<ChatSessionService> _logger;

    public ChatSessionService(
        IDataFactory<ChatSession> sessionFactory,
        IDataFactory<ChatMessage> messageFactory,
        IDataFactory<AppUser> userFactory,
        ITenantContext tenantContext,
        IAiAssistantCoordinator aiAssistantCoordinator,
        IChatBroadcaster broadcaster,
        ILogger<ChatSessionService> logger)
    {
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
        _userFactory = userFactory ?? throw new ArgumentNullException(nameof(userFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _aiAssistantCoordinator = aiAssistantCoordinator ?? throw new ArgumentNullException(nameof(aiAssistantCoordinator));
        _broadcaster = broadcaster ?? throw new ArgumentNullException(nameof(broadcaster));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<(List<ChatSession> sessions, long total)> GetSessionsAsync(ChatSessionListRequest request)
    {
        await _aiAssistantCoordinator.EnsureAssistantSessionForCurrentUserAsync();
        request ??= new ChatSessionListRequest();
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        Expression<Func<ChatSession, bool>> filter = session => session.Participants.Contains(currentUserId);
        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            filter = session => session.Participants.Contains(currentUserId) &&
                              session.TopicTags != null &&
                              session.TopicTags.Any(tag => tag.Contains(request.Keyword, StringComparison.OrdinalIgnoreCase));
        }

        var paged = await _sessionFactory.FindPagedAsync(filter, q => q.OrderByDescending(s => s.UpdatedAt), Math.Max(1, request.Page), Math.Min(Math.Max(request.PageSize, 1), MaxPageSize));
        await EnrichParticipantMetadataAsync(paged.items);
        return (paged.items, paged.total);
    }

    public async Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request)
    {
        var session = await EnsureSessionAccessibleAsync(sessionId);
        request ??= new ChatMessageListRequest();
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        Expression<Func<ChatMessage, bool>> filter = m => m.SessionId == session.Id;
        if (!string.IsNullOrWhiteSpace(request.Cursor))
        {
            var cursorMsg = await _messageFactory.GetByIdAsync(request.Cursor);
            if (cursorMsg != null && cursorMsg.SessionId == session.Id)
                filter = m => m.SessionId == session.Id && m.CreatedAt < cursorMsg.CreatedAt;
        }

        var limit = Math.Min(Math.Max(request.Limit, 1), MaxPageSize);
        var messages = await _messageFactory.FindAsync(filter, q => q.OrderByDescending(m => m.CreatedAt), limit + 1);
        var hasMore = messages.Count > limit;
        if (hasMore) messages = messages.Take(limit).ToList();
        var nextCursor = hasMore ? messages.LastOrDefault()?.Id : null;
        messages.Reverse();

        // Calculate read status
        var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();
        var lastReadMessages = new Dictionary<string, ChatMessage>();
        var uniqueIds = lastReadMessageIds.Values.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (uniqueIds.Count > 0)
        {
            var list = await _messageFactory.FindAsync(m => uniqueIds.Contains(m.Id), null, uniqueIds.Count);
            foreach (var m in list) lastReadMessages[m.Id] = m;
        }

        foreach (var message in messages.Where(m => m.SenderId == currentUserId))
        {
            var statuses = new Dictionary<string, bool>();
            foreach (var participant in session.Participants.Where(p => p != currentUserId))
            {
                if (lastReadMessageIds.TryGetValue(participant, out var lastId) && lastReadMessages.TryGetValue(lastId, out var lastMsg))
                    statuses[participant] = message.CreatedAt <= lastMsg.CreatedAt;
                else
                    statuses[participant] = false;
            }
            message.Metadata["readStatuses"] = statuses;
            if (statuses.Count > 0 && statuses.Values.All(r => r)) message.Metadata["isRead"] = true;
        }

        if (string.IsNullOrWhiteSpace(request.Cursor) && messages.Count > 0)
        {
            var lastMsg = messages[^1];
            if ((session.UnreadCounts?.GetValueOrDefault(currentUserId, 0) ?? 0) > 0)
                await MarkSessionReadAsync(sessionId, lastMsg.Id);
        }

        return (messages, hasMore, nextCursor);
    }

    public async Task<ChatSession> GetOrCreateDirectSessionAsync(string participantUserId)
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        if (currentUserId == participantUserId) throw new InvalidOperationException("无法与自己创建会话");

        var companyId = await _tenantContext.GetCurrentCompanyIdAsync() ?? throw new InvalidOperationException("COMPANY_NOT_FOUND");
        var participants = new[] { currentUserId, participantUserId };

        var existing = await _sessionFactory.FindAsync(s => s.CompanyId == companyId && s.Participants.Count == 2 && participants.All(p => s.Participants.Contains(p)), null, 1);
        if (existing.Count > 0) return existing[0];

        var participantUsers = await _userFactory.FindAsync(u => participants.Contains(u.Id));
        var session = new ChatSession
        {
            CompanyId = companyId,
            Participants = participants.ToList(),
            ParticipantNames = participants.ToDictionary(id => id, id => participantUsers.FirstOrDefault(u => u.Id == id)?.Name ?? id),
            ParticipantAvatars = participantUsers.Where(u => !string.IsNullOrWhiteSpace(u.Avatar)).ToDictionary(u => u.Id, u => u.Avatar!),
            TopicTags = new List<string> { "direct" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _sessionFactory.CreateAsync(session);
    }

    public async Task MarkSessionReadAsync(string sessionId, string lastMessageId)
    {
        var session = await EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var message = await _messageFactory.GetByIdAsync(lastMessageId);
        if (message == null || message.SessionId != session.Id) throw new KeyNotFoundException("消息不存在");

        var unread = session.UnreadCounts ?? new Dictionary<string, int>();
        unread[currentUserId] = 0;
        var lastRead = session.LastReadMessageIds ?? new Dictionary<string, string>();
        lastRead[currentUserId] = lastMessageId;

        await _sessionFactory.UpdateAsync(session.Id, s => { s.UnreadCounts = unread; s.LastReadMessageIds = lastRead; s.UpdatedAt = DateTime.UtcNow; });
        await _broadcaster.BroadcastSessionReadAsync(session.Id, currentUserId, new ChatSessionReadPayload { SessionId = session.Id, UserId = currentUserId, LastMessageId = message.Id, ReadAtUtc = DateTime.UtcNow });
        await NotifySessionSummaryAsync(session.Id);
    }

    public async Task<ChatSession> EnsureSessionAccessibleAsync(string sessionId)
    {
        var session = await _sessionFactory.GetByIdAsync(sessionId);
        if (session == null) throw new KeyNotFoundException("会话不存在");
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        if (!session.Participants.Contains(currentUserId)) throw new UnauthorizedAccessException("无权访问该会话");
        return session;
    }

    public async Task UpdateSessionAfterMessageAsync(ChatSession session, ChatMessage message, string userId)
    {
        var unread = session.UnreadCounts ?? new Dictionary<string, int>();
        foreach (var p in session.Participants.Where(p => p != userId)) unread[p] = unread.GetValueOrDefault(p, 0) + 1;

        await _sessionFactory.UpdateAsync(session.Id, s =>
        {
            s.LastMessageAt = message.CreatedAt;
            s.LastMessageExcerpt = message.Content?.Length > 50 ? message.Content[..50] + "..." : message.Content;
            s.UnreadCounts = unread; s.UpdatedAt = DateTime.UtcNow;
        });
        await NotifySessionSummaryAsync(session.Id);
    }

    public async Task UpdateSessionLastMessageOnlyAsync(ChatSession session, ChatMessage message, string userId)
    {
        await _sessionFactory.UpdateAsync(session.Id, s =>
        {
            s.LastMessageAt = message.CreatedAt;
            s.LastMessageExcerpt = message.Content?.Length > 50 ? message.Content[..50] + "..." : message.Content;
            s.UpdatedAt = DateTime.UtcNow;
        });
        await NotifySessionSummaryAsync(session.Id);
    }

    public async Task EnrichParticipantMetadataAsync(ChatSession session)
    {
        if (session != null) await EnrichParticipantMetadataAsync(new List<ChatSession> { session });
    }

    private async Task EnrichParticipantMetadataAsync(List<ChatSession> sessions)
    {
        if (sessions == null || sessions.Count == 0) return;
        var ids = sessions.SelectMany(s => s.Participants).Distinct().ToList();
        var users = await _userFactory.FindAsync(u => ids.Contains(u.Id));
        var userMap = users.ToDictionary(u => u.Id);
        foreach (var session in sessions)
        {
            session.ParticipantNames ??= new Dictionary<string, string>();
            session.ParticipantAvatars ??= new Dictionary<string, string>();
            foreach (var pid in session.Participants)
            {
                if (userMap.TryGetValue(pid, out var user))
                {
                    session.ParticipantNames[pid] = user.Name ?? user.Username ?? pid;
                    if (!string.IsNullOrWhiteSpace(user.Avatar)) session.ParticipantAvatars[pid] = user.Avatar;
                }
            }
        }
    }

    private async Task NotifySessionSummaryAsync(string sessionId)
    {
        try
        {
            var session = await _sessionFactory.GetByIdAsync(sessionId);
            if (session != null) await _broadcaster.BroadcastSessionUpdatedAsync(sessionId, new ChatSessionRealtimePayload { Session = session, BroadcastAtUtc = DateTime.UtcNow });
        }
        catch (Exception ex) { _logger.LogError(ex, "通知摘要失败: {SessionId}", sessionId); }
    }

    public async Task DeleteMessageAsync(string sessionId, string messageId)
    {
        await EnsureSessionAccessibleAsync(sessionId);
        await _messageFactory.SoftDeleteAsync(messageId);
    }

    public async Task<ChatMessage> SendMessageAsync(SendChatMessageRequest request, ChatAttachmentInfo? attachmentInfo)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.SessionId))
            throw new ArgumentException("会话标识不能为空", nameof(request.SessionId));

        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var session = await EnsureSessionAccessibleAsync(request.SessionId);

        if (request.Type == ChatMessageType.Text && string.IsNullOrWhiteSpace(request.Content))
            throw new ArgumentException("文本消息内容不能为空", nameof(request.Content));

        if (!string.IsNullOrWhiteSpace(request.ClientMessageId))
        {
            var existing = await _messageFactory.FindAsync(m => m.SessionId == session.Id && m.ClientMessageId == request.ClientMessageId && m.SenderId == currentUserId, null, 1);
            if (existing.Count > 0)
            {
                await UpdateSessionLastMessageOnlyAsync(session, existing[0], currentUserId);
                return existing[0];
            }
        }

        var sender = await _userFactory.GetByIdAsync(currentUserId);
        var message = new ChatMessage
        {
            SessionId = session.Id,
            CompanyId = session.CompanyId,
            SenderId = currentUserId,
            SenderName = sender?.Username ?? sender?.Name,
            RecipientId = request.RecipientId,
            Type = request.Type,
            Content = request.Content,
            Attachment = attachmentInfo,
            Metadata = request.Metadata ?? new Dictionary<string, object>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ClientMessageId = request.ClientMessageId
        };
        message.Metadata["assistantStreaming"] = request.AssistantStreaming;

        var saved = await _messageFactory.CreateAsync(message);
        await UpdateSessionAfterMessageAsync(session, saved, currentUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = saved, BroadcastAtUtc = DateTime.UtcNow };
        await _broadcaster.BroadcastMessageAsync(session.Id, payload);

        return saved;
    }
}
