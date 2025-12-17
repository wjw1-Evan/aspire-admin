using System.Linq;
using System.Reflection;
using MongoDB.Driver;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 简化的数据库操作工厂实现 - 完全基于原子操作
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public class DatabaseOperationFactory<T> : IDatabaseOperationFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly IMongoCollection<T> _collection;
    private readonly ITenantContext _tenantContext;

    public DatabaseOperationFactory(
        IMongoDatabase database,
        ITenantContext tenantContext)
    {
        ArgumentNullException.ThrowIfNull(database);
        ArgumentNullException.ThrowIfNull(tenantContext);
        
        // 支持自定义集合名称，优先使用 BsonCollectionName 特性
        var collectionNameAttribute = typeof(T).GetCustomAttribute<BsonCollectionNameAttribute>();
        var collectionName = collectionNameAttribute?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";
        
        _collection = database.GetCollection<T>(collectionName);
        _tenantContext = tenantContext;
    }

    // ========== 公共辅助 ==========

    /// <summary>
    /// 获取当前操作者信息（用户ID和用户名）
    /// </summary>
    private async Task<(string? userId, string? username)> GetActorAsync()
    {
        var userId = _tenantContext.GetCurrentUserId();
        var username = await _tenantContext.GetCurrentUsernameAsync().ConfigureAwait(false);
        return (userId, username);
    }

    /// <summary>
    /// 读取实体上已存在的企业ID（用于后台线程缺少租户上下文的场景）
    /// </summary>
    private static string? GetExistingCompanyId(T entity)
    {
        if (entity is IMultiTenant multiTenant)
        {
            return string.IsNullOrWhiteSpace(multiTenant.CompanyId) ? null : multiTenant.CompanyId;
        }
        return null;
    }

    /// <summary>
    /// 设置审计属性（使用反射，因为审计字段在不同实体中名称可能不同）
    /// </summary>
    private static void SetAuditProperty(T entity, string propertyName, string? value)
    {
        if (entity == null || string.IsNullOrEmpty(value))
            return;
            
        var prop = typeof(T).GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null && prop.CanWrite && prop.PropertyType == typeof(string))
        {
            prop.SetValue(entity, value);
        }
    }

    private async Task<UpdateDefinition<T>> WithUpdateAuditAsync(UpdateDefinition<T> update)
    {
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        var builder = Builders<T>.Update;
        var audit = new List<UpdateDefinition<T>>
        {
            builder.Set("updatedAt", DateTime.UtcNow)
        };

        if (!string.IsNullOrEmpty(userId))
        {
            audit.Add(builder.Set("updatedBy", userId));
        }
        if (!string.IsNullOrEmpty(username))
        {
            audit.Add(builder.Set("updatedByUsername", username));
        }

        return builder.Combine(update, builder.Combine(audit));
    }

    private async Task<UpdateDefinition<T>> WithSoftDeleteAuditAsync(UpdateDefinition<T> update)
    {
        var (userId, _) = await GetActorAsync().ConfigureAwait(false);
        var builder = Builders<T>.Update;
        var audit = new List<UpdateDefinition<T>>
        {
            builder.Set("isDeleted", true),
            builder.Set("deletedAt", DateTime.UtcNow),
            builder.Set("updatedAt", DateTime.UtcNow)
        };
        if (!string.IsNullOrEmpty(userId))
        {
            audit.Add(builder.Set("deletedBy", userId));
        }
        return builder.Combine(update, builder.Combine(audit));
    }

    /// <summary>
    /// 创建过滤器构建器
    /// </summary>
    public FilterBuilder<T> CreateFilterBuilder()
    {
        return new FilterBuilder<T>();
    }

    /// <summary>
    /// 创建排序构建器
    /// </summary>
    public SortBuilder<T> CreateSortBuilder()
    {
        return new SortBuilder<T>();
    }

    /// <summary>
    /// 创建更新构建器
    /// </summary>
    public UpdateBuilder<T> CreateUpdateBuilder()
    {
        return new UpdateBuilder<T>();
    }

    /// <summary>
    /// 创建投影构建器
    /// </summary>
    public ProjectionBuilder<T> CreateProjectionBuilder()
    {
        return new ProjectionBuilder<T>();
    }

    // ========== 核心原子操作 ==========

    /// <summary>
    /// 创建实体（原子操作）
    /// </summary>
    public async Task<T> CreateAsync(T entity)
    {
        // 设置时间戳
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.IsDeleted = false;

        // 设置创建人（通过反射设置审计字段）
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        SetAuditProperty(entity, "CreatedBy", userId);
        SetAuditProperty(entity, "CreatedByUsername", username);

        // 写入企业隔离字段
        if (entity is IMultiTenant multiTenant)
        {
            var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
            companyId ??= multiTenant.CompanyId;
            if (string.IsNullOrEmpty(companyId))
                throw new UnauthorizedAccessException("未找到当前企业信息");
            multiTenant.CompanyId = companyId;
        }

        await _collection.InsertOneAsync(entity).ConfigureAwait(false);
        return entity;
    }

    /// <summary>
    /// 批量创建实体（原子操作）
    /// </summary>
    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities)
    {
        var entityList = entities.ToList();
        if (entityList.Count == 0)
            return entityList;
        
        var (uid, uname) = await GetActorAsync().ConfigureAwait(false);
        var now = DateTime.UtcNow;
        
        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            entity.IsDeleted = false;
            SetAuditProperty(entity, "CreatedBy", uid);
            SetAuditProperty(entity, "CreatedByUsername", uname);

            if (entity is IMultiTenant multiTenant)
            {
                var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
                companyId ??= multiTenant.CompanyId;
                if (string.IsNullOrEmpty(companyId))
                    throw new UnauthorizedAccessException("未找到当前企业信息");
                multiTenant.CompanyId = companyId;
            }
        }

        await _collection.InsertManyAsync(entityList).ConfigureAwait(false);
        return entityList;
    }

    /// <summary>
    /// 查找并替换（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndReplaceAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null)
    {
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        return await FindOneAndReplaceInternalAsync(tenantFilter, replacement, options).ConfigureAwait(false);
    }
    
    /// <summary>
    /// 查找并替换内部实现（共享逻辑）
    /// </summary>
    private async Task<T?> FindOneAndReplaceInternalAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options)
    {
        // 更新审计字段
        replacement.UpdatedAt = DateTime.UtcNow;
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        SetAuditProperty(replacement, "UpdatedBy", userId);
        SetAuditProperty(replacement, "UpdatedByUsername", username);
        
        var result = await _collection.FindOneAndReplaceAsync(filter, replacement, options).ConfigureAwait(false);
        return result;
    }

    /// <summary>
    /// 查找并更新（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null)
    {
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        // 确保更新时间戳与更新人
        var updateWithTimestamp = await WithUpdateAuditAsync(update).ConfigureAwait(false);

        return await _collection.FindOneAndUpdateAsync(tenantFilter, updateWithTimestamp, options).ConfigureAwait(false);
    }

    /// <summary>
    /// 查找并软删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndSoftDeleteAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null)
    {
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        var update = await WithSoftDeleteAuditAsync(Builders<T>.Update.Combine()).ConfigureAwait(false);

        return await _collection.FindOneAndUpdateAsync(tenantFilter, update, options).ConfigureAwait(false);
    }

    /// <summary>
    /// 查找并硬删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndDeleteAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null)
    {
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);

        return await _collection.FindOneAndDeleteAsync(tenantFilter, options).ConfigureAwait(false);
    }

    /// <summary>
    /// 批量更新（原子操作）
    /// </summary>
    public async Task<long> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update)
    {
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        // 确保更新时间戳与更新人
        var updateWithTimestamp = await WithUpdateAuditAsync(update).ConfigureAwait(false);

        var result = await _collection.UpdateManyAsync(tenantFilter, updateWithTimestamp).ConfigureAwait(false);
        return result.ModifiedCount;
    }

    /// <summary>
    /// 批量软删除（原子操作，自动应用租户过滤）
    /// </summary>
    public async Task<long> SoftDeleteManyAsync(IEnumerable<string> ids)
    {
        var idList = ids.ToList();
        if (idList.Count == 0)
            return 0;
        
        var filter = Builders<T>.Filter.In(e => e.Id, idList);
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        var update = await WithSoftDeleteAuditAsync(Builders<T>.Update.Combine()).ConfigureAwait(false);

        var result = await _collection.UpdateManyAsync(finalFilter, update).ConfigureAwait(false);
        return result.ModifiedCount;
    }

    // ========== 查询操作 ==========

    /// <summary>
    /// 执行查询操作
    /// </summary>
    public async Task<List<T>> FindAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null)
    {
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        var finalSort = sort ?? Builders<T>.Sort.Descending(e => e.CreatedAt);
        
        var findOptions = new FindOptions<T> { Sort = finalSort, Limit = limit };
        if (projection != null)
            findOptions.Projection = projection;
        
        var cursor = await _collection.FindAsync(finalFilter, findOptions).ConfigureAwait(false);
        return await cursor.ToListAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    public async Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10, ProjectionDefinition<T>? projection = null)
    {
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        var finalSort = sort ?? Builders<T>.Sort.Descending(e => e.CreatedAt);
        var skip = (page - 1) * pageSize;
        
        var findOptions = new FindOptions<T> { Sort = finalSort, Skip = skip, Limit = pageSize };
        if (projection != null)
            findOptions.Projection = projection;
        
        var findTask = _collection.FindAsync(finalFilter, findOptions);
        var countTask = _collection.CountDocumentsAsync(finalFilter);
        
        await Task.WhenAll(findTask, countTask).ConfigureAwait(false);
        
        var cursor = await findTask.ConfigureAwait(false);
        var items = await cursor.ToListAsync().ConfigureAwait(false);
        var total = await countTask.ConfigureAwait(false);

        return (items, total);
    }

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    public async Task<T?> GetByIdAsync(string id, ProjectionDefinition<T>? projection = null)
    {
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(e => e.Id, id),
            Builders<T>.Filter.Eq(e => e.IsDeleted, false)
        );
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        if (projection != null)
        {
            return await _collection.Find(tenantFilter).Project(projection).As<T>().FirstOrDefaultAsync().ConfigureAwait(false);
        }
        
        return await _collection.Find(tenantFilter).FirstOrDefaultAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    public async Task<bool> ExistsAsync(string id)
    {
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(e => e.Id, id),
            Builders<T>.Filter.Eq(e => e.IsDeleted, false)
        );
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        var count = await _collection.CountDocumentsAsync(tenantFilter, new CountOptions { Limit = 1 }).ConfigureAwait(false);
        return count > 0;
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        return await _collection.CountDocumentsAsync(finalFilter).ConfigureAwait(false);
    }

    // ========== 不带租户过滤的操作 ==========

    /// <summary>
    /// 执行查询操作（不带租户过滤）
    /// </summary>
    public async Task<List<T>> FindWithoutTenantFilterAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null)
    {
        var finalFilter = ApplySoftDeleteFilter(filter);
        var finalSort = sort ?? Builders<T>.Sort.Descending(e => e.CreatedAt);
        
        var findOptions = new FindOptions<T> { Sort = finalSort, Limit = limit };
        if (projection != null)
            findOptions.Projection = projection;
        
        var cursor = await _collection.FindAsync(finalFilter, findOptions);
        return await cursor.ToListAsync();
    }

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id, ProjectionDefinition<T>? projection = null)
    {
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(e => e.Id, id),
            Builders<T>.Filter.Eq(e => e.IsDeleted, false)
        );
        
        if (projection != null)
        {
            return await _collection.Find(filter).Project(projection).As<T>().FirstOrDefaultAsync();
        }
        
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 查找并替换（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndReplaceWithoutTenantFilterAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null)
    {
        var finalFilter = ApplySoftDeleteFilter(filter);
        return await FindOneAndReplaceInternalAsync(finalFilter, replacement, options).ConfigureAwait(false);
    }

    /// <summary>
    /// 查找并更新（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndUpdateWithoutTenantFilterAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        // 确保更新时间戳与更新人
        var updateWithTimestamp = await WithUpdateAuditAsync(update).ConfigureAwait(false);

        var result = await _collection.FindOneAndUpdateAsync(finalFilter, updateWithTimestamp, options).ConfigureAwait(false);
        return result;
    }

    /// <summary>
    /// 查找并软删除（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndSoftDeleteWithoutTenantFilterAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        var update = await WithSoftDeleteAuditAsync(Builders<T>.Update.Combine()).ConfigureAwait(false);

        var result = await _collection.FindOneAndUpdateAsync(finalFilter, update, options).ConfigureAwait(false);
        return result;
    }

    /// <summary>
    /// 查找并硬删除（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndDeleteWithoutTenantFilterAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        var result = await _collection.FindOneAndDeleteAsync(finalFilter, options);
        return result;
    }

    // ========== 便捷方法 ==========

    public string? GetCurrentUserId() => _tenantContext.GetCurrentUserId();

    public string GetRequiredUserId()
    {
        var userId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("未找到当前用户信息");
        return userId;
    }

    public async Task<string> GetRequiredCompanyIdAsync()
    {
        var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");
        return companyId;
    }

    private async Task<FilterDefinition<T>> ApplyTenantFilterAsync(FilterDefinition<T> filter)
    {
        if (!typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
            return filter;

        var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
            return filter;

        // 直接使用 CompanyId 属性（MongoDB 驱动会自动处理 BsonElement 特性）
        return Builders<T>.Filter.And(filter, Builders<T>.Filter.Eq("companyId", companyId));
    }

    private async Task<string?> ResolveCurrentCompanyIdAsync() =>
        await _tenantContext.GetCurrentCompanyIdAsync().ConfigureAwait(false);

    private FilterDefinition<T> ApplySoftDeleteFilter(FilterDefinition<T>? filter)
    {
        var softDeleteFilter = Builders<T>.Filter.Eq(e => e.IsDeleted, false);
        return filter == null ? softDeleteFilter : Builders<T>.Filter.And(filter, softDeleteFilter);
    }

    private async Task<FilterDefinition<T>> ApplyDefaultFiltersAsync(FilterDefinition<T>? filter)
    {
        var baseFilter = filter ?? Builders<T>.Filter.Empty;
        var tenantFilter = await ApplyTenantFilterAsync(baseFilter).ConfigureAwait(false);
        return ApplySoftDeleteFilter(tenantFilter);
    }

}