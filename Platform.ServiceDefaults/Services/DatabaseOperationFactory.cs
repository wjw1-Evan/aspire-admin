using System.Reflection;
using Microsoft.Extensions.Logging;
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
    private readonly ILogger<DatabaseOperationFactory<T>> _logger;

    public DatabaseOperationFactory(
        IMongoDatabase database,
        ITenantContext tenantContext,
        ILogger<DatabaseOperationFactory<T>> logger)
    {
        // 支持自定义集合名称，优先使用 BsonCollectionName 特性
        var collectionNameAttribute = typeof(T).GetCustomAttribute<BsonCollectionNameAttribute>();
        var collectionName = collectionNameAttribute?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";
        
        _collection = database.GetCollection<T>(collectionName);
        _tenantContext = tenantContext;
        _logger = logger;
        
    }

    // ========== 公共辅助 ==========

    private (string? userId, string? username) GetActor()
    {
        // 临时方案：审计字段使用同步等待（审计字段不影响业务逻辑）
        // TODO: 考虑将审计字段获取改为可选或延迟异步加载
        var usernameTask = _tenantContext.GetCurrentUsernameAsync();
        var username = usernameTask.IsCompletedSuccessfully ? usernameTask.Result : null;
        return (_tenantContext.GetCurrentUserId(), username);
    }

    private void TrySetProperty(object target, string propertyName, object? value)
    {
        if (target == null || value == null)
            return;
            
        var prop = target.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null && prop.CanWrite)
        {
            // 检查值类型是否兼容
            var propType = prop.PropertyType;
            if (propType.IsInstanceOfType(value) || 
                (value is string strValue && propType == typeof(string)))
            {
                prop.SetValue(target, value);
            }
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
        
        if (count == 0)
        {
            return entityList;
        }
        
        // 优化：只调用一次 GetActor，避免重复调用
        var (uid, uname) = GetActor();
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
        
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .In(e => e.Id, idList)
            .Build();
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
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var cursor = await _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = finalSort,
            Limit = limit
        });
        
        var results = await cursor.ToListAsync();
        
        // 只在慢查询或Debug级别记录日志
        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug("查询 {EntityType}: {Count} 个", typeof(T).Name, results.Count);
        }
        
        return results;
    }

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    public async Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10)
    {
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var skip = (page - 1) * pageSize;
        
        // 并行执行查询和计数（优化性能）
        var findTask = _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = finalSort,
            Skip = skip,
            Limit = pageSize
        });
        var countTask = _collection.CountDocumentsAsync(finalFilter);
        
        await Task.WhenAll(findTask, countTask);
        
        var cursor = await findTask;
        var items = await cursor.ToListAsync();
        var total = await countTask;
        
        // 只在Debug级别记录详细信息
        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug("分页查询 {EntityType}: {Count} 个/共 {Total} 个, 页码: {Page}", 
                typeof(T).Name, items.Count, total, page);
        }

        return (items, total);
    }

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    public async Task<T?> GetByIdAsync(string id)
    {
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Equal(e => e.IsDeleted, false)
            .Build();
        
        // 应用多租户过滤
        var tenantFilter = ApplyTenantFilter(filter);
        
        var result = await _collection.Find(tenantFilter).FirstOrDefaultAsync();
        
        // 只在未找到时记录警告，减少日志开销
        if (result == null && _logger.IsEnabled(LogLevel.Warning))
        {
            _logger.LogWarning("根据ID获取 {EntityType} 实体未找到: {Id}", typeof(T).Name, id);
        }
        
        return result;
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
        var tenantFilter = ApplyTenantFilter(filter);
        
        // 使用 Limit=1 优化性能，找到第一个就返回
        var count = await _collection.CountDocumentsAsync(tenantFilter, new CountOptions { Limit = 1 });
        return count > 0;
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        // 应用多租户过滤和软删除过滤
        var finalFilter = ApplyDefaultFilters(filter);
        
        var count = await _collection.CountDocumentsAsync(finalFilter);
        
        // 只在Debug级别记录详细信息
        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug("获取 {EntityType} 实体数量: {Count}", typeof(T).Name, count);
        }
        
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
        
        // ✅ 默认按创建时间倒序排序（最新优先）- 使用表达式方式
        var finalSort = sort ?? CreateSortBuilder()
            .Descending(e => e.CreatedAt)
            .Build();
        
        var cursor = await _collection.FindAsync(finalFilter, new FindOptions<T>
        {
            Sort = finalSort,
            Limit = limit
        });
        
        return await cursor.ToListAsync();
    }

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id)
    {
        // ✅ 使用表达式构建过滤器
        var filter = CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Equal(e => e.IsDeleted, false)
            .Build();
        
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
        // ⚠️ 警告：同步方法调用异步接口，不推荐使用
        // 建议使用 TenantExtensions.GetCurrentUserAsync 或注入 ITenantContext 并调用异步方法
        var task = _tenantContext.GetCurrentUsernameAsync();
        return task.IsCompletedSuccessfully ? task.Result : null;
    }

    /// <summary>
    /// 获取当前企业ID（统一从数据库读取）
    /// </summary>
    public string? GetCurrentCompanyId()
    {
        // ⚠️ 警告：同步方法调用异步接口，不推荐使用
        // 建议使用 TenantExtensions.GetCurrentCompanyIdAsync 或注入 ITenantContext 并调用异步方法
        var task = _tenantContext.GetCurrentCompanyIdAsync();
        return task.IsCompletedSuccessfully ? task.Result : null;
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
    private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
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

        var companyId = ResolveCurrentCompanyId();
        if (string.IsNullOrEmpty(companyId))
        {
            // 只在警告级别记录，避免过多日志
            _logger.LogWarning("实体 {EntityType} 实现了 IMultiTenant 但无法获取当前企业ID", typeof(T).Name);
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
    /// ⚠️ 变更：不再重复查询数据库，直接使用 ITenantContext 提供的数据
    /// ⚠️ 警告：同步方法调用异步接口，不推荐使用
    /// </summary>
    private string? ResolveCurrentCompanyId()
    {
        // ✅ 直接使用 ITenantContext 从数据库读取的企业ID
        // ⚠️ 注意：GetAwaiter().GetResult() 在多租户过滤场景是必要的
        // 虽然可能在某些情况下有死锁风险，但对于只读的企业ID获取，风险相对较低
        var companyId = _tenantContext.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();
        return companyId;
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
    private FilterDefinition<T> ApplyDefaultFilters(FilterDefinition<T>? filter)
    {
        // 如果 filter 为 null，创建一个空的过滤器（使用表达式方式）
        var baseFilter = filter ?? CreateFilterBuilder().Build();
        var tenantFilter = ApplyTenantFilter(baseFilter);
        return ApplySoftDeleteFilter(tenantFilter);
    }

    /// <summary>
    /// 构建查询信息字符串（仅在Debug级别需要时调用）
    /// </summary>
    private string BuildQueryInfo(FilterDefinition<T> filter, SortDefinition<T>? sort = null, int? limit = null)
    {
        if (!_logger.IsEnabled(LogLevel.Debug))
        {
            return string.Empty;  // Debug未启用时跳过构建
        }
        
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
}