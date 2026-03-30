using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IChatHistoryService
{
    Task<ChatHistoryListResponse> GetChatHistoryAsync(ChatHistoryQueryRequest request);
    Task<ChatHistoryDetailResponse?> GetChatHistoryDetailAsync(string sessionId);
    Task<bool> DeleteChatHistoryAsync(string sessionId);
}
