using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 平台数据库上下文 - 基于 MongoDB Entity Framework Core (优化版本)
/// </summary>
public class PlatformDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public PlatformDbContext(
        DbContextOptions<PlatformDbContext> options,
        ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;

        // 🚀 兼容性修复：MongoDB 单机模式不支持事务，禁用自动事务
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    protected bool IsSystemContext => _tenantContext?.IsSystemContext ?? true;

    // 缓存实体类型扫描结果
    private static List<Type>? _cachedEntityTypes;
    private static readonly List<Assembly> _extraEntityAssemblies = [];
    private static readonly object _cacheLock = new();

    /// <summary>
    /// 注册额外的实体程序集（主要用于单元测试）
    /// </summary>
    public static void RegisterEntityAssembly(Assembly assembly)
    {
        lock (_cacheLock)
        {
            if (_extraEntityAssemblies.Contains(assembly)) return;

            _extraEntityAssemblies.Add(assembly);
            _cachedEntityTypes = null; // 清除缓存以重新扫描
        }
    }

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
        var userId = _tenantContext?.GetCurrentUserId();
        var companyId = _tenantContext?.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();
        ApplyAuditInfoCore(userId, companyId);
    }

    private async Task ApplyAuditInfoAsync()
    {
        var userId = _tenantContext?.GetCurrentUserId();
        var companyId = _tenantContext != null ? await _tenantContext.GetCurrentCompanyIdAsync() : null;
        ApplyAuditInfoCore(userId, companyId);
    }

    private void ApplyAuditInfoCore(string? userId, string? companyId)
    {
        var now = DateTime.UtcNow;

        // 🚀 使用 LINQ 筛选需要审计的实体
        var modifiedEntries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified)
            .ToList();

        if (modifiedEntries.Count == 0) return;

        // 🚀 使用 LINQ 分组处理不同类型的审计
        foreach (var entry in modifiedEntries)
        {
            var entity = entry.Entity;
            var isAdded = entry.State == EntityState.Added;

            // 1. 时间戳审计
            if (entity is ITimestamped timestamped)
            {
                if (isAdded) timestamped.CreatedAt = now;
                timestamped.UpdatedAt = now;
            }

            // 2. 操作追踪审计
            if (entity is IOperationTrackable trackable)
            {
                trackable.UpdatedBy = string.IsNullOrEmpty(userId) ? null : userId;
                trackable.LastOperationAt = now;

                if (isAdded)
                {
                    trackable.CreatedBy ??= trackable.UpdatedBy;
                    trackable.LastOperationType = "CREATE";
                }
                else
                {
                    trackable.LastOperationType = "UPDATE";
                }
            }

            // 3. 多租户审计
            if (isAdded && entity is IMultiTenant { CompanyId: "" or null } tenant)
            {
                tenant.CompanyId = companyId ?? string.Empty;
            }

            // 4. 软删除审计
            if (!isAdded && entity is ISoftDeletable softDeletable &&
                entry.Property(nameof(ISoftDeletable.IsDeleted)).IsModified)
            {
                if (softDeletable.IsDeleted)
                {
                    softDeletable.DeletedAt ??= now;
                    softDeletable.DeletedBy ??= userId;
                    if (entity is IOperationTrackable ot) ot.LastOperationType = "DELETE";
                }
                else
                {
                    softDeletable.DeletedAt = null;
                    softDeletable.DeletedBy = null;
                    softDeletable.DeletedReason = null;
                    if (entity is IOperationTrackable ot) ot.LastOperationType = "RESTORE";
                }
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 🚀 使用 LINQ 批量配置实体
        GetEntityTypes().ForEach(type => ConfigureEntity(modelBuilder, type));
    }

    private void ConfigureEntity(ModelBuilder modelBuilder, Type type)
    {
        var entityBuilder = modelBuilder.Entity(type);

        // 🚀 使用 LINQ 简化集合名称获取
        var collectionName = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>()?.Name
                          ?? type.GetCustomAttribute<TableAttribute>()?.Name
                          ?? $"{type.Name.ToLowerInvariant()}s";

        entityBuilder.ToCollection(collectionName);

        // 🚀 应用全局查询过滤器（软删除 + 多租户）
        typeof(PlatformDbContext)
            .GetMethod(nameof(ApplyFilterGeneric), BindingFlags.NonPublic | BindingFlags.Instance)
            ?.MakeGenericMethod(type)
            .Invoke(this, [modelBuilder]);
    }

    private void ApplyFilterGeneric<TEntity>(ModelBuilder modelBuilder) where TEntity : class
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            (e is not ISoftDeletable sd || !sd.IsDeleted) &&
            (e is not IMultiTenant mt || IsSystemContext || mt.CompanyId == _tenantContext!.GetCurrentCompanyIdAsync().GetAwaiter().GetResult())
        );
    }

    private static List<Type> GetEntityTypes()
    {
        if (_cachedEntityTypes != null) return _cachedEntityTypes;

        lock (_cacheLock)
        {
            if (_cachedEntityTypes != null) return _cachedEntityTypes;

            // 🚀 使用 LINQ 简化程序集收集
            var assemblies = new[] { Assembly.GetExecutingAssembly(), Assembly.GetEntryAssembly() }
                .Where(a => a != null)
                .Cast<Assembly>()
                .Concat(_extraEntityAssemblies)
                .Distinct()
                .ToList();

            // 🚀 使用 LINQ 简化实体类型扫描
            _cachedEntityTypes = assemblies
                .SelectMany(a =>
                {
                    try { return a.GetTypes(); }
                    catch { return []; }
                })
                .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IEntity).IsAssignableFrom(t))
                .ToList();

            return _cachedEntityTypes;
        }
    }
}
