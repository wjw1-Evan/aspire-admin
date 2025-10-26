using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 简化的数据库操作工厂接口 - 完全基于原子操作
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public interface IDatabaseOperationFactory<T> where T : class, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>
    /// 创建过滤器构建器
    /// </summary>
    FilterBuilder<T> CreateFilterBuilder();

    /// <summary>
    /// 创建排序构建器
    /// </summary>
    SortBuilder<T> CreateSortBuilder();

    /// <summary>
    /// 创建更新构建器
    /// </summary>
    UpdateBuilder<T> CreateUpdateBuilder();

    // ========== 核心原子操作 ==========

    /// <summary>
    /// 创建实体（原子操作）
    /// </summary>
    Task<T> CreateAsync(T entity);

    /// <summary>
    /// 批量创建实体（原子操作）
    /// </summary>
    Task<List<T>> CreateManyAsync(IEnumerable<T> entities);

    /// <summary>
    /// 查找并替换（原子操作）
    /// </summary>
    Task<T?> FindOneAndReplaceAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null);

    /// <summary>
    /// 查找并更新（原子操作）
    /// </summary>
    Task<T?> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null);

    /// <summary>
    /// 查找并软删除（原子操作）
    /// </summary>
    Task<T?> FindOneAndSoftDeleteAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null);

    /// <summary>
    /// 查找并硬删除（原子操作）
    /// </summary>
    Task<T?> FindOneAndDeleteAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null);

    /// <summary>
    /// 批量更新（原子操作）
    /// </summary>
    Task<long> UpdateManyAsync(FilterDefinition<T> filter, UpdateDefinition<T> update);

    /// <summary>
    /// 批量软删除（原子操作）
    /// </summary>
    Task<long> SoftDeleteManyAsync(IEnumerable<string> ids);

    // ========== 查询操作 ==========

    /// <summary>
    /// 执行查询操作
    /// </summary>
    Task<List<T>> FindAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null);

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10);

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    Task<T?> GetByIdAsync(string id);

    /// <summary>
    /// 检查实体是否存在
    /// </summary>
    Task<bool> ExistsAsync(string id);

    /// <summary>
    /// 获取实体数量
    /// </summary>
    Task<long> CountAsync(FilterDefinition<T>? filter = null);

    // ========== 不带租户过滤的操作 ==========

    /// <summary>
    /// 执行查询操作（不带租户过滤）
    /// </summary>
    Task<List<T>> FindWithoutTenantFilterAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null);

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    Task<T?> GetByIdWithoutTenantFilterAsync(string id);

    /// <summary>
    /// 查找并替换（原子操作，不带租户过滤）
    /// </summary>
    Task<T?> FindOneAndReplaceWithoutTenantFilterAsync(FilterDefinition<T> filter, T replacement, FindOneAndReplaceOptions<T>? options = null);

    /// <summary>
    /// 查找并更新（原子操作，不带租户过滤）
    /// </summary>
    Task<T?> FindOneAndUpdateWithoutTenantFilterAsync(FilterDefinition<T> filter, UpdateDefinition<T> update, FindOneAndUpdateOptions<T>? options = null);

    /// <summary>
    /// 查找并软删除（原子操作，不带租户过滤）
    /// </summary>
    Task<T?> FindOneAndSoftDeleteWithoutTenantFilterAsync(FilterDefinition<T> filter, FindOneAndUpdateOptions<T>? options = null);

    /// <summary>
    /// 查找并硬删除（原子操作，不带租户过滤）
    /// </summary>
    Task<T?> FindOneAndDeleteWithoutTenantFilterAsync(FilterDefinition<T> filter, FindOneAndDeleteOptions<T>? options = null);

    // ========== 上下文方法 ==========

    /// <summary>
    /// 获取当前用户ID
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取当前用户名
    /// </summary>
    string? GetCurrentUsername();

    /// <summary>
    /// 获取当前企业ID
    /// </summary>
    string? GetCurrentCompanyId();

    /// <summary>
    /// 获取必需的用户ID（为空则抛异常）
    /// </summary>
    string GetRequiredUserId();

    /// <summary>
    /// 获取必需的企业ID（为空则抛异常）
    /// </summary>
    string GetRequiredCompanyId();
}