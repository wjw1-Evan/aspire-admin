using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 云存储服务实现
/// </summary>
public class CloudStorageService : ICloudStorageService
{
    private readonly IDatabaseOperationFactory<FileItem> _fileItemFactory;
    private readonly IDatabaseOperationFactory<StorageQuota> _storageQuotaFactory;
    private readonly IGridFSService _gridFSService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CloudStorageService> _logger;
    private readonly GridFSBucket _filesBucket;
    private readonly GridFSBucket _thumbnailsBucket;

    /// <summary>
    /// 初始化云存储服务
    /// </summary>
    public CloudStorageService(
        IDatabaseOperationFactory<FileItem> fileItemFactory,
        IDatabaseOperationFactory<StorageQuota> storageQuotaFactory,
        IGridFSService gridFSService,
        ITenantContext tenantContext,
        ILogger<CloudStorageService> logger)
    {
        _fileItemFactory = fileItemFactory ?? throw new ArgumentNullException(nameof(fileItemFactory));
        _storageQuotaFactory = storageQuotaFactory ?? throw new ArgumentNullException(nameof(storageQuotaFactory));
        _gridFSService = gridFSService ?? throw new ArgumentNullException(nameof(gridFSService));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _filesBucket = _gridFSService.GetBucket("cloud_storage_files");
        _thumbnailsBucket = _gridFSService.GetBucket("cloud_storage_thumbnails");
    }

    #region 文件和文件夹管理

    /// <summary>
    /// 创建文件夹
    /// </summary>
    public async Task<FileItem> CreateFolderAsync(string name, string parentId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("文件夹名称不能为空", nameof(name));

        // 验证父文件夹是否存在
        if (!string.IsNullOrEmpty(parentId))
        {
            var parentFolder = await GetFileItemAsync(parentId);
            if (parentFolder == null)
                throw new ArgumentException("父文件夹不存在", nameof(parentId));
            if (parentFolder.Type != FileItemType.Folder)
                throw new ArgumentException("父项必须是文件夹", nameof(parentId));
        }

        // 检查同名文件夹是否已存在
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var existingFilter = filterBuilder
            .Equal(f => f.Name, name)
            .Equal(f => f.ParentId, parentId)
            .Equal(f => f.Type, FileItemType.Folder)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var existingFolder = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingFolder.Count > 0)
            throw new InvalidOperationException($"文件夹 '{name}' 已存在");

        // 构建路径
        var path = await BuildFilePathAsync(name, parentId);

        var folder = new FileItem
        {
            Name = name,
            Path = path,
            ParentId = parentId,
            Type = FileItemType.Folder,
            Status = FileStatus.Active,
            Size = 0,
            MimeType = "application/x-directory"
        };

        await _fileItemFactory.CreateAsync(folder);

