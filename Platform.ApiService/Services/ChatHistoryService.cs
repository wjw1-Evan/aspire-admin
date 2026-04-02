using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

public class ChatHistoryService : IChatHistoryService
{
    private readonly DbContext _context;
    private readonly IChatService _chatService;

    public ChatHistoryService(DbContext context, IChatService chatService)
    {
        _context = context;
        _chatService = chatService;
    }

    public async Task<PagedResult<ChatHistoryListItemDto>> GetChatHistoryAsync(ChatHistoryQueryRequest request)
    {
        Expression<Func<ChatSession, bool>>? filter = null;

        if (!string.IsNullOrEmpty(request.SessionId))
        {
            filter = s => s.Id == request.SessionId;
        }

        if (!string.IsNullOrEmpty(request.UserId))
        {
            var userId = request.UserId;
            filter = filter == null
                ? s => s.Participants != null && s.Participants.Contains(userId)
                : s => (filter.Compile()(s) && s.Participants != null && s.Participants.Contains(userId));
        }

        if (request.StartTime.HasValue)
        {
            var startTime = request.StartTime.Value;
            filter = filter == null
                ? s => s.LastMessageAt >= startTime
                : s => (filter.Compile()(s) && s.LastMessageAt >= startTime);
        }

        if (request.EndTime.HasValue)
        {
            var endTime = request.EndTime.Value;
            filter = filter == null
                ? s => s.LastMessageAt <= endTime
                : s => (filter.Compile()(s) && s.LastMessageAt <= endTime);
        }

        List<string>? matchedSessionIds = null;
        if (!string.IsNullOrEmpty(request.Content))
        {
            var content = request.Content;
            Expression<Func<ChatMessage, bool>> messageFilter = m => m.Content != null && m.Content.Contains(content);
            var messages = await _context.Set<ChatMessage>().Where(messageFilter).ToListAsync();
            matchedSessionIds = messages.Where(m => !string.IsNullOrEmpty(m.SessionId)).Select(m => m.SessionId!).Distinct().ToList();

            if (!matchedSessionIds.Any())
            {
                return new PagedResult<ChatHistoryListItemDto>
                {
                    Queryable = new List<ChatHistoryListItemDto>().AsQueryable(),
                    CurrentPage = request.Page,
                    PageSize = request.PageSize,
                    RowCount = 0,
                    PageCount = 0
                };
            }

            filter = filter == null
                ? s => matchedSessionIds.Contains(s.Id!)
                : s => (filter.Compile()(s) && matchedSessionIds.Contains(s.Id!));
        }

        var total = await _context.Set<ChatSession>().LongCountAsync(filter ??= s => true);

        var pagedResult = _context.Set<ChatSession>()
            .Where(filter)
            .OrderByDescending(s => s.LastMessageAt)
            .ThenByDescending(s => s.CreatedAt)
            .PageResult(request.Page, request.PageSize);
        var sessions = await pagedResult.Queryable.ToListAsync();

        var sessionIds = sessions.Select(s => s.Id!).ToList();
        var messageCounts = new Dictionary<string, int>();
        if (sessionIds.Any())
        {
            Expression<Func<ChatMessage, bool>> messageFilter = m => sessionIds.Contains(m.SessionId!);
            var messages = await _context.Set<ChatMessage>().Where(messageFilter).ToListAsync();
            messageCounts = messages
                .GroupBy(m => m.SessionId!)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        var listItems = sessions.Select(s => new ChatHistoryListItemDto
        {
            SessionId = s.Id,
            Participants = s.Participants,
            ParticipantNames = s.ParticipantNames,
            LastMessageExcerpt = s.LastMessageExcerpt,
            LastMessageAt = s.LastMessageAt,
            MessageCount = messageCounts.GetValueOrDefault(s.Id!, 0),
            CreatedAt = s.CreatedAt
        }).ToList();

        return new PagedResult<ChatHistoryListItemDto>
        {
            Queryable = listItems.AsQueryable(),
            CurrentPage = request.Page,
            PageSize = request.PageSize,
            RowCount = (int)total,
            PageCount = (int)Math.Ceiling((double)total / request.PageSize)
        };
    }

    public async Task<ChatHistoryDetailResponse?> GetChatHistoryDetailAsync(string sessionId)
    {
        var session = await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
        if (session == null)
        {
            return null;
        }

        var messageRequest = new ChatMessageListRequest
        {
            Limit = 1000
        };

        var (messages, _, _) = await _chatService.GetMessagesAsync(sessionId, messageRequest);

        return new ChatHistoryDetailResponse
        {
            Session = session,
            Messages = messages
        };
    }

    public async Task<bool> DeleteChatHistoryAsync(string sessionId)
    {
        var entity = await _context.Set<ChatSession>().FirstOrDefaultAsync(x => x.Id == sessionId);
        if (entity == null)
        {
            return false;
        }

        _context.Set<ChatSession>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}
