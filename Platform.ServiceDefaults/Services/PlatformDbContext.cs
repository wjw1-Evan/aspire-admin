using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.Linq.Expressions;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 平台数据库上下文 - 基于 MongoDB Entity Framework Core (优化版本)
/// </summary>
public class PlatformDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public PlatformDbContext(DbContextOptions<PlatformDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;

        // 🧱 核心配置：禁用自动事务。
        // 原因是 Standalone 模式的 MongoDB 不支持事务（需要 Replica Set）。
        // 启用批量删除等操作时，EF Core 默认会开启事务导致报错。
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    public string? CurrentCompanyId
    {
        get
        {
            if (_tenantContext == null) return null;

            // 🚀 性能优化：由于 EF Core 过滤器要求同步访问，此处使用同步阻塞。
            // 但通过 TenantContext 的 Scoped 缓存，后续调用将直接从内存返回，减少阻塞时间。
            var task = _tenantContext.GetCurrentCompanyIdAsync();
            if (!task.IsCompleted)
            {
                // _logger?.LogWarning("PlatformDbContext: 同步阻塞获取 CurrentCompanyId，请检查是否已在请求开始时预热缓存");
            }
            return task.GetAwaiter().GetResult();
        }
    }

    // 缓存实体类型扫描结果
    private static List<Type>? _cachedEntityTypes;
    private static readonly System.Threading.Lock _cacheLock = new();

    public override int SaveChanges()
    {
        ApplyAuditInfo();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await ApplyAuditInfoAsync();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditInfo()
    {
        // 同步版本保持不变，用于 SaveChanges()
        var userId = _tenantContext?.GetCurrentUserId();
        var companyId = CurrentCompanyId;

        ApplyAuditInfoCore(userId, companyId);
    }

    private async Task ApplyAuditInfoAsync()
    {
        // 🚀 性能优化：异步获取租户信息，避免 SaveChangesAsync 内部触发同步阻塞
        var userId = _tenantContext?.GetCurrentUserId();
        var companyId = _tenantContext != null ? await _tenantContext.GetCurrentCompanyIdAsync() : null;

        ApplyAuditInfoCore(userId, companyId);
    }

    private void ApplyAuditInfoCore(string? userId, string? companyId)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            ApplyEntryAuditInfo(entry, userId, companyId, now);
        }
    }

    private static void ApplyEntryAuditInfo(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry, string? userId, string? companyId, DateTime now)
    {
        var state = entry.State;
        if (state != EntityState.Added && state != EntityState.Modified) return;

        var entity = entry.Entity;
        var isAdded = state == EntityState.Added;

        // 处理时间戳
        if (entity is ITimestamped timestamped)
        {
            if (isAdded)
            {
                timestamped.CreatedAt = now;
                timestamped.UpdatedAt = now;
            }
            else
            {
                timestamped.UpdatedAt = now;
            }
        }

        // 处理操作追踪
        if (entity is IOperationTrackable trackable)
        {
            if (isAdded)
            {
                trackable.CreatedBy ??= userId;
                trackable.UpdatedBy = userId;
                trackable.LastOperationAt = now;
                trackable.LastOperationType = "CREATE";
            }
            else
            {
                trackable.UpdatedBy = userId;
                trackable.LastOperationAt = now;
                trackable.LastOperationType = "UPDATE";
            }
        }

        // 处理多租户
        if (isAdded && entity is IMultiTenant tenant && string.IsNullOrEmpty(tenant.CompanyId))
        {
            tenant.CompanyId = companyId ?? string.Empty;
        }

        // 处理软删除审计（仅在修改状态时检查）
        if (!isAdded && entity is ISoftDeletable softDeletable)
        {
            var isDeletedProp = entry.Property(nameof(ISoftDeletable.IsDeleted));
            if (isDeletedProp.IsModified)
            {
                if (softDeletable.IsDeleted)
                {
                    softDeletable.DeletedAt ??= now;
                    softDeletable.DeletedBy ??= userId;

                    if (entity is IOperationTrackable ot)
                    {
                        ot.LastOperationType = "DELETE";
                        ot.LastOperationAt = now;
                    }
                }
                else
                {
                    // 数据被恢复 (Undelete)：清除原有软删除记录
                    softDeletable.DeletedAt = null;
                    softDeletable.DeletedBy = null;
                    softDeletable.DeletedReason = null;

                    if (entity is IOperationTrackable ot)
                    {
                        ot.LastOperationType = "RESTORE";
                        ot.LastOperationAt = now;
                    }
                }
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 获取缓存的实体类型或扫描
        var entityTypes = GetEntityTypes();

        foreach (var type in entityTypes)
        {
            var entityBuilder = modelBuilder.Entity(type);

            // 配置集合名称：优先使用 BsonCollectionNameAttribute，其次是 TableAttribute，最后是类名复数
            var bsonAttr = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>();
            var tableAttr = type.GetCustomAttribute<TableAttribute>();
            var collectionName = bsonAttr?.Name ?? tableAttr?.Name ?? type.Name.ToLowerInvariant() + "s";
            entityBuilder.ToCollection(collectionName);

            // 🚀 配置全局查询过滤器（软删除 + 多租户）
            var parameter = Expression.Parameter(type, "e");
            Expression? filterBody = null;

            // 1. 软删除过滤器 (静态部分)
            if (typeof(ISoftDeletable).IsAssignableFrom(type))
            {
                var isDeleted = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                var nullableIsDeleted = Expression.Convert(isDeleted, typeof(bool?));
                filterBody = Expression.NotEqual(nullableIsDeleted, Expression.Constant(true, typeof(bool?)));
            }

            // 2. 多租户过滤器 (动态部分)
            if (typeof(IMultiTenant).IsAssignableFrom(type))
            {
                // 获取当前上下文实例的 CurrentCompanyId 属性
                var companyIdProperty = Expression.Property(parameter, nameof(IMultiTenant.CompanyId));
                var currentCompanyIdProperty = Expression.Property(Expression.Constant(this), nameof(CurrentCompanyId));

                var tenantFilter = Expression.Equal(companyIdProperty, currentCompanyIdProperty);
                filterBody = filterBody == null ? tenantFilter : Expression.AndAlso(filterBody, tenantFilter);
            }

            if (filterBody != null)
            {
                entityBuilder.HasQueryFilter(Expression.Lambda(filterBody, parameter));
            }
        }
    }

    /// <summary>
    /// 获取所有实体类型（带缓存）
    /// </summary>
    private static List<Type> GetEntityTypes()
    {
        if (_cachedEntityTypes != null) return _cachedEntityTypes;

        lock (_cacheLock)
        {
            if (_cachedEntityTypes != null) return _cachedEntityTypes;

            List<Assembly> assemblies = [Assembly.GetExecutingAssembly()];
            var entryAssembly = Assembly.GetEntryAssembly();
            if (entryAssembly != null && entryAssembly != Assembly.GetExecutingAssembly())
                assemblies.Add(entryAssembly);

            _cachedEntityTypes = [.. assemblies
                .SelectMany(a =>
                {
                    try
                    {
                        return a.GetTypes();
                    }
                    catch (ReflectionTypeLoadException ex)
                    {
                        // ASP.NET Core 环境中避免因某些依赖缺失导致整个扫描直接崩溃
                        return ex.Types.OfType<Type>();
                    }
                })
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IEntity).IsAssignableFrom(t))
                .Distinct()];

            return _cachedEntityTypes;
        }
    }

}