        _logger.LogInformation("Created folder: {FolderName} at path: {Path}", name, path);
        return folder;
    }

    /// <summary>
    /// 上传文件
    /// </summary>
    public async Task<FileItem> UploadFileAsync(IFormFile file, string parentId, bool overwrite = false)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("文件不能为空", nameof(file));

        var fileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("文件名不能为空");

        // 验证父文件夹
        if (!string.IsNullOrEmpty(parentId))
        {
            var parentFolder = await GetFileItemAsync(parentId);
            if (parentFolder == null)
                throw new ArgumentException("父文件夹不存在", nameof(parentId));
            if (parentFolder.Type != FileItemType.Folder)
                throw new ArgumentException("父项必须是文件夹", nameof(parentId));
        }

        // 检查存储配额
        await CheckStorageQuotaAsync(file.Length);

        // 计算文件哈希
        string fileHash;
        using (var stream = file.OpenReadStream())
        {
            fileHash = await ComputeFileHashAsync(stream);
        }

        // 检查是否存在同名文件
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var existingFilter = filterBuilder
            .Equal(f => f.Name, fileName)
            .Equal(f => f.ParentId, parentId)
            .Equal(f => f.Type, FileItemType.File)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var existingFile = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingFile.Count > 0 && !overwrite)
        {
            throw new InvalidOperationException($"文件 '{fileName}' 已存在，请选择覆盖或重命名");
        }

        // 检查是否存在相同哈希的文件（去重）
        var hashFilter = filterBuilder
            .Equal(f => f.Hash, fileHash)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var duplicateFiles = await _fileItemFactory.FindAsync(hashFilter, limit: 1);
        var duplicateFile = duplicateFiles.FirstOrDefault();
        string gridFSId;

        if (duplicateFile != null)
        {
            // 文件内容相同，复用GridFS文件
            gridFSId = duplicateFile.GridFSId;
            _logger.LogInformation("File content already exists, reusing GridFS file: {GridFSId}", gridFSId);
        }
        else
        {
            // 上传新文件到GridFS
            using var fileStream = file.OpenReadStream();
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            var uploadOptions = new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    ["originalName"] = fileName,
                    ["contentType"] = file.ContentType ?? "application/octet-stream",
                    ["uploadedAt"] = DateTime.UtcNow,
                    ["companyId"] = companyId ?? string.Empty,
                    ["hash"] = fileHash
                }
            };

            var objectId = await _filesBucket.UploadFromStreamAsync(fileName, fileStream, uploadOptions);
            gridFSId = objectId.ToString();
        }

        // 构建文件路径
        var filePath = await BuildFilePathAsync(fileName, parentId);

        FileItem fileItem;
        if (existingFile.Count > 0 && overwrite)
        {
            // 覆盖现有文件
            var existingFileItem = existingFile.First();
            var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
            var update = updateBuilder
                .Set(f => f.GridFSId, gridFSId)
                .Set(f => f.Size, file.Length)
                .Set(f => f.Hash, fileHash)
                .Set(f => f.MimeType, file.ContentType ?? "application/octet-stream")
                .Build();

            var updatedFileItem = await _fileItemFactory.FindOneAndUpdateAsync(
                filterBuilder.Equal(f => f.Id, existingFileItem.Id).Build(),
                update);

            if (updatedFileItem == null)
                throw new InvalidOperationException("更新文件失败");

            fileItem = updatedFileItem;
        }
        else
        {
            // 创建新文件记录
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

        // 更新存储配额
        await UpdateStorageUsageAsync(file.Length);

        _logger.LogInformation("Uploaded file: {FileName} ({FileSize} bytes) to path: {Path}",
            fileName, file.Length, filePath);

        return fileItem;
    }

    /// <summary>
    /// 获取文件项详情
    /// </summary>
    public async Task<FileItem?> GetFileItemAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        // 如果不是有效的 ObjectId，直接返回 null，避免 Mongo 驱动在序列化过滤器时抛出 FormatException
        if (!ObjectId.TryParse(id, out _))
            return null;

        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.Id, id)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var items = await _fileItemFactory.FindAsync(filter, limit: 1);
        return items.FirstOrDefault();
    }

    /// <summary>
    /// 获取文件项列表
    /// </summary>
    public async Task<PagedResult<FileItem>> GetFileItemsAsync(string parentId, FileListQuery query)
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.ParentId, parentId)
            .Equal(f => f.Status, FileStatus.Active);

        if (query.Type.HasValue)
            filter = filter.Equal(f => f.Type, query.Type.Value);

        var sortBuilder = _fileItemFactory.CreateSortBuilder();
        var sort = query.SortBy.ToLower() switch
        {
            "name" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.Name).Build()
                : sortBuilder.Ascending(f => f.Name).Build(),
            "size" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.Size).Build()
                : sortBuilder.Ascending(f => f.Size).Build(),
            "createdat" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.CreatedAt).Build()
                : sortBuilder.Ascending(f => f.CreatedAt).Build(),
            "updatedat" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.UpdatedAt).Build()
                : sortBuilder.Ascending(f => f.UpdatedAt).Build(),
            _ => sortBuilder.Ascending(f => f.Name).Build()
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(
            filter.Build(),
            sort,
            query.Page,
            query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 重命名文件或文件夹
    /// </summary>
    public async Task<FileItem> RenameFileItemAsync(string id, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("新名称不能为空", nameof(newName));

        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        // 检查同名文件是否已存在
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var existingFilter = filterBuilder
            .Equal(f => f.Name, newName)
            .Equal(f => f.ParentId, fileItem.ParentId)
            .Equal(f => f.Type, fileItem.Type)
            .Equal(f => f.Status, FileStatus.Active)
            .NotEqual(f => f.Id, id)
            .Build();

        var existingItems = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingItems.Count > 0)
            throw new InvalidOperationException($"名称 '{newName}' 已存在");

        // 更新名称和路径
        var newPath = await BuildFilePathAsync(newName, fileItem.ParentId);
        var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(f => f.Name, newName)
            .Set(f => f.Path, newPath)
            .Build();

        var updatedItem = await _fileItemFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(f => f.Id, id).Build(),
            update);

        if (updatedItem == null)
            throw new InvalidOperationException("重命名失败");

        _logger.LogInformation("Renamed file item {Id} from '{OldName}' to '{NewName}'",
            id, fileItem.Name, newName);

        return updatedItem;
    }

    /// <summary>
    /// 移动文件或文件夹
    /// </summary>
    public async Task<FileItem> MoveFileItemAsync(string id, string newParentId)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        // 验证目标父文件夹
        if (!string.IsNullOrEmpty(newParentId))
        {
            var targetParent = await GetFileItemAsync(newParentId);
            if (targetParent == null)
                throw new ArgumentException("目标文件夹不存在", nameof(newParentId));
            if (targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标必须是文件夹", nameof(newParentId));

            // 防止将文件夹移动到自己的子文件夹中
            if (fileItem.Type == FileItemType.Folder)
            {
                var isDescendant = await IsDescendantFolderAsync(id, newParentId);
                if (isDescendant)
                    throw new InvalidOperationException("不能将文件夹移动到自己的子文件夹中");
            }
        }

        // 检查目标位置是否已存在同名文件
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var existingFilter = filterBuilder
            .Equal(f => f.Name, fileItem.Name)
            .Equal(f => f.ParentId, newParentId)
            .Equal(f => f.Type, fileItem.Type)
            .Equal(f => f.Status, FileStatus.Active)
            .NotEqual(f => f.Id, id)
            .Build();

        var existingItems = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingItems.Count > 0)
            throw new InvalidOperationException($"目标位置已存在同名{(fileItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        // 更新路径
        var newPath = await BuildFilePathAsync(fileItem.Name, newParentId);
        var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(f => f.ParentId, newParentId)
            .Set(f => f.Path, newPath)
            .Build();

        var updatedItem = await _fileItemFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(f => f.Id, id).Build(),
            update);

        if (updatedItem == null)
            throw new InvalidOperationException("移动失败");

        _logger.LogInformation("Moved file item {Id} from '{OldPath}' to '{NewPath}'",
            id, fileItem.Path, newPath);

        return updatedItem;
    }

    /// <summary>
    /// 复制文件或文件夹
    /// </summary>
    public async Task<FileItem> CopyFileItemAsync(string id, string newParentId, string? newName = null)
    {
        var sourceItem = await GetFileItemAsync(id);
        if (sourceItem == null)
            throw new ArgumentException("源文件项不存在", nameof(id));

        // 验证目标父文件夹
        if (!string.IsNullOrEmpty(newParentId))
        {
            var targetParent = await GetFileItemAsync(newParentId);
            if (targetParent == null)
                throw new ArgumentException("目标文件夹不存在", nameof(newParentId));
            if (targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标必须是文件夹", nameof(newParentId));
        }

        var copyName = newName ?? $"{Path.GetFileNameWithoutExtension(sourceItem.Name)}_副本{Path.GetExtension(sourceItem.Name)}";
        var copyPath = await BuildFilePathAsync(copyName, newParentId);

        // 检查目标位置是否已存在同名文件
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var existingFilter = filterBuilder
            .Equal(f => f.Name, copyName)
            .Equal(f => f.ParentId, newParentId)
            .Equal(f => f.Type, sourceItem.Type)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var existingItems = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingItems.Count > 0)
            throw new InvalidOperationException($"目标位置已存在同名{(sourceItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        var copiedItem = new FileItem
        {
            Name = copyName,
            Path = copyPath,
            ParentId = newParentId,
            Type = sourceItem.Type,
            Size = sourceItem.Size,
            MimeType = sourceItem.MimeType,
            GridFSId = sourceItem.GridFSId, // 复用相同的GridFS文件
            Hash = sourceItem.Hash,
            Status = FileStatus.Active,
            Metadata = new Dictionary<string, object>(sourceItem.Metadata),
            Tags = new List<string>(sourceItem.Tags)
        };

        await _fileItemFactory.CreateAsync(copiedItem);

        // 如果是文件，更新存储配额
        if (sourceItem.Type == FileItemType.File)
        {
            await UpdateStorageUsageAsync(sourceItem.Size);
        }

        _logger.LogInformation("Copied file item {SourceId} to {CopyId} at path: {CopyPath}",
            id, copiedItem.Id, copyPath);

        return copiedItem;
    }

    /// <summary>
    /// 删除文件或文件夹（移动到回收站）
    /// </summary>
    public async Task DeleteFileItemAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项不存在", nameof(id));

        var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(f => f.Status, FileStatus.InRecycleBin)
            .Build();

        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        await _fileItemFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(f => f.Id, id).Build(),
            update);

        _logger.LogInformation("Moved file item {Id} to recycle bin: {Name}", id, fileItem.Name);
    }

    /// <summary>
    /// 永久删除文件或文件夹
    /// </summary>
    public async Task PermanentDeleteFileItemAsync(string id)
    {
        // 非法的 ObjectId 直接视为不存在
        if (string.IsNullOrWhiteSpace(id) || !ObjectId.TryParse(id, out _))
            throw new ArgumentException("文件项不存在", nameof(id));

        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
        {
            // 检查回收站中的文件
            var filterBuilder = _fileItemFactory.CreateFilterBuilder();
            var recycleBinFilter = filterBuilder
                .Equal(f => f.Id, id)
                .Equal(f => f.Status, FileStatus.InRecycleBin)
                .Build();

            var recycleBinItems = await _fileItemFactory.FindAsync(recycleBinFilter, limit: 1);
            if (recycleBinItems.Count == 0)
                throw new ArgumentException("文件项不存在", nameof(id));

            fileItem = recycleBinItems.First();
        }

        // 软删除文件记录
        await _fileItemFactory.FindOneAndSoftDeleteAsync(
            _fileItemFactory.CreateFilterBuilder().Equal(f => f.Id, id).Build());

        // 如果是文件，更新存储配额
        if (fileItem.Type == FileItemType.File)
        {
            await UpdateStorageUsageAsync(-fileItem.Size);
        }

        _logger.LogInformation("Permanently deleted file item {Id}: {Name}", id, fileItem.Name);
    }

    /// <summary>
    /// 从回收站恢复文件或文件夹
    /// </summary>
    public async Task<FileItem> RestoreFileItemAsync(string id, string? newParentId = null)
    {
        // 非法的 ObjectId 直接视为回收站中不存在该文件项
        if (string.IsNullOrWhiteSpace(id) || !ObjectId.TryParse(id, out _))
            throw new ArgumentException("回收站中不存在该文件项", nameof(id));

        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var recycleBinFilter = filterBuilder
            .Equal(f => f.Id, id)
            .Equal(f => f.Status, FileStatus.InRecycleBin)
            .Build();

        var recycleBinItems = await _fileItemFactory.FindAsync(recycleBinFilter, limit: 1);
        if (recycleBinItems.Count == 0)
            throw new ArgumentException("回收站中不存在该文件项", nameof(id));

        var fileItem = recycleBinItems.First();
        var targetParentId = newParentId ?? fileItem.ParentId;

        // 验证目标父文件夹
        if (!string.IsNullOrEmpty(targetParentId))
        {
            var targetParent = await GetFileItemAsync(targetParentId);
            if (targetParent == null)
                throw new ArgumentException("目标文件夹不存在", nameof(newParentId));
            if (targetParent.Type != FileItemType.Folder)
                throw new ArgumentException("目标必须是文件夹", nameof(newParentId));
        }

        // 检查目标位置是否已存在同名文件
        var existingFilter = filterBuilder
            .Equal(f => f.Name, fileItem.Name)
            .Equal(f => f.ParentId, targetParentId)
            .Equal(f => f.Type, fileItem.Type)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var existingItems = await _fileItemFactory.FindAsync(existingFilter, limit: 1);
        if (existingItems.Count > 0)
            throw new InvalidOperationException($"目标位置已存在同名{(fileItem.Type == FileItemType.File ? "文件" : "文件夹")}");

        // 更新状态和路径
        var newPath = await BuildFilePathAsync(fileItem.Name, targetParentId);
        var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Set(f => f.Status, FileStatus.Active)
            .Set(f => f.ParentId, targetParentId)
            .Set(f => f.Path, newPath)
            .Build();

        var restoredItem = await _fileItemFactory.FindOneAndUpdateAsync(
            filterBuilder.Equal(f => f.Id, id).Build(),
            update);

        if (restoredItem == null)
            throw new InvalidOperationException("恢复失败");

        _logger.LogInformation("Restored file item {Id} from recycle bin to path: {Path}",
            id, newPath);

        return restoredItem;
    }

    #endregion

    #region 文件下载和预览

    /// <summary>
    /// 下载文件
    /// </summary>
    public async Task<Stream> DownloadFileAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        if (fileItem.Type != FileItemType.File)
            throw new InvalidOperationException("只能下载文件");

        if (string.IsNullOrEmpty(fileItem.GridFSId))
            throw new InvalidOperationException("文件内容不存在");

        if (!ObjectId.TryParse(fileItem.GridFSId, out var gridFSId))
            throw new InvalidOperationException("文件标识格式不正确");

        try
        {
            var downloadStream = await _filesBucket.OpenDownloadStreamAsync(gridFSId);

            // 更新下载次数和最后访问时间
            var updateBuilder = _fileItemFactory.CreateUpdateBuilder();
            var update = updateBuilder
                .Inc(f => f.DownloadCount, 1)
                .Set(f => f.LastAccessedAt, DateTime.UtcNow)
                .Build();

            var filterBuilder = _fileItemFactory.CreateFilterBuilder();
            await _fileItemFactory.FindOneAndUpdateAsync(
                filterBuilder.Equal(f => f.Id, id).Build(),
                update);

            return downloadStream;
        }
        catch (GridFSFileNotFoundException)
        {
            throw new InvalidOperationException("文件内容不存在或已被删除");
        }
    }

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    public async Task<Stream> GetThumbnailAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        if (string.IsNullOrEmpty(fileItem.ThumbnailGridFSId))
            throw new InvalidOperationException("缩略图不存在");

        if (!ObjectId.TryParse(fileItem.ThumbnailGridFSId, out var thumbnailId))
            throw new InvalidOperationException("缩略图标识格式不正确");

        try
        {
            return await _thumbnailsBucket.OpenDownloadStreamAsync(thumbnailId);
        }
        catch (GridFSFileNotFoundException)
        {
            throw new InvalidOperationException("缩略图不存在或已被删除");
        }
    }

    /// <summary>
    /// 获取文件预览信息
    /// </summary>
    public async Task<FilePreviewInfo> GetPreviewInfoAsync(string id)
    {
        var fileItem = await GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(id));

        var previewInfo = new FilePreviewInfo
        {
            FileId = id,
            IsPreviewable = IsPreviewableFile(fileItem.MimeType),
            PreviewType = GetPreviewType(fileItem.MimeType),
            PreviewUrl = $"/api/cloud-storage/files/{id}/preview",
            ThumbnailUrl = !string.IsNullOrEmpty(fileItem.ThumbnailGridFSId)
                ? $"/api/cloud-storage/files/{id}/thumbnail"
                : string.Empty
        };

        return previewInfo;
    }

    #endregion

    #region 搜索和筛选

    /// <summary>
    /// 搜索文件
    /// </summary>
    public async Task<PagedResult<FileItem>> SearchFilesAsync(FileSearchQuery query)
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(f => f.Status, FileStatus.Active);

        // 关键词搜索
        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            filter = filter.Contains(f => f.Name, query.Keyword);
        }

        // 文件类型筛选
        if (query.Type.HasValue)
            filter = filter.Equal(f => f.Type, query.Type.Value);

        // MIME类型筛选
        if (!string.IsNullOrWhiteSpace(query.MimeType))
            filter = filter.Equal(f => f.MimeType, query.MimeType);

        // 文件大小筛选
        if (query.MinSize.HasValue)
            filter = filter.GreaterThanOrEqual(f => f.Size, query.MinSize.Value);
        if (query.MaxSize.HasValue)
            filter = filter.LessThanOrEqual(f => f.Size, query.MaxSize.Value);

        // 时间范围筛选
        if (query.CreatedAfter.HasValue)
            filter = filter.GreaterThanOrEqual(f => f.CreatedAt, query.CreatedAfter.Value);
        if (query.CreatedBefore.HasValue)
            filter = filter.LessThanOrEqual(f => f.CreatedAt, query.CreatedBefore.Value);

        if (query.ModifiedAfter.HasValue)
            filter = filter.GreaterThanOrEqual(f => f.UpdatedAt, query.ModifiedAfter.Value);
        if (query.ModifiedBefore.HasValue)
            filter = filter.LessThanOrEqual(f => f.UpdatedAt, query.ModifiedBefore.Value);

        // 标签筛选 - 暂时跳过，需要更复杂的查询
        // if (query.Tags.Count > 0)
        // {
        //     // TODO: 实现标签筛选
        // }

        var sortBuilder = _fileItemFactory.CreateSortBuilder();
        var sort = query.SortBy.ToLower() switch
        {
            "name" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.Name).Build()
                : sortBuilder.Ascending(f => f.Name).Build(),
            "size" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.Size).Build()
                : sortBuilder.Ascending(f => f.Size).Build(),
            "createdat" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.CreatedAt).Build()
                : sortBuilder.Ascending(f => f.CreatedAt).Build(),
            "updatedat" => query.SortOrder.ToLower() == "desc"
                ? sortBuilder.Descending(f => f.UpdatedAt).Build()
                : sortBuilder.Ascending(f => f.UpdatedAt).Build(),
            _ => sortBuilder.Ascending(f => f.Name).Build()
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(
            filter.Build(),
            sort,
            query.Page,
            query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 获取最近访问的文件
    /// </summary>
    public async Task<List<FileItem>> GetRecentFilesAsync(int count = 10)
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.Type, FileItemType.File)
            .Equal(f => f.Status, FileStatus.Active)
            .NotEqual(f => f.LastAccessedAt, null)
            .Build();

        var sortBuilder = _fileItemFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(f => f.LastAccessedAt).Build();

        var items = await _fileItemFactory.FindAsync(filter, sort, count);
        return items;
    }

    /// <summary>
    /// 搜索文件内容
    /// </summary>
    public async Task<PagedResult<FileItem>> SearchByContentAsync(string keyword, FileContentSearchQuery query)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            throw new ArgumentException("搜索关键词不能为空", nameof(keyword));

        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.Type, FileItemType.File)
            .Equal(f => f.Status, FileStatus.Active);

        // 只搜索文本类型的文件
        var textMimeTypes = new[]
        {
            "text/plain", "text/html", "text/css", "text/javascript", "text/xml",
            "application/json", "application/xml", "application/javascript"
        };

        if (query.FileTypes.Count > 0)
        {
            // 用户指定了文件类型
            var allowedTypes = query.FileTypes.Where(t => textMimeTypes.Contains(t.ToLowerInvariant())).ToList();
            if (allowedTypes.Count > 0)
            {
                filter = filter.In(f => f.MimeType, allowedTypes);
            }
            else
            {
                // 用户指定的文件类型都不支持内容搜索
                return new PagedResult<FileItem>
                {
                    Data = [],
                    Total = 0,
                    Page = query.Page,
                    PageSize = query.PageSize
                };
            }
        }
        else
        {
            // 默认搜索所有支持的文本类型
            filter = filter.In(f => f.MimeType, textMimeTypes);
        }

        // 文件大小限制（避免搜索过大的文件）
        var maxSearchFileSize = query.MaxFileSize ?? 10 * 1024 * 1024; // 默认10MB
        filter = filter.LessThanOrEqual(f => f.Size, maxSearchFileSize);

        var sortBuilder = _fileItemFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(f => f.UpdatedAt).Build();

        var (allFiles, total) = await _fileItemFactory.FindPagedAsync(
            filter.Build(),
            sort,
            1, // 先获取所有文件，然后在内存中搜索内容
            1000); // 限制搜索范围

        var matchedFiles = new List<FileItem>();

        // 在文件内容中搜索关键词
        foreach (var file in allFiles)
        {
            if (matchedFiles.Count >= query.PageSize * query.Page)
                break;

            try
            {
                if (!ObjectId.TryParse(file.GridFSId, out var gridFSId))
                    continue;

                using var stream = await _filesBucket.OpenDownloadStreamAsync(gridFSId);
                using var reader = new StreamReader(stream, Encoding.UTF8);

                var content = await reader.ReadToEndAsync();
                if (content.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    matchedFiles.Add(file);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to search content in file {FileId}: {FileName}",
                    file.Id, file.Name);
                // 继续搜索其他文件
            }
        }

        // 分页处理
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

    #endregion

    #region 回收站管理

    /// <summary>
    /// 获取回收站文件列表
    /// </summary>
    public async Task<PagedResult<FileItem>> GetRecycleBinItemsAsync(RecycleBinQuery query)
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(f => f.Status, FileStatus.InRecycleBin);

        if (query.Type.HasValue)
            filter = filter.Equal(f => f.Type, query.Type.Value);

        if (query.DeletedAfter.HasValue)
            filter = filter.GreaterThanOrEqual(f => f.DeletedAt, query.DeletedAfter.Value);
        if (query.DeletedBefore.HasValue)
            filter = filter.LessThanOrEqual(f => f.DeletedAt, query.DeletedBefore.Value);

        var sortBuilder = _fileItemFactory.CreateSortBuilder();
        var isDescending = query.SortOrder.ToLower() == "desc";
        var sort = query.SortBy.ToLower() switch
        {
            "name" => isDescending
                ? sortBuilder.Descending(f => f.Name).Build()
                : sortBuilder.Ascending(f => f.Name).Build(),
            "deletedat" => isDescending
                ? sortBuilder.Descending(f => f.DeletedAt).Build()
                : sortBuilder.Ascending(f => f.DeletedAt).Build(),
            "size" => isDescending
                ? sortBuilder.Descending(f => f.Size).Build()
                : sortBuilder.Ascending(f => f.Size).Build(),
            "type" => isDescending
                ? sortBuilder.Descending(f => f.Type).Build()
                : sortBuilder.Ascending(f => f.Type).Build(),
            "createdat" => isDescending
                ? sortBuilder.Descending(f => f.CreatedAt).Build()
                : sortBuilder.Ascending(f => f.CreatedAt).Build(),
            _ => sortBuilder.Descending(f => f.DeletedAt).Build() // 默认按删除时间降序
        };

        var (items, total) = await _fileItemFactory.FindPagedAsync(
            filter.Build(),
            sort,
            query.Page,
            query.PageSize);

        return new PagedResult<FileItem>
        {
            Data = items,
            Total = (int)total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 清空回收站
    /// </summary>
    public async Task EmptyRecycleBinAsync()
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(f => f.Status, FileStatus.InRecycleBin).Build();

        // 获取所有回收站文件以计算释放的存储空间
        var recycleBinItems = await _fileItemFactory.FindAsync(filter);
        var totalSize = recycleBinItems.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        var itemIds = recycleBinItems.Select(item => item.Id).ToList();

        // 软删除所有回收站文件
        if (itemIds.Count > 0)
        {
            await _fileItemFactory.SoftDeleteManyAsync(itemIds);
        }

        // 更新存储配额
        if (totalSize > 0)
        {
            await UpdateStorageUsageAsync(-totalSize);
        }

        _logger.LogInformation("Emptied recycle bin, freed {TotalSize} bytes from {ItemCount} items",
            totalSize, recycleBinItems.Count);
    }

    /// <summary>
    /// 清理过期的回收站文件
    /// </summary>
    public async Task CleanupExpiredRecycleBinItemsAsync(int expireDays = 30)
    {
        var expireDate = DateTime.UtcNow.AddDays(-expireDays);

        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.Status, FileStatus.InRecycleBin)
            .LessThan(f => f.DeletedAt, expireDate)
            .Build();

        var expiredItems = await _fileItemFactory.FindAsync(filter);
        var totalSize = expiredItems.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);
        var itemIds = expiredItems.Select(item => item.Id).ToList();

        if (itemIds.Count > 0)
        {
            await _fileItemFactory.SoftDeleteManyAsync(itemIds);

            // 更新存储配额
            if (totalSize > 0)
            {
                await UpdateStorageUsageAsync(-totalSize);
            }

            _logger.LogInformation("Cleaned up {ItemCount} expired recycle bin items, freed {TotalSize} bytes",
                itemIds.Count, totalSize);
        }
    }

    #endregion

    #region 存储统计

    /// <summary>
    /// 获取存储使用情况
    /// </summary>
    public async Task<StorageUsageInfo> GetStorageUsageAsync(string? userId = null)
    {
        var targetUserId = userId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(targetUserId))
            throw new InvalidOperationException("用户ID不能为空");

        var quota = await GetOrCreateStorageQuotaAsync(targetUserId);

        // 统计文件和文件夹数量
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var activeFilter = filterBuilder.Equal(f => f.Status, FileStatus.Active).Build();

        var allItems = await _fileItemFactory.FindAsync(activeFilter);
        var files = allItems.Where(f => f.Type == FileItemType.File).ToList();
        var folders = allItems.Where(f => f.Type == FileItemType.Folder).ToList();

        // 按文件类型统计使用量
        var typeUsage = files
            .GroupBy(f => GetFileTypeCategory(f.MimeType))
            .ToDictionary(g => g.Key, g => g.Sum(f => f.Size));

        return new StorageUsageInfo
        {
            UserId = targetUserId,
            TotalQuota = quota.TotalQuota,
            UsedSpace = quota.UsedSpace,
            FileCount = files.Count,
            FolderCount = folders.Count,
            TypeUsage = typeUsage,
            LastUpdatedAt = quota.LastCalculatedAt
        };
    }

    #endregion

    #region 高级文件操作

    /// <summary>
    /// 批量上传文件
    /// </summary>
    public async Task<List<FileItem>> UploadMultipleFilesAsync(IList<IFormFile> files, string parentId, FileConflictResolution conflictResolution = FileConflictResolution.Rename)
    {
        if (files == null || files.Count == 0)
            throw new ArgumentException("文件列表不能为空", nameof(files));

        var results = new List<FileItem>();
        var totalSize = files.Sum(f => f.Length);

        // 检查总存储配额
        await CheckStorageQuotaAsync(totalSize);

        foreach (var file in files)
        {
            try
            {
                var fileName = Path.GetFileName(file.FileName);
                if (string.IsNullOrWhiteSpace(fileName))
                    continue;

                // 处理文件名冲突
                var finalFileName = fileName;
                var overwrite = false;

                switch (conflictResolution)
                {
                    case FileConflictResolution.Overwrite:
                        overwrite = true;
                        break;
                    case FileConflictResolution.Rename:
                        finalFileName = await GetUniqueFileNameAsync(fileName, parentId);
                        break;
                    case FileConflictResolution.Skip:
                        if (await FileExistsAsync(fileName, parentId))
                            continue;
                        break;
                }

                // 创建临时文件用于上传
                var tempFile = new FormFileWrapper(file, finalFileName);
                var uploadedFile = await UploadFileAsync(tempFile, parentId, overwrite);
                results.Add(uploadedFile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload file: {FileName}", file.FileName);
                // 继续上传其他文件
            }
        }

        return results;
    }

    /// <summary>
    /// 下载文件夹为ZIP
    /// </summary>
    public async Task<Stream> DownloadFolderAsZipAsync(string folderId)
    {
        var folder = await GetFileItemAsync(folderId);
        if (folder == null)
            throw new ArgumentException("文件夹不存在", nameof(folderId));

        if (folder.Type != FileItemType.Folder)
            throw new InvalidOperationException("只能下载文件夹");

        var memoryStream = new MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(memoryStream, System.IO.Compression.ZipArchiveMode.Create, true))
        {
            await AddFolderToZipAsync(archive, folder, "");
        }

        memoryStream.Position = 0;
        return memoryStream;
    }

    /// <summary>
    /// 检查是否支持批量上传
    /// </summary>
    public async Task<bool> SupportsBatchUploadAsync()
    {
        // 这里可以根据系统配置或用户权限来决定
        await Task.CompletedTask;
        return true;
    }

    /// <summary>
    /// 检查是否支持断点续传
    /// </summary>
    public async Task<bool> SupportsResumeUploadAsync()
    {
        // 这里可以根据系统配置来决定
        await Task.CompletedTask;
        return false; // 暂时不支持断点续传
    }

    #endregion

    #region 批量操作

    /// <summary>
    /// 批量删除文件项
    /// </summary>
    public async Task<BatchOperationResult> BatchDeleteAsync(List<string> ids)
    {
        var result = new BatchOperationResult
        {
            Total = ids.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var id in ids)
        {
            try
            {
                await DeleteFileItemAsync(id);
                result.SuccessIds.Add(id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = id,
                    ErrorCode = "DELETE_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取回收站统计信息
    /// </summary>
    public async Task<RecycleStatistics> GetRecycleStatisticsAsync()
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(f => f.Status, FileStatus.InRecycleBin).Build();

        var items = await _fileItemFactory.FindAsync(filter);

        var totalItems = items.Count;
        var totalSize = items.Where(f => f.Type == FileItemType.File).Sum(f => f.Size);

        var itemsByDate = items
            .GroupBy(f => ((DateTime?)f.DeletedAt ?? (DateTime?)f.UpdatedAt ?? (DateTime?)f.CreatedAt ?? DateTime.UtcNow).Date)
            .Select(g => new RecycleStatisticsItem
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Count = g.Count(),
                Size = g.Where(f => f.Type == FileItemType.File).Sum(f => f.Size)
            })
            .OrderByDescending(g => g.Date)
            .ToList();

        return new RecycleStatistics
        {
            TotalItems = totalItems,
            TotalSize = totalSize,
            ItemsByDate = itemsByDate
        };
    }

    /// <summary>
    /// 批量移动文件项
    /// </summary>
    public async Task<BatchOperationResult> BatchMoveAsync(List<string> ids, string targetParentId)
    {
        var result = new BatchOperationResult
        {
            Total = ids.Count,
            StartTime = DateTime.UtcNow
        };

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
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = id,
                    ErrorCode = "MOVE_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 批量复制文件项
    /// </summary>
    public async Task<BatchOperationResult> BatchCopyAsync(List<string> ids, string targetParentId)
    {
        var result = new BatchOperationResult
        {
            Total = ids.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var id in ids)
        {
            try
            {
                var copiedItem = await CopyFileItemAsync(id, targetParentId);
                result.SuccessIds.Add(copiedItem.Id);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = id,
                    ErrorCode = "COPY_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    #endregion

    #region 私有辅助方法

    /// <summary>
    /// 构建文件路径
    /// </summary>
    private async Task<string> BuildFilePathAsync(string name, string parentId)
    {
        if (string.IsNullOrEmpty(parentId))
            return $"/{name}";

        var parent = await GetFileItemAsync(parentId);
        if (parent == null)
            return $"/{name}";

        return $"{parent.Path.TrimEnd('/')}/{name}";
    }

    /// <summary>
    /// 计算文件哈希值
    /// </summary>
    private static async Task<string> ComputeFileHashAsync(Stream stream)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = await sha256.ComputeHashAsync(stream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// 检查存储配额
    /// </summary>
    private async Task CheckStorageQuotaAsync(long fileSize)
    {
        var currentUserId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new InvalidOperationException("用户未登录");

        var quota = await GetOrCreateStorageQuotaAsync(currentUserId);
        if (quota.UsedSpace + fileSize > quota.TotalQuota)
        {
            throw new InvalidOperationException($"存储空间不足，需要 {fileSize} 字节，可用 {quota.TotalQuota - quota.UsedSpace} 字节");
        }
    }

    /// <summary>
    /// 更新存储使用量
    /// </summary>
    private async Task UpdateStorageUsageAsync(long sizeChange)
    {
        var currentUserId = _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
            return;

        var filterBuilder = _storageQuotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(q => q.UserId, currentUserId).Build();

        var updateBuilder = _storageQuotaFactory.CreateUpdateBuilder();
        var update = updateBuilder
            .Inc(q => q.UsedSpace, sizeChange)
            .Set(q => q.LastCalculatedAt, DateTime.UtcNow)
            .Build();

        await _storageQuotaFactory.FindOneAndUpdateAsync(filter, update);
    }

    /// <summary>
    /// 获取或创建存储配额
    /// </summary>
    private async Task<StorageQuota> GetOrCreateStorageQuotaAsync(string userId)
    {
        var filterBuilder = _storageQuotaFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(q => q.UserId, userId).Build();

        var quotas = await _storageQuotaFactory.FindAsync(filter, limit: 1);
        var quota = quotas.FirstOrDefault();

        if (quota == null)
        {
            quota = new StorageQuota
            {
                UserId = userId,
                TotalQuota = 10L * 1024 * 1024 * 1024, // 默认10GB
                UsedSpace = 0,
                FileCount = 0,
                LastCalculatedAt = DateTime.UtcNow
            };

            await _storageQuotaFactory.CreateAsync(quota);
        }

        return quota;
    }

    /// <summary>
    /// 检查是否为子文件夹
    /// </summary>
    private async Task<bool> IsDescendantFolderAsync(string ancestorId, string descendantId)
    {
        var current = await GetFileItemAsync(descendantId);
        while (current != null && !string.IsNullOrEmpty(current.ParentId))
        {
            if (current.ParentId == ancestorId)
                return true;
            current = await GetFileItemAsync(current.ParentId);
        }
        return false;
    }

    /// <summary>
    /// 判断文件是否可预览
    /// </summary>
    private static bool IsPreviewableFile(string mimeType)
    {
        var previewableMimeTypes = new[]
        {
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            "application/pdf",
            "text/plain", "text/html", "text/css", "text/javascript",
            "application/json", "application/xml",
            "video/mp4", "video/webm", "video/ogg",
            "audio/mp3", "audio/wav", "audio/ogg"
        };

        return previewableMimeTypes.Contains(mimeType.ToLowerInvariant());
    }

    /// <summary>
    /// 获取预览类型
    /// </summary>
    private static string GetPreviewType(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            var mime when mime.StartsWith("image/") => "image",
            "application/pdf" => "pdf",
            var mime when mime.StartsWith("text/") => "text",
            var mime when mime.StartsWith("video/") => "video",
            var mime when mime.StartsWith("audio/") => "audio",
            _ => "unknown"
        };
    }

    /// <summary>
    /// 获取文件类型分类
    /// </summary>
    private static string GetFileTypeCategory(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            var mime when mime.StartsWith("image/") => "图片",
            var mime when mime.StartsWith("video/") => "视频",
            var mime when mime.StartsWith("audio/") => "音频",
            var mime when mime.StartsWith("text/") => "文本",
            "application/pdf" => "PDF",
            var mime when mime.Contains("document") || mime.Contains("word") => "文档",
            var mime when mime.Contains("spreadsheet") || mime.Contains("excel") => "表格",
            var mime when mime.Contains("presentation") || mime.Contains("powerpoint") => "演示文稿",
            _ => "其他"
        };
    }

    /// <summary>
    /// 获取唯一文件名（处理重名冲突）
    /// </summary>
    private async Task<string> GetUniqueFileNameAsync(string originalName, string parentId)
    {
        var baseName = Path.GetFileNameWithoutExtension(originalName);
        var extension = Path.GetExtension(originalName);
        var counter = 1;
        var newName = originalName;

        while (await FileExistsAsync(newName, parentId))
        {
            newName = $"{baseName}({counter}){extension}";
            counter++;
        }

        return newName;
    }

    /// <summary>
    /// 检查文件是否存在
    /// </summary>
    private async Task<bool> FileExistsAsync(string fileName, string parentId)
    {
        var filterBuilder = _fileItemFactory.CreateFilterBuilder();
        var filter = filterBuilder
            .Equal(f => f.Name, fileName)
            .Equal(f => f.ParentId, parentId)
            .Equal(f => f.Status, FileStatus.Active)
            .Build();

        var existingFiles = await _fileItemFactory.FindAsync(filter, limit: 1);
        return existingFiles.Count > 0;
    }

    /// <summary>
    /// 递归添加文件夹到ZIP
    /// </summary>
    private async Task AddFolderToZipAsync(System.IO.Compression.ZipArchive archive, FileItem folder, string basePath)
    {
        var folderPath = string.IsNullOrEmpty(basePath) ? folder.Name : $"{basePath}/{folder.Name}";

        // 获取文件夹中的所有项目
        var query = new FileListQuery { Page = 1, PageSize = 1000 };
        var items = await GetFileItemsAsync(folder.Id, query);

        foreach (var item in items.Data)
        {
            if (item.Type == FileItemType.File)
            {
                // 添加文件到ZIP
                var filePath = $"{folderPath}/{item.Name}";
                var entry = archive.CreateEntry(filePath);

                try
                {
                    using var entryStream = entry.Open();
                    using var fileStream = await DownloadFileAsync(item.Id);
                    await fileStream.CopyToAsync(entryStream);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to add file {FileName} to ZIP", item.Name);
                }
            }
            else if (item.Type == FileItemType.Folder)
            {
                // 递归添加子文件夹
                await AddFolderToZipAsync(archive, item, folderPath);
            }
        }
    }

    #endregion
}

/// <summary>
/// 文件冲突解决策略
/// </summary>
public enum FileConflictResolution
{
    /// <summary>覆盖现有文件</summary>
    Overwrite,
    /// <summary>重命名新文件</summary>
    Rename,
    /// <summary>跳过冲突文件</summary>
    Skip
}

/// <summary>
/// FormFile包装器，用于修改文件名
/// </summary>
internal class FormFileWrapper : IFormFile
{
    private readonly IFormFile _innerFile;
    private readonly string _fileName;

    public FormFileWrapper(IFormFile innerFile, string fileName)
    {
        _innerFile = innerFile;
        _fileName = fileName;
    }

    public string ContentType => _innerFile.ContentType;
    public string ContentDisposition => _innerFile.ContentDisposition;
    public IHeaderDictionary Headers => _innerFile.Headers;
    public long Length => _innerFile.Length;
    public string Name => _innerFile.Name;
    public string FileName => _fileName;

    public void CopyTo(Stream target) => _innerFile.CopyTo(target);
    public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default) => _innerFile.CopyToAsync(target, cancellationToken);
    public Stream OpenReadStream() => _innerFile.OpenReadStream();
}
