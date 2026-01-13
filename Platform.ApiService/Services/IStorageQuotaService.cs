using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 存储配额服务接口
/// </summary>
public interface IStorageQuotaService
{
    /// <summary>
    /// 获取用户存储配额信息
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时获取当前用户）</param>
    /// <returns>存储配额信息</returns>
    Task<StorageQuota> GetUserQuotaAsync(string? userId = null);

    /// <summary>
    /// 设置用户存储配额
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="totalQuota">总配额（字节）</param>
    /// <param name="warningThreshold">警告阈值（百分比，0-100，可选）</param>
    /// <param name="isEnabled">是否启用（可选）</param>
    /// <returns>更新后的配额信息</returns>
    Task<StorageQuota> SetUserQuotaAsync(string userId, long totalQuota, int? warningThreshold = null, bool? isEnabled = null);

    /// <summary>
    /// 更新用户存储使用量
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="sizeChange">大小变化（字节，可为负数）</param>
    /// <returns>更新后的配额信息</returns>
    Task<StorageQuota> UpdateStorageUsageAsync(string userId, long sizeChange);

    /// <summary>
    /// 检查用户是否有足够的存储空间
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="requiredSize">需要的空间大小（字节）</param>
    /// <returns>是否有足够空间</returns>
    Task<bool> CheckStorageAvailabilityAsync(string userId, long requiredSize);

    /// <summary>
    /// 获取企业存储统计
    /// </summary>
    /// <param name="companyId">企业ID（可选，为空时获取当前企业）</param>
    /// <returns>企业存储统计</returns>
    Task<CompanyStorageStatistics> GetCompanyStorageStatisticsAsync(string? companyId = null);

    /// <summary>
    /// 重新计算用户存储使用量
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>重新计算后的配额信息</returns>
    Task<StorageQuota> RecalculateUserStorageAsync(string userId);

    /// <summary>
    /// 批量设置用户配额
    /// </summary>
    /// <param name="quotaSettings">配额设置列表</param>
    /// <returns>批量操作结果</returns>
    Task<BatchOperationResult> BatchSetUserQuotasAsync(List<UserQuotaSetting> quotaSettings);

    /// <summary>
    /// 获取存储使用量排行榜
    /// </summary>
    /// <param name="topCount">返回数量</param>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>存储使用量排行</returns>
    Task<List<UserStorageRanking>> GetStorageUsageRankingAsync(int topCount = 10, string? companyId = null);

    /// <summary>
    /// 获取存储配额警告列表
    /// </summary>
    /// <param name="warningThreshold">警告阈值（百分比，默认80%）</param>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>配额警告列表</returns>
    Task<List<StorageQuotaWarning>> GetQuotaWarningsAsync(double warningThreshold = 0.8, string? companyId = null);

    /// <summary>
    /// 清理未使用的存储配额记录
    /// </summary>
    /// <param name="companyId">企业ID（可选）</param>
    /// <returns>清理结果</returns>
    Task<BatchOperationResult> CleanupUnusedQuotasAsync(string? companyId = null);

    /// <summary>
    /// 获取存储配额列表（分页）
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>分页的存储配额列表</returns>
    Task<PagedResult<StorageQuotaListItem>> GetStorageQuotaListAsync(StorageQuotaListQuery query);

    /// <summary>
    /// 获取存储使用统计信息
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时获取当前用户）</param>
    /// <returns>存储使用统计信息</returns>
    Task<StorageUsageStats> GetStorageUsageStatsAsync(string? userId = null);
}

/// <summary>
/// 企业存储统计信息
/// </summary>
public class CompanyStorageStatistics
{
    /// <summary>企业ID</summary>
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>用户总数</summary>
    public int TotalUsers { get; set; } = 0;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>已使用空间（字节）</summary>
    public long UsedSpace { get; set; } = 0;

    /// <summary>可用空间（字节）</summary>
    public long AvailableSpace => TotalQuota - UsedSpace;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;

    /// <summary>文件总数</summary>
    public long TotalFiles { get; set; } = 0;

    /// <summary>文件夹总数</summary>
    public long TotalFolders { get; set; } = 0;

    /// <summary>按文件类型统计</summary>
    public Dictionary<string, long> TypeUsage { get; set; } = [];

    /// <summary>按用户统计</summary>
    public Dictionary<string, long> UserUsage { get; set; } = [];

    /// <summary>最后更新时间</summary>
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 用户配额设置
/// </summary>
public class UserQuotaSetting
{
    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>警告阈值（百分比，0-100，可选）</summary>
    public int? WarningThreshold { get; set; }

    /// <summary>是否启用（可选）</summary>
    public bool? IsEnabled { get; set; }
}

/// <summary>
/// 用户存储使用量排行
/// </summary>
public class UserStorageRanking
{
    /// <summary>排名</summary>
    public int Rank { get; set; } = 0;

    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>用户昵称</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>已使用空间（字节）</summary>
    public long UsedSpace { get; set; } = 0;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;

    /// <summary>文件数量</summary>
    public long FileCount { get; set; } = 0;

    /// <summary>最后活动时间</summary>
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>
/// 存储配额警告
/// </summary>
public class StorageQuotaWarning
{
    /// <summary>唯一标识</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>用户昵称</summary>
    public string UserDisplayName { get; set; } = string.Empty;

    /// <summary>已使用空间（字节）</summary>
    public long UsedQuota { get; set; } = 0;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage { get; set; } = 0;

    /// <summary>警告类型（approaching: 接近, exceeded: 超出）</summary>
    public string WarningType { get; set; } = "approaching";

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>配额项状态信息（扩展）</summary>
    public string? Message { get; set; }
}

/// <summary>
/// 警告级别枚举
/// </summary>
public enum WarningLevel
{
    /// <summary>信息</summary>
    Info = 0,

    /// <summary>警告</summary>
    Warning = 1,

    /// <summary>严重</summary>
    Critical = 2,

    /// <summary>紧急</summary>
    Emergency = 3
}

/// <summary>
/// 存储配额列表查询参数
/// </summary>
public class StorageQuotaListQuery
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 20;

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "usedQuota";

    /// <summary>排序方向</summary>
    public string SortOrder { get; set; } = "desc";

    /// <summary>搜索关键词</summary>
    public string? Keyword { get; set; }

    /// <summary>企业ID</summary>
    public string? CompanyId { get; set; }

    /// <summary>是否启用（筛选）</summary>
    public bool? IsEnabled { get; set; }
}

/// <summary>
/// 存储配额列表项
/// </summary>
public class StorageQuotaListItem
{
    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>用户昵称</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>邮箱</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; } = 0;

    /// <summary>已使用空间（字节）</summary>
    public long UsedSpace { get; set; } = 0;

    /// <summary>可用空间（字节）</summary>
    public long AvailableSpace => TotalQuota - UsedSpace;

    /// <summary>使用率（百分比）</summary>
    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;

    /// <summary>文件数量</summary>
    public long FileCount { get; set; } = 0;

    /// <summary>警告阈值（百分比，0-100）</summary>
    public int WarningThreshold { get; set; } = 80;

    /// <summary>是否启用</summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>最后计算时间</summary>
    public DateTime LastCalculatedAt { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>更新时间</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>状态</summary>
    public string Status { get; set; } = "Active";

    /// <summary>警告级别</summary>
    public WarningLevel? WarningLevel { get; set; }
}
