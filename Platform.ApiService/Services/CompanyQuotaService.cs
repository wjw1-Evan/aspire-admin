using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Extensions;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class CompanyQuotaService : ICompanyQuotaService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CompanyQuotaService> _logger;

    public CompanyQuotaService(DbContext context, ITenantContext tenantContext, ILogger<CompanyQuotaService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<CompanyStorageStatistics> GetCompanyStorageStatisticsAsync()
    {
        var companyId = _tenantContext.GetCurrentCompanyId() ?? throw new InvalidOperationException("企业ID不能为空");

        var company = await _context.Set<Company>().FirstOrDefaultAsync(c => c.Id == companyId)
            ?? throw new KeyNotFoundException("企业不存在");

        var companyUserIds = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == companyId && uc.Status == "active")
            .Select(uc => uc.UserId).ToListAsync();

        var quotas = await _context.Set<StorageQuota>().Where(q => companyUserIds.Contains(q.UserId)).ToListAsync();
        var files = await _context.Set<FileItem>().Where(f => f.CreatedBy != null && companyUserIds.Contains(f.CreatedBy) && f.Status == FileStatus.Active).ToListAsync();

        return new CompanyStorageStatistics
        {
            CompanyId = companyId,
            CompanyName = company.Name,
            TotalUsers = quotas.Count,
            TotalQuota = quotas.Sum(q => q.TotalQuota),
            UsedSpace = quotas.Sum(q => q.UsedSpace),
            TotalFiles = files.Count(f => f.Type == FileItemType.File),
            TotalFolders = files.Count(f => f.Type == FileItemType.Folder),
            TypeUsage = files.GroupBy(f => GetFileTypeCategory(f.MimeType)).ToDictionary(g => g.Key, g => g.Sum(f => f.Size)),
            UserUsage = quotas.ToDictionary(q => q.UserId, q => q.UsedSpace),
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    public async Task<StorageUsageStats> GetStorageUsageStatsAsync(string? userId = null)
    {
        var targetUserId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetUserId))
            throw new InvalidOperationException("用户ID不能为空");

        var files = await _context.Set<FileItem>().Where(f =>
            f.CreatedBy == targetUserId && f.Status == FileStatus.Active).ToListAsync();

        var quota = await _context.Set<StorageQuota>().FirstOrDefaultAsync(q => q.UserId == targetUserId);

        var usageDist = files
            .GroupBy(f => GetFileTypeCategory(f.MimeType))
            .Select(g => new UsageDistributionItem { Range = g.Key, Count = g.Count(), Percentage = (double)g.Count() / Math.Max(1, files.Count) * 100 })
            .ToList();

        var topUsers = files.GroupBy(f => f.CreatedBy ?? "unknown")
            .OrderByDescending(g => g.Sum(f => f.Size))
            .Take(5)
            .Select(g => new TopUserItem { UserId = g.Key, Username = g.Key, UsedQuota = g.Sum(f => f.Size) })
            .ToList();

        return new StorageUsageStats
        {
            TotalUsers = 1,
            TotalQuota = quota?.TotalQuota ?? 0,
            TotalUsed = quota?.UsedSpace ?? 0,
            AverageUsage = quota?.UsedSpace ?? 0,
            UsageDistribution = usageDist,
            TopUsers = topUsers
        };
    }

    public async Task<List<UserStorageRanking>> GetStorageUsageRankingAsync(int topCount = 10)
    {
        var companyId = _tenantContext.GetCurrentCompanyId() ?? throw new InvalidOperationException("企业ID不能为空");
        var companyUserIds = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == companyId && uc.Status == "active")
            .Select(uc => uc.UserId).ToListAsync();

        var quotas = await _context.Set<StorageQuota>().Where(q => companyUserIds.Contains(q.UserId)).ToListAsync();
        var users = await _context.Set<AppUser>().Where(u => companyUserIds.Contains(u.Id!)).ToListAsync();

        var ranking = quotas
            .OrderByDescending(q => q.UsedSpace)
            .Take(topCount)
            .Select((q, index) => new UserStorageRanking
            {
                Rank = index + 1,
                UserId = q.UserId,
                Username = users.FirstOrDefault(u => u.Id == q.UserId)?.Username ?? "Unknown",
                DisplayName = users.FirstOrDefault(u => u.Id == q.UserId)?.Name ?? "",
                UsedSpace = q.UsedSpace,
                TotalQuota = q.TotalQuota,
                FileCount = q.FileCount
            }).ToList();

        for (int i = 0; i < ranking.Count; i++) ranking[i].Rank = i + 1;
        return ranking;
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<StorageQuotaListItem>> GetStorageQuotaListAsync(
        ProTableRequest request, string? companyId = null, bool? isEnabled = null)
    {
        var targetCompanyId = companyId ?? _tenantContext.GetCurrentCompanyId();
        var allQuotas = await _context.Set<StorageQuota>().ToListAsync();

        if (!string.IsNullOrEmpty(targetCompanyId))
        {
            var userIds = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == targetCompanyId && uc.Status == "active")
                .Select(uc => uc.UserId).ToListAsync();
            allQuotas = allQuotas.Where(q => userIds.Contains(q.UserId)).ToList();
        }

        if (isEnabled.HasValue)
            allQuotas = allQuotas.Where(q => q.IsEnabled == isEnabled.Value).ToList();

        var items = allQuotas.Select(q => new StorageQuotaListItem
        {
            UserId = q.UserId,
            TotalQuota = q.TotalQuota,
            UsedSpace = q.UsedSpace,
            FileCount = q.FileCount,
            WarningThreshold = q.WarningThreshold,
            IsEnabled = q.IsEnabled,
            LastCalculatedAt = q.LastCalculatedAt,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt,
            Status = q.IsEnabled ? "Active" : "Disabled"
        }).ToList();

        return items.OrderByDescending(item => item.UsedSpace).ToList().AsQueryable().ToPagedList(request);
    }

    private static string GetFileTypeCategory(string? mimeType)
    {
        if (string.IsNullOrEmpty(mimeType)) return "other";
        if (mimeType.StartsWith("image/")) return "image";
        if (mimeType.StartsWith("video/")) return "video";
        if (mimeType.StartsWith("audio/")) return "audio";
        if (mimeType.StartsWith("text/")) return "text";
        return "other";
    }

    private static Dictionary<string, long> CalculateUsageDistribution(List<FileItem> files)
    {
        return files.Where(f => f.Type == FileItemType.File)
            .GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));
    }
}
