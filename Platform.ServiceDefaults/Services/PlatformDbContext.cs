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
/// 平台数据库上下文 - 基于 MongoDB Entity Framework Core (优化版本) 不允许修改该文件
/// </summary>
public class PlatformDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public PlatformDbContext(DbContextOptions<PlatformDbContext> options, ITenantContext? tenantContext = null) 
        : base(options)
    {
        _tenantContext = tenantContext;
        // 🚀 兼容性修复：MongoDB 单机模式不支持事务，禁用自动事务
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    protected bool IsSystemContext => _tenantContext?.IsSystemContext ?? true;


    public string? CurrentCompanyId => _tenantContext?.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();


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
        => ApplyAuditInfoCore(_tenantContext?.GetCurrentUserId(), CurrentCompanyId);

    private async Task ApplyAuditInfoAsync() 
        => ApplyAuditInfoCore(_tenantContext?.GetCurrentUserId(), _tenantContext != null ? await _tenantContext.GetCurrentCompanyIdAsync() : null);

    private void ApplyAuditInfoCore(string? userId, string? companyId)
    {
        var hmac = new HMac(new SM3Digest());
        hmac.Init(new Org.BouncyCastle.Crypto.Parameters.KeyParameter(System.Text.Encoding.UTF8.GetBytes("YOUR_GLOBAL_SM3_HMAC_KEY_REPLACE_ME")));
        var now = DateTime.UtcNow;

        ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
            .ToList()
            .ForEach(entry => ApplyEntryAuditInfo(entry, userId, companyId, now, hmac));
    }

    private static void ApplyEntryAuditInfo(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry, string? userId, string? companyId, DateTime now, HMac hmac)
    {
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
            var currentUserId = string.IsNullOrEmpty(userId) ? null : userId;
            trackable.UpdatedBy = currentUserId;
            trackable.LastOperationAt = now;
            if (isAdded)
            {
                trackable.CreatedBy ??= currentUserId;
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
            var currentCompanyId = string.IsNullOrEmpty(companyId) ? null : companyId;
            tenant.CompanyId = currentCompanyId ?? string.Empty;
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
            var properties = entry.CurrentValues.Properties.Where(p => p.Name != nameof(IAntiTamper.Sm3Mac));
            var payloadStr = string.Join("|", properties.Select(p => entry.CurrentValues[p]?.ToString() ?? ""));
            var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payloadStr);
            antiTamper.Sm3Mac = Hex.ToHexString(MacUtilities.DoFinal(hmac, payloadBytes));
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        GetEntityTypes().ForEach(type => ConfigureEntity(modelBuilder, type));
    }

    private void ConfigureEntity(ModelBuilder modelBuilder, Type type)
    {
        var entityBuilder = modelBuilder.Entity(type);
        var bsonAttr = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>();
        var tableAttr = type.GetCustomAttribute<TableAttribute>();
        entityBuilder.ToCollection(bsonAttr?.Name ?? tableAttr?.Name ?? type.Name.ToLowerInvariant() + "s");

        // 🚀 核心优化：使用泛型方法反射调用，利用编译器生成的 Lambda 确保对 'this' (DbContext) 的闭包正确。
        // 避免手动构建 Expression.Constant(this) 导致过滤器被绑定到第一个创建模型的实例上（EF Core 模型缓存问题）。
        var method = typeof(PlatformDbContext).GetMethod(nameof(ApplyFilterGeneric), BindingFlags.NonPublic | BindingFlags.Instance);
        method?.MakeGenericMethod(type).Invoke(this, [modelBuilder]);
    }

    private void ApplyFilterGeneric<TEntity>(ModelBuilder modelBuilder) where TEntity : class
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            (!(e is ISoftDeletable) || !((ISoftDeletable)e).IsDeleted) &&
            (!(e is IMultiTenant) || (IsSystemContext || ((IMultiTenant)e).CompanyId == CurrentCompanyId))
        );
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
