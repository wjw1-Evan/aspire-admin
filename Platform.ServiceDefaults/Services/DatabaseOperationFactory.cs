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

    private static void TrySetProperty(object target, string propertyName, object? value)
    {
        if (target == null || value == null)
            return;
            
        var prop = target.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null && prop.CanWrite)
        {
            // 检查值类型是否兼容
            var propType = prop.PropertyType;
            if (propType.IsInstanceOfType(value) || 
                (value is string && propType == typeof(string)))
            {
                prop.SetValue(target, value);
            }
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

        // 设置创建人
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(entity, "CreatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(entity, "CreatedByUsername", username);
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
        var count = entityList.Count;
        
        if (count == 0)
        {
            return entityList;
        }
        
        // 优化：只调用一次 GetActorAsync，避免重复调用
        var (uid, uname) = await GetActorAsync().ConfigureAwait(false);
        var now = DateTime.UtcNow;
        
        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            entity.IsDeleted = false;
            
            if (!string.IsNullOrEmpty(uid))
            {
                TrySetProperty(entity, "CreatedBy", uid);
            }
            if (!string.IsNullOrEmpty(uname))
            {
                TrySetProperty(entity, "CreatedByUsername", uname);
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
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        // 设置时间戳与更新人
        replacement.UpdatedAt = DateTime.UtcNow;
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(replacement, "UpdatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(replacement, "UpdatedByUsername", username);
        }

        return await _collection.FindOneAndReplaceAsync(tenantFilter, replacement, options).ConfigureAwait(false);
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
    /// 批量软删除（原子操作）
    /// 注意：该方法会自动应用租户过滤（如果实体实现 IMultiTenant），确保只能删除当前企业的数据
    /// </summary>
    public async Task<long> SoftDeleteManyAsync(IEnumerable<string> ids)
    {
        var idList = ids.ToList();
        
        if (idList.Count == 0)
        {
            return 0;
        }
        
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .In(e => e.Id, idList)
            .Build();
        
        // ✅ 应用多租户过滤和软删除过滤，确保只能删除当前企业的未删除数据
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
        // 应用多租户过滤和软删除过滤
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var findOptions = new FindOptions<T>
        {
            Sort = finalSort,
            Limit = limit
        };
        
        if (projection != null)
        {
            findOptions.Projection = projection;
        }
        
        var cursor = await _collection.FindAsync(finalFilter, findOptions).ConfigureAwait(false);
        
        return await cursor.ToListAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    public async Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10, ProjectionDefinition<T>? projection = null)
    {
        // 应用多租户过滤和软删除过滤
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var skip = (page - 1) * pageSize;
        
        // 并行执行查询和计数（优化性能）
        var findOptions = new FindOptions<T>
        {
            Sort = finalSort,
            Skip = skip,
            Limit = pageSize
        };
        
        if (projection != null)
        {
            findOptions.Projection = projection;
        }
        
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
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Equal(e => e.IsDeleted, false)
            .Build();
        
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        if (projection != null)
        {
            var projectedFluent = _collection.Find(tenantFilter).Project(projection);
            return await projectedFluent.As<T>().FirstOrDefaultAsync().ConfigureAwait(false);
        }
        
        return await _collection.Find(tenantFilter).FirstOrDefaultAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    public async Task<bool> ExistsAsync(string id)
    {
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Equal(e => e.IsDeleted, false)
            .Build();
        
        // 应用多租户过滤
        var tenantFilter = await ApplyTenantFilterAsync(filter).ConfigureAwait(false);
        
        // 使用 Limit=1 优化性能，找到第一个就返回
        var count = await _collection.CountDocumentsAsync(tenantFilter, new CountOptions { Limit = 1 }).ConfigureAwait(false);
        return count > 0;
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        // 应用多租户过滤和软删除过滤
        var finalFilter = await ApplyDefaultFiltersAsync(filter).ConfigureAwait(false);
        
        return await _collection.CountDocumentsAsync(finalFilter).ConfigureAwait(false);
    }

    // ========== 不带租户过滤的操作 ==========

    /// <summary>
    /// 执行查询操作（不带租户过滤）
    /// </summary>
    public async Task<List<T>> FindWithoutTenantFilterAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var findOptions = new FindOptions<T>
        {
            Sort = finalSort,
            Limit = limit
        };
        
        if (projection != null)
        {
            findOptions.Projection = projection;
        }
        
        var cursor = await _collection.FindAsync(finalFilter, findOptions);
        
        return await cursor.ToListAsync();
    }

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id, ProjectionDefinition<T>? projection = null)
    {
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Equal(e => e.IsDeleted, false)
            .Build();
        
        if (projection != null)
        {
            var projectedFluent = _collection.Find(filter).Project(projection);
            return await projectedFluent.As<T>().FirstOrDefaultAsync();
        }
        
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 查找并替换（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndReplaceWithoutTenantFilterAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        // 保存原始 Id
        var originalId = replacement.Id;
        
        // 创建副本用于替换，移除 Id 字段以避免修改 MongoDB 的 _id 字段
        // 当使用 FindOneAndReplace 时，如果 replacement 有 Id，MongoDB 会尝试修改 _id 导致错误
        replacement.Id = null!;
        
        // 设置时间戳与更新人
        replacement.UpdatedAt = DateTime.UtcNow;
        var (userId, username) = await GetActorAsync().ConfigureAwait(false);
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(replacement, "UpdatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(replacement, "UpdatedByUsername", username);
        }

        var result = await _collection.FindOneAndReplaceAsync(finalFilter, replacement, options).ConfigureAwait(false);
        
        // 恢复原始对象的 Id
        replacement.Id = originalId;
        
        // 如果结果是新插入的文档且原来有 Id，恢复 Id 到结果
        if (result != null && string.IsNullOrEmpty(result.Id) && !string.IsNullOrEmpty(originalId))
        {
            result.Id = originalId;
        }
        
        return result;
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

    /// <summary>
    /// 获取当前用户ID
    /// </summary>
    public string? GetCurrentUserId()
    {
        return _tenantContext.GetCurrentUserId();
    }


    /// <summary>
    /// 获取必需的用户ID（为空则抛异常）
    /// </summary>
    public string GetRequiredUserId()
    {
        var userId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedAccessException("未找到当前用户信息");
        return userId;
    }

    /// <summary>
    /// 获取必需的企业ID（统一从数据库读取，为空则抛异常）
    /// </summary>
    public async Task<string> GetRequiredCompanyIdAsync()
    {
        var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");
        return companyId;
    }



    // ========== 私有辅助方法 ==========

    // 缓存 CompanyId 字段名（避免重复反射）- 延迟初始化
    private static string? _companyIdFieldName;
    private static readonly object _companyIdFieldNameLock = new object();
    
    /// <summary>
    /// 获取 CompanyId 字段的 MongoDB 字段名（静态缓存，避免重复反射）
    /// </summary>
    private static string? GetCompanyIdFieldName()
    {
        if (_companyIdFieldName != null)
            return _companyIdFieldName;
            
        lock (_companyIdFieldNameLock)
        {
            if (_companyIdFieldName != null)
                return _companyIdFieldName;
                
            if (!typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
            {
                _companyIdFieldName = null;
                return null;
            }
            
            // GetProperty 和 GetCustomAttribute 不会抛出异常（除非内存不足等极端情况）
            var companyIdProperty = typeof(T).GetProperty("CompanyId");
            if (companyIdProperty != null)
            {
                var bsonElementAttr = companyIdProperty.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonElementAttribute>();
                _companyIdFieldName = bsonElementAttr?.ElementName ?? "companyId";
            }
            else
            {
                _companyIdFieldName = "companyId";  // 默认值
            }
            
            return _companyIdFieldName;
        }
    }
    
    /// <summary>
    /// 应用多租户过滤
    /// ⚠️ 修复：使用 MongoDB 字段名（从 BsonElement 特性获取）而非 C# 属性名
    /// 优化：使用缓存的字段名，减少反射调用
    /// </summary>
    private async Task<FilterDefinition<T>> ApplyTenantFilterAsync(FilterDefinition<T> filter)
    {
        // 检查实体是否实现多租户接口
        if (!typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
        {
            return filter;
        }

        var fieldName = GetCompanyIdFieldName();
        if (string.IsNullOrEmpty(fieldName))
        {
            return filter;
        }

        var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
        {
            return filter;
        }

        // ✅ 使用表达式构建企业ID过滤器
        // 注意：由于需要支持动态字段名（可能不是 CompanyId），这里仍需要使用字符串字段名
        // 但尽量保持表达式风格，使用 Builders 的表达式方法
        var companyFilter = Builders<T>.Filter.Eq(fieldName, companyId);
        return Builders<T>.Filter.And(filter, companyFilter);
    }

    /// <summary>
    /// 统一解析当前企业ID：从 ITenantContext 获取（ITenantContext 已从数据库读取）
    /// </summary>
    private async Task<string?> ResolveCurrentCompanyIdAsync()
    {
        // ✅ 直接使用 ITenantContext 从数据库读取的企业ID
        return await _tenantContext.GetCurrentCompanyIdAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// 应用软删除过滤
    /// </summary>
    private FilterDefinition<T> ApplySoftDeleteFilter(FilterDefinition<T>? filter)
    {
        // ✅ 使用表达式构建软删除过滤器
        var softDeleteFilter = CreateFilterBuilder()
            .Equal(e => e.IsDeleted, false)
            .Build();
        
        if (filter == null)
            return softDeleteFilter;
            
        // 合并过滤器
        return Builders<T>.Filter.And(filter, softDeleteFilter);
    }

    /// <summary>
    /// 应用默认过滤（多租户 + 软删除）
    /// </summary>
    private async Task<FilterDefinition<T>> ApplyDefaultFiltersAsync(FilterDefinition<T>? filter)
    {
        // 如果 filter 为 null，创建一个空的过滤器（使用表达式方式）
        var baseFilter = filter ?? CreateFilterBuilder().Build();
        var tenantFilter = await ApplyTenantFilterAsync(baseFilter).ConfigureAwait(false);
        return ApplySoftDeleteFilter(tenantFilter);
    }

}