using Platform.ApiService.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

public interface IChatHistoryService
{
    Task<System.Linq.Dynamic.Core.PagedResult<ChatHistoryListItemDto>> GetChatHistoryAsync(Platform.ServiceDefaults.Models.PageParams request);
    Task<ChatHistoryDetailResponse?> GetChatHistoryDetailAsync(string sessionId);
    Task<bool> DeleteChatHistoryAsync(string sessionId);
}
