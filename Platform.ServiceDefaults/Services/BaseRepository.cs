using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 泛型仓储基类，提供通用的 CRUD 操作 - 所有微服务通用
/// </summary>
/// <typeparam name="T">实体类型，必须实现 IEntity、ISoftDeletable 和 ITimestamped 接口</typeparam>
public class BaseRepository<T> where T : IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// MongoDB 集合（公开以支持复杂查询场景）
    /// </summary>
    public IMongoCollection<T> Collection { get; }
    
    protected readonly IHttpContextAccessor HttpContextAccessor;
    protected readonly ITenantContext TenantContext;

    public BaseRepository(IMongoDatabase database, string collectionName, IHttpContextAccessor httpContextAccessor, ITenantContext tenantContext)
    {
        Collection = database.GetCollection<T>(collectionName);
        HttpContextAccessor = httpContextAccessor;
        TenantContext = tenantContext;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    protected string? GetCurrentUserId()
    {
        return HttpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 构建租户过滤器（自动添加 CompanyId 和 IsDeleted 过滤）
    /// </summary>
    protected FilterDefinition<T> BuildTenantFilter(FilterDefinition<T>? additionalFilter = null)
    {
        var builder = Builders<T>.Filter;
        var filters = new List<FilterDefinition<T>>
        {
            builder.Eq(e => e.IsDeleted, false)
        };

        // ✅ 如果实体有 CompanyId 属性，强制要求 CompanyId
        if (typeof(T).GetProperty("CompanyId") != null)
        {
            var companyId = TenantContext.GetCurrentCompanyId();
            
            // ✅ CompanyId 为空时抛出异常，防止数据泄露
            if (string.IsNullOrEmpty(companyId))
            {
                throw new UnauthorizedAccessException(
                    "当前用户没有关联的企业，无法访问多租户数据。请确保用户已登录并选择了企业。");
            }
            
            filters.Add(builder.Eq("companyId", companyId));
        }

        if (additionalFilter != null)
        {
            filters.Add(additionalFilter);
        }

        return builder.And(filters);
    }

    /// <summary>
    /// 根据ID获取实体（排除已删除，自动租户过滤）
    /// </summary>
    public virtual async Task<T?> GetByIdAsync(string id)
    {
        var builder = Builders<T>.Filter;
        var idFilter = builder.Eq(e => e.Id, id);
        var filter = BuildTenantFilter(idFilter);
        return await Collection.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 获取所有实体（排除已删除，自动租户过滤）
    /// </summary>
    public virtual async Task<List<T>> GetAllAsync()
    {
        var filter = BuildTenantFilter();
        return await Collection.Find(filter).ToListAsync();
    }

    /// <summary>
    /// 获取所有实体（排除已删除，自动租户过滤，带排序）
    /// </summary>
    public virtual async Task<List<T>> GetAllAsync(SortDefinition<T> sort)
    {
        var filter = BuildTenantFilter();
        return await Collection.Find(filter).Sort(sort).ToListAsync();
    }

    /// <summary>
    /// 创建实体（自动设置CompanyId和时间戳）
    /// </summary>
    public virtual async Task<T> CreateAsync(T entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        
        // 自动设置 CompanyId（如果实体支持多租户）
        if (entity is IMultiTenant multiTenantEntity)
        {
            var companyId = TenantContext.GetCurrentCompanyId();
            if (!string.IsNullOrEmpty(companyId))
            {
                multiTenantEntity.CompanyId = companyId;
            }
        }

        await Collection.InsertOneAsync(entity);
        return entity;
    }

    /// <summary>
    /// 更新实体（自动更新时间戳）
    /// </summary>
    public virtual async Task<bool> UpdateAsync(T entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        
        var builder = Builders<T>.Filter;
        var idFilter = builder.Eq(e => e.Id, entity.Id);
        var filter = BuildTenantFilter(idFilter);
        
        var result = await Collection.ReplaceOneAsync(filter, entity);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 软删除实体（设置 IsDeleted = true）
    /// </summary>
    public virtual async Task<bool> SoftDeleteAsync(string id)
    {
        var builder = Builders<T>.Filter;
        var idFilter = builder.Eq(e => e.Id, id);
        var filter = BuildTenantFilter(idFilter);
        
        var update = Builders<T>.Update
            .Set(e => e.IsDeleted, true)
            .Set(e => e.UpdatedAt, DateTime.UtcNow);
        
        var result = await Collection.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 硬删除实体（从数据库中完全删除）
    /// </summary>
    public virtual async Task<bool> HardDeleteAsync(string id)
    {
        var builder = Builders<T>.Filter;
        var idFilter = builder.Eq(e => e.Id, id);
        var filter = BuildTenantFilter(idFilter);
        
        var result = await Collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    /// <summary>
    /// 批量创建实体
    /// </summary>
    public virtual async Task<List<T>> CreateManyAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        var now = DateTime.UtcNow;
        
        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            
            // 自动设置 CompanyId（如果实体支持多租户）
            if (entity is IMultiTenant multiTenantEntity)
            {
                var companyId = TenantContext.GetCurrentCompanyId();
                if (!string.IsNullOrEmpty(companyId))
                {
                    multiTenantEntity.CompanyId = companyId;
                }
            }
        }

        await Collection.InsertManyAsync(entityList);
        return entityList;
    }

    /// <summary>
    /// 批量软删除实体
    /// </summary>
    public virtual async Task<long> SoftDeleteManyAsync(IEnumerable<string> ids)
    {
        var builder = Builders<T>.Filter;
        var idFilter = builder.In(e => e.Id, ids);
        var filter = BuildTenantFilter(idFilter);
        
        var update = Builders<T>.Update
            .Set(e => e.IsDeleted, true)
            .Set(e => e.UpdatedAt, DateTime.UtcNow);
        
        var result = await Collection.UpdateManyAsync(filter, update);
        return result.ModifiedCount;
    }

    /// <summary>
    /// 分页查询
    /// </summary>
    public virtual async Task<(List<T> items, long total)> GetPagedAsync(
        FilterDefinition<T>? filter = null,
        SortDefinition<T>? sort = null,
        int page = 1,
        int pageSize = 10)
    {
        var tenantFilter = BuildTenantFilter(filter);
        
        var total = await Collection.CountDocumentsAsync(tenantFilter);
        
        var items = await Collection
            .Find(tenantFilter)
            .Sort(sort)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
        
        return (items, total);
    }

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    public virtual async Task<bool> ExistsAsync(string id)
    {
        var builder = Builders<T>.Filter;
        var idFilter = builder.Eq(e => e.Id, id);
        var filter = BuildTenantFilter(idFilter);
        
        var count = await Collection.CountDocumentsAsync(filter);
        return count > 0;
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public virtual async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        var tenantFilter = BuildTenantFilter(filter);
        return await Collection.CountDocumentsAsync(tenantFilter);
    }
}
