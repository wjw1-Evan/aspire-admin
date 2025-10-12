using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class NoticeService : INoticeService
{
    private readonly IMongoCollection<NoticeIconItem> _notices;
    private readonly ILogger<NoticeService> _logger;

    public NoticeService(IMongoDatabase database, ILogger<NoticeService> logger)
    {
        _notices = database.GetCollection<NoticeIconItem>("notices");
        _logger = logger;
    }


    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        // 从数据库获取通知数据，只获取未删除的记录，按时间倒序排列
        var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.IsDeleted, false);
        var notices = await _notices.Find(filter)
            .SortByDescending(n => n.Datetime)
            .ToListAsync();

        return new NoticeIconListResponse
        {
            Data = notices,
            Total = notices.Count,
            Success = true
        };
    }

    public async Task<NoticeIconItem?> GetNoticeByIdAsync(string id)
    {
        // 只获取未删除的通知
        var filter = Builders<NoticeIconItem>.Filter.And(
            Builders<NoticeIconItem>.Filter.Eq(n => n.Id, id),
            Builders<NoticeIconItem>.Filter.Eq(n => n.IsDeleted, false)
        );
        return await _notices.Find(filter).FirstOrDefaultAsync();
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
            Datetime = request.Datetime ?? DateTime.UtcNow,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _notices.InsertOneAsync(notice);
        return notice;
    }

    public async Task<NoticeIconItem?> UpdateNoticeAsync(string id, UpdateNoticeRequest request)
    {
        var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.Id, id);
        var update = Builders<NoticeIconItem>.Update.Set(n => n.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Title))
            update = update.Set(n => n.Title, request.Title);
        
        if (!string.IsNullOrEmpty(request.Description))
            update = update.Set(n => n.Description, request.Description);
        
        if (!string.IsNullOrEmpty(request.Avatar))
            update = update.Set(n => n.Avatar, request.Avatar);
        
        if (!string.IsNullOrEmpty(request.Status))
            update = update.Set(n => n.Status, request.Status);
        
        if (!string.IsNullOrEmpty(request.Extra))
            update = update.Set(n => n.Extra, request.Extra);
        
        if (request.Type.HasValue)
            update = update.Set(n => n.Type, request.Type.Value);
        
        if (request.ClickClose.HasValue)
            update = update.Set(n => n.ClickClose, request.ClickClose.Value);
        
        if (request.Read.HasValue)
            update = update.Set(n => n.Read, request.Read.Value);
        
        if (request.Datetime.HasValue)
            update = update.Set(n => n.Datetime, request.Datetime.Value);

        var result = await _notices.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetNoticeByIdAsync(id);
        }
        
        return null;
    }

    public async Task<bool> DeleteNoticeAsync(string id)
    {
        var result = await _notices.DeleteOneAsync(n => n.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> MarkAsReadAsync(string id)
    {
        var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.Id, id);
        var update = Builders<NoticeIconItem>.Update
            .Set(n => n.Read, true)
            .Set(n => n.UpdatedAt, DateTime.UtcNow);

        var result = await _notices.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> MarkAllAsReadAsync()
    {
        var filter = Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false);
        var update = Builders<NoticeIconItem>.Update
            .Set(n => n.Read, true)
            .Set(n => n.UpdatedAt, DateTime.UtcNow);

        var result = await _notices.UpdateManyAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 初始化 v2.0 欢迎通知
    /// </summary>
    public async Task InitializeWelcomeNoticeAsync()
    {
        // 先删除旧的 v2.0 通知（如果存在）
        var deleteResult = await _notices.DeleteManyAsync(n => 
            n.Title == "🎉 系统已升级到 v2.0");
        
        if (deleteResult.DeletedCount > 0)
        {
            _logger.LogInformation($"删除了 {deleteResult.DeletedCount} 条旧的 v2.0 通知");
        }

        // 创建欢迎通知
        var welcomeNotice = new NoticeIconItem
        {
            Title = "🎉 系统已升级到 v2.0",
            Description = "新版本带来搜索增强、性能提升、安全加固等多项重大改进，点击查看详情",
            Avatar = "https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg",
            Type = NoticeIconItemType.Notification,
            Status = null,  // 不显示状态标签
            Extra = null,   // 不显示额外文字
            Datetime = DateTime.UtcNow,
            Read = false,
            ClickClose = false,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _notices.InsertOneAsync(welcomeNotice);
        _logger.LogInformation("已创建 v2.0 欢迎通知");
    }

}
