using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class QuotaWarningService : IQuotaWarningService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<QuotaWarningService> _logger;

    public QuotaWarningService(DbContext context, ITenantContext tenantContext, ILogger<QuotaWarningService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<List<StorageQuotaWarning>> GetQuotaWarningsAsync(double warningThreshold = 0.8)
    {
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(companyId))
            return new List<StorageQuotaWarning>();

        var userIds = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == companyId && uc.Status == "active")
            .Select(uc => uc.UserId).ToListAsync();

        var quotas = await _context.Set<StorageQuota>().Where(q => userIds.Contains(q.UserId) && q.IsEnabled && q.TotalQuota > 0).ToListAsync();
        var users = await _context.Set<AppUser>().Where(u => userIds.Contains(u.Id!)).ToListAsync();

        return quotas.Where(q => q.TotalQuota > 0 && (double)q.UsedSpace / q.TotalQuota >= warningThreshold)
            .Select(q => new StorageQuotaWarning
            {
                Id = q.Id!,
                UserId = q.UserId,
                Username = users.FirstOrDefault(u => u.Id == q.UserId)?.Username ?? "",
                UserDisplayName = users.FirstOrDefault(u => u.Id == q.UserId)?.Name ?? "",
                UsedQuota = q.UsedSpace,
                TotalQuota = q.TotalQuota,
                UsagePercentage = (double)q.UsedSpace / q.TotalQuota * 100,
                WarningType = q.UsedSpace >= q.TotalQuota ? "exceeded" : "approaching",
                CreatedAt = DateTime.UtcNow
            }).ToList();
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<StorageQuotaWarning>> GetQuotaWarningsPaginatedAsync(
        ProTableRequest request, double warningThreshold = 0.8)
    {
        var warnings = await GetQuotaWarningsAsync(warningThreshold);
        return warnings.ToList().AsQueryable().ToPagedList(request);
    }

    public async Task<BatchOperationResult> CleanupUnusedQuotasAsync()
    {
        var result = new BatchOperationResult { StartTime = DateTime.UtcNow };
        var allQuotas = await _context.Set<StorageQuota>().ToListAsync();
        result.Total = allQuotas.Count;

        foreach (var quota in allQuotas)
        {
            var hasFiles = await _context.Set<FileItem>().AnyAsync(f => f.CreatedBy == quota.UserId && f.Status == FileStatus.Active);
            if (!hasFiles && quota.UsedSpace == 0)
            {
                _context.Set<StorageQuota>().Remove(quota);
                result.SuccessIds.Add(quota.UserId);
                result.SuccessCount++;
            }
        }
        await _context.SaveChangesAsync();
        result.EndTime = DateTime.UtcNow;
        return result;
    }

    private static WarningLevel GetWarningLevel(double usagePercentage)
    {
        if (usagePercentage >= 1.0) return WarningLevel.Emergency;
        if (usagePercentage >= 0.95) return WarningLevel.Critical;
        if (usagePercentage >= 0.8) return WarningLevel.Warning;
        return WarningLevel.Info;
    }
}
