using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.Linq.Expressions;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 平台数据库上下文 - 基于 MongoDB Entity Framework Core (优化版本)
/// </summary>
public class PlatformDbContext(DbContextOptions<PlatformDbContext> options, ITenantContext? tenantContext = null)
    : DbContext(options)
{
    private readonly string? _currentCompanyId = tenantContext?.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();
    private readonly ITenantContext? _tenantContext = tenantContext;

    public override int SaveChanges()
    {
        ApplyAuditInfo();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInfo();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// 🚀 自动填充审计字段（CreatedBy, UpdatedBy, CreatedAt, UpdatedAt 等）
    /// </summary>
    private void ApplyAuditInfo()
    {
        var userId = _tenantContext?.GetCurrentUserId();
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            // 处理时间戳
            if (entry.Entity is ITimestamped timestamped)
            {
                if (entry.State == EntityState.Added)
                {
                    timestamped.CreatedAt = now;
                    timestamped.UpdatedAt = now;
                }
                else if (entry.State == EntityState.Modified)
                {
                    timestamped.UpdatedAt = now;
                }
            }

            // 处理操作追踪
            if (entry.Entity is IOperationTrackable trackable)
            {
                if (entry.State == EntityState.Added)
                {
                    trackable.CreatedBy ??= userId;
                    trackable.UpdatedBy = userId;
                    trackable.LastOperationAt = now;
                    trackable.LastOperationType = "CREATE";
                }
                else if (entry.State == EntityState.Modified)
                {
                    trackable.UpdatedBy = userId;
                    trackable.LastOperationAt = now;
                    trackable.LastOperationType = "UPDATE";
                }
            }

            // 处理多租户
            if (entry.Entity is IMultiTenant tenant && string.IsNullOrEmpty(tenant.CompanyId))
            {
                if (entry.State == EntityState.Added)
                {
                    tenant.CompanyId = _currentCompanyId ?? string.Empty;
                }
            }

            // 处理软删除审计
            if (entry.Entity is ISoftDeletable softDeletable && entry.State == EntityState.Modified)
            {
                var isDeletedProp = entry.Property(nameof(ISoftDeletable.IsDeleted));
                if (isDeletedProp.IsModified && (bool)isDeletedProp.CurrentValue!)
                {
                    softDeletable.DeletedAt ??= now;
                    softDeletable.DeletedBy ??= userId;

                    if (entry.Entity is IOperationTrackable ot)
                    {
                        ot.LastOperationType = "DELETE";
                        ot.LastOperationAt = now;
                    }
                }
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 获取所有继承自 IEntity 的实体模型
        // 扫描当前程序集以及入口程序集（ApiService）
        var assemblies = new List<Assembly> { Assembly.GetExecutingAssembly() };
        var entryAssembly = Assembly.GetEntryAssembly();
        if (entryAssembly != null) assemblies.Add(entryAssembly);

        var entityTypes = assemblies
            .SelectMany(a => a.GetTypes())
            .Where(t => t.IsClass && !t.IsAbstract && typeof(IEntity).IsAssignableFrom(t))
            .Distinct();

        foreach (var type in entityTypes)
        {
            var entityBuilder = modelBuilder.Entity(type);

            // 配置集合名称：优先使用 BsonCollectionNameAttribute，否则使用类名复数
            var attr = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>();
            var collectionName = attr?.Name ?? type.Name.ToLowerInvariant() + "s";

            entityBuilder.ToCollection(collectionName);

            // 🚀 配置全局查询过滤器（软删除 + 多租户）
            var globalFilter = CreateGlobalFilter(type, _currentCompanyId);
            if (globalFilter != null)
            {
                entityBuilder.HasQueryFilter(globalFilter);
            }
        }
    }

    /// <summary>
    /// 🚀 创建全局过滤器（软删除 + 多租户）
    /// </summary>
    private static System.Linq.Expressions.LambdaExpression? CreateGlobalFilter(Type type, string? companyId)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(type, "e");
        System.Linq.Expressions.Expression? body = null;

        if (typeof(ISoftDeletable).IsAssignableFrom(type))
        {
            var isDeleted = System.Linq.Expressions.Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
            var notDeleted = System.Linq.Expressions.Expression.Equal(isDeleted, System.Linq.Expressions.Expression.Constant(false));
            body = notDeleted;
        }

        if (typeof(IMultiTenant).IsAssignableFrom(type) && !string.IsNullOrEmpty(companyId))
        {
            var companyIdProperty = System.Linq.Expressions.Expression.Property(parameter, nameof(IMultiTenant.CompanyId));
            var companyIdConstant = System.Linq.Expressions.Expression.Constant(companyId);
            var tenantFilter = System.Linq.Expressions.Expression.Equal(companyIdProperty, companyIdConstant);
            body = body == null ? tenantFilter : System.Linq.Expressions.Expression.AndAlso(body, tenantFilter);
        }

        return body == null ? null : System.Linq.Expressions.Expression.Lambda(body, parameter);
    }
}
