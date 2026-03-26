using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 极简 EF Core 数据工厂 - 只封装写操作，查询直接使用 Query
/// 审计字段（时间戳、操作人、多租户、软删除）统一由 PlatformDbContext.SaveChangesAsync 自动设置
/// </summary>
public class EFCoreDataFactory<T>(DbContext context)
    : IDataFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    private readonly DbSet<T> _dbSet = context.Set<T>();

    /// <summary>
    /// 暴露 DbSet 供所有查询和操作使用（已应用全局过滤器：软删除 + 多租户）
    /// </summary>
    public DbSet<T> Query => _dbSet;

    /// <summary>
    /// 暴露 DbContext 实例（用于事务、批量操作等高级场景）
    /// </summary>
    public DbContext Context => context;

    /// <summary>
    /// 跨租户查询（绕过多租户过滤器但仍过滤软删除）
    /// </summary>
    public IQueryable<T> QueryWithoutTenantFilter => _dbSet.IgnoreQueryFilters().Where(e => !e.IsDeleted);

    #region 写操作（封装 SaveChanges，自动应用审计）

    public async Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
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

    public async Task<T?> UpdateAsync(string id, Action<T> updateAction, CancellationToken cancellationToken = default)
        => await UpdateAsync(id, e => { updateAction(e); return Task.CompletedTask; }, cancellationToken);

    public async Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default)
    {
        var entity = await _dbSet.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entity == null) return null;

        await updateAction(entity);
        await context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default)
    {
        const int batchSize = 1000;
        var totalUpdated = 0;

        while (true)
        {
            var batch = await _dbSet.Where(filter).Take(batchSize).ToListAsync(cancellationToken);
            if (batch.Count == 0) break;

            foreach (var entity in batch)
            {
                updateAction(entity);
            }

            await context.SaveChangesAsync(cancellationToken);
            totalUpdated += batch.Count;

            if (batch.Count < batchSize) break;
        }

        return totalUpdated;
    }

    #endregion
}
