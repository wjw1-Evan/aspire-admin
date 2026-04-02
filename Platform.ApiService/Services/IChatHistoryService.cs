using Platform.ApiService.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

public interface IChatHistoryService
{
    Task<PagedResult<ChatHistoryListItemDto>> GetChatHistoryAsync(ChatHistoryQueryRequest request);
    Task<ChatHistoryDetailResponse?> GetChatHistoryDetailAsync(string sessionId);
    Task<bool> DeleteChatHistoryAsync(string sessionId);
}
