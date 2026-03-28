using Microsoft.EntityFrameworkCore;
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
    Overwrite,
    Rename,
    Skip
}

/// <summary>
/// 云存储服务实现
/// </summary>
public class CloudStorageService : ICloudStorageService
{
    private readonly DbContext _context;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CloudStorageService> _logger;
    private readonly IStorageQuotaService _storageQuotaService;

    public CloudStorageService(
        DbContext context,
        IStorageQuotaService storageQuotaService,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext,
        ILogger<CloudStorageService> logger)
    {
        _context = context;
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
    public async Task<RecycleStatistics> GetRecycleStatisticsAsync()
    {
        var recycleItems = await _context.Set<FileItem>().Where(x => x.Status == FileStatus.InRecycleBin).ToListAsync();

        var totalItems = recycleItems.Count;
        var totalSize = recycleItems.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);

        var itemsByDate = recycleItems
            .Where(x => x.DeletedAt.HasValue)
            .GroupBy(x => x.DeletedAt!.Value.ToString("yyyy-MM-dd"))
            .Select(g => new RecycleStatisticsItem
            {
                Date = g.Key,
                Count = g.Count(),
                Size = g.Where(f => f.Type == FileItemType.File).Sum(f => f.Size)
            })
            .OrderByDescending(x => x.Date)
            .ToList();

        return new RecycleStatistics
        {
            TotalItems = totalItems,
            TotalSize = totalSize,
            ItemsByDate = itemsByDate
        };
    }

