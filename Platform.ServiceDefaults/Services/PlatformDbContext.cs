using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.Utilities.Encoders;
using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Crypto.Macs;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.Linq.Expressions;
using System.ComponentModel.DataAnnotations.Schema;


namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 平台数据库上下文 - 基于 MongoDB Entity Framework Core (优化版本)
/// </summary>
public class PlatformDbContext(DbContextOptions<PlatformDbContext> options, ITenantContext? tenantContext = null)
    : DbContext(options)
{
    public string? CurrentCompanyId
    {
        get
        {
            if (tenantContext == null) return null;

            // 🚀 性能优化：由于 EF Core 过滤器要求同步访问，此处使用同步阻塞。
            // 但通过 TenantContext 的 Scoped 缓存，后续调用将直接从内存返回，减少阻塞时间。
            var task = tenantContext.GetCurrentCompanyIdAsync();
            if (!task.IsCompleted)
            {
                // _logger?.LogWarning("PlatformDbContext: 同步阻塞获取 CurrentCompanyId，请检查是否已在请求开始时预热缓存");
            }
            return task.GetAwaiter().GetResult();
        }
    }

    // 缓存实体类型扫描结果
    private static List<Type>? _cachedEntityTypes;
    private static readonly List<Assembly> _extraEntityAssemblies = [];
    private static readonly System.Threading.Lock _cacheLock = new();

    /// <summary>
    /// 注册额外的实体程序集（主要用于单元测试）
    /// </summary>
    /// <param name="assembly"></param>
    public static void RegisterEntityAssembly(Assembly assembly)
    {
        lock (_cacheLock)
        {
            if (!_extraEntityAssemblies.Contains(assembly))
            {
                _extraEntityAssemblies.Add(assembly);
                _cachedEntityTypes = null; // 清除缓存以重新扫描
            }
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
        // 同步版本保持不变，用于 SaveChanges()
        var userId = tenantContext?.GetCurrentUserId();
        var companyId = CurrentCompanyId;

        ApplyAuditInfoCore(userId, companyId);
    }

    private async Task ApplyAuditInfoAsync()
    {
        // 🚀 性能优化：异步获取租户信息，避免 SaveChangesAsync 内部触发同步阻塞
        var userId = tenantContext?.GetCurrentUserId();
        var companyId = tenantContext != null ? await tenantContext.GetCurrentCompanyIdAsync() : null;

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
        if (entry.State != EntityState.Added && entry.State != EntityState.Modified) return;

        var entity = entry.Entity;
        var isAdded = entry.State == EntityState.Added;

        // 1. 时间戳
        if (entity is ITimestamped timestamped)
        {
            if (isAdded) timestamped.CreatedAt = now;
            timestamped.UpdatedAt = now;
        }

        // 2. 操作追踪
        if (entity is IOperationTrackable trackable)
        {
            trackable.UpdatedBy = userId;
            trackable.LastOperationAt = now;
            if (isAdded)
            {
                trackable.CreatedBy ??= userId;
                trackable.LastOperationType = "CREATE";
            }
            else
            {
                trackable.LastOperationType = "UPDATE";
            }
        }

        // 3. 多租户
        if (isAdded && entity is IMultiTenant tenant && string.IsNullOrEmpty(tenant.CompanyId))
        {
            tenant.CompanyId = companyId ?? string.Empty;
        }

        // 4. 软删除审计
        if (!isAdded && entity is ISoftDeletable softDeletable)
        {
            var isDeletedProp = entry.Property(nameof(ISoftDeletable.IsDeleted));
            if (isDeletedProp.IsModified)
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

        // 5. 数据防篡改 (MAC 生成)
        if (entity is IAntiTamper antiTamper)
        {
            var keyBytes = System.Text.Encoding.UTF8.GetBytes("YOUR_GLOBAL_SM3_HMAC_KEY_REPLACE_ME");
            var hmac = new HMac(new SM3Digest());
            hmac.Init(new Org.BouncyCastle.Crypto.Parameters.KeyParameter(keyBytes));

            var properties = entry.CurrentValues.Properties.Where(p => p.Name != nameof(IAntiTamper.Sm3Mac));
            var payloadStr = string.Join("|", properties.Select(p => entry.CurrentValues[p]?.ToString() ?? ""));

            var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payloadStr);
            antiTamper.Sm3Mac = Hex.ToHexString(MacUtilities.DoFinal(hmac, payloadBytes));
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var type in GetEntityTypes())
        {
            var entityBuilder = modelBuilder.Entity(type);

            // 配置集合名称
            var bsonAttr = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>();
            var tableAttr = type.GetCustomAttribute<TableAttribute>();
            entityBuilder.ToCollection(bsonAttr?.Name ?? tableAttr?.Name ?? type.Name.ToLowerInvariant() + "s");

            // 配置全局查询过滤器
            var parameter = Expression.Parameter(type, "e");
            Expression? filterBody = null;

            if (typeof(ISoftDeletable).IsAssignableFrom(type))
            {
                var isDeleted = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                filterBody = Expression.NotEqual(Expression.Convert(isDeleted, typeof(bool?)), Expression.Constant(true, typeof(bool?)));
            }

            if (typeof(IMultiTenant).IsAssignableFrom(type))
            {
                var companyIdProperty = Expression.Property(parameter, nameof(IMultiTenant.CompanyId));
                var currentCompanyIdProperty = Expression.Property(Expression.Constant(this), nameof(CurrentCompanyId));
                var tenantFilter = Expression.Equal(companyIdProperty, currentCompanyIdProperty);
                filterBody = filterBody == null ? tenantFilter : Expression.AndAlso(filterBody, tenantFilter);
            }

            if (filterBody != null) entityBuilder.HasQueryFilter(Expression.Lambda(filterBody, parameter));
        }
    }

    private static List<Type> GetEntityTypes()
    {
        if (_cachedEntityTypes != null) return _cachedEntityTypes;

        lock (_cacheLock)
        {
            if (_cachedEntityTypes != null) return _cachedEntityTypes;

            var assemblies = new List<Assembly>
            {
                Assembly.GetExecutingAssembly()
            };

            var entryAssembly = Assembly.GetEntryAssembly();
            if (entryAssembly != null) assemblies.Add(entryAssembly);

            assemblies.AddRange(_extraEntityAssemblies);

            _cachedEntityTypes = assemblies
                .Distinct()
                .SelectMany(a => { try { return a.GetTypes(); } catch { return Type.EmptyTypes; } })
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IEntity).IsAssignableFrom(t))
                .ToList();

            return _cachedEntityTypes;
        }
    }

}
