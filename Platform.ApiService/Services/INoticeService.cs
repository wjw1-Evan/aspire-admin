using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知服务接口
/// </summary>
public interface INoticeService
{
    Task<NoticeIconListResponse> GetNoticesAsync();
    Task<NoticeIconItem?> GetNoticeByIdAsync(string id);
    Task<NoticeIconItem> CreateNoticeAsync(CreateNoticeRequest request);
    Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request);
    Task<bool> DeleteNoticeAsync(string id);
    Task InitializeWelcomeNoticeAsync();
}