    /// <inheritdoc/>
    public async Task<BatchOperationResult> BatchDeleteAsync(List<string> ids)
    {
        var result = new BatchOperationResult { Total = ids.Count, StartTime = DateTime.UtcNow };
        foreach (var id in ids)
        {
            try
            {
                var item = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id);
                if (item != null)
                {
                    _context.Set<FileItem>().Remove(item);
                    await _context.SaveChangesAsync();
                }
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
    public async Task<Stream> DownloadFolderAsZipAsync(string folderId)
    {
        var folder = await GetFileItemAsync(folderId);
        if (folder == null || folder.Type != FileItemType.Folder)
            throw new ArgumentException("文件夹不存在或无效", nameof(folderId));

        var memoryStream = new MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(memoryStream, System.IO.Compression.ZipArchiveMode.Create, true))
        {
            await AddFolderToZipAsync(archive, folder, "");
        }

        memoryStream.Position = 0;
        return memoryStream;
    }

    private async Task AddFolderToZipAsync(System.IO.Compression.ZipArchive archive, FileItem folder, string relativePath)
    {
        var children = await _context.Set<FileItem>().Where(x => x.ParentId == folder.Id && x.Status == FileStatus.Active).ToListAsync();

        foreach (var child in children)
        {
            var childPath = string.IsNullOrEmpty(relativePath) ? child.Name : $"{relativePath}/{child.Name}";

            if (child.Type == FileItemType.Folder)
            {
                await AddFolderToZipAsync(archive, child, childPath);
            }
            else if (!string.IsNullOrEmpty(child.GridFSId))
            {
                var entry = archive.CreateEntry(childPath);
                using var entryStream = entry.Open();
                using var fileStream = await _fileStorageFactory.GetDownloadStreamAsync(child.GridFSId, "cloud_storage_files");
                await fileStream.CopyToAsync(entryStream);
            }
        }
    }

    /// <inheritdoc/>
    public async Task<FileItem> CopyFileItemAsync(string id, string newParentId, string? newName = null)
    {
        var sourceItem = await GetFileItemAsync(id);
        if (sourceItem == null) throw new ArgumentException("源文件项不存在", nameof(id));

        string targetPathPrefix = "";
        if (!string.IsNullOrEmpty(newParentId))
        {
            var targetParent = await GetFileItemAsync(newParentId);
            if (targetParent == null || targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标文件夹不存在或无效", nameof(newParentId));

            if (sourceItem.Type == FileItemType.Folder)
            {
                if (sourceItem.Id == newParentId || await IsDescendantFolderAsync(sourceItem.Id, newParentId))
                    throw new InvalidOperationException("不能将文件夹复制到自身或其子文件夹中");
            }
            targetPathPrefix = targetParent.Path;
        }

        var targetName = !string.IsNullOrWhiteSpace(newName) ? newName : sourceItem.Name;
        var exists = await _context.Set<FileItem>().AnyAsync(x => x.Name == targetName && x.ParentId == newParentId && x.Type == sourceItem.Type && x.Status == FileStatus.Active);
        if (exists) throw new InvalidOperationException($"目标位置已存在同名{(sourceItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        return await CopyItemRecursiveAsync(sourceItem, newParentId, targetName, targetPathPrefix);
    }

    private async Task<FileItem> CopyItemRecursiveAsync(FileItem source, string parentId, string name, string parentPath)
    {
        var newPath = string.IsNullOrEmpty(parentPath) ? $"/{name}" : $"{parentPath}/{name}";

        var newItem = new FileItem
        {
            Name = name,
            Path = newPath,
            ParentId = parentId,
            Type = source.Type,
            Size = source.Size,
            MimeType = source.MimeType,
            GridFSId = source.GridFSId,
            Hash = source.Hash,
            ThumbnailGridFSId = source.ThumbnailGridFSId,
            Metadata = source.Metadata != null ? new Dictionary<string, object>(source.Metadata) : new Dictionary<string, object>(),
            Status = FileStatus.Active,
            LastAccessedAt = DateTime.UtcNow,
            DownloadCount = 0
        };

        await _context.Set<FileItem>().AddAsync(newItem);
        await _context.SaveChangesAsync();

        if (newItem.Type == FileItemType.File)
        {
            await UpdateStorageUsageAsync(newItem.Size);
        }
        else if (newItem.Type == FileItemType.Folder)
        {
            var children = await _context.Set<FileItem>().Where(x => x.ParentId == source.Id && x.Status == FileStatus.Active).ToListAsync();
            foreach (var child in children)
            {
                await CopyItemRecursiveAsync(child, newItem.Id!, child.Name, newItem.Path);
            }
        }

        return newItem;
    }

    /// <inheritdoc/>
    public async Task<FileItem> CreateFolderAsync(string name, string parentId)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("文件夹名称不能为空", nameof(name));

        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? string.Empty : parentId;
        if (!string.IsNullOrEmpty(normalizedParentId))
        {
            var parent = await GetFileItemAsync(normalizedParentId);
            if (parent == null || parent.Type != FileItemType.Folder) throw new ArgumentException("父文件夹不存在或无效");
        }

        var exists = await _context.Set<FileItem>().AnyAsync(x => x.Name == name && x.ParentId == normalizedParentId && x.Type == FileItemType.Folder && x.Status == FileStatus.Active);
        if (exists) throw new InvalidOperationException($"文件夹 '{name}' 已存在");

        var path = await BuildFilePathAsync(name, normalizedParentId);
        var folder = new FileItem
        {
            Name = name,
            Path = path,
            ParentId = normalizedParentId,
            Type = FileItemType.Folder,
            Status = FileStatus.Active,
            Size = 0,
            MimeType = "application/x-directory"
        };

        await _context.Set<FileItem>().AddAsync(folder);
        await _context.SaveChangesAsync();
        return folder;
    }

    /// <inheritdoc/>
    public async Task<FileItem> UploadFileAsync(IFormFile file, string parentId, bool overwrite = false)
    {
        if (file == null || file.Length == 0) throw new ArgumentException("文件不能为空", nameof(file));
        var fileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("文件名不能为空");

        var (isValid, errorMessage) = FileValidator.ValidateFile(file);
        if (!isValid) throw new ArgumentException(errorMessage!);

        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? string.Empty : parentId;
        if (!string.IsNullOrEmpty(normalizedParentId))
        {
            var parent = await GetFileItemAsync(normalizedParentId);
            if (parent == null || parent.Type != FileItemType.Folder) throw new ArgumentException("父文件夹不存在或无效");
        }

        await CheckStorageQuotaAsync(file.Length);

        string fileHash;
        using (var stream = file.OpenReadStream()) fileHash = await ComputeFileHashAsync(stream);

        var existingFile = await _context.Set<FileItem>().FirstOrDefaultAsync(x => 
            x.Name == fileName && x.ParentId == normalizedParentId && x.Type == FileItemType.File && x.Status == FileStatus.Active);

        var duplicateFile = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Hash == fileHash && x.Status == FileStatus.Active);
        string gridFSId;

        if (duplicateFile != null)
        {
            gridFSId = duplicateFile.GridFSId;
        }
        else
        {
            using var uploadStream = file.OpenReadStream();
            gridFSId = await _fileStorageFactory.UploadAsync(uploadStream, fileName, file.ContentType, new Dictionary<string, object>
            {
                ["originalName"] = fileName,
                ["contentType"] = file.ContentType ?? "application/octet-stream",
                ["uploadedAt"] = DateTime.UtcNow,
                ["hash"] = fileHash
            }, "cloud_storage_files");
        }

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
                await _context.Set<FileVersion>().AddAsync(version);
            }

            existingFile.GridFSId = gridFSId;
            existingFile.Size = file.Length;
            existingFile.Hash = fileHash;
            existingFile.MimeType = file.ContentType ?? "application/octet-stream";
            fileItem = existingFile;
            await _context.SaveChangesAsync();
        }
        else
        {
            fileItem = new FileItem
            {
                Name = fileName,
                Path = await BuildFilePathAsync(fileName, normalizedParentId),
                ParentId = normalizedParentId,
                Type = FileItemType.File,
                Size = file.Length,
                MimeType = file.ContentType ?? "application/octet-stream",
                GridFSId = gridFSId,
                Hash = fileHash,
                Status = FileStatus.Active
            };
            await _context.Set<FileItem>().AddAsync(fileItem);
            await _context.SaveChangesAsync();
        }

