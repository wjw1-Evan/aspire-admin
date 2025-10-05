using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class NoticeService
{
    private readonly IMongoCollection<NoticeIconItem> _notices;

    public NoticeService(IMongoDatabase database)
    {
        _notices = database.GetCollection<NoticeIconItem>("notices");
      
    }


    public async Task<NoticeIconListResponse> GetNoticesAsync()
    {
        // 从数据库获取通知数据，按时间倒序排列
        var notices = await _notices.Find(Builders<NoticeIconItem>.Filter.Empty)
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
        return await _notices.Find(n => n.Id == id).FirstOrDefaultAsync();
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

}
