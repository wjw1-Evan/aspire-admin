using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

public interface IUserQuotaService
{
    Task<StorageQuota> GetUserQuotaAsync(string? userId = null);
    Task<StorageQuota> SetUserQuotaAsync(string userId, long totalQuota, int? warningThreshold = null, bool? isEnabled = null);
    Task<StorageQuota> UpdateStorageUsageAsync(string userId, long sizeChange);
    Task<bool> CheckStorageAvailabilityAsync(string userId, long requiredSize);
    Task<StorageQuota> RecalculateUserStorageAsync(string userId);
    Task<BatchOperationResult> BatchSetUserQuotasAsync(List<UserQuotaSetting> quotaSettings);
}

public interface ICompanyQuotaService
{
    Task<CompanyStorageStatistics> GetCompanyStorageStatisticsAsync();
    Task<StorageUsageStats> GetStorageUsageStatsAsync(string? userId = null);
    Task<List<UserStorageRanking>> GetStorageUsageRankingAsync(int topCount = 10);
    Task<System.Linq.Dynamic.Core.PagedResult<StorageQuotaListItem>> GetStorageQuotaListAsync(PageParams pageParams, string? companyId = null, bool? isEnabled = null);
}

public interface IQuotaWarningService
{
    Task<List<StorageQuotaWarning>> GetQuotaWarningsAsync(double warningThreshold = 0.8);
    Task<System.Linq.Dynamic.Core.PagedResult<StorageQuotaWarning>> GetQuotaWarningsPaginatedAsync(PageParams pageParams, double warningThreshold = 0.8);
    Task<BatchOperationResult> CleanupUnusedQuotasAsync();
}
