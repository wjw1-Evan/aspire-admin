using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 🚀 优化的数据工厂接口 - 纯EF Core LINQ模式
/// 移除自定义Builder，使用标准LINQ表达式和编译查询优化
/// </summary>
public interface IDataFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    // 🚀 基础CRUD操作 - 纯LINQ模式
    Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(System.Linq.Expressions.Expression<Func<T, bool>> filter, CancellationToken cancellationToken = default);

    // 🚀 查询操作 - 支持Include预加载
    /// <summary>
    /// 查询数据（多租户过滤由 PlatformDbContext 全局查询过滤器自动处理）
    /// </summary>
    Task<List<T>> FindAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        System.Linq.Expressions.Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default);

    // 🚀 优化的分页查询
    /// <summary>
    /// 分页查询数据（多租户过滤由 PlatformDbContext 全局查询过滤器自动处理）
    /// </summary>
    Task<(List<T> items, long total)> FindPagedAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int page = 1,
        int pageSize = 10,
        System.Linq.Expressions.Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default);

    // 🚀 创建操作 - 批量优化
    Task<T> CreateAsync(T entity, CancellationToken cancellationToken = default);
    Task<List<T>> CreateManyAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);

    // 🚀 更新操作 - 支持Action和ExecuteUpdate
    Task<T?> UpdateAsync(string id, Action<T> updateAction, CancellationToken cancellationToken = default);
    Task<T?> UpdateAsync(string id, Func<T, Task> updateAction, CancellationToken cancellationToken = default);
    Task<int> UpdateManyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> filter,
        Action<T> updateAction,
        CancellationToken cancellationToken = default);
    Task<int> UpdateManyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> filter,
        Func<T, Task> updateAction,
        CancellationToken cancellationToken = default);

    // 🚀 删除操作 - 软删除和硬删除
    Task<bool> SoftDeleteAsync(string id, string? reason = null, CancellationToken cancellationToken = default);
    Task<int> SoftDeleteManyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> filter,
        string? reason = null,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);
    Task<int> DeleteManyAsync(
        System.Linq.Expressions.Expression<Func<T, bool>> filter,
        CancellationToken cancellationToken = default);

    // 🚀 统计操作
    Task<long> CountAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? filter = null,
        CancellationToken cancellationToken = default);

    Task<long> SumAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? filter,
        System.Linq.Expressions.Expression<Func<T, long>> selector,
        CancellationToken cancellationToken = default);

    // 🚀 忽略过滤器操作（用于管理场景）
    Task<T?> GetByIdWithoutTenantFilterAsync(string id, CancellationToken cancellationToken = default);
    Task<List<T>> FindWithoutTenantFilterAsync(
        System.Linq.Expressions.Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        int? limit = null,
        System.Linq.Expressions.Expression<Func<T, object>>[]? includes = null,
        CancellationToken cancellationToken = default);

}
