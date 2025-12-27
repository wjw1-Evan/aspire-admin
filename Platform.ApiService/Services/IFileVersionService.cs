using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件版本控制服务接口
/// </summary>
public interface IFileVersionService
{
    /// <summary>
    /// 创建文件版本
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="file">文件内容</param>
    /// <param name="comment">版本说明</param>
    /// <returns>创建的版本</returns>
    Task<FileVersion> CreateVersionAsync(string fileItemId, IFormFile file, string? comment = null);

    /// <summary>
    /// 获取文件版本历史
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <returns>版本历史列表</returns>
    Task<List<FileVersion>> GetVersionHistoryAsync(string fileItemId);

    /// <summary>
    /// 获取版本详情
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>版本详情</returns>
    Task<FileVersion?> GetVersionAsync(string versionId);

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="versionNumber">版本号</param>
    /// <returns>恢复后的版本</returns>
    Task<FileVersion> RestoreVersionAsync(string fileItemId, int versionNumber);

    /// <summary>
    /// 删除指定版本
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>删除操作结果</returns>
    Task DeleteVersionAsync(string versionId);

    /// <summary>
    /// 下载指定版本的文件
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>文件流</returns>
    Task<Stream> DownloadVersionAsync(string versionId);

    /// <summary>
    /// 比较两个版本的差异
    /// </summary>
    /// <param name="versionId1">版本1 ID</param>
    /// <param name="versionId2">版本2 ID</param>
    /// <returns>版本比较结果</returns>
    Task<FileVersionComparison> CompareVersionsAsync(string versionId1, string versionId2);

    /// <summary>
    /// 获取文件的当前版本
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <returns>当前版本</returns>
    Task<FileVersion?> GetCurrentVersionAsync(string fileItemId);

    /// <summary>
    /// 设置版本为当前版本
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>设置后的版本</returns>
    Task<FileVersion> SetAsCurrentVersionAsync(string versionId);

    /// <summary>
    /// 清理过期版本（保留指定数量的最新版本）
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="keepCount">保留版本数量</param>
    /// <returns>清理结果</returns>
    Task<BatchOperationResult> CleanupOldVersionsAsync(string fileItemId, int keepCount = 10);

    /// <summary>
    /// 批量删除版本
    /// </summary>
    /// <param name="versionIds">版本ID列表</param>
    /// <returns>删除结果</returns>
    Task<BatchOperationResult> BatchDeleteVersionsAsync(List<string> versionIds);

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <returns>版本统计</returns>
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