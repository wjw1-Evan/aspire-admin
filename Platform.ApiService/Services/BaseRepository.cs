using MongoDB.Driver;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 泛型仓储基类，提供通用的 CRUD 操作
/// </summary>
/// <typeparam name="T">实体类型，必须实现 IEntity、ISoftDeletable 和 ITimestamped 接口</typeparam>
public class BaseRepository<T> where T : IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// MongoDB 集合（公开以支持复杂查询场景）
    /// </summary>
    public IMongoCollection<T> Collection { get; }
    
    protected readonly IHttpContextAccessor HttpContextAccessor;

    public BaseRepository(IMongoDatabase database, string collectionName, IHttpContextAccessor httpContextAccessor)
    {
        Collection = database.GetCollection<T>(collectionName);
        HttpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    protected string? GetCurrentUserId()
    {
        return HttpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 根据ID获取实体（排除已删除）
    /// </summary>
    public virtual async Task<T?> GetByIdAsync(string id)
    {
        var filter = MongoFilterExtensions.ByIdAndNotDeleted<T>(id);
        return await Collection.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 获取所有实体（排除已删除）
    /// </summary>
    public virtual async Task<List<T>> GetAllAsync()
    {
        var filter = MongoFilterExtensions.NotDeleted<T>();
        return await Collection.Find(filter).ToListAsync();
    }

    /// <summary>
    /// 获取所有实体（排除已删除，带排序）
    /// </summary>
    public virtual async Task<List<T>> GetAllAsync(SortDefinition<T> sort)
    {
        var filter = MongoFilterExtensions.NotDeleted<T>();
        return await Collection.Find(filter).Sort(sort).ToListAsync();
    }

    /// <summary>
    /// 创建实体
    /// </summary>
    public virtual async Task<T> CreateAsync(T entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.IsDeleted = false;
        
        await Collection.InsertOneAsync(entity);
        return entity;
    }

    /// <summary>
    /// 更新实体
    /// </summary>
    public virtual async Task<bool> UpdateAsync(string id, UpdateDefinition<T> update)
    {
        var filter = MongoFilterExtensions.ByIdAndNotDeleted<T>(id);
        
        // 自动添加 UpdatedAt 字段
        update = update.Set(x => x.UpdatedAt, DateTime.UtcNow);
        
        var result = await Collection.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 软删除实体
    /// </summary>
    public virtual async Task<bool> SoftDeleteAsync(string id, string? reason = null)
    {
        var currentUserId = GetCurrentUserId();
        var filter = MongoFilterExtensions.ByIdAndNotDeleted<T>(id);
        
        return await Collection.SoftDeleteOneAsync(filter, currentUserId, reason);
    }

    /// <summary>
    /// 检查实体是否存在（排除已删除）
    /// </summary>
    public virtual async Task<bool> ExistsAsync(string id)
    {
        var filter = MongoFilterExtensions.ByIdAndNotDeleted<T>(id);
        var count = await Collection.CountDocumentsAsync(filter);
        return count > 0;
    }

    /// <summary>
    /// 根据过滤器检查是否存在（排除已删除）
    /// </summary>
    public virtual async Task<bool> ExistsAsync(FilterDefinition<T> filter)
    {
        var combinedFilter = filter.AndNotDeleted();
        var count = await Collection.CountDocumentsAsync(combinedFilter);
        return count > 0;
    }

    /// <summary>
    /// 根据过滤器获取数量（排除已删除）
    /// </summary>
    public virtual async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        var finalFilter = filter == null 
            ? MongoFilterExtensions.NotDeleted<T>() 
            : filter.AndNotDeleted();
        
        return await Collection.CountDocumentsAsync(finalFilter);
    }

    /// <summary>
    /// 根据过滤器查找实体（排除已删除）
    /// </summary>
    public virtual async Task<T?> FindOneAsync(FilterDefinition<T> filter)
    {
        var combinedFilter = filter.AndNotDeleted();
        return await Collection.Find(combinedFilter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 根据过滤器查找多个实体（排除已删除）
    /// </summary>
    public virtual async Task<List<T>> FindAsync(FilterDefinition<T> filter)
    {
        var combinedFilter = filter.AndNotDeleted();
        return await Collection.Find(combinedFilter).ToListAsync();
    }

    /// <summary>
    /// 根据过滤器查找多个实体（排除已删除，带排序）
    /// </summary>
    public virtual async Task<List<T>> FindAsync(FilterDefinition<T> filter, SortDefinition<T> sort)
    {
        var combinedFilter = filter.AndNotDeleted();
        return await Collection.Find(combinedFilter).Sort(sort).ToListAsync();
    }

    /// <summary>
    /// 分页查询
    /// </summary>
    public virtual async Task<(List<T> items, long total)> GetPagedAsync(
        FilterDefinition<T>? filter, 
        int page, 
        int pageSize, 
        SortDefinition<T>? sort = null)
    {
        var finalFilter = filter == null 
            ? MongoFilterExtensions.NotDeleted<T>() 
            : filter.AndNotDeleted();
        
        var total = await Collection.CountDocumentsAsync(finalFilter);
        
        var query = Collection.Find(finalFilter);
        
        if (sort != null)
        {
            query = query.Sort(sort);
        }
        
        var items = await query
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
        
        return (items, total);
    }

    /// <summary>
    /// 批量软删除
    /// </summary>
    public virtual async Task<long> SoftDeleteManyAsync(FilterDefinition<T> filter, string? reason = null)
    {
        var currentUserId = GetCurrentUserId();
        var combinedFilter = filter.AndNotDeleted();
        
        return await Collection.SoftDeleteManyAsync(combinedFilter, currentUserId, reason);
    }

    /// <summary>
    /// 批量更新
    /// </summary>
    public virtual async Task<long> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update)
    {
        var combinedFilter = filter.AndNotDeleted();
        
        // 自动添加 UpdatedAt 字段
        update = update.Set(x => x.UpdatedAt, DateTime.UtcNow);
        
        var result = await Collection.UpdateManyAsync(combinedFilter, update);
        return result.ModifiedCount;
    }
}

