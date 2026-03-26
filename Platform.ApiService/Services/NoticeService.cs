using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知服务实现
/// </summary>
public class NoticeService : INoticeService
{
    private readonly IDataFactory<NoticeIconItem> _noticeFactory;

    /// <summary>
    /// 初始化通知服务
    /// </summary>
    /// <param name="noticeFactory">通知数据操作工厂</param>
    public NoticeService(
        IDataFactory<NoticeIconItem> noticeFactory)
    {
        _noticeFactory = noticeFactory;
    }

    /// <summary>
    /// 获取当前用户的通知列表
    /// </summary>
    /// <returns>通知列表响应</returns>
    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        // 仅返回当前企业的未删除通知，按时间倒序（工厂自动叠加租户与软删除过滤）
        var notices = await _noticeFactory.FindAsync(
            orderBy: query => query.OrderByDescending(n => n.Datetime));

        return new NoticeIconListResponse
        {
            Data = notices,
            Total = notices.Count,
            Success = true
        };
    }

    /// <summary>
    /// 根据ID获取通知详情
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>通知信息，如果不存在则返回 null</returns>
    public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
    {
        return await _noticeFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 创建通知
    /// </summary>
    /// <param name="request">创建通知请求</param>
    /// <returns>创建的通知信息</returns>
    public async Task<NoticeIconItem> CreateNoticeAsync(CreateNoticeRequest request)
    {
        var notice = new NoticeIconItem
        {
            Title = request.Title ?? string.Empty,
            Description = request.Description,
            Avatar = request.Avatar,
            Status = request.Status,
            Extra = request.Extra,
            Type = request.Type,
            ClickClose = request.ClickClose,
            Datetime = request.Datetime ?? DateTime.UtcNow
        };

        return await _noticeFactory.CreateAsync(notice);
    }

    /// <summary>
    /// 创建系统通知
    /// </summary>
    public async Task<NoticeIconItem> CreateNoticeForCompanyAsync(CreateNoticeRequest request)
    {
        var notice = new NoticeIconItem
        {
            Title = request.Title ?? string.Empty,
            Description = request.Description,
            Avatar = request.Avatar,
            Status = request.Status,
            Extra = request.Extra,
            Type = request.Type,
            ClickClose = request.ClickClose,
            Datetime = request.Datetime ?? DateTime.UtcNow
        };

        return await _noticeFactory.CreateAsync(notice);
    }

    /// <summary>
    /// 更新通知（使用原子操作）
    /// </summary>
    public async Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request)
    {
        // 仅允许更新当前企业的通知（工厂自动叠加租户过滤）
        return await _noticeFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Title))
                entity.Title = request.Title;

            if (!string.IsNullOrEmpty(request.Description))
                entity.Description = request.Description;

            if (!string.IsNullOrEmpty(request.Avatar))
                entity.Avatar = request.Avatar;

            if (!string.IsNullOrEmpty(request.Status))
                entity.Status = request.Status;

            if (!string.IsNullOrEmpty(request.Extra))
                entity.Extra = request.Extra;

            if (request.Type.HasValue)
                entity.Type = request.Type.Value;

            if (request.ClickClose.HasValue)
                entity.ClickClose = request.ClickClose.Value;

            if (request.Read.HasValue)
                entity.Read = request.Read.Value;

            if (request.Datetime.HasValue)
                entity.Datetime = request.Datetime.Value;
        });
    }

    /// <summary>
    /// 删除通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功删除</returns>
    public async Task<bool> DeleteNoticeAsync(string id)
    {
        // 仅允许删除当前企业的通知（工厂自动叠加租户过滤）
        return await _noticeFactory.SoftDeleteAsync(id);
    }

    /// <summary>
    /// 标记为已读（使用原子操作）
    /// </summary>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        // 仅允许标记当前企业的通知（工厂自动叠加租户过滤）
        var updated = await _noticeFactory.UpdateAsync(id, entity =>
        {
            entity.Read = true;
        });

        return updated != null;
    }

    /// <summary>
    /// 标记所有通知为已读
    /// </summary>
    /// <returns>是否成功标记</returns>
    public async Task<bool> MarkAllAsReadAsync()
    {
        // 仅作用于当前企业的未读通知（工厂自动叠加租户过滤）
        var result = await _noticeFactory.UpdateManyAsync(
            n => !n.Read,
            entity => entity.Read = true);
        return result > 0;
    }
}
