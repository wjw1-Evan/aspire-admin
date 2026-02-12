using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件版本控制服务实现
/// </summary>
public class FileVersionService : IFileVersionService
{
    private readonly IDataFactory<FileVersion> _versionFactory;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<FileVersionService> _logger;

    /// <summary>
    /// 初始化文件版本控制服务
    /// </summary>
    public FileVersionService(
        IDataFactory<FileVersion> versionFactory,
        ICloudStorageService cloudStorageService,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext,
        ILogger<FileVersionService> logger)
    {
        _versionFactory = versionFactory ?? throw new ArgumentNullException(nameof(versionFactory));
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _fileStorageFactory = fileStorageFactory ?? throw new ArgumentNullException(nameof(fileStorageFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建文件版本
    /// </summary>
    public async Task<FileVersion> CreateVersionAsync(string fileItemId, IFormFile file, string? comment = null)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        if (file == null || file.Length == 0)
            throw new ArgumentException("文件不能为空", nameof(file));

        // 验证文件是否存在
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        if (fileItem.Type != FileItemType.File)
            throw new InvalidOperationException("只能为文件创建版本");

        // 计算文件哈希
        string fileHash;
        using (var stream = file.OpenReadStream())
        {
            fileHash = await ComputeFileHashAsync(stream);
        }

        // 检查是否与当前版本相同
        var currentVersion = await GetCurrentVersionAsync(fileItemId);
        if (currentVersion != null && currentVersion.Hash == fileHash)
        {
            throw new InvalidOperationException("文件内容与当前版本相同，无需创建新版本");
        }

        // 获取下一个版本号
        var nextVersionNumber = await GetNextVersionNumberAsync(fileItemId);

        // 上传文件到存储
        string gridFSId;
        using (var fileStream = file.OpenReadStream())
        {
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            var metadata = new Dictionary<string, object>
            {
                ["originalName"] = file.FileName,
                ["contentType"] = file.ContentType ?? "application/octet-stream",
                ["uploadedAt"] = DateTime.UtcNow,
                ["companyId"] = companyId ?? string.Empty,
                ["hash"] = fileHash,
                ["fileItemId"] = fileItemId,
                ["versionNumber"] = nextVersionNumber
            };

            gridFSId = await _fileStorageFactory.UploadAsync(
                fileStream,
                file.FileName,
                file.ContentType,
                metadata,
                "cloud_storage_files");
        }

        // 将之前的当前版本标记为非当前版本
        if (currentVersion != null)
        {
            await SetVersionAsNonCurrentAsync(currentVersion.Id);
        }

        // 创建新版本记录
        var version = new FileVersion
        {
            FileItemId = fileItemId,
            VersionNumber = nextVersionNumber,
            GridFSId = gridFSId,
            Size = file.Length,
            Hash = fileHash,
            Comment = comment ?? string.Empty,
            IsCurrentVersion = true
        };

        await _versionFactory.CreateAsync(version);

        // 清理过期版本（保留最新10个版本）
        _ = Task.Run(async () =>
        {
            try
            {
                await CleanupOldVersionsAsync(fileItemId, 10);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cleanup old versions for file {FileItemId}", fileItemId);
            }
        });

        _logger.LogInformation("Created version {VersionNumber} for file {FileItemId}", nextVersionNumber, fileItemId);
        return version;
    }

    /// <summary>
    /// 获取文件版本历史
    /// </summary>
    public async Task<List<FileVersion>> GetVersionHistoryAsync(string fileItemId)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        var versions = await _versionFactory.FindAsync(
            v => v.FileItemId == fileItemId,
            query => query.OrderByDescending(v => v.VersionNumber));
        return versions;
    }

    /// <summary>
    /// 获取版本详情
    /// </summary>
    public async Task<FileVersion?> GetVersionAsync(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            return null;

        return await _versionFactory.GetByIdAsync(versionId);
    }

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    public async Task<FileVersion> RestoreVersionAsync(string fileItemId, int versionNumber)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        // 验证文件是否存在
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        // 查找指定版本
        var targetVersion = await _versionFactory.FindAsync(
            v => v.FileItemId == fileItemId && v.VersionNumber == versionNumber,
            limit: 1);
        var version = targetVersion.FirstOrDefault();

        if (version == null)
            throw new ArgumentException($"版本 {versionNumber} 不存在", nameof(versionNumber));

        // 获取当前版本
        var currentVersion = await GetCurrentVersionAsync(fileItemId);
        if (currentVersion != null && currentVersion.VersionNumber == versionNumber)
        {
            throw new InvalidOperationException("指定版本已经是当前版本");
        }

        // 将当前版本标记为非当前版本
        if (currentVersion != null)
        {
            await SetVersionAsNonCurrentAsync(currentVersion.Id);
        }

        // 将目标版本标记为当前版本
        var updatedVersion = await _versionFactory.UpdateAsync(version.Id, v =>
        {
            v.IsCurrentVersion = true;
        });

        if (updatedVersion == null)
            throw new InvalidOperationException("恢复版本失败");

        _logger.LogInformation("Restored file {FileItemId} to version {VersionNumber}", fileItemId, versionNumber);
        return updatedVersion;
    }

