using System.Linq;
using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
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

    // ========== 静态缓存（性能优化） ==========

    private static readonly string _companyIdFieldName = InitCompanyIdFieldName();

    /// <summary>
    /// 初始化 CompanyId 的 BSON 字段名
    /// </summary>
    private static string InitCompanyIdFieldName()
    {
        if (!typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
            return "companyId";

        var prop = typeof(T).GetProperty("CompanyId", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        if (prop != null)
        {
            var bsonElementAttr = prop.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonElementAttribute>();
            if (bsonElementAttr != null && !string.IsNullOrEmpty(bsonElementAttr.ElementName))
            {
                return bsonElementAttr.ElementName;
            }
            var name = prop.Name;
            return name.Length > 0 ? char.ToLowerInvariant(name[0]) + name.Substring(1) : "companyId";
        }
        return "companyId";
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
        if (entity is IOperationTrackable op)
        {
            op.CreatedBy = userId;
            op.CreatedByUsername = username;
        }
        else
        {
            SetAuditProperty(entity, "CreatedBy", userId);
            SetAuditProperty(entity, "CreatedByUsername", username);
        }

        // 写入企业隔离字段
        // 注意：如果实体已经设置了 CompanyId（业务字段，如 UserCompany.CompanyId），优先使用实体上的值
        // 这样可以避免业务字段被多租户隔离机制覆盖（如创建新企业时的 UserCompany 记录）
        if (entity is IMultiTenant multiTenant)
        {
            // 如果实体已经明确设置了 CompanyId（非空），优先使用实体上的值
            // 否则从 TenantContext 获取当前企业的 CompanyId（用于多租户隔离）
            var companyId = !string.IsNullOrEmpty(multiTenant.CompanyId)
                ? multiTenant.CompanyId
                : await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
            if (string.IsNullOrEmpty(companyId))
                throw new UnauthorizedAccessException("未找到当前企业信息");
            multiTenant.CompanyId = companyId;
        }

        await _collection.InsertOneAsync(entity).ConfigureAwait(false);
        return entity;
    }

    /// <summary>
    /// 创建实体（原子操作，后台线程场景，避免访问 HttpContext）
    /// </summary>
    /// <param name="entity">要创建的实体</param>
    /// <param name="userId">用户ID（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
    /// <param name="username">用户名（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
    public async Task<T> CreateAsync(T entity, string? userId, string? username)
    {
        // 设置时间戳
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.IsDeleted = false;

        // 如果未提供 userId 或 username，尝试从 TenantContext 获取（可能失败，如果 HttpContext 已释放）
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(username))
        {
            try
            {
                var (contextUserId, contextUsername) = await GetActorAsync().ConfigureAwait(false);
                userId ??= contextUserId;
                username ??= contextUsername;
            }
            catch (ObjectDisposedException)
            {
                // HttpContext 已释放，使用提供的值或默认值
                // 这在后台线程场景中是预期的
            }
        }

        // 设置创建人（通过反射设置审计字段）
        if (entity is IOperationTrackable op)
        {
            op.CreatedBy = userId;
            op.CreatedByUsername = username;
        }
        else
        {
            SetAuditProperty(entity, "CreatedBy", userId);
            SetAuditProperty(entity, "CreatedByUsername", username);
        }

        // 写入企业隔离字段
        // 在后台线程场景中，实体应该已经设置了 CompanyId（通过业务代码设置）
        if (entity is IMultiTenant multiTenant)
        {
            // 优先使用实体上已有的 CompanyId（后台线程场景中应该已经设置）
            if (!string.IsNullOrEmpty(multiTenant.CompanyId))
            {
                // 实体已有 CompanyId，直接使用
            }
            else
            {
                // 如果实体没有 CompanyId，尝试从 TenantContext 获取（可能失败，如果 HttpContext 已释放）
                try
                {
                    var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
                    if (!string.IsNullOrEmpty(companyId))
                    {
                        multiTenant.CompanyId = companyId;
                    }
                }
                catch (ObjectDisposedException)
                {
                    // HttpContext 已释放，这是后台线程场景的预期行为
                    // 如果实体没有 CompanyId，抛出异常
                    throw new UnauthorizedAccessException("后台线程场景中，实体必须提供 CompanyId，因为无法访问 HttpContext");
                }
            }

            // 如果仍然没有 CompanyId，抛出异常
            if (string.IsNullOrEmpty(multiTenant.CompanyId))
            {
                throw new UnauthorizedAccessException("未找到当前企业信息，且实体未提供 CompanyId");
            }
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
            if (entity is IOperationTrackable op)
            {
                op.CreatedBy = uid;
                op.CreatedByUsername = uname;
            }
            else
            {
                SetAuditProperty(entity, "CreatedBy", uid);
                SetAuditProperty(entity, "CreatedByUsername", uname);
            }

            if (entity is IMultiTenant multiTenant)
            {
                // 如果实体已经明确设置了 CompanyId（非空），优先使用实体上的值
                // 否则从 TenantContext 获取当前企业的 CompanyId（用于多租户隔离）
                var companyId = !string.IsNullOrEmpty(multiTenant.CompanyId)
                    ? multiTenant.CompanyId
                    : await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
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
        if (replacement is IOperationTrackable op)
        {
            op.UpdatedBy = userId;
            op.UpdatedByUsername = username;
        }
        else
        {
            SetAuditProperty(replacement, "UpdatedBy", userId);
            SetAuditProperty(replacement, "UpdatedByUsername", username);
        }

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

    /// <summary>
    /// 执行批量写入操作（由调用方负责审计和过滤）
    /// </summary>
    public async Task<BulkWriteResult<T>> BulkWriteAsync(IEnumerable<WriteModel<T>> requests, BulkWriteOptions? options = null)
    {
        return await _collection.BulkWriteAsync(requests, options).ConfigureAwait(false);
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
    /// 执行查询操作（包含软删除记录）
    /// </summary>
    public async Task<List<T>> FindIncludingDeletedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null)
    {
        var baseFilter = filter ?? Builders<T>.Filter.Empty;
        var finalFilter = await ApplyTenantFilterAsync(baseFilter).ConfigureAwait(false);
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
        // 验证并钳制分页参数到项目规范范围：page 1–10000，pageSize 1–100
        if (page < 1)
            page = 1;
        else if (page > 10000)
            page = 10000;

        if (pageSize < 1)
            pageSize = 1;
        else if (pageSize > 100)
            pageSize = 100;

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

    /// <summary>
    /// 执行聚合操作（自动应用租户过滤）
    /// </summary>
    public async Task<List<TResult>> AggregateAsync<TResult>(PipelineDefinition<T, TResult> pipeline)
    {
        var finalFilter = await ApplyDefaultFiltersAsync(null).ConfigureAwait(false);

        // 创建渲染参数，这能自动处理 LinqProvider 等底层差异
        var serializer = BsonSerializer.SerializerRegistry.GetSerializer<T>();
        var registry = BsonSerializer.SerializerRegistry;
        var renderArgs = new RenderArgs<T>(serializer, registry);

        // 1. 渲染过滤器为 $match 阶段
        var filterBson = finalFilter.Render(renderArgs);
        var matchDocument = new BsonDocument("$match", filterBson);

        // 2. 渲染原始管道
        var renderedPipeline = pipeline.Render(renderArgs);

        // 合并阶段：先执行租户/软删除过滤，再执行业务定义的管道
        var stages = new List<BsonDocument> { matchDocument };
        stages.AddRange(renderedPipeline.Documents);

        // 执行聚合
        var cursor = await _collection.Aggregate(PipelineDefinition<T, TResult>.Create(stages)).ToListAsync().ConfigureAwait(false);
        return cursor;
    }

    private async Task<FilterDefinition<T>> ApplyTenantFilterAsync(FilterDefinition<T> filter)
    {
        if (!typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
            return filter;

        var companyId = await ResolveCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
            return filter;

        // 使用缓存的 CompanyId BSON 字段名
        return Builders<T>.Filter.And(filter, Builders<T>.Filter.Eq(_companyIdFieldName, companyId));
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
