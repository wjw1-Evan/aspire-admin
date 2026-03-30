using Microsoft.EntityFrameworkCore;
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
    private readonly DbContext _context;
    private const int MaxPageSize = 200;
    private readonly ITenantContext _tenantContext;
    private readonly IAiAssistantCoordinator _aiAssistantCoordinator;
    private readonly IChatBroadcaster _broadcaster;
    private readonly ILogger<ChatSessionService> _logger;

    public ChatSessionService(
        DbContext context,
        ITenantContext tenantContext,
        IAiAssistantCoordinator aiAssistantCoordinator,
        IChatBroadcaster broadcaster,
        ILogger<ChatSessionService> logger)
    {
        _context = context;
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

        var query = _context.Set<ChatSession>().Where(filter);
        var total = await query.LongCountAsync();
        var items = await query.OrderByDescending(s => s.UpdatedAt)
            .Skip((Math.Max(1, request.Page) - 1) * Math.Min(Math.Max(request.PageSize, 1), MaxPageSize))
            .Take(Math.Min(Math.Max(request.PageSize, 1), MaxPageSize))
            .ToListAsync();

        await EnrichParticipantMetadataAsync(items);
        return (items, total);
    }

    public async Task<(List<ChatMessage> messages, bool hasMore, string? nextCursor)> GetMessagesAsync(string sessionId, ChatMessageListRequest request)
    {
        var session = await EnsureSessionAccessibleAsync(sessionId);
        request ??= new ChatMessageListRequest();
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        Expression<Func<ChatMessage, bool>> filter = m => m.SessionId == session.Id;
        if (!string.IsNullOrWhiteSpace(request.Cursor))
        {
            var cursorMsg = await _context.Set<ChatMessage>().FirstOrDefaultAsync(m => m.Id == request.Cursor);
            if (cursorMsg != null && cursorMsg.SessionId == session.Id)
                filter = m => m.SessionId == session.Id && m.CreatedAt < cursorMsg.CreatedAt;
        }

        var limit = Math.Min(Math.Max(request.Limit, 1), MaxPageSize);
        var messages = await _context.Set<ChatMessage>()
            .Where(filter)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit + 1)
            .ToListAsync();

        var hasMore = messages.Count > limit;
        if (hasMore) messages = messages.Take(limit).ToList();
        var nextCursor = hasMore ? messages.LastOrDefault()?.Id : null;
        messages.Reverse();

        var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();
        var lastReadMessages = new Dictionary<string, ChatMessage>();
        var uniqueIds = lastReadMessageIds.Values.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (uniqueIds.Count > 0)
        {
            var list = await _context.Set<ChatMessage>().Where(m => uniqueIds.Contains(m.Id)).ToListAsync();
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

        var participants = new[] { currentUserId, participantUserId }.OrderBy(id => id).ToList();

        var existing = await _context.Set<ChatSession>()
            .Where(s => s.Participants.Count == 2 && s.Participants.All(p => participants.Contains(p)))
            .FirstOrDefaultAsync();
        
        if (existing != null) return existing;

        var participantUsers = await _context.Set<AppUser>().Where(u => participants.Contains(u.Id)).ToListAsync();
        var session = new ChatSession
        {
            Participants = participants,
            ParticipantNames = participants.ToDictionary(id => id, id => participantUsers.FirstOrDefault(u => u.Id == id)?.Name ?? id),
            ParticipantAvatars = participantUsers.Where(u => !string.IsNullOrWhiteSpace(u.Avatar)).ToDictionary(u => u.Id, u => u.Avatar!),
            TopicTags = new List<string> { "direct" }
        };

        await _context.Set<ChatSession>().AddAsync(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<ChatSession?> GetSessionByIdAsync(string sessionId)
    {
        return await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
    }

    public async Task MarkSessionReadAsync(string sessionId, string lastMessageId)
    {
        var session = await EnsureSessionAccessibleAsync(sessionId);
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var message = await _context.Set<ChatMessage>().FirstOrDefaultAsync(x => x.Id == lastMessageId);
        if (message == null || message.SessionId != session.Id) throw new KeyNotFoundException("消息不存在");

        var unread = session.UnreadCounts ?? new Dictionary<string, int>();
        unread[currentUserId] = 0;
        var lastRead = session.LastReadMessageIds ?? new Dictionary<string, string>();
        lastRead[currentUserId] = lastMessageId;

        session.UnreadCounts = unread;
        session.LastReadMessageIds = lastRead;
        await _context.SaveChangesAsync();

        await _broadcaster.BroadcastSessionReadAsync(session.Id, currentUserId, new ChatSessionReadPayload { SessionId = session.Id, UserId = currentUserId, LastMessageId = message.Id, ReadAtUtc = DateTime.UtcNow });
        await NotifySessionSummaryAsync(session.Id);
    }

    public async Task<ChatSession> EnsureSessionAccessibleAsync(string sessionId)
    {
        var session = await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
        if (session == null) throw new KeyNotFoundException("会话不存在");
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        if (!session.Participants.Contains(currentUserId)) throw new UnauthorizedAccessException("无权访问该会话");
        return session;
    }

    public async Task UpdateSessionAfterMessageAsync(ChatSession session, ChatMessage message, string userId)
    {
        var unread = session.UnreadCounts ?? new Dictionary<string, int>();
        foreach (var p in session.Participants.Where(p => p != userId)) unread[p] = unread.GetValueOrDefault(p, 0) + 1;

        session.LastMessageAt = message.CreatedAt;
        session.LastMessageExcerpt = message.Content?.Length > 50 ? message.Content[..50] + "..." : message.Content;
        session.UnreadCounts = unread;
        await _context.SaveChangesAsync();

        await NotifySessionSummaryAsync(session.Id);
    }

    public async Task UpdateSessionLastMessageOnlyAsync(ChatSession session, ChatMessage message, string userId)
    {
        session.LastMessageAt = message.CreatedAt;
        session.LastMessageExcerpt = message.Content?.Length > 50 ? message.Content[..50] + "..." : message.Content;
        await _context.SaveChangesAsync();

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
        var users = await _context.Set<AppUser>().Where(u => ids.Contains(u.Id)).ToListAsync();
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
            var session = await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
            if (session != null) await _broadcaster.BroadcastSessionUpdatedAsync(sessionId, new ChatSessionRealtimePayload { Session = session, BroadcastAtUtc = DateTime.UtcNow });
        }
        catch (Exception ex) { _logger.LogError(ex, "通知摘要失败: {SessionId}", sessionId); }
    }

    public async Task DeleteMessageAsync(string sessionId, string messageId)
    {
        await EnsureSessionAccessibleAsync(sessionId);
        var message = await _context.Set<ChatMessage>().FirstOrDefaultAsync(x => x.Id == messageId);
        if (message != null)
        {
            _context.Set<ChatMessage>().Remove(message);
            await _context.SaveChangesAsync();
        }
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
            var existing = await _context.Set<ChatMessage>()
                .FirstOrDefaultAsync(m => m.SessionId == session.Id && m.ClientMessageId == request.ClientMessageId && m.SenderId == currentUserId);
            
            if (existing != null)
            {
                await UpdateSessionLastMessageOnlyAsync(session, existing, currentUserId);
                return existing;
            }
        }

        var sender = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
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
            ClientMessageId = request.ClientMessageId
        };
        message.Metadata["assistantStreaming"] = request.AssistantStreaming;

        await _context.Set<ChatMessage>().AddAsync(message);
        await _context.SaveChangesAsync();
        
        await UpdateSessionAfterMessageAsync(session, message, currentUserId);

        var payload = new ChatMessageRealtimePayload { SessionId = session.Id, Message = message, BroadcastAtUtc = DateTime.UtcNow };
        await _broadcaster.BroadcastMessageAsync(session.Id, payload);

        return message;
    }
}