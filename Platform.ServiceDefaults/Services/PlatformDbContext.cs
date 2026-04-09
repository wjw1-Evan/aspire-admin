using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using Platform.ServiceDefaults.Models;
using System.Reflection;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Http;

namespace Platform.ServiceDefaults.Services;

public class PlatformDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public PlatformDbContext(
        DbContextOptions<PlatformDbContext> options,
        IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    private ITenantContext? TenantContext
    {
        get
        {
            if (_httpContextAccessor?.HttpContext == null) return null;
            return _httpContextAccessor.HttpContext.RequestServices.GetService(typeof(ITenantContext)) as ITenantContext;
        }
    }

    protected string? CurrentUserId => _httpContextAccessor?.HttpContext?.Items["UserId"] as string;
    protected string? CurrentCompanyId
    {
        get
        {
            var companyId = _httpContextAccessor?.HttpContext?.Items["CompanyId"] as string;
            if (string.IsNullOrEmpty(companyId) && !IsSystemContext)
            {
                companyId = TenantContext?.GetCurrentCompanyIdAsync().GetAwaiter().GetResult();
                if (!string.IsNullOrEmpty(companyId))
                {
                    _httpContextAccessor!.HttpContext!.Items["CompanyId"] = companyId;
                }
            }
            return companyId;
        }
    }
    protected bool IsSystemContext => _httpContextAccessor?.HttpContext == null;

    public Task<string> GetCurrentCompanyIdAsync()
        => Task.FromResult(CurrentCompanyId ?? string.Empty);

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

        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            var entity = entry.Entity;
            var isAdded = entry.State == EntityState.Added;

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
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var type in GetEntityTypes())
        {
            var entityBuilder = modelBuilder.Entity(type);
            var collectionName = type.GetCustomAttribute<Attributes.BsonCollectionNameAttribute>()?.Name
                              ?? type.GetCustomAttribute<TableAttribute>()?.Name
                              ?? $"{type.Name.ToLowerInvariant()}s";

            entityBuilder.ToCollection(collectionName);

            if (typeof(IMultiTenant).IsAssignableFrom(type))
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
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => IsSystemContext || ((IMultiTenant)e).CompanyId == CurrentCompanyId);
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
}
