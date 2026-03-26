using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 通知服务实现
/// </summary>
public class NoticeService : INoticeService
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化通知服务
    /// </summary>
    public NoticeService(DbContext context)
    {
        _context = context;
        
    }

    /// <summary>
    /// 获取当前用户的通知列表
    /// </summary>
    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        var notices = await _context.Set<NoticeIconItem>()
            .OrderByDescending(n => n.Datetime)
            .ToListAsync();

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
    public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
    {
        return await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
    }

    /// <summary>
    /// 创建通知
    /// </summary>
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

        await _context.Set<NoticeIconItem>().AddAsync(notice);
        await _context.SaveChangesAsync();
        return notice;
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

        await _context.Set<NoticeIconItem>().AddAsync(notice);
        await _context.SaveChangesAsync();
        return notice;
    }

    /// <summary>
    /// 更新通知（使用原子操作）
    /// </summary>
    public async Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request)
    {
        var entity = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;

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

        await _context.SaveChangesAsync();
        return entity;
    }

    /// <summary>
    /// 删除通知
    /// </summary>
    public async Task<bool> DeleteNoticeAsync(string id)
    {
        var entity = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 标记为已读（使用原子操作）
    /// </summary>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        var entity = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.Read = true;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 标记所有通知为已读
    /// </summary>
    public async Task<bool> MarkAllAsReadAsync()
    {
        var unreadItems = await _context.Set<NoticeIconItem>().Where(n => !n.Read).ToListAsync();
        foreach (var item in unreadItems)
            item.Read = true;
        await _context.SaveChangesAsync();
        return unreadItems.Count > 0;
    }
}