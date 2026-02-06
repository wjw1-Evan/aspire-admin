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

    /// <summary>
    /// 创建投影构建器
    /// </summary>
    ProjectionBuilder<T> CreateProjectionBuilder();

    // ========== 核心原子操作 ==========

    /// <summary>
    /// 创建实体（原子操作）
    /// </summary>
    Task<T> CreateAsync(T entity);

    /// <summary>
    /// 创建实体（原子操作，后台线程场景，避免访问 HttpContext）
    /// </summary>
    /// <param name="entity">要创建的实体</param>
    /// <param name="userId">用户ID（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
    /// <param name="username">用户名（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
    Task<T> CreateAsync(T entity, string? userId, string? username);

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

    /// <summary>
    /// 执行批量写入操作 (原子操作)
    /// </summary>
    Task<BulkWriteResult<T>> BulkWriteAsync(IEnumerable<WriteModel<T>> requests, BulkWriteOptions? options = null);

    // ========== 查询操作 ==========

    /// <summary>
    /// 执行查询操作
    /// </summary>
    Task<List<T>> FindAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null);

    /// <summary>
    /// 执行查询操作（包含软删除记录）
    /// </summary>
    Task<List<T>> FindIncludingDeletedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null);

    /// <summary>
    /// 执行分页查询操作
    /// </summary>
    Task<(List<T> items, long total)> FindPagedAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int page = 1, int pageSize = 10, ProjectionDefinition<T>? projection = null);

    /// <summary>
    /// 根据ID获取实体
    /// </summary>
    Task<T?> GetByIdAsync(string id, ProjectionDefinition<T>? projection = null);

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
    Task<List<T>> FindWithoutTenantFilterAsync(FilterDefinition<T>? filter = null, SortDefinition<T>? sort = null, int? limit = null, ProjectionDefinition<T>? projection = null);

    /// <summary>
    /// 根据ID获取实体（不带租户过滤）
    /// </summary>
    Task<T?> GetByIdWithoutTenantFilterAsync(string id, ProjectionDefinition<T>? projection = null);

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

    /// <summary>
    /// 执行聚合操作（自动应用租户过滤）
    /// </summary>
    Task<List<TResult>> AggregateAsync<TResult>(PipelineDefinition<T, TResult> pipeline);

    // ========== 上下文方法 ==========

    /// <summary>
    /// 获取当前用户ID（从 JWT token 读取，同步方法）
    /// </summary>
    string? GetCurrentUserId();

    /// <summary>
    /// 获取必需的用户ID（为空则抛异常）
    /// </summary>
    string GetRequiredUserId();

    /// <summary>
    /// 获取必需的企业ID（统一从数据库读取，为空则抛异常）
    /// </summary>
    Task<string> GetRequiredCompanyIdAsync();
}