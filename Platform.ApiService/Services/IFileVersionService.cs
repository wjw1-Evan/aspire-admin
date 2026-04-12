using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件版本控制服务接口
/// </summary>
public interface IFileVersionService
{
    /// <summary>
    /// 创建文件版本
    /// </summary>
    Task<FileVersion> CreateVersionAsync(string fileItemId, IFormFile file, string? comment = null);

    /// <summary>
    /// 获取文件版本历史
    /// </summary>
    Task<List<FileVersion>> GetVersionHistoryAsync(string fileItemId);

    /// <summary>
    /// 获取文件版本历史（分页）
    /// </summary>
    Task<PagedResult<FileVersion>> GetVersionHistoryPaginatedAsync(string fileItemId, PageParams request);

    /// <summary>
    /// 获取版本详情
    /// </summary>
    Task<FileVersion?> GetVersionAsync(string versionId);

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    Task<FileVersion> RestoreVersionAsync(string fileItemId, int versionNumber);

    /// <summary>
    /// 删除指定版本
    /// </summary>
    Task DeleteVersionAsync(string versionId);

    /// <summary>
    /// 下载指定版本的文件
    /// </summary>
    Task<Stream> DownloadVersionAsync(string versionId);

    /// <summary>
    /// 比较两个版本的差异
    /// </summary>
    Task<FileVersionComparison> CompareVersionsAsync(string versionId1, string versionId2);

    /// <summary>
    /// 获取文件的当前版本
    /// </summary>
    Task<FileVersion?> GetCurrentVersionAsync(string fileItemId);

    /// <summary>
    /// 设置版本为当前版本
    /// </summary>
    Task<FileVersion> SetAsCurrentVersionAsync(string versionId);

    /// <summary>
    /// 清理过期版本（保留指定数量的最新版本）
    /// </summary>
    Task<BatchOperationResult> CleanupOldVersionsAsync(string fileItemId, int keepCount = 10);

    /// <summary>
    /// 批量删除版本
    /// </summary>
    Task<BatchOperationResult> BatchDeleteVersionsAsync(List<string> versionIds);

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    Task<VersionStatistics> GetVersionStatisticsAsync(string fileItemId);
}

/// <summary>
/// 版本统计信息
/// </summary>
public class VersionStatistics
{
    /// <summary>文件项ID</summary>
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>总版本数</summary>
    public int TotalVersions { get; set; } = 0;

    /// <summary>当前版本号</summary>
    public int CurrentVersionNumber { get; set; } = 1;

    /// <summary>最早版本创建时间</summary>
    public DateTime? EarliestVersionDate { get; set; }

    /// <summary>最新版本创建时间</summary>
    public DateTime? LatestVersionDate { get; set; }

    /// <summary>总存储大小（所有版本）</summary>
    public long TotalStorageSize { get; set; } = 0;

    /// <summary>版本大小分布</summary>
    public Dictionary<int, long> VersionSizes { get; set; } = [];

    /// <summary>版本创建者统计</summary>
    public Dictionary<string, int> CreatorStatistics { get; set; } = [];
}