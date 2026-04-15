using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Services;

public class PlatformDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;
    private readonly ISM3HmacProvider? _hmacProvider;

    public PlatformDbContext(
        DbContextOptions<PlatformDbContext> options,
        ITenantContext? tenantContext = null,
        ISM3HmacProvider? hmacProvider = null)
        : base(options)
    {
        _tenantContext = tenantContext;
        _hmacProvider = hmacProvider;
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    protected string? CurrentUserId => _tenantContext?.GetCurrentUserId();

    protected string? CurrentCompanyId => _tenantContext?.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();

    private static List<Type>? _cachedEntityTypes;

    public override int SaveChanges()
    {
        ApplyAuditInfoCore();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditInfoCore();
        return await base.SaveChangesAsync();
    }

    private void ApplyAuditInfoCore()
    {
        var now = DateTime.UtcNow;
        var userId = CurrentUserId;
        var companyId = CurrentCompanyId;

        foreach (var entry in ChangeTracker.Entries())
        {
            var entity = entry.Entity;
            var state = entry.State;

            if (state is EntityState.Added or EntityState.Modified)
            {
                var isAdded = state == EntityState.Added;

                if (entity is ITimestamped { } timestamped)
                {
                    if (isAdded) timestamped.CreatedAt = now;
                    timestamped.UpdatedAt = now;
                }

                if (entity is IOperationTrackable { } trackable)
                {
                    trackable.UpdatedBy = userId;
                    trackable.LastOperationAt = now;
                    if (isAdded) trackable.CreatedBy ??= userId;
                }

                if (isAdded && entity is IMultiTenant { CompanyId: "" or null } tenant)
                    tenant.CompanyId = companyId ?? string.Empty;

                if (entity is IIntegrityTrackable && _hmacProvider != null)
                {
                    var keyFields = ExtractKeyFields(entity);
                    var hmac = _hmacProvider.ComputeHmac(keyFields, companyId);
                    ((IIntegrityTrackable)entity).IntegrityHash = hmac;
                }

                if (!isAdded && entity is ISoftDeletable { } softDeletable &&
                    entry.Property(nameof(ISoftDeletable.IsDeleted)).IsModified)
                {
                    if (softDeletable.IsDeleted == true)
                    {
                        softDeletable.DeletedAt ??= now;
                        softDeletable.DeletedBy ??= userId;
                    }
                    else
                    {
                        softDeletable.DeletedAt = null;
                        softDeletable.DeletedBy = null;
                    }
                }
            }

            if (state == EntityState.Deleted && entity is ISoftDeletable { } deletable)
            {
                entry.State = EntityState.Modified;
                deletable.IsDeleted = true;
                deletable.DeletedAt = now;
                deletable.DeletedBy = userId;
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var type in GetEntityTypes())
        {
            modelBuilder.Entity(type);

            var tableName = type.Name;
            modelBuilder.Entity(type).ToCollection(tableName);

            if (typeof(IMultiTenant).IsAssignableFrom(type) || typeof(ISoftDeletable).IsAssignableFrom(type))
            {
                typeof(PlatformDbContext)
                    .GetMethod(nameof(ApplyQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(type)
                    .Invoke(this, [modelBuilder]);
            }
        }
    }

    private void ApplyQueryFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : class
    {
        var entityType = typeof(TEntity);


        if (typeof(IMultiTenant).IsAssignableFrom(entityType)
            && typeof(ISoftDeletable).IsAssignableFrom(entityType))
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(
                e => ((IMultiTenant)e).CompanyId == CurrentCompanyId
                    && ((ISoftDeletable)e).IsDeleted != true);
        }
        else if (typeof(IMultiTenant).IsAssignableFrom(entityType))
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(
                e => ((IMultiTenant)e).CompanyId == CurrentCompanyId);
        }
        else if (typeof(ISoftDeletable).IsAssignableFrom(entityType))
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(
                e => ((ISoftDeletable)e).IsDeleted != true);
        }
    }

    private static List<Type> GetEntityTypes()
    {
        if (_cachedEntityTypes != null) return _cachedEntityTypes;

        _cachedEntityTypes = new[] { Assembly.GetExecutingAssembly(), Assembly.GetEntryAssembly() }
            .Where(a => a != null)
            .Cast<Assembly>()
            .Distinct()
            .SelectMany(a => TryGetTypes(a))
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IEntity).IsAssignableFrom(t))
            .ToList();

        return _cachedEntityTypes;
    }

    private static Type[] TryGetTypes(Assembly a)
    {
        try { return a.GetTypes(); }
        catch { return []; }
    }

    private static string ExtractKeyFields(object entity)
    {
        var type = entity.GetType();
        var sb = new System.Text.StringBuilder();

        var props = type.GetProperties()
            .Where(p => p.CanRead && p.GetIndexParameters().Length == 0)
            .Where(p => p.Name != nameof(IEntity.Id) && p.Name != nameof(IIntegrityTrackable.IntegrityHash));

        foreach (var prop in props)
        {
            var value = prop.GetValue(entity);
            if (value != null)
            {
                sb.Append(value.ToString());
                sb.Append("|");
            }
        }

        return sb.ToString().TrimEnd('|');
    }
}