    /// <summary>
    /// 删除指定版本
    /// </summary>
    public async Task DeleteVersionAsync(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            throw new ArgumentException("版本ID不能为空", nameof(versionId));

        var version = await GetVersionAsync(versionId);
        if (version == null)
            throw new ArgumentException("版本不存在", nameof(versionId));

        // 不允许删除当前版本
        if (version.IsCurrentVersion)
        {
            throw new InvalidOperationException("不能删除当前版本");
        }

        // 验证当前用户是否有权限删除版本
        var currentUserId = _tenantContext.GetCurrentUserId();
        if (version.CreatedBy != currentUserId)
        {
            // 检查是否是文件所有者
            var fileItem = await _cloudStorageService.GetFileItemAsync(version.FileItemId);
            if (fileItem?.CreatedBy != currentUserId)
            {
                throw new UnauthorizedAccessException("无权限删除此版本");
            }
        }

        // 软删除版本记录
        await _versionFactory.SoftDeleteAsync(versionId);

        _logger.LogInformation("Deleted version {VersionId}", versionId);
    }

    /// <summary>
    /// 下载指定版本的文件
    /// </summary>
    public async Task<Stream> DownloadVersionAsync(string versionId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null)
            throw new ArgumentException("版本不存在", nameof(versionId));

        if (string.IsNullOrEmpty(version.GridFSId))
            throw new InvalidOperationException("版本文件内容不存在");

