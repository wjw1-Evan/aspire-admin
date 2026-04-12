using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ICloudFileOperationService
{
    Task<FileItem> UploadFileAsync(IFormFile file, string parentId, bool overwrite = false);
    Task<Stream> DownloadFileAsync(string id);
    Task<FileItem> CopyFileItemAsync(string id, string newParentId, string? newName = null);
    Task<Stream> DownloadFolderAsZipAsync(string folderId);
}

public interface ICloudFolderService
{
    Task<FileItem> CreateFolderAsync(string name, string parentId);
    Task<FileItem> RenameFileItemAsync(string id, string newName);
    Task<FileItem> MoveFileItemAsync(string id, string newParentId);
}

public interface ICloudRecycleBinService
{
    Task DeleteFileAsync(string id, string userId);
    Task DeleteFileItemAsync(string id);
    Task PermanentDeleteFileItemAsync(string id);
    Task<FileItem> RestoreFileItemAsync(string id, string? newParentId = null);
    Task EmptyRecycleBinAsync();
    Task<(int deletedCount, long freedSpace)> CleanupExpiredRecycleBinItemsAsync(int expireDays = 30);
    Task<RecycleStatistics> GetRecycleStatisticsAsync();
}

public interface ICloudSearchService
{
    Task<System.Linq.Dynamic.Core.PagedResult<FileItem>> SearchFilesAsync(Platform.ServiceDefaults.Models.PageParams query);
    Task<List<FileItem>> GetRecentFilesAsync(int count = 10);
    Task<System.Linq.Dynamic.Core.PagedResult<FileItem>> SearchByContentAsync(string keyword, FileContentSearchQuery query);
}
