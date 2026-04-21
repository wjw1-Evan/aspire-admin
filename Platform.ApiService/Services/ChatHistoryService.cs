using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
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

    public async Task<System.Linq.Dynamic.Core.PagedResult<ChatHistoryListItemDto>> GetChatHistoryAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = _context.Set<ChatSession>().ToPagedList(request);
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

        return new System.Linq.Dynamic.Core.PagedResult<ChatHistoryListItemDto>
        {
            Queryable = listItems.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
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
