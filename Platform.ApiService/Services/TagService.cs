using MongoDB.Driver;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class TagService : BaseService, ITagService
{
    private readonly IMongoCollection<TagItem> _tags;
    private readonly ILogger<TagService> _logger;

    public TagService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<TagService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _tags = database.GetCollection<TagItem>("tags");
        _logger = logger;
    }

    public async Task<TagListResponse> GetTagsAsync()
    {
        // 获取当前企业ID进行多租户过滤
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        // 只查询当前企业的标签数据
        var filter = Builders<TagItem>.Filter.And(
            Builders<TagItem>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TagItem>.Filter.Eq(t => t.IsDeleted, false)
        );

        var tagList = await _tags.Find(filter)
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
        // 获取当前企业ID进行多租户过滤
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        // 只查询当前企业的标签数据
        var filter = Builders<TagItem>.Filter.And(
            Builders<TagItem>.Filter.Eq(t => t.Id, id),
            Builders<TagItem>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TagItem>.Filter.Eq(t => t.IsDeleted, false)
        );

        return await _tags.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<TagItem> CreateTagAsync(CreateTagRequest request)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var tag = new TagItem
        {
            CompanyId = companyId,
            Name = request.Name,
            Value = request.Value,
            Type = request.Type,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _tags.InsertOneAsync(tag);
        return tag;
    }

    public async Task<TagItem?> UpdateTagAsync(string id, UpdateTagRequest request)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<TagItem>.Filter.And(
            Builders<TagItem>.Filter.Eq(t => t.Id, id),
            Builders<TagItem>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TagItem>.Filter.Eq(t => t.IsDeleted, false)
        );
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
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<TagItem>.Filter.And(
            Builders<TagItem>.Filter.Eq(t => t.Id, id),
            Builders<TagItem>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TagItem>.Filter.Eq(t => t.IsDeleted, false)
        );

        var result = await _tags.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public async Task<List<TagItem>> GetTagsByTypeAsync(int type)
    {
        var companyId = GetCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var filter = Builders<TagItem>.Filter.And(
            Builders<TagItem>.Filter.Eq(t => t.Type, type),
            Builders<TagItem>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TagItem>.Filter.Eq(t => t.IsDeleted, false)
        );

        return await _tags.Find(filter)
            .SortBy(t => t.Name)
            .ToListAsync();
    }

}
