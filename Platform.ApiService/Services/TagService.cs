using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public class TagService : ITagService
{
    private readonly IDatabaseOperationFactory<TagItem> _tagFactory;
    private readonly ILogger<TagService> _logger;

    public TagService(
        IDatabaseOperationFactory<TagItem> tagFactory,
        ILogger<TagService> logger)
    {
        _tagFactory = tagFactory;
        _logger = logger;
    }

    public async Task<TagListResponse> GetTagsAsync()
    {
        // 使用工厂自动进行多租户过滤
        var sort = _tagFactory.CreateSortBuilder()
            .Ascending(t => t.Name)
            .Build();
        
        var tags = await _tagFactory.FindAsync(sort: sort);

        return new TagListResponse
        {
            List = tags,
            Total = tags.Count,
            Success = true
        };
    }

    public async Task<TagItem?> GetTagByIdAsync(string id)
    {
        return await _tagFactory.GetByIdAsync(id);
    }

    public async Task<TagItem> CreateTagAsync(CreateTagRequest request)
    {
        var tag = new TagItem
        {
            Name = request.Name,
            Value = request.Value,
            Type = request.Type,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _tagFactory.CreateAsync(tag);
    }

    /// <summary>
    /// 更新标签（使用原子操作）
    /// </summary>
    public async Task<TagItem?> UpdateTagAsync(string id, UpdateTagRequest request)
    {
        var filter = _tagFactory.CreateFilterBuilder()
            .Equal(t => t.Id, id)
            .Build();

        var updateBuilder = _tagFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(t => t.Name, request.Name);
        
        if (request.Value.HasValue)
            updateBuilder.Set(t => t.Value, request.Value.Value);
        
        if (request.Type.HasValue)
            updateBuilder.Set(t => t.Type, request.Type.Value);
        
        updateBuilder.SetCurrentTimestamp();
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<TagItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedTag = await _tagFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedTag;
    }

    public async Task<bool> DeleteTagAsync(string id)
    {
        var filter = _tagFactory.CreateFilterBuilder().Equal(t => t.Id, id).Build();
        var result = await _tagFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    public async Task<List<TagItem>> GetTagsByTypeAsync(int type)
    {
        var filter = _tagFactory.CreateFilterBuilder()
            .Equal(t => t.Type, type)
            .Build();
        
        var sort = _tagFactory.CreateSortBuilder()
            .Ascending(t => t.Name)
            .Build();
        
        return await _tagFactory.FindAsync(filter, sort);
    }

}
