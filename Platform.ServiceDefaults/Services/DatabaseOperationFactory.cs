using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MongoDB.Bson;
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
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<DatabaseOperationFactory<T>> _logger;

    public DatabaseOperationFactory(
        IMongoDatabase database,
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<DatabaseOperationFactory<T>> logger)
    {
        // 支持自定义集合名称，优先使用 BsonCollectionName 特性
        var collectionNameAttribute = typeof(T).GetCustomAttribute<BsonCollectionNameAttribute>();
        var collectionName = collectionNameAttribute?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";
        
        _collection = database.GetCollection<T>(collectionName);
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
        _database = database;
    }

    private readonly IMongoDatabase _database;

    // ========== 公共辅助 ==========

    private (string? userId, string? username) GetActor()
    {
        return (_tenantContext.GetCurrentUserId(), _tenantContext.GetCurrentUsername());
    }

    private void TrySetProperty(object target, string propertyName, object? value)
    {
        try
        {
            var prop = target.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            if (prop != null && prop.CanWrite)
            {
                prop.SetValue(target, value);
            }
        }
        catch
        {
            // 忽略反射赋值失败，保持容错
        }
    }

    private UpdateDefinition<T> WithUpdateAudit(UpdateDefinition<T> update)
    {
        var (userId, username) = GetActor();
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

    private UpdateDefinition<T> WithSoftDeleteAudit(UpdateDefinition<T> update)
    {
        var (userId, _) = GetActor();
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

    // ========== 核心原子操作 ==========

    /// <summary>
    /// 创建实体（原子操作）
    /// </summary>
    public async Task<T> CreateAsync(T entity)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        var entityId = entity.Id ?? "new";
        
        _logger.LogDebug("开始创建 {EntityType} 实体: {EntityId}", entityType, entityId);
        
        // 设置时间戳
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.IsDeleted = false;

        // 设置创建人
        var (userId, username) = GetActor();
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(entity, "CreatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(entity, "CreatedByUsername", username);
        }

        await _collection.InsertOneAsync(entity);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功创建 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
            entityType, entity.Id, elapsed);
        
        return entity;
    }

    /// <summary>
    /// 批量创建实体（原子操作）
    /// </summary>
    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        var entityList = entities.ToList();
        var count = entityList.Count;
        
        _logger.LogDebug("开始批量创建 {EntityType} 实体: {Count} 个", entityType, count);
        
        var now = DateTime.UtcNow;
        
        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            entity.IsDeleted = false;
            var (uid, uname) = GetActor();
            if (!string.IsNullOrEmpty(uid))
            {
                TrySetProperty(entity, "CreatedBy", uid);
            }
            if (!string.IsNullOrEmpty(uname))
            {
                TrySetProperty(entity, "CreatedByUsername", uname);
            }
        }

        await _collection.InsertManyAsync(entityList);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功批量创建 {EntityType} 实体: {Count} 个, 耗时: {ElapsedMs}ms", 
            entityType, count, elapsed);
        
        return entityList;
    }

    /// <summary>
    /// 查找并替换（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndReplaceAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        var replacementId = replacement.Id ?? "unknown";
        
        _logger.LogDebug("开始查找并替换 {EntityType} 实体: {ReplacementId}", entityType, replacementId);
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 设置时间戳与更新人
        replacement.UpdatedAt = DateTime.UtcNow;
        var (userId, username) = GetActor();
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(replacement, "UpdatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(replacement, "UpdatedByUsername", username);
        }

        var result = await _collection.FindOneAndReplaceAsync(tenantFilter, replacement, options);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        if (result != null)
        {
            _logger.LogInformation("✅ 成功查找并替换 {EntityType} 实体: {ReplacementId}, 耗时: {ElapsedMs}ms", 
                entityType, replacementId, elapsed);
        }
        else
        {
            _logger.LogWarning("⚠️ 查找并替换 {EntityType} 实体未找到匹配记录: {ReplacementId}, 耗时: {ElapsedMs}ms", 
                entityType, replacementId, elapsed);
        }
        
        return result;
    }

    /// <summary>
    /// 查找并更新（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        _logger.LogDebug("开始查找并更新 {EntityType} 实体", entityType);
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 确保更新时间戳与更新人
        var updateWithTimestamp = WithUpdateAudit(update);

        var result = await _collection.FindOneAndUpdateAsync(tenantFilter, updateWithTimestamp, options);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        if (result != null)
        {
            _logger.LogInformation("✅ 成功查找并更新 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
                entityType, result.Id, elapsed);
        }
        else
        {
            _logger.LogWarning("⚠️ 查找并更新 {EntityType} 实体未找到匹配记录, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
        }
        
        return result;
    }

    /// <summary>
    /// 查找并软删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndSoftDeleteAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        _logger.LogDebug("开始查找并软删除 {EntityType} 实体", entityType);
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        var update = WithSoftDeleteAudit(Builders<T>.Update.Combine());

        var result = await _collection.FindOneAndUpdateAsync(tenantFilter, update, options);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        if (result != null)
        {
            _logger.LogInformation("✅ 成功查找并软删除 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
                entityType, result.Id, elapsed);
        }
        else
        {
            _logger.LogWarning("⚠️ 查找并软删除 {EntityType} 实体未找到匹配记录, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
        }
        
        return result;
    }

    /// <summary>
    /// 查找并硬删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndDeleteAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        _logger.LogDebug("开始查找并硬删除 {EntityType} 实体", entityType);
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        var result = await _collection.FindOneAndDeleteAsync(tenantFilter, options);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        if (result != null)
        {
            _logger.LogInformation("✅ 成功查找并硬删除 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
                entityType, result.Id, elapsed);
        }
        else
        {
            _logger.LogWarning("⚠️ 查找并硬删除 {EntityType} 实体未找到匹配记录, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
        }
        
        return result;
    }

    /// <summary>
    /// 批量更新（原子操作）
    /// </summary>
    public async Task<long> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        _logger.LogDebug("开始批量更新 {EntityType} 实体", entityType);
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 确保更新时间戳与更新人
        var updateWithTimestamp = WithUpdateAudit(update);

        var result = await _collection.UpdateManyAsync(tenantFilter, updateWithTimestamp);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功批量更新 {EntityType} 实体: {ModifiedCount} 个, 耗时: {ElapsedMs}ms", 
            entityType, result.ModifiedCount, elapsed);
        
        return result.ModifiedCount;
    }

    /// <summary>
    /// 批量软删除（原子操作）
    /// </summary>
    public async Task<long> SoftDeleteManyAsync(IEnumerable<string> ids)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        var idList = ids.ToList();
        var count = idList.Count;
        
        _logger.LogDebug("开始批量软删除 {EntityType} 实体: {Count} 个", entityType, count);
        
        var filter = Builders<T>.Filter.In(x => x.Id, idList);
        var update = WithSoftDeleteAudit(Builders<T>.Update.Combine());

        var result = await _collection.UpdateManyAsync(filter, update);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功批量软删除 {EntityType} 实体: {ModifiedCount} 个, 耗时: {ElapsedMs}ms", 
            entityType, result.ModifiedCount, elapsed);
        
        return result.ModifiedCount;
    }

    // ========== 查询操作 ==========

    /// <summary>
    /// 执行查询操作
    /// </summary>
    public async Task<List<T>> FindAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        // 记录查询语句
        var queryInfo = BuildQueryInfo(finalFilter, sort, limit);
        _logger.LogDebug("开始查询 {EntityType} 实体, 查询语句: {QueryInfo}", entityType, queryInfo);
        
        var cursor = await _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = sort,
            Limit = limit
        });
        
        var results = await cursor.ToListAsync();
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功查询 {EntityType} 实体: {Count} 个, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
            entityType, results.Count, elapsed, queryInfo);
        
        return results;
    }

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    public async Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        // 记录查询语句
        var queryInfo = BuildQueryInfo(finalFilter, sort, pageSize);
        _logger.LogDebug("开始分页查询 {EntityType} 实体, 页码: {Page}, 页大小: {PageSize}, 查询语句: {QueryInfo}", entityType, page, pageSize, queryInfo);
        
        var skip = (page - 1) * pageSize;
        
        var cursor = await _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = sort,
            Skip = skip,
            Limit = pageSize
        });
        
        var items = await cursor.ToListAsync();
        var total = await _collection.CountDocumentsAsync(finalFilter);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功分页查询 {EntityType} 实体: {Count} 个/共 {Total} 个, 页码: {Page}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
            entityType, items.Count, total, page, elapsed, queryInfo);

        return (items, total);
    }

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    public async Task<T?> GetByIdAsync(string id)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(x => x.Id, id),
            Builders<T>.Filter.Eq(x => x.IsDeleted, false)
        );
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 记录查询语句
        var queryInfo = BuildQueryInfo(tenantFilter);
        _logger.LogDebug("开始根据ID获取 {EntityType} 实体: {Id}, 查询语句: {QueryInfo}", entityType, id, queryInfo);
        
        var result = await _collection.Find(tenantFilter).FirstOrDefaultAsync();
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        if (result != null)
        {
            _logger.LogInformation("✅ 成功根据ID获取 {EntityType} 实体: {Id}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, id, elapsed, queryInfo);
        }
        else
        {
            _logger.LogWarning("⚠️ 根据ID获取 {EntityType} 实体未找到: {Id}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, id, elapsed, queryInfo);
        }
        
        return result;
    }

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    public async Task<bool> ExistsAsync(string id)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(x => x.Id, id),
            Builders<T>.Filter.Eq(x => x.IsDeleted, false)
        );
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 记录查询语句
        var queryInfo = BuildQueryInfo(tenantFilter);
        _logger.LogDebug("开始检查 {EntityType} 实体是否存在: {Id}, 查询语句: {QueryInfo}", entityType, id, queryInfo);
        
        var count = await _collection.CountDocumentsAsync(tenantFilter, new CountOptions { Limit = 1 });
        var exists = count > 0;
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 检查 {EntityType} 实体是否存在: {Id} = {Exists}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
            entityType, id, exists, elapsed, queryInfo);
        
        return exists;
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        // 记录查询语句
        var queryInfo = BuildQueryInfo(finalFilter);
        _logger.LogDebug("开始获取 {EntityType} 实体数量, 查询语句: {QueryInfo}", entityType, queryInfo);
        
        var count = await _collection.CountDocumentsAsync(finalFilter);
        
        var elapsed = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("✅ 成功获取 {EntityType} 实体数量: {Count}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
            entityType, count, elapsed, queryInfo);
        
        return count;
    }

    // ========== 不带租户过滤的操作 ==========

    /// <summary>
    /// 执行查询操作（不带租户过滤）
    /// </summary>
    public async Task<List<T>> FindWithoutTenantFilterAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        var cursor = await _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = sort,
            Limit = limit
        });
        
        return await cursor.ToListAsync();
    }

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id)
    {
        var filter = Builders<T>.Filter.And(
            Builders<T>.Filter.Eq(x => x.Id, id),
            Builders<T>.Filter.Eq(x => x.IsDeleted, false)
        );
        
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
        var (userId, username) = GetActor();
        if (!string.IsNullOrEmpty(userId))
        {
            TrySetProperty(replacement, "UpdatedBy", userId);
        }
        if (!string.IsNullOrEmpty(username))
        {
            TrySetProperty(replacement, "UpdatedByUsername", username);
        }

        var result = await _collection.FindOneAndReplaceAsync(finalFilter, replacement, options);
        
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
        var updateWithTimestamp = WithUpdateAudit(update);

        var result = await _collection.FindOneAndUpdateAsync(finalFilter, updateWithTimestamp, options);
        return result;
    }

    /// <summary>
    /// 查找并软删除（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndSoftDeleteWithoutTenantFilterAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        var update = WithSoftDeleteAudit(Builders<T>.Update.Combine());

        var result = await _collection.FindOneAndUpdateAsync(finalFilter, update, options);
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
    /// 获取当前用户名
    /// </summary>
    public string? GetCurrentUsername()
    {
        return _tenantContext.GetCurrentUsername();
    }

    /// <summary>
    /// 获取当前企业ID（统一从数据库读取）
    /// </summary>
    public string? GetCurrentCompanyId()
    {
        return ResolveCurrentCompanyId();
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
    public string GetRequiredCompanyId()
    {
        var companyId = ResolveCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");
        return companyId;
    }



    // ========== 私有辅助方法 ==========

    /// <summary>
    /// 应用多租户过滤
    /// </summary>
    private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
    {
        // 检查实体是否实现多租户接口
        if (typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
        {
            var companyId = ResolveCurrentCompanyId();
            if (!string.IsNullOrEmpty(companyId))
            {
                // 使用反射获取 CompanyId 属性
                var companyIdProperty = typeof(T).GetProperty("CompanyId");
                if (companyIdProperty != null)
                {
                    var companyFilter = Builders<T>.Filter.Eq(companyIdProperty.Name, companyId);
                    return Builders<T>.Filter.And(filter, companyFilter);
                }
            }
        }
        
        return filter;
    }

    /// <summary>
    /// 统一解析当前企业ID：统一从数据库 users 集合读取当前用户的 CurrentCompanyId
    /// </summary>
    private string? ResolveCurrentCompanyId()
    {
        try
        {
            // 从数据库读取当前用户的 CurrentCompanyId
            var userId = _tenantContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return null;
            }

            // users 集合（弱类型），仅读取需要的字段
            var users = _database.GetCollection<BsonDocument>("users");
            FilterDefinition<BsonDocument> idFilter;
            try
            {
                idFilter = Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(userId));
            }
            catch
            {
                // userId 不是 ObjectId 格式时，按字符串 Id 字段兜底
                idFilter = Builders<BsonDocument>.Filter.Eq("id", userId);
            }

            var projection = Builders<BsonDocument>.Projection.Include("currentCompanyId");
            var doc = users.Find(idFilter).Project(projection).FirstOrDefault();
            var currentCompanyId = doc?.GetValue("currentCompanyId", BsonNull.Value);
            if (currentCompanyId != null && !currentCompanyId.IsBsonNull && currentCompanyId.IsString)
            {
                return currentCompanyId.AsString;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ResolveCurrentCompanyId 回退读取失败");
        }

        return null;
    }

    /// <summary>
    /// 应用软删除过滤
    /// </summary>
    private FilterDefinition<T> ApplySoftDeleteFilter(FilterDefinition<T>? filter)
    {
        var softDeleteFilter = Builders<T>.Filter.Eq(x => x.IsDeleted, false);
        
        if (filter == null)
            return softDeleteFilter;
            
        return Builders<T>.Filter.And(filter, softDeleteFilter);
    }

    /// <summary>
    /// 应用默认过滤（多租户 + 软删除）
    /// </summary>
    private FilterDefinition<T> ApplyDefaultFilters(FilterDefinition<T>? filter)
    {
        var tenantFilter = ApplyTenantFilter(filter ?? Builders<T>.Filter.Empty);
        return ApplySoftDeleteFilter(tenantFilter);
    }

    /// <summary>
    /// 构建查询信息字符串
    /// </summary>
    private string BuildQueryInfo(FilterDefinition<T> filter, SortDefinition<T>? sort = null, int? limit = null)
    {
        try
        {
            var queryInfo = new List<string>();
            
            // 添加过滤条件
            if (filter != null)
            {
                var registry = MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry;
                var serializer = registry.GetSerializer<T>();
                var args = new MongoDB.Driver.RenderArgs<T>(serializer, registry);
                var filterJson = filter.Render(args);
                queryInfo.Add($"Filter: {filterJson}");
            }
            
            // 添加排序条件
            if (sort != null)
            {
                var registry = MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry;
                var serializer = registry.GetSerializer<T>();
                var args = new MongoDB.Driver.RenderArgs<T>(serializer, registry);
                var sortJson = sort.Render(args);
                queryInfo.Add($"Sort: {sortJson}");
            }
            
            // 添加限制条件
            if (limit.HasValue)
            {
                queryInfo.Add($"Limit: {limit.Value}");
            }
            
            return string.Join(", ", queryInfo);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "构建查询信息失败");
            return "查询信息构建失败";
        }
    }
}