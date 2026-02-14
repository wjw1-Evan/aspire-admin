using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;

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
        // 🚀 异步获取企业 ID 并提前设置，避免 DbContext.SaveChanges 内部同步阻塞
        if (entity is IMultiTenant multiTenant && string.IsNullOrEmpty(multiTenant.CompanyId))
        {
            var companyId = await GetCurrentCompanyIdAsync();
            if (!string.IsNullOrEmpty(companyId))
                multiTenant.CompanyId = companyId;
        }
        // 其余审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        _dbSet.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        var entityList = entities.ToList();
        if (entityList.Count == 0) return entityList;

        // 🚀 异步获取企业 ID 并提前批量设置，避免 DbContext 内部同步阻塞
        var companyId = await GetCurrentCompanyIdAsync();
        if (!string.IsNullOrEmpty(companyId))
        {
            foreach (var entity in entityList)
            {
                if (entity is IMultiTenant multiTenant && string.IsNullOrEmpty(multiTenant.CompanyId))
                    multiTenant.CompanyId = companyId;
            }
        }

        // 其余审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        await _dbSet.AddRangeAsync(entityList, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

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

        updateAction(entity);
        // 审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return null;

        await updateAction(entity);
        // 审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        const int maxBatchSize = 1000;
        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);
        if (entities.Count > maxBatchSize)
            entities = entities.Take(maxBatchSize).ToList();
        if (entities.Count == 0) return 0;

        foreach (var entity in entities)
            updateAction(entity);

        // 审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        await _context.SaveChangesAsync(cancellationToken);

        if (entities.Count > 0)
            await _auditService.RecordOperationAsync("BATCH_UPDATE", typeof(T).Name, $"count:{entities.Count}", entities.Count, $"Updated {entities.Count} entities");

        return entities.Count;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        const int maxBatchSize = 1000;
        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);
        if (entities.Count > maxBatchSize)
            entities = entities.Take(maxBatchSize).ToList();
        if (entities.Count == 0) return 0;

        foreach (var entity in entities)
            await updateAction(entity);

        // 审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        await _context.SaveChangesAsync(cancellationToken);

        if (entities.Count > 0)
            await _auditService.RecordOperationAsync("BATCH_UPDATE", typeof(T).Name, $"count:{entities.Count}", entities.Count, $"Updated {entities.Count} entities");

        return entities.Count;
    }

    public async Task<bool> SoftDeleteAsync(string id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return false;

        // 只设置软删除标记，审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        entity.IsDeleted = true;
        entity.DeletedReason = reason;
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.RecordOperationAsync("SOFT_DELETE", typeof(T).Name, id, null, reason);
        return true;
    }

    public async Task<int> SoftDeleteManyAsync(Expression<Func<T, bool>> filter, string? reason = null, CancellationToken cancellationToken = default)
    {
        const int maxBatchSize = 1000;
        var entities = await _dbSet.Where(filter).Take(maxBatchSize + 1).ToListAsync(cancellationToken);
        if (entities.Count > maxBatchSize)
            entities = entities.Take(maxBatchSize).ToList();
        if (entities.Count == 0) return 0;

        // 只设置软删除标记，审计字段由 PlatformDbContext.SaveChangesAsync 统一设置
        foreach (var entity in entities)
        {
            entity.IsDeleted = true;
            entity.DeletedReason = reason;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.RecordOperationAsync("BATCH_SOFT_DELETE", typeof(T).Name, $"count:{entities.Count}", entities.Count, reason);
        return entities.Count;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbSet.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entity == null) return false;

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

}
