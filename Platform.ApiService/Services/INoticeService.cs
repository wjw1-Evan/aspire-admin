using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知服务接口
/// </summary>
public interface INoticeService
{
    /// <summary>
    /// 获取当前用户的通知列表
    /// </summary>
    /// <returns>通知列表响应</returns>
    Task<NoticeIconListResponse> GetNoticesAsync();
    
    /// <summary>
    /// 根据ID获取通知详情
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>通知信息，如果不存在则返回 null</returns>
    Task<NoticeIconItem?> GetNoticeByIdAsync(string id);
    
    /// <summary>
    /// 创建通知
    /// </summary>
    /// <param name="request">创建通知请求</param>
    /// <returns>创建的通知信息</returns>
    Task<NoticeIconItem> CreateNoticeAsync(CreateNoticeRequest request);
    
    /// <summary>
    /// 为指定企业创建通知（用于系统通知，不依赖当前用户上下文）
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="request">创建通知请求</param>
    /// <returns>创建的通知信息</returns>
    Task<NoticeIconItem> CreateNoticeForCompanyAsync(string companyId, CreateNoticeRequest request);
    
    /// <summary>
    /// 更新通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <param name="request">更新通知请求</param>
    /// <returns>更新后的通知信息，如果不存在则返回 null</returns>
    Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request);
    
    /// <summary>
    /// 删除通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功删除</returns>
    Task<bool> DeleteNoticeAsync(string id);
    
    /// <summary>
    /// 标记通知为已读
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功标记</returns>
    Task<bool> MarkAsReadAsync(string id);
    
    /// <summary>
    /// 标记所有通知为已读
    /// </summary>
    /// <returns>是否成功标记</returns>
    Task<bool> MarkAllAsReadAsync();
}

