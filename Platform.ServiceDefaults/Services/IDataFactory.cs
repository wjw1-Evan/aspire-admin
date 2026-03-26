using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using System.Linq.Expressions;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 极简数据工厂接口 - 只封装写操作，查询直接使用 Query
/// PlatformDbContext 已自动处理：审计字段、全局过滤器（软删除+多租户）、软删除审计
/// </summary>
public interface IDataFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// 暴露 DbSet 供所有查询和操作使用（已应用全局过滤器：软删除 + 多租户）
    /// 
    /// 使用示例：
    /// - 查询单个：await factory.Query.FirstOrDefaultAsync(e => e.Id == id)
    /// - 查询列表：await factory.Query.Where(...).ToListAsync()
    /// - 关联查询：await factory.Query.Include(e => e.Related).Where(...).ToListAsync()
    /// - 统计数量：await factory.Query.CountAsync()
    /// - 检查存在：await factory.Query.AnyAsync(e => e.Id == id)
    /// - 分页查询：await factory.Query.Skip(skip).Take(take).ToListAsync()
    /// </summary>
    DbSet<T> Query { get; }

    /// <summary>
    /// 获取 DbContext 实例（用于事务、批量操作等高级场景）
    /// </summary>
    DbContext Context { get; }

    /// <summary>
    /// 跨租户查询（绕过多租户过滤器但仍过滤软删除）
    /// 使用示例：await factory.QueryWithoutTenantFilter.Where(...).ToListAsync()
    /// </summary>
    IQueryable<T> QueryWithoutTenantFilter { get; }

    // 🚀 写操作（封装 SaveChanges，自动应用审计）
    Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default);
    Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);
    Task<T?> UpdateAsync(string id, Action<T> updateAction, CancellationToken cancellationToken = default);
    Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default);
    Task<int> UpdateManyAsync(Expression<Func<T, bool>> filter, Action<T> updateAction, CancellationToken cancellationToken = default);
}
