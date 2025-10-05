using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class TagService
{
    private readonly IMongoCollection<TagItem> _tags;

    public TagService(IMongoDatabase database)
    {
        _tags = database.GetCollection<TagItem>("tags");
   
    }

    public async Task<TagListResponse> GetTagsAsync()
    {
        // 从数据库获取标签数据
        var tagList = await _tags.Find(Builders<TagItem>.Filter.Empty)
            .SortBy(t => t.Name)
            .ToListAsync();

        return new TagListResponse
        {
            List = tagList,
            Total = tagList.Count,
            Success = true
        };
    }

    public async Task<TagItem?> GetTagByIdAsync(string id)
    {
        return await _tags.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    public async Task<TagItem> CreateTagAsync(CreateTagRequest request)
    {
        var tag = new TagItem
        {
            Name = request.Name,
            Value = request.Value,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _tags.InsertOneAsync(tag);
        return tag;
    }

    public async Task<TagItem?> UpdateTagAsync(string id, UpdateTagRequest request)
    {
        var filter = Builders<TagItem>.Filter.Eq(t => t.Id, id);
        var update = Builders<TagItem>.Update.Set(t => t.UpdatedAt, DateTime.UtcNow);

        if (!string.IsNullOrEmpty(request.Name))
            update = update.Set(t => t.Name, request.Name);
        
        if (request.Value.HasValue)
            update = update.Set(t => t.Value, request.Value.Value);
        
        if (request.Type.HasValue)
            update = update.Set(t => t.Type, request.Type.Value);

        var result = await _tags.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            return await GetTagByIdAsync(id);
        }
        
        return null;
    }

    public async Task<bool> DeleteTagAsync(string id)
    {
        var result = await _tags.DeleteOneAsync(t => t.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<List<TagItem>> GetTagsByTypeAsync(int type)
    {
        return await _tags.Find(t => t.Type == type)
            .SortBy(t => t.Name)
            .ToListAsync();
    }

}