        if (IsImageFile(file.ContentType))
        {
            try { using var thumbStream = file.OpenReadStream(); await GenerateAndUploadThumbnailAsync(thumbStream, fileItem); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to generate thumbnail for {FileId}", fileItem.Id); }
        }

        await UpdateStorageUsageAsync(file.Length);
        return fileItem;
    }

    /// <inheritdoc/>
    public async Task<FileItem?> GetFileItemAsync(string id)
    {
        return await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id && x.Status == FileStatus.Active);
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> GetFileItemsAsync(string parentId, FileListQuery query)
    {
        var normalizedParentId = string.IsNullOrWhiteSpace(parentId) ? string.Empty : parentId;
        var q = _context.Set<FileItem>().Where(x => x.Status == FileStatus.Active && x.ParentId == normalizedParentId);
        
        if (query.Type.HasValue) q = q.Where(x => x.Type == query.Type.Value);

        var sortBy = query.SortBy.ToLower();
        var isDesc = query.SortOrder.ToLower() == "desc";

        q = sortBy switch
        {
            "name" => isDesc ? q.OrderByDescending(f => f.Name) : q.OrderBy(f => f.Name),
            "size" => isDesc ? q.OrderByDescending(f => f.Size) : q.OrderBy(f => f.Size),
            "createdat" => isDesc ? q.OrderByDescending(f => f.CreatedAt) : q.OrderBy(f => f.CreatedAt),
            "updatedat" => isDesc ? q.OrderByDescending(f => f.UpdatedAt) : q.OrderBy(f => f.UpdatedAt),
            _ => q.OrderBy(f => f.Name)
        };

        var total = await q.LongCountAsync();
        var data = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();

        return new PagedResult<FileItem> { Data = data, Total = (int)total, Page = query.Page, PageSize = query.PageSize };
    }

    /// <inheritdoc/>
    public async Task<FileItem> RenameFileItemAsync(string id, string newName)
    {
        var item = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id && x.Status == FileStatus.Active);
        if (item == null) throw new ArgumentException("文件项不存在", nameof(id));

