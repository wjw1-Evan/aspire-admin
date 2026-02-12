using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore.Infrastructure;
using System.Collections.Concurrent;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 🚀 优化的Entity Framework Core数据工厂 - 纯LINQ操作
/// 替换DatabaseOperationFactory，提供高性能、类型安全的数据访问
/// </summary>
public class EFCoreDataFactory<T> : IDataFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly PlatformDbContext _context;
    private readonly DbSet<T> _dbSet;
    private readonly IAuditService _auditService;
    private readonly string? _currentUserId;
    private readonly ITenantContext? _tenantContext;

    // 编译查询缓存 - 大幅提升重复查询性能
    private static readonly ConcurrentDictionary<string, object> QueryCache = new();
    private static readonly SemaphoreSlim BatchLock = new(1, 1);

    public EFCoreDataFactory(
        PlatformDbContext context,
        IAuditService auditService,
        IHttpContextAccessor? httpContextAccessor = null,
        ITenantContext? tenantContext = null)
    {
        _context = context;
        _dbSet = context.Set<T>();
        _auditService = auditService;
        _tenantContext = tenantContext;

        // 🚀 获取当前用户ID（同步方式）
        _currentUserId = tenantContext?.GetCurrentUserId()
            ?? httpContextAccessor?.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    }

    public async Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        // 🚀 使用FindAsync优先（更高效的键查找）
        var entity = await _dbSet.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null)
        {
            // 🚀 如果找不到，尝试 IgnoreQueryFilters 看看是否被过滤器拦截
            var ignoredEntity = await _dbSet.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (ignoredEntity != null)
            {
                var logger = _context.GetService<ILogger<EFCoreDataFactory<T>>>();
                if (logger != null)
                {
                    logger.LogWarning("EFCoreDataFactory: [过滤器拦截] 实体 {Type} ID {Id} 被全局过滤器拦截 (可能是 isDeleted:true 或多租户不匹配)", typeof(T).Name, id);
                }
            }
        }
        return entity;
    }

    public async Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default)
    {
        // 🚀 使用AnyAsync配合Select只查Id，减少数据传输
        return await _dbSet.Where(e => e.Id == id).Select(e => e.Id).AnyAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        // 🚀 使用Select只查Id，减少数据传输
        return await _dbSet.Where(filter).Select(e => e.Id).AnyAsync(cancellationToken);
    }

    public async Task<List<T>> FindAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        // 🚀 使用AsNoTracking提升查询性能
        IQueryable<T> query = _dbSet.AsNoTracking();

        // 🚀 先应用过滤条件，再应用Include（优化查询计划）
        if (filter != null)
        {
            query = query.Where(filter);
        }

        // 🚀 Include只应用于需要的关联
        if (includes != null && includes.Length > 0)
        {
            foreach (var include in includes)
            {
                query = query.Include(include);
            }
        }

        // 🚀 先排序再分页
        if (orderBy != null)
        {
            query = orderBy(query);
        }

        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<(List<T> items, long total)> FindPagedAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int page = 1,
        int pageSize = 10,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        // 🚀 参数验证和边界处理
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<T> baseQuery = _dbSet.AsNoTracking();

        if (filter != null)
        {
            baseQuery = baseQuery.Where(filter);
        }

        // 🚀 优化的分页查询：先获取总数，再获取数据
        // 对于小数据集，可以考虑使用CountAsync的fast path
        var totalTask = baseQuery.CountAsync(cancellationToken);

        // 🚀 构建数据查询
        var itemsQuery = baseQuery;

        // 🚀 Include只应用于数据查询，不应用于计数
        if (includes != null && includes.Length > 0)
        {
            foreach (var include in includes)
            {
                itemsQuery = itemsQuery.Include(include);
            }
        }

        // 🚀 排序必须在Skip/Take之前
        if (orderBy != null)
        {
            itemsQuery = orderBy(itemsQuery);
        }
        else
        {
            // 🚀 默认按创建时间倒序排序
            itemsQuery = itemsQuery.OrderByDescending(e => e.CreatedAt);
        }

        // 🚀 执行分页查询
        var itemsTask = itemsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // 🚀 并行执行计数和查询
        await Task.WhenAll(totalTask, itemsTask);

        return (itemsTask.Result, totalTask.Result);
    }

    public async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        // 🚀 性能优化：显式异步获取企业 ID，减少对 DbContext 同步属性的依赖
        var companyId = await GetCurrentCompanyIdAsync();
        SetCreateAudit(entity, companyId);
        _dbSet.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        var entityList = entities.ToList();
        if (entityList.Count == 0) return entityList;

        // 🚀 性能优化：显式异步获取企业 ID
        var companyId = await GetCurrentCompanyIdAsync();

        // 🚀 批量设置审计字段
        var now = DateTime.UtcNow;
        foreach (var entity in entityList)
        {
            entity.CreatedAt = now;
            entity.UpdatedAt = now;
            if (entity is IMultiTenant multiTenant && string.IsNullOrEmpty(multiTenant.CompanyId) && !string.IsNullOrEmpty(companyId))
            {
                multiTenant.CompanyId = companyId;
            }
        }

        await _dbSet.AddRangeAsync(entityList, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // 🚀 批量审计记录（只在有实体时记录）
        if (entityList.Count > 0)
        {
            await _auditService.RecordOperationAsync("BATCH_CREATE", typeof(T).Name, $"count:{entityList.Count}", entityList.Count, $"Created {entityList.Count} entities");
        }

        return entityList;
    }

    public async Task<T?> UpdateAsync(string id, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return null;

        SetUpdateAudit(entity);
        updateAction(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return null;

        SetUpdateAudit(entity);
        await updateAction(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        // 🚀 限制批量更新数量以避免内存问题
        const int maxBatchSize = 1000;

        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);

        // 🚀 如果超过最大批量大小，记录警告并只处理前maxBatchSize个
        var totalCount = entities.Count;
        if (totalCount > maxBatchSize)
        {
            entities = entities.Take(maxBatchSize).ToList();
        }

        if (entities.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var entity in entities)
        {
            entity.UpdatedAt = now;
            updateAction(entity);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // 🚀 只在有更新时记录审计
        if (entities.Count > 0)
        {
            await _auditService.RecordOperationAsync("BATCH_UPDATE", typeof(T).Name, $"count:{entities.Count}", entities.Count, $"Updated {entities.Count} entities");
        }

        return entities.Count;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        // 🚀 限制批量更新数量以避免内存问题
        const int maxBatchSize = 1000;

        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);

        var totalCount = entities.Count;
        if (totalCount > maxBatchSize)
        {
            entities = entities.Take(maxBatchSize).ToList();
        }

        if (entities.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var entity in entities)
        {
            entity.UpdatedAt = now;
            await updateAction(entity);
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (entities.Count > 0)
        {
            await _auditService.RecordOperationAsync("BATCH_UPDATE", typeof(T).Name, $"count:{entities.Count}", entities.Count, $"Updated {entities.Count} entities");
        }

        return entities.Count;
    }

    public async Task<bool> SoftDeleteAsync(string id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return false;

        ApplySoftDelete(entity, reason);
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.RecordOperationAsync("SOFT_DELETE", typeof(T).Name, id, null, reason);
        return true;
    }

    public async Task<int> SoftDeleteManyAsync(Expression<Func<T, bool>> filter, string? reason = null, CancellationToken cancellationToken = default)
    {
        // 🚀 限制批量软删除数量
        const int maxBatchSize = 1000;

        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);

        var totalCount = entities.Count;
        if (totalCount > maxBatchSize)
        {
            entities = entities.Take(maxBatchSize).ToList();
        }

        if (entities.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var entity in entities)
        {
            // 🚀 使用接口显式转换避免二义性
            if (entity is ISoftDeletable softDeletable)
            {
                softDeletable.IsDeleted = true;
                softDeletable.DeletedAt = now;
                softDeletable.DeletedBy = _currentUserId;
                softDeletable.DeletedReason = reason;
            }
            entity.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.RecordOperationAsync("BATCH_SOFT_DELETE", typeof(T).Name, $"count:{entities.Count}", entities.Count, reason);
        return entities.Count;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbSet.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entity == null) return false;

        SetDeleteAudit(entity);
        _dbSet.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> DeleteManyAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        // 🚀 限制批量硬删除数量
        const int maxBatchSize = 1000;

        var entities = await _dbSet.IgnoreQueryFilters()
            .Where(filter)
            .Take(maxBatchSize + 1)
            .ToListAsync(cancellationToken);

        var totalCount = entities.Count;
        if (totalCount > maxBatchSize)
        {
            entities = entities.Take(maxBatchSize).ToList();
        }

        if (entities.Count == 0) return 0;

        _dbSet.RemoveRange(entities);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.RecordOperationAsync("BATCH_DELETE", typeof(T).Name, $"count:{entities.Count}", entities.Count, "Hard deleted entities");
        return entities.Count;
    }

    public async Task<long> CountAsync(Expression<Func<T, bool>>? filter = null, CancellationToken cancellationToken = default)
    {
        IQueryable<T> query = _dbSet;
        if (filter != null) query = query.Where(filter);
        return await query.CountAsync(cancellationToken);
    }

    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id, CancellationToken cancellationToken = default)
    {
        // 🚀 使用FindAsync更高效，但需要在内存中应用过滤器
        var entity = await _dbSet.FindAsync(new object[] { id }, cancellationToken);
        return entity?.IsDeleted != true ? entity : null;
    }

    public async Task<List<T>> FindWithoutTenantFilterAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        // 🚀 使用IgnoreQueryFilters但保留软删除过滤
        IQueryable<T> query = _dbSet.IgnoreQueryFilters().AsNoTracking();

        // 🚀 手动应用软删除过滤 - 优化：使用 != true 以兼容 MongoDB 缺失字段
        query = query.Where(e => e.IsDeleted != true);

        // 🚀 先应用过滤再Include
        if (filter != null)
        {
            query = query.Where(filter);
        }

        if (includes != null && includes.Length > 0)
        {
            foreach (var include in includes)
            {
                query = query.Include(include);
            }
        }

        if (orderBy != null)
        {
            query = orderBy(query);
        }
        else
        {
            // 🚀 默认排序
            query = query.OrderByDescending(e => e.CreatedAt);
        }

        if (limit.HasValue && limit.Value > 0)
        {
            query = query.Take(limit.Value);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public string? GetCurrentUserId() => _currentUserId;
    public string GetRequiredUserId() => _currentUserId ?? throw new UnauthorizedAccessException("User not authenticated");

    public async Task<string?> GetCurrentCompanyIdAsync()
    {
        if (_tenantContext == null)
        {
            return null;
        }

        return await _tenantContext.GetCurrentCompanyIdAsync().ConfigureAwait(false);
    }

    public async Task<string> GetRequiredCompanyIdAsync()
    {
        if (_tenantContext == null)
        {
            throw new UnauthorizedAccessException("Tenant context not available");
        }

        var companyId = await _tenantContext.GetCurrentCompanyIdAsync().ConfigureAwait(false);
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        return companyId;
    }


    private void SetCreateAudit(T entity, string? companyId)
    {
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        if (entity is IMultiTenant multiTenant && string.IsNullOrEmpty(multiTenant.CompanyId) && !string.IsNullOrEmpty(companyId))
        {
            multiTenant.CompanyId = companyId;
        }
        if (entity is IOperationTrackable trackable)
        {
            trackable.CreatedBy = _currentUserId;
            trackable.UpdatedBy = _currentUserId;
            trackable.LastOperationType = "CREATE";
            trackable.LastOperationAt = DateTime.UtcNow;
        }
    }

    private void SetUpdateAudit(T entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        if (entity is IOperationTrackable trackable)
        {
            trackable.UpdatedBy = _currentUserId;
            trackable.LastOperationType = "UPDATE";
            trackable.LastOperationAt = DateTime.UtcNow;
        }
    }

    private void SetDeleteAudit(T entity)
    {
        if (entity is IOperationTrackable trackable)
        {
            trackable.LastOperationType = "DELETE";
            trackable.LastOperationAt = DateTime.UtcNow;
        }
    }

    private void ApplySoftDelete(T entity, string? reason)
    {
        SetDeleteAudit(entity);
        if (entity is ISoftDeletable softDeletable)
        {
            softDeletable.IsDeleted = true;
            softDeletable.DeletedAt = DateTime.UtcNow;
            softDeletable.DeletedBy = _currentUserId;
            softDeletable.DeletedReason = reason;
        }
        if (entity is ITimestamped timestamped) timestamped.UpdatedAt = DateTime.UtcNow;
        if (entity is IOperationTrackable trackable)
        {
            trackable.UpdatedBy = _currentUserId;
            trackable.LastOperationType = "SOFT_DELETE";
            trackable.LastOperationAt = DateTime.UtcNow;
        }
    }
}
