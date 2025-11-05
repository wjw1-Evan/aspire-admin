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
    /// <summary>
    /// 为指定企业创建通知（用于系统通知，不依赖当前用户上下文）
    /// </summary>
    Task<NoticeIconItem> CreateNoticeForCompanyAsync(string companyId, CreateNoticeRequest request);
    Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request);
    Task<bool> DeleteNoticeAsync(string id);
    Task<bool> MarkAsReadAsync(string id);
    Task<bool> MarkAllAsReadAsync();
}

