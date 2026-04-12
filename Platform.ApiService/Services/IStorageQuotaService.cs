using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 存储配额服务接口
/// </summary>
public interface IStorageQuotaService
{
    /// <summary>
    /// 获取用户存储配额信息
    /// </summary>
    Task<StorageQuota> GetUserQuotaAsync(string? userId = null);

    /// <summary>
    /// 设置用户存储配额
    /// </summary>
    Task<StorageQuota> SetUserQuotaAsync(string userId, long totalQuota, int? warningThreshold = null, bool? isEnabled = null);

    /// <summary>
    /// 更新用户存储使用量
    /// </summary>
    Task<StorageQuota> UpdateStorageUsageAsync(string userId, long sizeChange);

    /// <summary>
    /// 检查用户是否有足够的存储空间
    /// </summary>
    Task<bool> CheckStorageAvailabilityAsync(string userId, long requiredSize);

    /// <summary>
    /// 获取企业存储统计
    /// </summary>
    Task<CompanyStorageStatistics> GetCompanyStorageStatisticsAsync();

    /// <summary>
    /// 重新计算用户存储使用量
    /// </summary>
    Task<StorageQuota> RecalculateUserStorageAsync(string userId);

    /// <summary>
    /// 批量设置用户配额
    /// </summary>
    Task<BatchOperationResult> BatchSetUserQuotasAsync(List<UserQuotaSetting> quotaSettings);

    /// <summary>
    /// 获取存储使用量排行榜
    /// </summary>
    Task<List<UserStorageRanking>> GetStorageUsageRankingAsync(int topCount = 10);

    /// <summary>
    /// 获取存储配额警告列表
    /// </summary>
    Task<List<StorageQuotaWarning>> GetQuotaWarningsAsync(double warningThreshold = 0.8);

    /// <summary>
    /// 获取存储配额警告列表（分页）
    /// </summary>
    Task<PagedResult<StorageQuotaWarning>> GetQuotaWarningsPaginatedAsync(PageParams pageParams, double warningThreshold = 0.8);

    /// <summary>
    /// 清理未使用的存储配额记录
    /// </summary>
    Task<BatchOperationResult> CleanupUnusedQuotasAsync();

    /// <summary>
    /// 获取存储配额列表（分页）
    /// </summary>
    Task<PagedResult<StorageQuotaListItem>> GetStorageQuotaListAsync(PageParams pageParams, string? companyId = null, bool? isEnabled = null);

    /// <summary>
    /// 获取存储使用统计信息
    /// </summary>
    Task<StorageUsageStats> GetStorageUsageStatsAsync(string? userId = null);
}

/// <summary>
/// 企业存储统计信息
/// </summary>
public class CompanyStorageStatistics
{
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public int TotalUsers { get; set; } = 0;
    public long TotalQuota { get; set; } = 0;
    public long UsedSpace { get; set; } = 0;
    public long AvailableSpace => TotalQuota - UsedSpace;
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;
    public long TotalFiles { get; set; } = 0;
    public long TotalFolders { get; set; } = 0;
    public Dictionary<string, long> TypeUsage { get; set; } = [];
    public Dictionary<string, long> UserUsage { get; set; } = [];
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 用户配额设置
/// </summary>
public class UserQuotaSetting
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public long TotalQuota { get; set; } = 0;
    public int? WarningThreshold { get; set; }
    public bool? IsEnabled { get; set; }
}

/// <summary>
/// 用户存储使���量排行
/// </summary>
public class UserStorageRanking
{
    public int Rank { get; set; } = 0;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public long UsedSpace { get; set; } = 0;
    public long TotalQuota { get; set; } = 0;
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;
    public long FileCount { get; set; } = 0;
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>
/// 存储配额警告
/// </summary>
public class StorageQuotaWarning
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public long UsedQuota { get; set; } = 0;
    public long TotalQuota { get; set; } = 0;
    public double UsagePercentage { get; set; } = 0;
    public string WarningType { get; set; } = "approaching";
    public DateTime? CreatedAt { get; set; }
    public string? Message { get; set; }
}

/// <summary>
/// 警告级别枚举
/// </summary>
public enum WarningLevel
{
    Info = 0,
    Warning = 1,
    Critical = 2,
    Emergency = 3
}

/// <summary>
/// 存储配额列表项
/// </summary>
public class StorageQuotaListItem
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public long TotalQuota { get; set; } = 0;
    public long UsedSpace { get; set; } = 0;
    public long AvailableSpace => TotalQuota - UsedSpace;
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;
    public long FileCount { get; set; } = 0;
    public int WarningThreshold { get; set; } = 80;
    public bool IsEnabled { get; set; } = true;
    public DateTime LastCalculatedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Status { get; set; } = "Active";
    public WarningLevel? WarningLevel { get; set; }
}