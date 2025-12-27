using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 云存储服务接口
/// </summary>
public interface ICloudStorageService
{
    // 文件和文件夹管理

    /// <summary>
    /// 创建文件夹
    /// </summary>
    /// <param name="name">文件夹名称</param>
    /// <param name="parentId">父文件夹ID</param>
    /// <returns>创建的文件夹</returns>
    Task<FileItem> CreateFolderAsync(string name, string parentId);

    /// <summary>
    /// 上传文件
    /// </summary>
    /// <param name="file">上传的文件</param>
    /// <param name="parentId">父文件夹ID</param>
    /// <param name="overwrite">是否覆盖同名文件</param>
    /// <returns>上传的文件项</returns>
    Task<FileItem> UploadFileAsync(IFormFile file, string parentId, bool overwrite = false);

    /// <summary>
    /// 获取文件项详情
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>文件项详情</returns>
    Task<FileItem?> GetFileItemAsync(string id);

    /// <summary>
    /// 获取文件项列表
    /// </summary>
    /// <param name="parentId">父文件夹ID</param>
    /// <param name="query">查询参数</param>
    /// <returns>文件项列表</returns>
    Task<PagedResult<FileItem>> GetFileItemsAsync(string parentId, FileListQuery query);

    /// <summary>
    /// 重命名文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="newName">新名称</param>
    /// <returns>重命名后的文件项</returns>
    Task<FileItem> RenameFileItemAsync(string id, string newName);

    /// <summary>
    /// 移动文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="newParentId">新的父文件夹ID</param>
    /// <returns>移动后的文件项</returns>
    Task<FileItem> MoveFileItemAsync(string id, string newParentId);

    /// <summary>
    /// 复制文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="newParentId">目标父文件夹ID</param>
    /// <param name="newName">新名称（可选）</param>
    /// <returns>复制后的文件项</returns>
    Task<FileItem> CopyFileItemAsync(string id, string newParentId, string? newName = null);

    /// <summary>
    /// 删除文件或文件夹（移动到回收站）
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>删除操作结果</returns>
    Task DeleteFileItemAsync(string id);

    /// <summary>
    /// 永久删除文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>永久删除操作结果</returns>
    Task PermanentDeleteFileItemAsync(string id);

    /// <summary>
    /// 从回收站恢复文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="newParentId">新的父文件夹ID（可选）</param>
    /// <returns>恢复后的文件项</returns>
    Task<FileItem> RestoreFileItemAsync(string id, string? newParentId = null);

    // 文件下载和预览

    /// <summary>
    /// 下载文件
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>文件流</returns>
    Task<Stream> DownloadFileAsync(string id);

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>缩略图流</returns>
    Task<Stream> GetThumbnailAsync(string id);

    /// <summary>
    /// 获取文件预览信息
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>预览信息</returns>
    Task<FilePreviewInfo> GetPreviewInfoAsync(string id);

    // 搜索和筛选

    /// <summary>
    /// 搜索文件
    /// </summary>
    /// <param name="query">搜索查询参数</param>
    /// <returns>搜索结果</returns>
    Task<PagedResult<FileItem>> SearchFilesAsync(FileSearchQuery query);

    /// <summary>
    /// 获取最近访问的文件
    /// </summary>
    /// <param name="count">返回数量</param>
    /// <returns>最近文件列表</returns>
    Task<List<FileItem>> GetRecentFilesAsync(int count = 10);

    /// <summary>
    /// 搜索文件内容
    /// </summary>
    /// <param name="keyword">搜索关键词</param>
    /// <param name="query">搜索查询参数</param>
    /// <returns>搜索结果</returns>
    Task<PagedResult<FileItem>> SearchByContentAsync(string keyword, FileContentSearchQuery query);

    // 回收站管理

    /// <summary>
    /// 获取回收站文件列表
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>回收站文件列表</returns>
    Task<PagedResult<FileItem>> GetRecycleBinItemsAsync(RecycleBinQuery query);

    /// <summary>
    /// 清空回收站
    /// </summary>
    /// <returns>清空操作结果</returns>
    Task EmptyRecycleBinAsync();

    /// <summary>
    /// 清理过期的回收站文件
    /// </summary>
    /// <param name="expireDays">过期天数</param>
    /// <returns>清理操作结果</returns>
    Task CleanupExpiredRecycleBinItemsAsync(int expireDays = 30);

    // 高级文件操作

    /// <summary>
    /// 批量上传文件
    /// </summary>
    /// <param name="files">文件列表</param>
    /// <param name="parentId">父文件夹ID</param>
    /// <param name="conflictResolution">冲突解决策略</param>
    /// <returns>上传结果列表</returns>
    Task<List<FileItem>> UploadMultipleFilesAsync(IList<IFormFile> files, string parentId, FileConflictResolution conflictResolution = FileConflictResolution.Rename);

    /// <summary>
    /// 下载文件夹为ZIP
    /// </summary>
    /// <param name="folderId">文件夹ID</param>
    /// <returns>ZIP文件流</returns>
    Task<Stream> DownloadFolderAsZipAsync(string folderId);

    /// <summary>
    /// 检查是否支持批量上传
    /// </summary>
    /// <returns>是否支持</returns>
    Task<bool> SupportsBatchUploadAsync();

    /// <summary>
    /// 检查是否支持断点续传
    /// </summary>
    /// <returns>是否支持</returns>
    Task<bool> SupportsResumeUploadAsync();

    // 存储统计

    /// <summary>
    /// 获取存储使用情况
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时获取当前用户）</param>
    /// <returns>存储使用信息</returns>
    Task<StorageUsageInfo> GetStorageUsageAsync(string? userId = null);

    // 批量操作

    /// <summary>
    /// 批量删除文件项
    /// </summary>
    /// <param name="ids">文件项ID列表</param>
    /// <returns>删除结果</returns>
    Task<BatchOperationResult> BatchDeleteAsync(List<string> ids);

    /// <summary>
    /// 批量移动文件项
    /// </summary>
    /// <param name="ids">文件项ID列表</param>
    /// <param name="targetParentId">目标父文件夹ID</param>
    /// <returns>移动结果</returns>
    Task<BatchOperationResult> BatchMoveAsync(List<string> ids, string targetParentId);

    /// <summary>
    /// 批量复制文件项
    /// </summary>
    /// <param name="ids">文件项ID列表</param>
    /// <param name="targetParentId">目标父文件夹ID</param>
    /// <returns>复制结果</returns>
    Task<BatchOperationResult> BatchCopyAsync(List<string> ids, string targetParentId);
}