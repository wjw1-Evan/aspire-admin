using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 看板版本服务接口
/// </summary>
public interface IDashboardVersionService
{
    /// <summary>
    /// 创建看板版本快照
    /// </summary>
    Task<DashboardVersion> CreateVersionAsync(string dashboardId, string userId, string? comment = null);

    /// <summary>
    /// 获取版本历史（分页）
    /// </summary>
    Task<PagedResult<DashboardVersion>> GetVersionHistoryPaginatedAsync(string dashboardId, ProTableRequest request);

    /// <summary>
    /// 获取版本历史列表
    /// </summary>
    Task<List<DashboardVersion>> GetVersionHistoryAsync(string dashboardId);

    /// <summary>
    /// 获取版本详情
    /// </summary>
    Task<DashboardVersion?> GetVersionAsync(string versionId);

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    Task<DashboardVersion> RestoreVersionAsync(string dashboardId, int versionNumber, string userId);

    /// <summary>
    /// 删除指定版本
    /// </summary>
    Task DeleteVersionAsync(string versionId, string userId);

    /// <summary>
    /// 获取当前版本
    /// </summary>
    Task<DashboardVersion?> GetCurrentVersionAsync(string dashboardId);

    /// <summary>
    /// 设置指定版本为当前版本
    /// </summary>
    Task<DashboardVersion> SetAsCurrentVersionAsync(string versionId, string userId);

    /// <summary>
    /// 比较两个版本差异
    /// </summary>
    Task<DashboardVersionComparison> CompareVersionsAsync(string versionId1, string versionId2);

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    Task<DashboardVersionStatistics> GetVersionStatisticsAsync(string dashboardId);
}
