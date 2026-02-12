using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;
using Platform.ApiService.Validators;
using Platform.ServiceDefaults.Services;
using System.Linq;
using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件冲突解决策略
/// </summary>
public enum FileConflictResolution
{
    /// <summary>
    /// 覆盖现有文件
    /// </summary>
    Overwrite,
    /// <summary>
    /// 重命名新文件（添加序号）
    /// </summary>
    Rename,
    /// <summary>
    /// 跳过上传
    /// </summary>
    Skip
}

/// <summary>
/// 云存储服务实现
/// </summary>
public class CloudStorageService : ICloudStorageService
{
    private readonly IDataFactory<FileItem> _fileItemFactory;
    private readonly IDataFactory<FileVersion> _fileVersionFactory;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CloudStorageService> _logger;
    private readonly IStorageQuotaService _storageQuotaService;

    /// <summary>
    /// 初始化云存储服务
    /// </summary>
    /// <param name="fileItemFactory">文件项数据库工厂</param>
    /// <param name="fileVersionFactory">文件版本数据库工厂</param>
    /// <param name="storageQuotaService">存储配额服务</param>
    /// <param name="gridFSService">GridFS服务</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志记录器</param>
    public CloudStorageService(
        IDataFactory<FileItem> fileItemFactory,
        IDataFactory<FileVersion> fileVersionFactory,
        IStorageQuotaService storageQuotaService,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext,
        ILogger<CloudStorageService> logger)
    {
        _fileItemFactory = fileItemFactory;
        _fileVersionFactory = fileVersionFactory;
        _storageQuotaService = storageQuotaService;
        _fileStorageFactory = fileStorageFactory;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <inheritdoc/>
    public Task<bool> SupportsBatchUploadAsync() => Task.FromResult(true);
    /// <inheritdoc/>
    public Task<bool> SupportsResumeUploadAsync() => Task.FromResult(false);
    /// <inheritdoc/>
    public Task<RecycleStatistics> GetRecycleStatisticsAsync() => throw new NotImplementedException();
    /// <inheritdoc/>
    public async Task<BatchOperationResult> BatchDeleteAsync(List<string> ids)
    {
        var result = new BatchOperationResult { Total = ids.Count, StartTime = DateTime.UtcNow };
        foreach (var id in ids)
        {
            try
            {
                await _fileItemFactory.SoftDeleteAsync(id);
                result.SuccessIds.Add(id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError { FileItemId = id, ErrorCode = "DELETE_FAILED", ErrorMessage = ex.Message });
                result.FailureCount++;
            }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }
    /// <inheritdoc/>
    public async Task<BatchOperationResult> BatchMoveAsync(List<string> ids, string targetParentId)
    {
        var result = new BatchOperationResult { Total = ids.Count, StartTime = DateTime.UtcNow };
        foreach (var id in ids)
        {
            try
            {
                await MoveFileItemAsync(id, targetParentId);
                result.SuccessIds.Add(id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError { FileItemId = id, ErrorCode = "MOVE_FAILED", ErrorMessage = ex.Message });
                result.FailureCount++;
            }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }
    /// <inheritdoc/>
    public async Task<BatchOperationResult> BatchCopyAsync(List<string> ids, string targetParentId)
    {
        var result = new BatchOperationResult { Total = ids.Count, StartTime = DateTime.UtcNow };
        foreach (var id in ids)
        {
            try
            {
                await CopyFileItemAsync(id, targetParentId);
                result.SuccessIds.Add(id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError { FileItemId = id, ErrorCode = "COPY_FAILED", ErrorMessage = ex.Message });
                result.FailureCount++;
            }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }
    /// <inheritdoc/>
    public Task<Stream> DownloadFolderAsZipAsync(string folderId) => throw new NotImplementedException();
    /// <inheritdoc/>
    public Task<FileItem> CopyFileItemAsync(string id, string newParentId, string? newName = null) => throw new NotImplementedException();

    /// <inheritdoc/>
    public async Task<FileItem> CreateFolderAsync(string name, string parentId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("文件夹名称不能为空", nameof(name));

        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? null : parentId;

        if (!string.IsNullOrEmpty(normalizedParentId))
        {
            var parentFolder = await GetFileItemAsync(normalizedParentId);
            if (parentFolder == null)
                throw new ArgumentException("父文件夹不存在", nameof(parentId));
            if (parentFolder.Type != FileItemType.Folder)
                throw new ArgumentException("父项必须是文件夹", nameof(parentId));
        }

        var existingFolders = await _fileItemFactory.FindAsync(
            x => x.Name == name && x.ParentId == normalizedParentId && x.Type == FileItemType.Folder && x.Status == FileStatus.Active,
            limit: 1);

        if (existingFolders.Count > 0)
            throw new InvalidOperationException($"文件夹 '{name}' 已存在");

        var path = await BuildFilePathAsync(name, normalizedParentId ?? string.Empty);

        var folder = new FileItem
        {
            Name = name,
            Path = path,
            ParentId = normalizedParentId ?? string.Empty,
            Type = FileItemType.Folder,
            Status = FileStatus.Active,
            Size = 0,
            MimeType = "application/x-directory"
        };

        await _fileItemFactory.CreateAsync(folder);
        _logger.LogInformation("Created folder: {FolderName} at path: {Path}", name, path);
        return folder;
    }

    /// <inheritdoc/>
    public async Task<FileItem> UploadFileAsync(IFormFile file, string parentId, bool overwrite = false)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("文件不能为空", nameof(file));

        var fileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("文件名不能为空");

        var (isValid, errorMessage) = FileValidator.ValidateFile(file);
        if (!isValid)
            throw new ArgumentException(errorMessage!);

        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? null : parentId;

        if (normalizedParentId != null)
        {
            var parentFolder = await GetFileItemAsync(normalizedParentId);
            if (parentFolder == null)
                throw new ArgumentException("父文件夹不存在", nameof(parentId));
            if (parentFolder.Type != FileItemType.Folder)
                throw new ArgumentException("父项必须是文件夹", nameof(parentId));
        }

        await CheckStorageQuotaAsync(file.Length);

        string fileHash;
        using (var fileStream = file.OpenReadStream())
        {
            fileHash = await ComputeFileHashAsync(fileStream);
        }

        Expression<Func<FileItem, bool>> baseFilter;
        if (normalizedParentId == null)
            baseFilter = x => x.Name == fileName && x.Type == FileItemType.File && x.Status == FileStatus.Active && x.IsDeleted == false && (x.ParentId == null || x.ParentId == string.Empty);
        else
            baseFilter = x => x.Name == fileName && x.Type == FileItemType.File && x.Status == FileStatus.Active && x.IsDeleted == false && x.ParentId == normalizedParentId;

        var existingFiles = await _fileItemFactory.FindAsync(baseFilter, limit: 1);
        var existingFile = existingFiles.FirstOrDefault();

        var hashFiles = await _fileItemFactory.FindAsync(
            x => x.Hash == fileHash && x.Status == FileStatus.Active && x.IsDeleted == false,
            limit: 1);
        var duplicateFile = hashFiles.FirstOrDefault();
        string gridFSId;

        if (duplicateFile != null)
        {
            gridFSId = duplicateFile.GridFSId;
            _logger.LogInformation("File content already exists, reusing GridFS file: {GridFSId}", gridFSId);
        }
        else
        {
            using var uploadStream = file.OpenReadStream();
            var metadata = new Dictionary<string, object>
            {
                ["originalName"] = fileName,
                ["contentType"] = file.ContentType ?? "application/octet-stream",
                ["uploadedAt"] = DateTime.UtcNow,
                ["hash"] = fileHash
            };
            gridFSId = await _fileStorageFactory.UploadAsync(
                uploadStream,
                fileName,
                file.ContentType,
                metadata,
                "cloud_storage_files");
        }

        var filePath = await BuildFilePathAsync(fileName, normalizedParentId ?? string.Empty);
        FileItem fileItem;

        if (existingFile != null)
        {
            if (!overwrite)
            {
                await EnsureCurrentVersionSnapshotAsync(existingFile);
                var nextVersionNumber = await GetNextVersionNumberAsync(existingFile.Id!);
                await MarkAllVersionsAsNonCurrentAsync(existingFile.Id!);
                var version = new FileVersion
                {
                    FileItemId = existingFile.Id!,
                    VersionNumber = nextVersionNumber,
                    GridFSId = gridFSId,
                    Size = file.Length,
                    Hash = fileHash,
                    Comment = "上传新版本",
                    IsCurrentVersion = true
                };
                await _fileVersionFactory.CreateAsync(version);

                await _fileItemFactory.UpdateAsync(existingFile.Id!, entity =>
                {
                    entity.GridFSId = gridFSId;
                    entity.Size = file.Length;
                    entity.Hash = fileHash;
                    entity.MimeType = file.ContentType ?? "application/octet-stream";
                });
            }
            else
            {
                await _fileItemFactory.UpdateAsync(existingFile.Id!, entity =>
                {
                    entity.GridFSId = gridFSId;
                    entity.Size = file.Length;
                    entity.Hash = fileHash;
                    entity.MimeType = file.ContentType ?? "application/octet-stream";
                });
            }

            var updated = await _fileItemFactory.FindAsync(x => x.Id == existingFile.Id, limit: 1);
            fileItem = updated.First();
        }
        else
        {
            fileItem = new FileItem
            {
                Name = fileName,
                Path = filePath,
                ParentId = parentId,
                Type = FileItemType.File,
                Size = file.Length,
                MimeType = file.ContentType ?? "application/octet-stream",
                GridFSId = gridFSId,
                Hash = fileHash,
                Status = FileStatus.Active
            };
            await _fileItemFactory.CreateAsync(fileItem);
        }

        if (IsImageFile(file.ContentType))
        {
            try
            {
                using var thumbStream = file.OpenReadStream();
                await GenerateAndUploadThumbnailAsync(thumbStream, fileItem);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate thumbnail for file {FileId}", fileItem.Id);
            }
        }

        await UpdateStorageUsageAsync(file.Length);
        _logger.LogInformation("Uploaded file: {FileName} ({FileSize} bytes)", fileName, file.Length);
        return fileItem;
    }

    /// <inheritdoc/>
    public async Task<FileItem?> GetFileItemAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        var items = await _fileItemFactory.FindAsync(x => x.Id == id && x.Status == FileStatus.Active, limit: 1);
        return items.FirstOrDefault();
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> GetFileItemsAsync(string parentId, FileListQuery query)
    {
        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? null : parentId;

        Expression<Func<FileItem, bool>> filter;
        if (normalizedParentId == null)
        {
            if (query.Type.HasValue)
                filter = x => x.Status == FileStatus.Active && x.IsDeleted == false && (x.ParentId == null || x.ParentId == string.Empty) && x.Type == query.Type.Value;
            else
                filter = x => x.Status == FileStatus.Active && x.IsDeleted == false && (x.ParentId == null || x.ParentId == string.Empty);
        }
        else
        {
            if (query.Type.HasValue)
                filter = x => x.Status == FileStatus.Active && x.IsDeleted == false && x.ParentId == normalizedParentId && x.Type == query.Type.Value;
            else
                filter = x => x.Status == FileStatus.Active && x.IsDeleted == false && x.ParentId == normalizedParentId;
        }

        Func<IQueryable<FileItem>, IOrderedQueryable<FileItem>> sort;
        var sortByLower = query.SortBy.ToLower();
        var sortOrderDesc = query.SortOrder.ToLower() == "desc";

        sort = sortByLower switch
        {
            "name" => sortOrderDesc ? q => q.OrderByDescending(f => f.Name) : q => q.OrderBy(f => f.Name),
            "size" => sortOrderDesc ? q => q.OrderByDescending(f => f.Size) : q => q.OrderBy(f => f.Size),
            "createdat" => sortOrderDesc ? q => q.OrderByDescending(f => f.CreatedAt) : q => q.OrderBy(f => f.CreatedAt),
            "updatedat" => sortOrderDesc ? q => q.OrderByDescending(f => f.UpdatedAt) : q => q.OrderBy(f => f.UpdatedAt),
            _ => q => q.OrderBy(f => f.Name)
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(filter, sort, query.Page, query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <inheritdoc/>
    public async Task<FileItem> RenameFileItemAsync(string id, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("新名称不能为空", nameof(newName));

        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        var existingItems = await _fileItemFactory.FindAsync(
            x => x.Name == newName && x.ParentId == fileItem.ParentId && x.Type == fileItem.Type && x.Status == FileStatus.Active && x.Id != id,
            limit: 1);

        if (existingItems.Count > 0)
            throw new InvalidOperationException($"名称 '{newName}' 已存在");

        var newPath = await BuildFilePathAsync(newName, fileItem.ParentId);

        await _fileItemFactory.UpdateAsync(id, entity =>
        {
            entity.Name = newName;
            entity.Path = newPath;
        });

        var updated = await _fileItemFactory.FindAsync(x => x.Id == id, limit: 1);
        var updatedItem = updated.First();

        if (fileItem.Type == FileItemType.Folder)
            await UpdateDescendantsPathAsync(fileItem.Path, newPath);

        _logger.LogInformation("Renamed file item {Id} from '{OldName}' to '{NewName}'", id, fileItem.Name, newName);
        return updatedItem!;
    }

    /// <inheritdoc/>
    public async Task<FileItem> MoveFileItemAsync(string id, string newParentId)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        if (!string.IsNullOrEmpty(newParentId))
        {
            var targetParent = await GetFileItemAsync(newParentId);
            if (targetParent == null)
                throw new ArgumentException("目标文件夹不存在", nameof(newParentId));
            if (targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标必须是文件夹", nameof(newParentId));

            if (fileItem.Type == FileItemType.Folder)
            {
                var isDescendant = await IsDescendantFolderAsync(id, newParentId);
                if (isDescendant)
                    throw new InvalidOperationException("不能将文件夹移动到自己的子文件夹中");
            }
        }

        var existingItems = await _fileItemFactory.FindAsync(
            x => x.Name == fileItem.Name && x.ParentId == newParentId && x.Type == fileItem.Type && x.Status == FileStatus.Active && x.Id != id,
            limit: 1);

        if (existingItems.Count > 0)
            throw new InvalidOperationException($"目标位置已存在同名{(fileItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        var newPath = await BuildFilePathAsync(fileItem.Name, newParentId);

        await _fileItemFactory.UpdateAsync(id, entity =>
        {
            entity.ParentId = newParentId;
            entity.Path = newPath;
        });

        var updated = await _fileItemFactory.FindAsync(x => x.Id == id, limit: 1);
        var updatedItem = updated.First();

        if (fileItem.Type == FileItemType.Folder)
            await UpdateDescendantsPathAsync(fileItem.Path, newPath);

        _logger.LogInformation("Moved file item {Id} from '{OldPath}' to '{NewPath}'", id, fileItem.Path, newPath);
        return updatedItem!;
    }

    /// <inheritdoc/>
    public async Task DeleteFileItemAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        var now = DateTime.UtcNow;
        var currentUserId = _tenantContext.GetCurrentUserId();
        var currentUsername = await _tenantContext.GetCurrentUsernameAsync();
        var keepDays = 30;

        await _fileItemFactory.UpdateAsync(id, entity =>
        {
            entity.Status = FileStatus.InRecycleBin;
            entity.DeletedAt = now;
            entity.DeletedBy = currentUserId;
            entity.DeletedByName = currentUsername;
            entity.OriginalPath = fileItem.Path;
            entity.DaysUntilPermanentDelete = keepDays;
        });

        if (fileItem.Type == FileItemType.Folder)
        {
            var pathPrefix = $"{fileItem.Path}/";
            var childItems = await _fileItemFactory.FindAsync(x => x.Path != null && x.Path.StartsWith(pathPrefix));
            foreach (var child in childItems)
            {
                await _fileItemFactory.UpdateAsync(child.Id!, entity =>
                {
                    entity.Status = FileStatus.InRecycleBin;
                    entity.DeletedAt = now;
                    entity.DeletedBy = currentUserId;
                    entity.DeletedByName = currentUsername;
                });
            }
        }

        _logger.LogInformation("Moved file item {Id} to recycle bin: {Name}", id, fileItem.Name);
    }

    /// <inheritdoc/>
    public async Task PermanentDeleteFileItemAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项不存在", nameof(id));

        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
        {
            var recycleItems = await _fileItemFactory.FindAsync(x => x.Id == id && x.Status == FileStatus.InRecycleBin, limit: 1);
            if (recycleItems.Count == 0)
                throw new ArgumentException("文件项不存在", nameof(id));
            fileItem = recycleItems.First();
        }

        if (fileItem.Type == FileItemType.Folder)
            await PermanentDeleteFolderContentsAsync(fileItem);

        await _fileItemFactory.SoftDeleteAsync(id);

        if (fileItem.Type == FileItemType.File)
        {
            await UpdateStorageUsageAsync(-fileItem.Size);
            await DeleteGridFSFileAsync(fileItem);
        }

        _logger.LogInformation("Permanently deleted file item {Id}: {Name}", id, fileItem.Name);
    }

    /// <inheritdoc/>
    public async Task<FileItem> RestoreFileItemAsync(string id, string? newParentId = null)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("回收站中不存在该文件项", nameof(id));

        var recycleItems = await _fileItemFactory.FindAsync(x => x.Id == id && x.Status == FileStatus.InRecycleBin, limit: 1);
        if (recycleItems.Count == 0)
            throw new ArgumentException("回收站中不存在该文件项", nameof(id));

        var fileItem = recycleItems.First();
        var targetParentId = newParentId ?? fileItem.ParentId;

        if (!string.IsNullOrEmpty(targetParentId))
        {
            var targetParent = await GetFileItemAsync(targetParentId);
            if (targetParent == null)
                throw new ArgumentException("目标文件夹不存在", nameof(newParentId));
            if (targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标必须是文件夹", nameof(newParentId));
        }

        var existingItems = await _fileItemFactory.FindAsync(
            x => x.Name == fileItem.Name && x.ParentId == targetParentId && x.Type == fileItem.Type && x.Status == FileStatus.Active,
            limit: 1);

        if (existingItems.Count > 0)
            throw new InvalidOperationException($"目标位置已存在同名{(fileItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        var newPath = await BuildFilePathAsync(fileItem.Name, targetParentId);

        await _fileItemFactory.UpdateAsync(id, entity =>
        {
            entity.Status = FileStatus.Active;
            entity.ParentId = targetParentId;
            entity.Path = newPath;
            entity.DeletedAt = null;
            entity.DeletedBy = null;
            entity.DeletedByName = null;
            entity.OriginalPath = null;
            entity.DaysUntilPermanentDelete = null;
        });

        var restored = await _fileItemFactory.FindAsync(x => x.Id == id, limit: 1);
        var restoredItem = restored.First();

        if (fileItem.Type == FileItemType.Folder)
        {
            var pathPrefix = $"{fileItem.Path}/";
            var childItems = await _fileItemFactory.FindAsync(x => x.Path != null && x.Path.StartsWith(pathPrefix));
            foreach (var child in childItems)
            {
                await _fileItemFactory.UpdateAsync(child.Id!, entity =>
                {
                    entity.Status = FileStatus.Active;
                    entity.DeletedAt = null;
                    entity.DeletedBy = null;
                    entity.DeletedByName = null;
                    entity.OriginalPath = null;
                    entity.DaysUntilPermanentDelete = null;
                });
            }
            await UpdateDescendantsPathAsync(fileItem.Path, newPath);
        }

        _logger.LogInformation("Restored file item {Id} from recycle bin to path: {Path}", id, newPath);
        return restoredItem!;
    }

    /// <inheritdoc/>
    public async Task<Stream> DownloadFileAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        if (fileItem.Type != FileItemType.File)
            throw new InvalidOperationException("只能下载文件");

        if (string.IsNullOrEmpty(fileItem.GridFSId))
            throw new InvalidOperationException("文件内容不存在");

        var bytes = await _fileStorageFactory.DownloadAsBytesAsync(fileItem.GridFSId, "cloud_storage_files");

        await _fileItemFactory.UpdateAsync(id, entity =>
        {
            entity.DownloadCount = entity.DownloadCount + 1;
            entity.LastAccessedAt = DateTime.UtcNow;
        });

        return new MemoryStream(bytes);
    }

    /// <inheritdoc/>
    public async Task<Stream> GetThumbnailAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        if (string.IsNullOrEmpty(fileItem.ThumbnailGridFSId))
            throw new InvalidOperationException("缩略图不存在");

        var bytes = await _fileStorageFactory.DownloadAsBytesAsync(fileItem.ThumbnailGridFSId, "cloud_storage_thumbnails");
        return new MemoryStream(bytes);
    }

    /// <inheritdoc/>
    public async Task<FilePreviewInfo> GetPreviewInfoAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        return new FilePreviewInfo
        {
            FileId = id,
            IsPreviewable = IsPreviewableFile(fileItem.MimeType),
            PreviewType = GetPreviewType(fileItem.MimeType),
            PreviewUrl = $"/api/cloud-storage/files/{id}/download",
            ThumbnailUrl = !string.IsNullOrEmpty(fileItem.ThumbnailGridFSId) ? $"/api/cloud-storage/files/{id}/thumbnail" : string.Empty
        };
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> SearchFilesAsync(FileSearchQuery query)
    {
        Expression<Func<FileItem, bool>> filter;
        var keyword = query.Keyword?.ToLower();
        var type = query.Type;

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            if (type.HasValue)
                filter = x => x.Status == FileStatus.Active && x.Name.ToLower().Contains(keyword) && x.Type == type.Value;
            else
                filter = x => x.Status == FileStatus.Active && x.Name.ToLower().Contains(keyword);
        }
        else
        {
            if (type.HasValue)
                filter = x => x.Status == FileStatus.Active && x.Type == type.Value;
            else
                filter = x => x.Status == FileStatus.Active;
        }

        Func<IQueryable<FileItem>, IOrderedQueryable<FileItem>> sort;
        var sortByLower = query.SortBy.ToLower();
        var sortOrderDesc = query.SortOrder.ToLower() == "desc";

        sort = sortByLower switch
        {
            "name" => sortOrderDesc ? q => q.OrderByDescending(f => f.Name) : q => q.OrderBy(f => f.Name),
            "size" => sortOrderDesc ? q => q.OrderByDescending(f => f.Size) : q => q.OrderBy(f => f.Size),
            "createdat" => sortOrderDesc ? q => q.OrderByDescending(f => f.CreatedAt) : q => q.OrderBy(f => f.CreatedAt),
            "updatedat" => sortOrderDesc ? q => q.OrderByDescending(f => f.UpdatedAt) : q => q.OrderBy(f => f.UpdatedAt),
            _ => q => q.OrderBy(f => f.Name)
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(filter, sort, query.Page, query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <inheritdoc/>
    public async Task<List<FileItem>> GetRecentFilesAsync(int count = 10)
    {
        return await _fileItemFactory.FindAsync(
            x => x.Type == FileItemType.File && x.Status == FileStatus.Active && x.LastAccessedAt != null,
            query => query.OrderByDescending(f => f.LastAccessedAt),
            count);
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> SearchByContentAsync(string keyword, FileContentSearchQuery query)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            throw new ArgumentException("搜索关键词不能为空", nameof(keyword));

        Expression<Func<FileItem, bool>> filter = x => x.Type == FileItemType.File && x.Status == FileStatus.Active;

        var (allFiles, _) = await _fileItemFactory.FindPagedAsync(
            filter,
            q => q.OrderByDescending(f => f.UpdatedAt),
            1,
            100);

        var matchedFiles = new List<FileItem>();

        foreach (var file in allFiles)
        {
            if (matchedFiles.Count >= query.PageSize * query.Page)
                break;

            try
            {
                if (string.IsNullOrEmpty(file.GridFSId))
                    continue;

                var bytes = await _fileStorageFactory.DownloadAsBytesAsync(file.GridFSId, "cloud_storage_files");
                var limit = 2 * 1024 * 1024;
                var bytesToRead = (int)Math.Min(bytes.Length, limit);
                var content = Encoding.UTF8.GetString(bytes, 0, bytesToRead);

                if (content.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                    matchedFiles.Add(file);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to search content in file {FileId}", file.Id);
            }
        }

        var skip = (query.Page - 1) * query.PageSize;
        var pagedResults = matchedFiles.Skip(skip).Take(query.PageSize).ToList();

        return new PagedResult<FileItem>
        {
            Data = pagedResults,
            Total = matchedFiles.Count,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> GetRecycleBinItemsAsync(RecycleBinQuery query)
    {
        Expression<Func<FileItem, bool>> filter;
        if (query.Type.HasValue)
            filter = x => x.Status == FileStatus.InRecycleBin && x.Type == query.Type.Value;
        else
            filter = x => x.Status == FileStatus.InRecycleBin;

        Func<IQueryable<FileItem>, IOrderedQueryable<FileItem>> sort;
        var sortByLower = query.SortBy.ToLower();
        var sortOrderDesc = query.SortOrder.ToLower() == "desc";

        sort = sortByLower switch
        {
            "name" => sortOrderDesc ? q => q.OrderByDescending(f => f.Name) : q => q.OrderBy(f => f.Name),
            "deletedat" => sortOrderDesc ? q => q.OrderByDescending(f => f.DeletedAt) : q => q.OrderBy(f => f.DeletedAt),
            "size" => sortOrderDesc ? q => q.OrderByDescending(f => f.Size) : q => q.OrderBy(f => f.Size),
            _ => q => q.OrderByDescending(f => f.DeletedAt)
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(filter, sort, query.Page, query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <inheritdoc/>
    public async Task EmptyRecycleBinAsync()
    {
        var recycleItems = await _fileItemFactory.FindAsync(x => x.Status == FileStatus.InRecycleBin);
        var totalSize = recycleItems.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        var itemIds = recycleItems.Select(x => x.Id!).Where(id => !string.IsNullOrEmpty(id)).ToList();

        foreach (var itemId in itemIds)
            await _fileItemFactory.SoftDeleteAsync(itemId);

        if (totalSize > 0)
            await UpdateStorageUsageAsync(-totalSize);

        _logger.LogInformation("Emptied recycle bin, freed {TotalSize} bytes from {ItemCount} items", totalSize, recycleItems.Count);
    }

    /// <inheritdoc/>
    public async Task<(int deletedCount, long freedSpace)> CleanupExpiredRecycleBinItemsAsync(int expireDays = 30)
    {
        var expireDate = DateTime.UtcNow.AddDays(-expireDays);
        var expiredItems = await _fileItemFactory.FindAsync(x => x.Status == FileStatus.InRecycleBin && x.DeletedAt != null && x.DeletedAt < expireDate);

        var totalSize = expiredItems.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        var itemIds = expiredItems.Select(x => x.Id!).Where(id => !string.IsNullOrEmpty(id)).ToList();

        foreach (var itemId in itemIds)
            await _fileItemFactory.SoftDeleteAsync(itemId);

        if (totalSize > 0)
            await UpdateStorageUsageAsync(-totalSize);

        _logger.LogInformation("Cleaned up {ItemCount} expired recycle bin items, freed {TotalSize} bytes", itemIds.Count, totalSize);
        return (itemIds.Count, totalSize);
    }

    /// <inheritdoc/>
    public async Task<StorageUsageInfo> GetStorageUsageAsync(string? userId = null)
    {
        var targetUserId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetUserId))
            throw new InvalidOperationException("用户ID不能为空");

        StorageQuota quota;
        try
        {
            quota = await _storageQuotaService.GetUserQuotaAsync(targetUserId);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("用户尚未分配存储配额"))
        {
            await InitializeDefaultQuotaAsync(targetUserId);
            quota = await _storageQuotaService.GetUserQuotaAsync(targetUserId);
        }

        var folderCount = await _fileItemFactory.CountAsync(x => x.CreatedBy == targetUserId && x.Type == FileItemType.Folder && x.Status == FileStatus.Active);

        return new StorageUsageInfo
        {
            UserId = targetUserId,
            TotalQuota = quota.TotalQuota,
            UsedSpace = quota.UsedSpace,
            FileCount = quota.FileCount,
            FolderCount = (int)folderCount,
            TypeUsage = quota.TypeUsage ?? [],
            LastUpdatedAt = quota.LastCalculatedAt
        };
    }

    /// <inheritdoc/>
    public async Task<List<FileItem>> UploadMultipleFilesAsync(IList<IFormFile> files, string parentId, FileConflictResolution conflictResolution = FileConflictResolution.Rename)
    {
        if (files == null || files.Count == 0)
            throw new ArgumentException("文件列表不能为空", nameof(files));

        var rootParentId = string.IsNullOrWhiteSpace(parentId) ? string.Empty : parentId;
        var processedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var results = new List<FileItem>();
        var totalSize = files.Sum(f => f.Length);

        await CheckStorageQuotaAsync(totalSize);

        foreach (var file in files)
        {
            try
            {
                var (isValid, errorMessage) = FileValidator.ValidateFile(file);
                if (!isValid)
                {
                    _logger.LogWarning("文件验证失败: {FileName} - {Error}", file.FileName, errorMessage);
                    continue;
                }

                var relativePath = file.FileName?.Replace("\\", "/") ?? string.Empty;
                var directoryPath = Path.GetDirectoryName(relativePath)?.Replace("\\", "/");
                var fileName = Path.GetFileName(relativePath);

                var dedupeKey = string.IsNullOrEmpty(relativePath) ? (file.FileName ?? string.Empty) : relativePath;
                if (!processedPaths.Add(dedupeKey))
                {
                    _logger.LogWarning("Skipped duplicate file in batch: {Path}", dedupeKey);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(fileName))
                    continue;

                var targetParentId = rootParentId;
                if (!string.IsNullOrWhiteSpace(directoryPath))
                    targetParentId = await EnsureFolderPathAsync(directoryPath!, rootParentId);

                var overwrite = conflictResolution == FileConflictResolution.Overwrite;
                if (conflictResolution == FileConflictResolution.Skip && await FileExistsAsync(fileName, targetParentId))
                    continue;

                var uploadedFile = await UploadFileAsync(file, targetParentId, overwrite);
                results.Add(uploadedFile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload file: {FileName}", file.FileName);
            }
        }

        return results;
    }

    private async Task<string> EnsureFolderPathAsync(string relativePath, string parentId)
    {
        var segments = relativePath.Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
        var currentParentId = string.IsNullOrWhiteSpace(parentId) ? null : parentId;

        foreach (var segment in segments)
        {
            Expression<Func<FileItem, bool>> baseFilter;
            if (currentParentId == null)
                baseFilter = x => x.Name == segment && x.Type == FileItemType.Folder && x.Status == FileStatus.Active && x.IsDeleted == false && (x.ParentId == null || x.ParentId == string.Empty);
            else
                baseFilter = x => x.Name == segment && x.Type == FileItemType.Folder && x.Status == FileStatus.Active && x.IsDeleted == false && x.ParentId == currentParentId;

            var existing = await _fileItemFactory.FindAsync(baseFilter, limit: 1);

            if (existing.Any())
            {
                currentParentId = existing.First().Id!;
            }
            else
            {
                var path = await BuildFilePathAsync(segment, currentParentId ?? string.Empty);
                var newFolder = new FileItem
                {
                    Name = segment,
                    Path = path,
                    ParentId = currentParentId ?? string.Empty,
                    Type = FileItemType.Folder,
                    Status = FileStatus.Active,
                    Size = 0,
                    MimeType = "application/x-directory"
                };

                await _fileItemFactory.CreateAsync(newFolder);
                currentParentId = newFolder.Id;
            }
        }

        return currentParentId!;
    }

    private async Task<string> BuildFilePathAsync(string name, string parentId)
    {
        if (string.IsNullOrEmpty(parentId))
            return $"/{name}";

        var parentItems = await _fileItemFactory.FindAsync(x => x.Id == parentId && x.Status == FileStatus.Active, limit: 1);
        var parent = parentItems.FirstOrDefault();
        if (parent == null)
            return $"/{name}";

        return $"{parent.Path}/{name}";
    }

    private async Task UpdateDescendantsPathAsync(string oldPath, string newPath)
    {
        var pathPrefix = $"{oldPath}/";
        var childItems = await _fileItemFactory.FindAsync(x => x.Path != null && x.Path.StartsWith(pathPrefix));
        foreach (var child in childItems)
        {
            await _fileItemFactory.UpdateAsync(child.Id!, entity =>
            {
                entity.Path = entity.Path!.Replace(pathPrefix, $"{newPath}/", StringComparison.Ordinal);
            });
        }
    }

    private async Task PermanentDeleteFolderContentsAsync(FileItem folder)
    {
        var pathPrefix = $"{folder.Path}/";
        var childItems = await _fileItemFactory.FindAsync(x => x.Path != null && x.Path.StartsWith(pathPrefix));

        foreach (var item in childItems)
        {
            if (item.Type == FileItemType.Folder)
                await PermanentDeleteFolderContentsAsync(item);

            await _fileItemFactory.SoftDeleteAsync(item.Id!);

            if (item.Type == FileItemType.File)
            {
                await UpdateStorageUsageAsync(-item.Size);
                await DeleteGridFSFileAsync(item);
            }
        }
    }

    private async Task DeleteGridFSFileAsync(FileItem fileItem)
    {
        if (!string.IsNullOrEmpty(fileItem.GridFSId))
        {
            await _fileStorageFactory.DeleteAsync(fileItem.GridFSId, "cloud_storage_files");
        }
    }

    private async Task GenerateAndUploadThumbnailAsync(Stream sourceStream, FileItem fileItem)
    {
        sourceStream.Position = 0;
        using var image = await Image.LoadAsync(sourceStream);
        var thumbnailWidth = 200;
        var thumbnailHeight = (int)(image.Height * (thumbnailWidth / (double)image.Width));
        image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(thumbnailWidth, thumbnailHeight), Mode = ResizeMode.Stretch }));
        using var thumbnailStream = new MemoryStream();
        await image.SaveAsPngAsync(thumbnailStream);
        thumbnailStream.Position = 0;
        var thumbnailId = await _fileStorageFactory.UploadAsync(
            thumbnailStream,
            $"{fileItem.Id}.png",
            "image/png",
            null,
            "cloud_storage_thumbnails");

        await _fileItemFactory.UpdateAsync(fileItem.Id!, entity =>
        {
            entity.ThumbnailGridFSId = thumbnailId;
        });
    }

    private async Task EnsureCurrentVersionSnapshotAsync(FileItem fileItem)
    {
        var currentVersion = await GetCurrentVersionAsync(fileItem.Id!);
        if (currentVersion == null)
        {
            var version = new FileVersion
            {
                FileItemId = fileItem.Id!,
                VersionNumber = 1,
                GridFSId = fileItem.GridFSId,
                Size = fileItem.Size,
                Hash = fileItem.Hash,
                Comment = "原始版本",
                IsCurrentVersion = true
            };
            await _fileVersionFactory.CreateAsync(version);
        }
    }

    private async Task<FileVersion?> GetCurrentVersionAsync(string fileItemId)
    {
        var versions = await _fileVersionFactory.FindAsync(x => x.FileItemId == fileItemId && x.IsCurrentVersion, limit: 1);
        return versions.FirstOrDefault();
    }

    private async Task MarkAllVersionsAsNonCurrentAsync(string fileItemId)
    {
        var versions = await _fileVersionFactory.FindAsync(x => x.FileItemId == fileItemId && x.IsCurrentVersion);
        foreach (var version in versions)
        {
            await _fileVersionFactory.UpdateAsync(version.Id!, entity =>
            {
                entity.IsCurrentVersion = false;
            });
        }
    }

    private async Task<int> GetNextVersionNumberAsync(string fileItemId)
    {
        var versions = await _fileVersionFactory.FindAsync(x => x.FileItemId == fileItemId, query => query.OrderByDescending(v => v.VersionNumber));
        return versions.Count > 0 ? versions.Max(v => v.VersionNumber) + 1 : 1;
    }

    private async Task CheckStorageQuotaAsync(long fileSize)
    {
        var userId = _tenantContext.GetCurrentUserId();
        var quota = await _storageQuotaService.GetUserQuotaAsync(userId);
        if (quota.UsedSpace + fileSize > quota.TotalQuota)
            throw new InvalidOperationException("存储配额不足");
    }

    private async Task UpdateStorageUsageAsync(long sizeDelta)
    {
        var userId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(userId)) return;
        await _storageQuotaService.UpdateStorageUsageAsync(userId, sizeDelta);
    }

    private async Task InitializeDefaultQuotaAsync(string userId)
    {
        await _storageQuotaService.SetUserQuotaAsync(userId, 0);
    }

    private async Task<bool> FileExistsAsync(string name, string parentId)
    {
        var items = await _fileItemFactory.FindAsync(x => x.Name == name && x.ParentId == parentId && x.Status == FileStatus.Active, limit: 1);
        return items.Count > 0;
    }

    private async Task<bool> IsDescendantFolderAsync(string folderId, string potentialDescendantId)
    {
        if (folderId == potentialDescendantId)
            return true;

        var folderItems = await _fileItemFactory.FindAsync(x => x.Id == folderId && x.Type == FileItemType.Folder, limit: 1);
        if (folderItems.Count == 0)
            return false;

        var folder = folderItems.First();
        var pathPrefix = $"{folder.Path}/";
        var descendantItems = await _fileItemFactory.FindAsync(x => x.Id == potentialDescendantId && x.Path != null && x.Path.StartsWith(pathPrefix), limit: 1);
        return descendantItems.Count > 0;
    }

    private static async Task<string> ComputeFileHashAsync(Stream stream)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = await sha256.ComputeHashAsync(stream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static bool IsImageFile(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
            return false;
        return contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) &&
               (contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase) ||
                contentType.Equals("image/png", StringComparison.OrdinalIgnoreCase) ||
                contentType.Equals("image/gif", StringComparison.OrdinalIgnoreCase) ||
                contentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsPreviewableFile(string mimeType)
    {
        return mimeType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) ||
               mimeType.StartsWith("text/", StringComparison.OrdinalIgnoreCase) ||
               mimeType.Equals("application/json", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetPreviewType(string mimeType)
    {
        if (mimeType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return "pdf";
        if (mimeType.StartsWith("text/", StringComparison.OrdinalIgnoreCase))
            return "text";
        if (mimeType.Equals("application/json", StringComparison.OrdinalIgnoreCase))
            return "json";
        return "unsupported";
    }
}
