using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;

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
    private string? _cachedCompanyId;
    private bool _companyIdResolved;

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
        return await _dbSet.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(filter, cancellationToken);
    }

    public async Task<List<T>> FindAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<T> query = _dbSet.AsNoTracking();

        if (includes != null)
        {
            foreach (var include in includes)
            {
                query = query.Include(include);
            }
        }

        if (filter != null)
        {
            query = query.Where(filter);
        }

        if (orderBy != null)
        {
            query = orderBy(query);
        }

        if (limit.HasValue)
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
        page = Math.Max(1, page);
        pageSize = Math.Min(100, Math.Max(1, pageSize));

        IQueryable<T> baseQuery = _dbSet.AsNoTracking();

        if (filter != null)
        {
            baseQuery = baseQuery.Where(filter);
        }

        var countTask = baseQuery.CountAsync(cancellationToken);

        IQueryable<T> itemsQuery = baseQuery;

        if (includes != null)
        {
            foreach (var include in includes)
            {
                itemsQuery = itemsQuery.Include(include);
            }
        }

        if (orderBy != null)
        {
            itemsQuery = orderBy(itemsQuery);
        }

        var itemsTask = itemsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        await Task.WhenAll(countTask, itemsTask);

        return (await itemsTask, await countTask);
    }

    public async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        var companyId = await ResolveCompanyIdAsync().ConfigureAwait(false);
        SetCreateAudit(entity, companyId);
        _dbSet.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        var entityList = entities.ToList();
        var companyId = await ResolveCompanyIdAsync().ConfigureAwait(false);
        foreach (var entity in entityList) SetCreateAudit(entity, companyId);
        await _dbSet.AddRangeAsync(entityList, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
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

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        var entities = await _dbSet.Where(filter).ToListAsync(cancellationToken);
        foreach (var entity in entities)
        {
            SetUpdateAudit(entity);
            updateAction(entity);
        }
        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.RecordOperationAsync("BATCH_UPDATE", typeof(T).Name, "multiple", entities.Count, $"Updated {entities.Count} entities");
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
        var entities = await _dbSet.Where(filter).ToListAsync(cancellationToken);
        foreach (var entity in entities) ApplySoftDelete(entity, reason);
        await _context.SaveChangesAsync(cancellationToken);
        if (entities.Any()) await _auditService.RecordOperationAsync("BATCH_SOFT_DELETE", typeof(T).Name, "multiple", entities.Count, reason);
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
        var entities = await _dbSet.IgnoreQueryFilters().Where(filter).ToListAsync(cancellationToken);
        foreach (var entity in entities) SetDeleteAudit(entity);
        _dbSet.RemoveRange(entities);
        await _context.SaveChangesAsync(cancellationToken);
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
        return await _dbSet.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(entity => !entity.IsDeleted)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<List<T>> FindWithoutTenantFilterAsync(Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, int? limit = null, Expression<Func<T, object>>[]? includes = null, CancellationToken cancellationToken = default)
    {
        IQueryable<T> query = _dbSet.IgnoreQueryFilters().AsNoTracking().Where(entity => !entity.IsDeleted);
        if (includes != null) foreach (var include in includes) query = query.Include(include);
        if (filter != null) query = query.Where(filter);
        if (orderBy != null) query = orderBy(query);
        if (limit.HasValue) query = query.Take(limit.Value);
        return await query.ToListAsync(cancellationToken);
    }

    public string? GetCurrentUserId() => _currentUserId;
    public string GetRequiredUserId() => _currentUserId ?? throw new UnauthorizedAccessException("User not authenticated");

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

    private async Task<string?> ResolveCompanyIdAsync()
    {
        if (_companyIdResolved)
        {
            return _cachedCompanyId;
        }

        _companyIdResolved = true;
        if (_tenantContext == null)
        {
            return null;
        }

        _cachedCompanyId = await _tenantContext.GetCurrentCompanyIdAsync().ConfigureAwait(false);
        return _cachedCompanyId;
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