        try
        {
            var bytes = await _fileStorageFactory.DownloadAsBytesAsync(version.GridFSId, "cloud_storage_files");
            return new MemoryStream(bytes);
        }
        catch
        {
            throw new InvalidOperationException("版本文件内容不存在或已被删除");
        }
    }

    /// <summary>
    /// 比较两个版本的差异
    /// </summary>
    public async Task<FileVersionComparison> CompareVersionsAsync(string versionId1, string versionId2)
    {
        var version1 = await GetVersionAsync(versionId1);
        var version2 = await GetVersionAsync(versionId2);

        if (version1 == null)
            throw new ArgumentException("版本1不存在", nameof(versionId1));

        if (version2 == null)
            throw new ArgumentException("版本2不存在", nameof(versionId2));

        if (version1.FileItemId != version2.FileItemId)
            throw new InvalidOperationException("只能比较同一文件的不同版本");

        var comparison = new FileVersionComparison
        {
            Version1Id = versionId1,
            Version2Id = versionId2,
            Version1 = version1,
            Version2 = version2,
            HasDifferences = version1.Hash != version2.Hash,
            ComparisonType = "hash"
        };

        // 如果是文本文件，尝试进行内容比较
        var fileItem = await _cloudStorageService.GetFileItemAsync(version1.FileItemId);
        if (fileItem != null && IsTextFile(fileItem.MimeType))
        {
            try
            {
                var content1 = await GetVersionContentAsTextAsync(version1);
                var content2 = await GetVersionContentAsTextAsync(version2);

                if (content1 != null && content2 != null)
                {
                    comparison.DiffContent = GenerateTextDiff(content1, content2);
                    comparison.ComparisonType = "text";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to compare text content for versions {Version1} and {Version2}", versionId1, versionId2);
            }
        }

        return comparison;
    }

    /// <summary>
    /// 获取文件的当前版本
    /// </summary>
    public async Task<FileVersion?> GetCurrentVersionAsync(string fileItemId)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            return null;

        var versions = await _versionFactory.FindAsync(
            v => v.FileItemId == fileItemId && v.IsCurrentVersion,
            limit: 1);
        return versions.FirstOrDefault();
    }

    /// <summary>
    /// 设置版本为当前版本
    /// </summary>
    public async Task<FileVersion> SetAsCurrentVersionAsync(string versionId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null)
            throw new ArgumentException("版本不存在", nameof(versionId));

        if (version.IsCurrentVersion)
            return version;

        // 将其他版本标记为非当前版本
        var currentVersion = await GetCurrentVersionAsync(version.FileItemId);
        if (currentVersion != null)
        {
            await SetVersionAsNonCurrentAsync(currentVersion.Id);
        }

        // 设置为当前版本
        var updatedVersion = await _versionFactory.UpdateAsync(versionId, v =>
        {
            v.IsCurrentVersion = true;
        });

        if (updatedVersion == null)
            throw new InvalidOperationException("设置当前版本失败");

        return updatedVersion;
    }

    /// <summary>
    /// 清理过期版本（保留指定数量的最新版本）
    /// </summary>
    public async Task<BatchOperationResult> CleanupOldVersionsAsync(string fileItemId, int keepCount = 10)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        if (keepCount < 1)
            throw new ArgumentException("保留版本数量必须大于0", nameof(keepCount));

        var result = new BatchOperationResult
        {
            StartTime = DateTime.UtcNow
        };

        try
        {
            // 获取所有版本，按版本号降序排列
            var versions = await GetVersionHistoryAsync(fileItemId);

            // 如果版本数量不超过保留数量，无需清理
            if (versions.Count <= keepCount)
            {
                result.Total = 0;
                result.EndTime = DateTime.UtcNow;
                return result;
            }

            // 获取需要删除的版本（排除当前版本）
            var versionsToDelete = versions
                .Where(v => !v.IsCurrentVersion)
                .Skip(keepCount - 1) // 保留最新的 keepCount-1 个历史版本（加上1个当前版本）
                .ToList();

            result.Total = versionsToDelete.Count;

            foreach (var version in versionsToDelete)
            {
                try
                {
                    await DeleteVersionAsync(version.Id);
                    result.SuccessIds.Add(version.Id);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new BatchOperationError
                    {
                        FileItemId = version.Id,
                        ErrorCode = "DELETE_VERSION_FAILED",
                        ErrorMessage = ex.Message
                    });
                    result.FailureCount++;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old versions for file {FileItemId}", fileItemId);
            result.Errors.Add(new BatchOperationError
            {
                FileItemId = fileItemId,
                ErrorCode = "CLEANUP_FAILED",
                ErrorMessage = ex.Message
            });
            result.FailureCount = result.Total;
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 批量删除版本
    /// </summary>
    public async Task<BatchOperationResult> BatchDeleteVersionsAsync(List<string> versionIds)
    {
        var result = new BatchOperationResult
        {
            Total = versionIds.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var versionId in versionIds)
        {
            try
            {
                await DeleteVersionAsync(versionId);
                result.SuccessIds.Add(versionId);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = versionId,
                    ErrorCode = "DELETE_VERSION_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    public async Task<VersionStatistics> GetVersionStatisticsAsync(string fileItemId)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            throw new ArgumentException("文件项ID不能为空", nameof(fileItemId));

        var versions = await GetVersionHistoryAsync(fileItemId);
        var currentVersion = await GetCurrentVersionAsync(fileItemId);

        var statistics = new VersionStatistics
        {
            FileItemId = fileItemId,
            TotalVersions = versions.Count,
            CurrentVersionNumber = currentVersion?.VersionNumber ?? 0,
            EarliestVersionDate = versions.LastOrDefault()?.CreatedAt,
            LatestVersionDate = versions.FirstOrDefault()?.CreatedAt,
            TotalStorageSize = versions.Sum(v => v.Size),
            VersionSizes = versions.ToDictionary(v => v.VersionNumber, v => v.Size),
            CreatorStatistics = versions
                .Where(v => !string.IsNullOrEmpty(v.CreatedBy))
                .GroupBy(v => v.CreatedBy!)
                .ToDictionary(g => g.Key, g => g.Count())
        };

        return statistics;
    }

    #region 私有辅助方法

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
    /// 获取下一个版本号
    /// </summary>
    private async Task<int> GetNextVersionNumberAsync(string fileItemId)
    {
        var versions = await GetVersionHistoryAsync(fileItemId);
        return versions.Count > 0 ? versions.Max(v => v.VersionNumber) + 1 : 1;
    }

    private async Task SetVersionAsNonCurrentAsync(string versionId)
    {
        await _versionFactory.UpdateAsync(versionId, v =>
        {
            v.IsCurrentVersion = false;
        });
    }

    /// <summary>
    /// 判断是否为文本文件
    /// </summary>
    private static bool IsTextFile(string mimeType)
    {
        var textMimeTypes = new[]
        {
            "text/plain", "text/html", "text/css", "text/javascript", "text/xml",
            "application/json", "application/xml", "application/javascript",
            "text/markdown", "text/csv"
        };

        return textMimeTypes.Contains(mimeType.ToLowerInvariant());
    }

    /// <summary>
    /// 获取版本内容为文本
    /// </summary>
    private async Task<string?> GetVersionContentAsTextAsync(FileVersion version)
    {
        try
        {
            using var stream = await DownloadVersionAsync(version.Id);
            using var reader = new StreamReader(stream, Encoding.UTF8);
            return await reader.ReadToEndAsync();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 生成文本差异
    /// </summary>
    private static string GenerateTextDiff(string content1, string content2)
    {
        // 简单的行级差异比较
        var lines1 = content1.Split('\n');
        var lines2 = content2.Split('\n');

        var diff = new StringBuilder();
        var maxLines = Math.Max(lines1.Length, lines2.Length);

        for (int i = 0; i < maxLines; i++)
        {
            var line1 = i < lines1.Length ? lines1[i] : string.Empty;
            var line2 = i < lines2.Length ? lines2[i] : string.Empty;

            if (line1 != line2)
            {
                if (!string.IsNullOrEmpty(line1))
                    diff.AppendLine($"- {line1}");
                if (!string.IsNullOrEmpty(line2))
                    diff.AppendLine($"+ {line2}");
            }
            else if (!string.IsNullOrEmpty(line1))
            {
                diff.AppendLine($"  {line1}");
            }
        }

        return diff.ToString();
    }

    #endregion
}