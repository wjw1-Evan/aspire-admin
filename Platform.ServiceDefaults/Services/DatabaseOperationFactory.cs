using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
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
        // 使用默认的集合命名约定：类型名转小写复数形式
        var collectionName = typeof(T).Name.ToLowerInvariant() + "s";
        _collection = database.GetCollection<T>(collectionName);
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
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
        
        try
        {
            _logger.LogDebug("开始创建 {EntityType} 实体: {EntityId}", entityType, entityId);
            
            // 设置时间戳
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.IsDeleted = false;

            await _collection.InsertOneAsync(entity);
            
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogInformation("✅ 成功创建 {EntityType} 实体: {EntityId}, 耗时: {ElapsedMs}ms", 
                entityType, entity.Id, elapsed);
            
            return entity;
        }
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 创建 {EntityType} 实体失败: {EntityId}, 耗时: {ElapsedMs}ms", 
                entityType, entityId, elapsed);
            throw;
        }
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
        
        try
        {
            _logger.LogDebug("开始批量创建 {EntityType} 实体: {Count} 个", entityType, count);
            
            var now = DateTime.UtcNow;
            
            foreach (var entity in entityList)
            {
                entity.CreatedAt = now;
                entity.UpdatedAt = now;
                entity.IsDeleted = false;
            }

            await _collection.InsertManyAsync(entityList);
            
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogInformation("✅ 成功批量创建 {EntityType} 实体: {Count} 个, 耗时: {ElapsedMs}ms", 
                entityType, count, elapsed);
            
            return entityList;
        }
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 批量创建 {EntityType} 实体失败: {Count} 个, 耗时: {ElapsedMs}ms", 
                entityType, count, elapsed);
            throw;
        }
    }

    /// <summary>
    /// 查找并替换（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndReplaceAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        var replacementId = replacement.Id ?? "unknown";
        
        try
        {
            _logger.LogDebug("开始查找并替换 {EntityType} 实体: {ReplacementId}", entityType, replacementId);
            
            // 应用多租户过滤
            var tenantFilter = ApplyTenantFilter(filter);
            
            // 设置时间戳
            replacement.UpdatedAt = DateTime.UtcNow;

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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 查找并替换 {EntityType} 实体失败: {ReplacementId}, 耗时: {ElapsedMs}ms", 
                entityType, replacementId, elapsed);
            throw;
        }
    }

    /// <summary>
    /// 查找并更新（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
            _logger.LogDebug("开始查找并更新 {EntityType} 实体", entityType);
            
            // 应用多租户过滤
            var tenantFilter = ApplyTenantFilter(filter);
            
            // 确保更新时间戳
            var updateWithTimestamp = Builders<T>.Update.Combine(
                update,
                Builders<T>.Update.Set(x => x.UpdatedAt, DateTime.UtcNow)
            );

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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 查找并更新 {EntityType} 实体失败, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
            throw;
        }
    }

    /// <summary>
    /// 查找并软删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndSoftDeleteAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
            _logger.LogDebug("开始查找并软删除 {EntityType} 实体", entityType);
            
            // 应用多租户过滤
            var tenantFilter = ApplyTenantFilter(filter);
            
            var update = Builders<T>.Update
                .Set(x => x.IsDeleted, true)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);

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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 查找并软删除 {EntityType} 实体失败, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
            throw;
        }
    }

    /// <summary>
    /// 查找并硬删除（原子操作）
    /// </summary>
    public async Task<T?> FindOneAndDeleteAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 查找并硬删除 {EntityType} 实体失败, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
            throw;
        }
    }

    /// <summary>
    /// 批量更新（原子操作）
    /// </summary>
    public async Task<long> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
            _logger.LogDebug("开始批量更新 {EntityType} 实体", entityType);
            
            // 应用多租户过滤
            var tenantFilter = ApplyTenantFilter(filter);
            
            // 确保更新时间戳
            var updateWithTimestamp = Builders<T>.Update.Combine(
                update,
                Builders<T>.Update.Set(x => x.UpdatedAt, DateTime.UtcNow)
            );

            var result = await _collection.UpdateManyAsync(tenantFilter, updateWithTimestamp);
            
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogInformation("✅ 成功批量更新 {EntityType} 实体: {ModifiedCount} 个, 耗时: {ElapsedMs}ms", 
                entityType, result.ModifiedCount, elapsed);
            
            return result.ModifiedCount;
        }
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 批量更新 {EntityType} 实体失败, 耗时: {ElapsedMs}ms", 
                entityType, elapsed);
            throw;
        }
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
        
        try
        {
            _logger.LogDebug("开始批量软删除 {EntityType} 实体: {Count} 个", entityType, count);
            
            var filter = Builders<T>.Filter.In(x => x.Id, idList);
            var update = Builders<T>.Update
                .Set(x => x.IsDeleted, true)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);

            var result = await _collection.UpdateManyAsync(filter, update);
            
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogInformation("✅ 成功批量软删除 {EntityType} 实体: {ModifiedCount} 个, 耗时: {ElapsedMs}ms", 
                entityType, result.ModifiedCount, elapsed);
            
            return result.ModifiedCount;
        }
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "❌ 批量软删除 {EntityType} 实体失败: {Count} 个, 耗时: {ElapsedMs}ms", 
                entityType, count, elapsed);
            throw;
        }
    }

    // ========== 查询操作 ==========

    /// <summary>
    /// 执行查询操作
    /// </summary>
    public async Task<List<T>> FindAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            var queryInfo = BuildQueryInfo(ApplyDefaultFilters(filter), sort, limit);
            _logger.LogError(ex, "❌ 查询 {EntityType} 实体失败, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, elapsed, queryInfo);
            throw;
        }
    }

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    public async Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            var queryInfo = BuildQueryInfo(ApplyDefaultFilters(filter), sort, pageSize);
            _logger.LogError(ex, "❌ 分页查询 {EntityType} 实体失败, 页码: {Page}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, page, elapsed, queryInfo);
            throw;
        }
    }

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    public async Task<T?> GetByIdAsync(string id)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            var queryInfo = BuildQueryInfo(ApplyTenantFilter(Builders<T>.Filter.Eq(x => x.Id, id)));
            _logger.LogError(ex, "❌ 根据ID获取 {EntityType} 实体失败: {Id}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, id, elapsed, queryInfo);
            throw;
        }
    }

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    public async Task<bool> ExistsAsync(string id)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            var queryInfo = BuildQueryInfo(ApplyTenantFilter(Builders<T>.Filter.Eq(x => x.Id, id)));
            _logger.LogError(ex, "❌ 检查 {EntityType} 实体是否存在失败: {Id}, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, id, elapsed, queryInfo);
            throw;
        }
    }

    /// <summary>
    /// 获取实体数量
    /// </summary>
    public async Task<long> CountAsync(FilterDefinition<T>? filter = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var entityType = typeof(T).Name;
        
        try
        {
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
        catch (Exception ex)
        {
            var elapsed = stopwatch.ElapsedMilliseconds;
            var queryInfo = BuildQueryInfo(ApplyDefaultFilters(filter));
            _logger.LogError(ex, "❌ 获取 {EntityType} 实体数量失败, 耗时: {ElapsedMs}ms, 查询语句: {QueryInfo}", 
                entityType, elapsed, queryInfo);
            throw;
        }
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
        
        // 设置时间戳
        replacement.UpdatedAt = DateTime.UtcNow;

        var result = await _collection.FindOneAndReplaceAsync(finalFilter, replacement, options);
        return result;
    }

    /// <summary>
    /// 查找并更新（原子操作，不带租户过滤）
    /// </summary>
    public async Task<T?> FindOneAndUpdateWithoutTenantFilterAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null)
    {
        // 只应用软删除过滤
        var finalFilter = ApplySoftDeleteFilter(filter);
        
        // 确保更新时间戳
        var updateWithTimestamp = Builders<T>.Update.Combine(
            update,
            Builders<T>.Update.Set(x => x.UpdatedAt, DateTime.UtcNow)
        );

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
        
        var update = Builders<T>.Update
            .Set(x => x.IsDeleted, true)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

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
    /// 获取当前企业ID
    /// </summary>
    public string? GetCurrentCompanyId()
    {
        return _tenantContext.GetCurrentCompanyId();
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
    /// 获取必需的企业ID（为空则抛异常）
    /// </summary>
    public string GetRequiredCompanyId()
    {
        var companyId = _tenantContext.GetCurrentCompanyId();
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
            var companyId = _tenantContext.GetCurrentCompanyId();
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
                var filterJson = filter.Render(
                    MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry.GetSerializer<T>(),
                    MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry);
                queryInfo.Add($"Filter: {filterJson}");
            }
            
            // 添加排序条件
            if (sort != null)
            {
                var sortJson = sort.Render(
                    MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry.GetSerializer<T>(),
                    MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry);
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