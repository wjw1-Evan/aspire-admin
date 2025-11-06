using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知服务实现
/// </summary>
public class NoticeService : INoticeService
{
    private readonly IDatabaseOperationFactory<NoticeIconItem> _noticeFactory;
    private readonly Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser> _userFactory;

    /// <summary>
    /// 初始化通知服务
    /// </summary>
    /// <param name="noticeFactory">通知数据操作工厂</param>
    /// <param name="userFactory">用户数据操作工厂</param>
    public NoticeService(
        IDatabaseOperationFactory<NoticeIconItem> noticeFactory,
        Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser> userFactory)
    {
        _noticeFactory = noticeFactory;
        _userFactory = userFactory;
    }

    /// <summary>
    /// 获取当前用户的通知列表
    /// </summary>
    /// <returns>通知列表响应</returns>
    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        // 仅返回当前企业的未删除通知，按时间倒序（工厂自动叠加租户与软删除过滤）
        var sort = _noticeFactory.CreateSortBuilder()
            .Descending(n => n.Datetime)
            .Build();
        var notices = await _noticeFactory.FindAsync(sort: sort);

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
        // 按规范：从数据库获取当前用户的企业ID（JWT 中不包含 companyId）
        var currentUserId = _noticeFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId)
            ?? throw new UnauthorizedAccessException("未找到当前用户信息");
        if (string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");

        var notice = new NoticeIconItem
        {
            Title = request.Title ?? string.Empty,
            Description = request.Description,
            Avatar = request.Avatar,
            Status = request.Status,
            Extra = request.Extra,
            Type = request.Type,
            ClickClose = request.ClickClose,
            Datetime = request.Datetime ?? DateTime.UtcNow,
            CompanyId = currentUser.CurrentCompanyId
        };

        return await _noticeFactory.CreateAsync(notice);
    }

    /// <summary>
    /// 为指定企业创建通知（用于系统通知，不依赖当前用户上下文）
    /// </summary>
    public async Task<NoticeIconItem> CreateNoticeForCompanyAsync(string companyId, CreateNoticeRequest request)
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
            Datetime = request.Datetime ?? DateTime.UtcNow,
            CompanyId = companyId  // 使用指定的企业ID
        };

        // 直接创建通知，CompanyId 已设置，工厂会自动处理多租户过滤
        // 注意：由于 NoticeIconItem 实现了 IMultiTenant，工厂会自动应用企业过滤
        // 但这里我们直接设置 CompanyId，所以创建时不会自动过滤
        return await _noticeFactory.CreateAsync(notice);
    }

    /// <summary>
    /// 更新通知（使用原子操作）
    /// </summary>
    public async Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request)
    {
        // 仅允许更新当前企业的通知（工厂自动叠加租户过滤）
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();

        var updateBuilder = _noticeFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Title))
            updateBuilder.Set(n => n.Title, request.Title);
        
        if (!string.IsNullOrEmpty(request.Description))
            updateBuilder.Set(n => n.Description, request.Description);
        
        if (!string.IsNullOrEmpty(request.Avatar))
            updateBuilder.Set(n => n.Avatar, request.Avatar);
        
        if (!string.IsNullOrEmpty(request.Status))
            updateBuilder.Set(n => n.Status, request.Status);
        
        if (!string.IsNullOrEmpty(request.Extra))
            updateBuilder.Set(n => n.Extra, request.Extra);
        
        if (request.Type.HasValue)
            updateBuilder.Set(n => n.Type, request.Type.Value);
        
        if (request.ClickClose.HasValue)
            updateBuilder.Set(n => n.ClickClose, request.ClickClose.Value);
        
        if (request.Read.HasValue)
            updateBuilder.Set(n => n.Read, request.Read.Value);
        
        if (request.Datetime.HasValue)
            updateBuilder.Set(n => n.Datetime, request.Datetime.Value);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<NoticeIconItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedNotice = await _noticeFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedNotice;
    }

    /// <summary>
    /// 删除通知
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功删除</returns>
    public async Task<bool> DeleteNoticeAsync(string id)
    {
        // 仅允许删除当前企业的通知（工厂自动叠加租户过滤）
        var filter = _noticeFactory.CreateFilterBuilder().Equal(n => n.Id, id).Build();
        var result = await _noticeFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    /// <summary>
    /// 标记为已读（使用原子操作）
    /// </summary>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        // 仅允许标记当前企业的通知（工厂自动叠加租户过滤）
        var idFilter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();
        var filter = idFilter;

        var update = _noticeFactory.CreateUpdateBuilder()
            .Set(n => n.Read, true)
            .Build();

        var options = new FindOneAndUpdateOptions<NoticeIconItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedNotice = await _noticeFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedNotice != null;
    }

    /// <summary>
    /// 标记所有通知为已读
    /// </summary>
    /// <returns>是否成功标记</returns>
    public async Task<bool> MarkAllAsReadAsync()
    {
        // 仅作用于当前企业的未读通知（工厂自动叠加租户过滤）
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Read, false)
            .Build();
        
        var update = _noticeFactory.CreateUpdateBuilder()
            .Set(n => n.Read, true)
            .Build();
        
        var result = await _noticeFactory.UpdateManyAsync(filter, update);
        return result > 0;
    }
}