        var exists = await _context.Set<FileItem>().AnyAsync(x => x.Name == newName && x.ParentId == item.ParentId && x.Type == item.Type && x.Status == FileStatus.Active && x.Id != id);
        if (exists) throw new InvalidOperationException($"名称 '{newName}' 已存在");

        var oldPath = item.Path;
        var newPath = await BuildFilePathAsync(newName, item.ParentId);
        item.Name = newName;
        item.Path = newPath;

        await _context.SaveChangesAsync();
        if (item.Type == FileItemType.Folder) await UpdateDescendantsPathAsync(oldPath!, newPath);
        return item;
    }

    /// <inheritdoc/>
    public async Task<FileItem> MoveFileItemAsync(string id, string newParentId)
    {
        var item = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id && x.Status == FileStatus.Active);
        if (item == null) throw new ArgumentException("文件项不存在", nameof(id));

        if (!string.IsNullOrEmpty(newParentId))
        {
            var parent = await GetFileItemAsync(newParentId);
            if (parent == null || parent.Type != FileItemType.Folder) throw new ArgumentException("目标文件夹无效");
            if (item.Type == FileItemType.Folder && (id == newParentId || await IsDescendantFolderAsync(id, newParentId)))
                throw new InvalidOperationException("不能移动到自身或子文件夹");
        }

        var exists = await _context.Set<FileItem>().AnyAsync(x => x.Name == item.Name && x.ParentId == newParentId && x.Type == item.Type && x.Status == FileStatus.Active && x.Id != id);
        if (exists) throw new InvalidOperationException("目标位置已存在同名项");

        var oldPath = item.Path;
        var newPath = await BuildFilePathAsync(item.Name, newParentId);
        item.ParentId = newParentId;
        item.Path = newPath;

        await _context.SaveChangesAsync();
        if (item.Type == FileItemType.Folder) await UpdateDescendantsPathAsync(oldPath!, newPath);
        return item;
    }

    /// <inheritdoc/>
    public async Task DeleteFileAsync(string id, string userId)
    {
        var item = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id && x.Status == FileStatus.Active);
        if (item == null) throw new ArgumentException("文件项不存在");
        if (item.CreatedBy != userId) throw new UnauthorizedAccessException("无权删除他人的文件");

        item.Status = FileStatus.InRecycleBin;
        item.DeletedAt = DateTime.UtcNow;
        item.DeletedBy = userId;
        item.OriginalPath = item.Path;
        item.DaysUntilPermanentDelete = 30;

        if (item.Type == FileItemType.Folder)
        {
            var pathPrefix = $"{item.Path}/";
            var children = await _context.Set<FileItem>().Where(x => x.Path != null && x.Path.StartsWith(pathPrefix)).ToListAsync();
            foreach (var child in children)
            {
                child.Status = FileStatus.InRecycleBin;
                child.DeletedAt = DateTime.UtcNow;
                child.DeletedBy = userId;
            }
        }
        await _context.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task DeleteFileItemAsync(string id) => await DeleteFileAsync(id, _tenantContext.GetCurrentUserId() ?? "system");

    /// <inheritdoc/>
    public async Task PermanentDeleteFileItemAsync(string id)
    {
        var item = await _context.Set<FileItem>().IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) throw new ArgumentException("文件项不存在");

        if (item.Type == FileItemType.Folder) await PermanentDeleteFolderContentsAsync(item);

        _context.Set<FileItem>().Remove(item);
        if (item.Type == FileItemType.File)
        {
            await UpdateStorageUsageAsync(-item.Size);
            await DeleteGridFSFileAsync(item);
        }
        await _context.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task<FileItem> RestoreFileItemAsync(string id, string? newParentId = null)
    {
        var item = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == id && x.Status == FileStatus.InRecycleBin);
        if (item == null) throw new ArgumentException("回收站中不存在该文件项");

        var targetParentId = newParentId ?? item.ParentId;
        if (!string.IsNullOrEmpty(targetParentId))
        {
            var parent = await GetFileItemAsync(targetParentId);
            if (parent == null || parent.Type != FileItemType.Folder) throw new ArgumentException("目标文件夹无效");
        }

        var exists = await _context.Set<FileItem>().AnyAsync(x => x.Name == item.Name && x.ParentId == targetParentId && x.Type == item.Type && x.Status == FileStatus.Active);
        if (exists) throw new InvalidOperationException("目标位置已存在同名项");

        var oldPath = item.Path;
        var newPath = await BuildFilePathAsync(item.Name, targetParentId);
        item.Status = FileStatus.Active;
        item.ParentId = targetParentId;
        item.Path = newPath;
        item.DeletedAt = null;
        item.DeletedBy = null;
        item.OriginalPath = null;

        if (item.Type == FileItemType.Folder)
        {
            var pathPrefix = $"{oldPath}/";
            var children = await _context.Set<FileItem>().Where(x => x.Path != null && x.Path.StartsWith(pathPrefix)).ToListAsync();
            foreach (var child in children)
            {
                child.Status = FileStatus.Active;
                child.DeletedAt = null;
                child.DeletedBy = null;
                child.OriginalPath = null;
                child.Path = child.Path!.Replace(pathPrefix, $"{newPath}/");
            }
        }
        await _context.SaveChangesAsync();
        return item;
    }

    /// <inheritdoc/>
    public async Task<Stream> DownloadFileAsync(string id)
    {
        var item = await GetFileItemAsync(id);
        if (item == null || item.Type != FileItemType.File || string.IsNullOrEmpty(item.GridFSId))
            throw new ArgumentException("文件不存在或无法下载");

        item.DownloadCount++;
        item.LastAccessedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await _fileStorageFactory.GetDownloadStreamAsync(item.GridFSId, "cloud_storage_files");
    }

    /// <inheritdoc/>
    public async Task<Stream> GetThumbnailAsync(string id)
    {
        var item = await GetFileItemAsync(id);
        if (item == null || string.IsNullOrEmpty(item.ThumbnailGridFSId)) throw new ArgumentException("缩略图不存在");
        return await _fileStorageFactory.GetDownloadStreamAsync(item.ThumbnailGridFSId, "cloud_storage_thumbnails");
    }

    /// <inheritdoc/>
    public async Task<FilePreviewInfo> GetPreviewInfoAsync(string id)
    {
        var item = await GetFileItemAsync(id);
        if (item == null) throw new ArgumentException("文件不存在");
        return new FilePreviewInfo
        {
            FileId = id,
            IsPreviewable = IsPreviewableFile(item.MimeType),
            PreviewType = GetPreviewType(item.MimeType),
            PreviewUrl = $"/api/cloud-storage/files/{id}/download",
            ThumbnailUrl = !string.IsNullOrEmpty(item.ThumbnailGridFSId) ? $"/api/cloud-storage/files/{id}/thumbnail" : string.Empty
        };
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> SearchFilesAsync(FileSearchQuery query)
    {
        var keyword = query.Keyword?.ToLower();
        var q = _context.Set<FileItem>().Where(x => x.Status == FileStatus.Active);
        if (!string.IsNullOrWhiteSpace(keyword)) q = q.Where(x => x.Name.ToLower().Contains(keyword));
        if (query.Type.HasValue) q = q.Where(x => x.Type == query.Type.Value);

        var isDesc = query.SortOrder.ToLower() == "desc";
        q = query.SortBy.ToLower() switch
        {
            "name" => isDesc ? q.OrderByDescending(f => f.Name) : q.OrderBy(f => f.Name),
            "size" => isDesc ? q.OrderByDescending(f => f.Size) : q.OrderBy(f => f.Size),
            "createdat" => isDesc ? q.OrderByDescending(f => f.CreatedAt) : q.OrderBy(f => f.CreatedAt),
            "updatedat" => isDesc ? q.OrderByDescending(f => f.UpdatedAt) : q.OrderBy(f => f.UpdatedAt),
            _ => q.OrderBy(f => f.Name)
        };

        var total = await q.LongCountAsync();
        var data = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<FileItem> { Data = data, Total = (int)total, Page = query.Page, PageSize = query.PageSize };
    }

    /// <inheritdoc/>
    public async Task<List<FileItem>> GetRecentFilesAsync(int count = 10)
    {
        return await _context.Set<FileItem>()
            .Where(x => x.Type == FileItemType.File && x.Status == FileStatus.Active && x.LastAccessedAt != null)
            .OrderByDescending(f => f.LastAccessedAt)
            .Take(count)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> SearchByContentAsync(string keyword, FileContentSearchQuery query)
    {
        if (string.IsNullOrWhiteSpace(keyword)) throw new ArgumentException("搜索关键词不能为空");
        var allFiles = await _context.Set<FileItem>().Where(x => x.Type == FileItemType.File && x.Status == FileStatus.Active)
            .OrderByDescending(f => f.UpdatedAt).Take(500).ToListAsync();

        var matched = new List<FileItem>();
        foreach (var file in allFiles)
        {
            if (matched.Count >= query.PageSize * query.Page) break;
            try
            {
                if (string.IsNullOrEmpty(file.GridFSId)) continue;
                var bytes = await _fileStorageFactory.DownloadAsBytesAsync(file.GridFSId, "cloud_storage_files");
                var content = Encoding.UTF8.GetString(bytes, 0, (int)Math.Min(bytes.Length, 1024 * 1024));
                if (content.Contains(keyword, StringComparison.OrdinalIgnoreCase)) matched.Add(file);
            }
            catch { /* 忽略文件读取错误，不影响搜索结果 */ }
        }

        var paged = matched.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToList();
        return new PagedResult<FileItem> { Data = paged, Total = matched.Count, Page = query.Page, PageSize = query.PageSize };
    }

    /// <inheritdoc/>
    public async Task<PagedResult<FileItem>> GetRecycleBinItemsAsync(RecycleBinQuery query)
    {
        var q = _context.Set<FileItem>().Where(x => x.Status == FileStatus.InRecycleBin);
        if (query.Type.HasValue) q = q.Where(x => x.Type == query.Type.Value);

        var isDesc = query.SortOrder.ToLower() == "desc";
        q = query.SortBy.ToLower() switch
        {
            "name" => isDesc ? q.OrderByDescending(f => f.Name) : q.OrderBy(f => f.Name),
            "size" => isDesc ? q.OrderByDescending(f => f.Size) : q.OrderBy(f => f.Size),
            "deletedat" => isDesc ? q.OrderByDescending(f => f.DeletedAt) : q.OrderBy(f => f.DeletedAt),
            _ => q.OrderByDescending(f => f.DeletedAt)
        };

        var total = await q.LongCountAsync();
        var data = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<FileItem> { Data = data, Total = (int)total, Page = query.Page, PageSize = query.PageSize };
    }

    /// <inheritdoc/>
    public async Task EmptyRecycleBinAsync()
    {
        var items = await _context.Set<FileItem>().Where(x => x.Status == FileStatus.InRecycleBin).ToListAsync();
        var totalSize = items.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        foreach (var item in items) _context.Set<FileItem>().Remove(item);
        if (totalSize > 0) await UpdateStorageUsageAsync(-totalSize);
        await _context.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task<(int deletedCount, long freedSpace)> CleanupExpiredRecycleBinItemsAsync(int expireDays = 30)
    {
        var expireDate = DateTime.UtcNow.AddDays(-expireDays);
        var expired = await _context.Set<FileItem>().Where(x => x.Status == FileStatus.InRecycleBin && x.DeletedAt < expireDate).ToListAsync();
        var totalSize = expired.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        foreach (var item in expired) _context.Set<FileItem>().Remove(item);
        if (totalSize > 0) await UpdateStorageUsageAsync(-totalSize);
        await _context.SaveChangesAsync();
        return (expired.Count, totalSize);
    }

    /// <inheritdoc/>
    public async Task<StorageUsageInfo> GetStorageUsageAsync(string? userId = null)
    {
        var targetId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetId)) throw new InvalidOperationException("用户ID不能为空");
        
        StorageQuota quota;
        try { quota = await _storageQuotaService.GetUserQuotaAsync(targetId); }
        catch { await InitializeDefaultQuotaAsync(targetId); quota = await _storageQuotaService.GetUserQuotaAsync(targetId); }

        var folders = await _context.Set<FileItem>().LongCountAsync(x => x.CreatedBy == targetId && x.Type == FileItemType.Folder && x.Status == FileStatus.Active);
        return new StorageUsageInfo { UserId = targetId, TotalQuota = quota.TotalQuota, UsedSpace = quota.UsedSpace, FileCount = quota.FileCount, FolderCount = (int)folders, TypeUsage = quota.TypeUsage ?? new Dictionary<string, long>(), LastUpdatedAt = quota.LastCalculatedAt };
    }

    /// <inheritdoc/>
    public async Task<List<FileItem>> UploadMultipleFilesAsync(IList<IFormFile> files, string parentId, FileConflictResolution conflictResolution = FileConflictResolution.Rename)
    {
        if (files == null || files.Count == 0) throw new ArgumentException("文件列表不能为空");
        var results = new List<FileItem>();
        await CheckStorageQuotaAsync(files.Sum(f => f.Length));

        foreach (var file in files)
        {
            try
            {
                var (isValid, err) = FileValidator.ValidateFile(file);
                if (!isValid) continue;

                var relativePath = file.FileName?.Replace("\\", "/") ?? string.Empty;
                var dirPath = Path.GetDirectoryName(relativePath)?.Replace("\\", "/");
                var fileName = Path.GetFileName(relativePath);
                if (string.IsNullOrWhiteSpace(fileName)) continue;

                var targetId = string.IsNullOrWhiteSpace(parentId) ? string.Empty : parentId;
                if (!string.IsNullOrWhiteSpace(dirPath)) targetId = await EnsureFolderPathAsync(dirPath!, targetId);

                if (conflictResolution == FileConflictResolution.Skip && await FileExistsAsync(fileName, targetId)) continue;
                results.Add(await UploadFileAsync(file, targetId, conflictResolution == FileConflictResolution.Overwrite));
            }
            catch (Exception ex) { _logger.LogError(ex, "Batch upload failed for {File}", file.FileName); }
        }
        return results;
    }

    private async Task<string> EnsureFolderPathAsync(string relativePath, string parentId)
    {
        var segments = relativePath.Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
        var currentId = parentId;
        foreach (var seg in segments)
        {
            var folder = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Name == seg && x.ParentId == currentId && x.Type == FileItemType.Folder && x.Status == FileStatus.Active);
            if (folder != null) currentId = folder.Id!;
            else
            {
                var newFolder = await CreateFolderAsync(seg, currentId);
                currentId = newFolder.Id!;
            }
        }
        return currentId;
    }

    private async Task<string> BuildFilePathAsync(string name, string parentId)
    {
        if (string.IsNullOrEmpty(parentId)) return $"/{name}";
        var parent = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == parentId);
        return parent == null ? $"/{name}" : $"{parent.Path}/{name}";
    }

    private async Task UpdateDescendantsPathAsync(string oldPath, string newPath)
    {
        var prefix = $"{oldPath}/";
        var children = await _context.Set<FileItem>().Where(x => x.Path != null && x.Path.StartsWith(prefix)).ToListAsync();
        foreach (var child in children) child.Path = child.Path!.Replace(prefix, $"{newPath}/");
        await _context.SaveChangesAsync();
    }

    private async Task PermanentDeleteFolderContentsAsync(FileItem folder)
    {
        var prefix = $"{folder.Path}/";
        var children = await _context.Set<FileItem>().IgnoreQueryFilters().Where(x => x.Path != null && x.Path.StartsWith(prefix)).ToListAsync();
        foreach (var item in children)
        {
            if (item.Type == FileItemType.Folder) await PermanentDeleteFolderContentsAsync(item);
            _context.Set<FileItem>().Remove(item);
            if (item.Type == FileItemType.File) { await UpdateStorageUsageAsync(-item.Size); await DeleteGridFSFileAsync(item); }
        }
    }

    private async Task DeleteGridFSFileAsync(FileItem item) { if (!string.IsNullOrEmpty(item.GridFSId)) await _fileStorageFactory.DeleteAsync(item.GridFSId, "cloud_storage_files"); }

    private async Task GenerateAndUploadThumbnailAsync(Stream stream, FileItem file)
    {
        stream.Position = 0;
        using var image = await Image.LoadAsync(stream);
        image.Mutate(x => x.Resize(200, 0));
        using var ms = new MemoryStream();
        await image.SaveAsPngAsync(ms);
        ms.Position = 0;
        file.ThumbnailGridFSId = await _fileStorageFactory.UploadAsync(ms, $"{file.Id}.png", "image/png", null, "cloud_storage_thumbnails");
        await _context.SaveChangesAsync();
    }

    private async Task EnsureCurrentVersionSnapshotAsync(FileItem file)
    {
        if (!await _context.Set<FileVersion>().AnyAsync(x => x.FileItemId == file.Id && x.IsCurrentVersion))
        {
            await _context.Set<FileVersion>().AddAsync(new FileVersion { FileItemId = file.Id!, VersionNumber = 1, GridFSId = file.GridFSId, Size = file.Size, Hash = file.Hash, Comment = "原始版本", IsCurrentVersion = true });
            await _context.SaveChangesAsync();
        }
    }

    private async Task MarkAllVersionsAsNonCurrentAsync(string fileId)
    {
        var versions = await _context.Set<FileVersion>().Where(x => x.FileItemId == fileId && x.IsCurrentVersion).ToListAsync();
        foreach (var v in versions) v.IsCurrentVersion = false;
        await _context.SaveChangesAsync();
    }

    private async Task<int> GetNextVersionNumberAsync(string fileId)
    {
        var max = await _context.Set<FileVersion>().Where(x => x.FileItemId == fileId).MaxAsync(v => (int?)v.VersionNumber) ?? 0;
        return max + 1;
    }

    private async Task CheckStorageQuotaAsync(long size) { if ((await _storageQuotaService.GetUserQuotaAsync(_tenantContext.GetCurrentUserId())).UsedSpace + size > (await _storageQuotaService.GetUserQuotaAsync(_tenantContext.GetCurrentUserId())).TotalQuota) throw new InvalidOperationException("存储配额不足"); }
    private async Task UpdateStorageUsageAsync(long delta) { var id = _tenantContext.GetCurrentUserId(); if (id != null) await _storageQuotaService.UpdateStorageUsageAsync(id, delta); }
    private async Task InitializeDefaultQuotaAsync(string id) => await _storageQuotaService.SetUserQuotaAsync(id, 0);
    private async Task<bool> FileExistsAsync(string name, string pid) => await _context.Set<FileItem>().AnyAsync(x => x.Name == name && x.ParentId == pid && x.Status == FileStatus.Active);
    private async Task<bool> IsDescendantFolderAsync(string fid, string did)
    {
        if (fid == did) return true;
        var folder = await _context.Set<FileItem>().FirstOrDefaultAsync(x => x.Id == fid);
        return folder != null && await _context.Set<FileItem>().AnyAsync(x => x.Id == did && x.Path != null && x.Path.StartsWith($"{folder.Path}/"));
    }

    private static async Task<string> ComputeFileHashAsync(Stream s) { using var sha = SHA256.Create(); return Convert.ToHexString(await sha.ComputeHashAsync(s)).ToLowerInvariant(); }
    private static bool IsImageFile(string? ct) => !string.IsNullOrEmpty(ct) && ct.StartsWith("image/") && (ct.EndsWith("jpeg") || ct.EndsWith("png") || ct.EndsWith("gif") || ct.EndsWith("webp"));
    private static bool IsPreviewableFile(string mt) => mt.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) || mt.StartsWith("text/", StringComparison.OrdinalIgnoreCase) || mt.Equals("application/json", StringComparison.OrdinalIgnoreCase);
    private static string GetPreviewType(string mt) => mt.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : mt.StartsWith("text/") ? "text" : mt.Equals("application/json") ? "json" : "unsupported";
}