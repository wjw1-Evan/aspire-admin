using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// EF Core 数据工厂 - 提供类型安全的 CRUD 和分页查询
/// 审计字段（时间戳、操作人、多租户等）统一由 PlatformDbContext.SaveChangesAsync 设置
/// </summary>
public class EFCoreDataFactory<T>(DbContext context)
    : IDataFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly DbSet<T> _dbSet = context.Set<T>();

    #region 查询操作

    public async Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
        => await _dbSet.FindAsync([id], cancellationToken);

    public async Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default)
        => await ExistsAsync(e => e.Id == id, cancellationToken);

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
        => await _dbSet.AnyAsync(filter, cancellationToken);

    public async Task<List<T>> FindAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(_dbSet.AsNoTracking(), filter, orderBy, includes);
        if (limit is > 0) query = query.Take(limit.Value);
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
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<T> baseQuery = _dbSet.AsNoTracking();
        if (filter != null) baseQuery = baseQuery.Where(filter);

        // 顺序执行查询，因为单一 DbContext 实例不支持多线程并发查询 (不能用 Task.WhenAll)
        var total = await baseQuery.CountAsync(cancellationToken);

        var itemsQuery = BuildQuery(baseQuery, null, orderBy, includes);
        var items = await itemsQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<long> CountAsync(Expression<Func<T, bool>>? filter = null, CancellationToken cancellationToken = default)
    {
        IQueryable<T> query = _dbSet;
        if (filter != null) query = query.Where(filter);
        return await query.CountAsync(cancellationToken);
    }

    public async Task<long> SumAsync(Expression<Func<T, bool>>? filter, Expression<Func<T, long>> selector, CancellationToken cancellationToken = default)
    {
        IQueryable<T> query = _dbSet;
        if (filter != null) query = query.Where(filter);
        return await query.SumAsync(selector, cancellationToken);
    }

    #endregion

    #region 创建操作

    public async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        await CreateManyAsync([entity], cancellationToken);
        return entity;
    }

    public async Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default)
    {
        var entityList = entities.ToList();
        if (entityList.Count == 0) return entityList;

        await _dbSet.AddRangeAsync(entityList, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return entityList;
    }

    #endregion

    #region 更新操作

    public async Task<T?> UpdateAsync(string id, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        return await UpdateAsync(id, e => { updateAction(e); return Task.CompletedTask; }, cancellationToken);
    }

    public async Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        var entity = await GetByIdAsync(id, cancellationToken);
        if (entity == null) return null;
        await updateAction(entity);
        await context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        return await UpdateManyAsync(filter, e => { updateAction(e); return Task.CompletedTask; }, cancellationToken);
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        var entities = await LoadBatchAsync(filter, cancellationToken);
        if (entities.Count == 0) return 0;

        foreach (var entity in entities) await updateAction(entity);
        await context.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    #endregion

    #region 删除操作

    public async Task<bool> SoftDeleteAsync(string id, string? reason = null, CancellationToken cancellationToken = default)
    {
        var count = await SoftDeleteManyAsync(e => e.Id == id, reason, cancellationToken);
        return count > 0;
    }

    public async Task<int> SoftDeleteManyAsync(Expression<Func<T, bool>> filter, string? reason = null, CancellationToken cancellationToken = default)
    {
        var entities = await LoadBatchAsync(filter, cancellationToken);
        if (entities.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var entity in entities)
        {
            entity.IsDeleted = true;
            entity.DeletedAt = now;
            entity.DeletedReason = reason;
        }

        await context.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbSet.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entity == null) return false;

        _dbSet.Remove(entity);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> DeleteManyAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default)
    {
        var entities = await _dbSet.IgnoreQueryFilters().Where(filter).ToListAsync(cancellationToken);
        if (entities.Count == 0) return 0;

        _dbSet.RemoveRange(entities);
        await context.SaveChangesAsync(cancellationToken);
        return entities.Count;
    }

    #endregion

    #region 忽略过滤器操作

    public async Task<T?> GetByIdWithoutTenantFilterAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbSet.FindAsync([id], cancellationToken);
        return entity?.IsDeleted != true ? entity : null;
    }

    public async Task<List<T>> FindWithoutTenantFilterAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default)
    {
        // IgnoreQueryFilters 跳过多租户过滤，但手动保留软删除过滤
        var baseQuery = _dbSet.IgnoreQueryFilters().AsNoTracking().Where(e => e.IsDeleted != true);
        var query = BuildQuery(baseQuery, filter, orderBy, includes);
        if (limit is > 0) query = query.Take(limit.Value);
        return await query.ToListAsync(cancellationToken);
    }

    #endregion

    #region 私有工具方法

    /// <summary>
    /// 构建查询：应用过滤、Include、排序
    /// </summary>
    private static IQueryable<T> BuildQuery(
        IQueryable<T> query,
        Expression<Func<T, bool>>? filter,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy,
        Expression<Func<T, object>>[]? includes)
    {
        if (filter != null) query = query.Where(filter);

        if (includes is { Length: > 0 })
        {
            foreach (var include in includes)
                query = query.Include(include);
        }

        return orderBy != null ? orderBy(query) : query.OrderByDescending(e => e.CreatedAt);
    }

    /// <summary>
    /// 加载批量操作的实体
    /// </summary>
    private async Task<List<T>> LoadBatchAsync(Expression<Func<T, bool>> filter, CancellationToken cancellationToken)
        => await _dbSet.Where(filter).ToListAsync(cancellationToken);

    #endregion
}
