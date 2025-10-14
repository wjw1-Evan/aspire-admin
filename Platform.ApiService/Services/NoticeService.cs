using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class NoticeService : BaseService, INoticeService
{
    private readonly BaseRepository<NoticeIconItem> _noticeRepository;
    
    // 快捷访问器
    private IMongoCollection<NoticeIconItem> _notices => _noticeRepository.Collection;

    public NoticeService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<NoticeService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _noticeRepository = new BaseRepository<NoticeIconItem>(database, "notices", httpContextAccessor, tenantContext);
    }

    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        // 从数据库获取通知数据，只获取未删除的记录，按时间倒序排列
        var sort = Builders<NoticeIconItem>.Sort.Descending(n => n.Datetime);
        var notices = await _noticeRepository.GetAllAsync(sort);

        return new NoticeIconListResponse
        {
            Data = notices,
            Total = notices.Count,
            Success = true
        };
    }

    public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
    {
        return await _noticeRepository.GetByIdAsync(id);
    }

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

        return await _noticeRepository.CreateAsync(notice);
    }

    public async Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request)
    {
        var updateBuilder = Builders<NoticeIconItem>.Update;
        var updates = new List<UpdateDefinition<NoticeIconItem>>();

        if (!string.IsNullOrEmpty(request.Title))
            updates.Add(updateBuilder.Set(n => n.Title, request.Title));
        
        if (!string.IsNullOrEmpty(request.Description))
            updates.Add(updateBuilder.Set(n => n.Description, request.Description));
        
        if (!string.IsNullOrEmpty(request.Avatar))
            updates.Add(updateBuilder.Set(n => n.Avatar, request.Avatar));
        
        if (!string.IsNullOrEmpty(request.Status))
            updates.Add(updateBuilder.Set(n => n.Status, request.Status));
        
        if (!string.IsNullOrEmpty(request.Extra))
            updates.Add(updateBuilder.Set(n => n.Extra, request.Extra));
        
        if (request.Type.HasValue)
            updates.Add(updateBuilder.Set(n => n.Type, request.Type.Value));
        
        if (request.ClickClose.HasValue)
            updates.Add(updateBuilder.Set(n => n.ClickClose, request.ClickClose.Value));
        
        if (request.Read.HasValue)
            updates.Add(updateBuilder.Set(n => n.Read, request.Read.Value));
        
        if (request.Datetime.HasValue)
            updates.Add(updateBuilder.Set(n => n.Datetime, request.Datetime.Value));

        if (updates.Count == 0)
            return null;

        var updated = await _noticeRepository.UpdateAsync(id, updateBuilder.Combine(updates));
        return updated ? await GetNoticeByIdAsync(id) : null;
    }

    public async Task<bool> DeleteNoticeAsync(string id)
    {
        return await _noticeRepository.SoftDeleteAsync(id);
    }

    public async Task<bool> MarkAsReadAsync(string id)
    {
        var update = Builders<NoticeIconItem>.Update.Set(n => n.Read, true);
        return await _noticeRepository.UpdateAsync(id, update);
    }

    public async Task<bool> MarkAllAsReadAsync()
    {
        var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false);
        var update = Builders<NoticeIconItem>.Update.Set(n => n.Read, true);
        
        var count = await _noticeRepository.UpdateManyAsync(filter, update);
        return count > 0;
    }
}
