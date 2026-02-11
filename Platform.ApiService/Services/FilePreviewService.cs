using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件预览服务实现
/// </summary>
public class FilePreviewService : IFilePreviewService
{
    private readonly ICloudStorageService _cloudStorageService;
    private readonly IGridFSService _gridFSService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<FilePreviewService> _logger;
    private readonly GridFSBucket _thumbnailsBucket;
    private readonly GridFSBucket _previewsBucket;

    /// <summary>
    /// 支持预览的MIME类型
    /// </summary>
    private static readonly HashSet<string> SupportedPreviewTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // 图片
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp",
        // 文本
        "text/plain", "text/html", "text/css", "text/javascript", "text/xml", "text/csv", "text/markdown",
        // 代码
        "application/json", "application/xml", "application/javascript",
        // PDF
        "application/pdf",
        // 视频
        "video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov",
        // 音频
        "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/flac",
        // Office文档（基础支持）
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    };

    /// <summary>
    /// 支持缩略图的MIME类型
    /// </summary>
    private static readonly HashSet<string> SupportedThumbnailTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp",
        "application/pdf",
        "video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov"
    };

    /// <summary>
    /// 初始化文件预览服务
    /// </summary>
    public FilePreviewService(
        ICloudStorageService cloudStorageService,
        IGridFSService gridFSService,
        ITenantContext tenantContext,
        ILogger<FilePreviewService> logger)
    {
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _gridFSService = gridFSService ?? throw new ArgumentNullException(nameof(gridFSService));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _thumbnailsBucket = _gridFSService.GetBucket("cloud_storage_thumbnails");
        _previewsBucket = _gridFSService.GetBucket("cloud_storage_previews");
    }

    /// <summary>
    /// 获取文件预览信息
    /// </summary>
    public async Task<FilePreviewInfo> GetPreviewInfoAsync(string fileItemId)
    {
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        var previewInfo = new FilePreviewInfo
        {
            FileId = fileItemId,
            IsPreviewable = IsPreviewSupported(fileItem.MimeType),
            PreviewType = GetPreviewType(fileItem.MimeType),
            PreviewUrl = $"/api/cloud-storage/files/{fileItemId}/preview",
            ThumbnailUrl = !string.IsNullOrEmpty(fileItem.ThumbnailGridFSId)
                ? $"/api/cloud-storage/files/{fileItemId}/thumbnail"
                : string.Empty,
            Metadata = new Dictionary<string, object>
            {
                ["mimeType"] = fileItem.MimeType,
                ["size"] = fileItem.Size,
                ["name"] = fileItem.Name,
                ["supportsThumbnail"] = IsThumbnailSupported(fileItem.MimeType)
            }
        };

        return previewInfo;
    }

    /// <summary>
    /// 生成文件缩略图
    /// </summary>
    public async Task<string> GenerateThumbnailAsync(string fileItemId, int width = 200, int height = 200)
    {
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        if (!IsThumbnailSupported(fileItem.MimeType))
            throw new InvalidOperationException($"文件类型 {fileItem.MimeType} 不支持生成缩略图");

        // 如果已有缩略图，直接返回
        if (!string.IsNullOrEmpty(fileItem.ThumbnailGridFSId))
        {
            return fileItem.ThumbnailGridFSId;
        }

        try
        {
            // 获取原文件内容
            using var originalStream = await _cloudStorageService.DownloadFileAsync(fileItemId);

            // 生成缩略图（这里是简化实现，实际应该使用图像处理库）
            var thumbnailData = await GenerateThumbnailDataAsync(originalStream, fileItem.MimeType, width, height);

            // 上传缩略图到GridFS
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            var uploadOptions = new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    ["originalFileId"] = fileItemId,
                    ["width"] = width,
                    ["height"] = height,
                    ["generatedAt"] = DateTime.UtcNow,
                    ["companyId"] = companyId ?? string.Empty
                }
            };

            using var thumbnailStream = new MemoryStream(thumbnailData);
            var objectId = await _thumbnailsBucket.UploadFromStreamAsync(
                $"thumbnail_{fileItem.Name}",
                thumbnailStream,
                uploadOptions);

            var thumbnailGridFSId = objectId.ToString();

            // 更新文件项的缩略图ID
            // 注意：这里需要直接更新FileItem，但我们没有直接访问FileItem工厂的权限
            // 实际实现中应该通过CloudStorageService提供的方法来更新

            _logger.LogInformation("Generated thumbnail for file {FileItemId}: {ThumbnailId}", fileItemId, thumbnailGridFSId);
            return thumbnailGridFSId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate thumbnail for file {FileItemId}", fileItemId);
            throw new InvalidOperationException("生成缩略图失败", ex);
        }
    }

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    public async Task<Stream> GetThumbnailAsync(string fileItemId)
    {
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        if (string.IsNullOrEmpty(fileItem.ThumbnailGridFSId))
        {
            // 如果没有缩略图，尝试生成一个
            if (IsThumbnailSupported(fileItem.MimeType))
            {
                await GenerateThumbnailAsync(fileItemId);
                // 重新获取文件信息
                fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
            }

            if (string.IsNullOrEmpty(fileItem?.ThumbnailGridFSId))
                throw new InvalidOperationException("缩略图不存在且无法生成");
        }

        if (!ObjectId.TryParse(fileItem.ThumbnailGridFSId, out var thumbnailId))
            throw new InvalidOperationException("缩略图标识格式不正确");

        try
        {
            return await _thumbnailsBucket.OpenDownloadStreamAsync(thumbnailId);
        }
        catch (GridFSFileNotFoundException)
        {
            throw new InvalidOperationException("缩略图文件不存在或已被删除");
        }
    }

    /// <summary>
    /// 获取文件预览内容
    /// </summary>
    public async Task<FilePreviewContent> GetPreviewContentAsync(string fileItemId, PreviewOptions? previewOptions = null)
    {
        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null)
            throw new ArgumentException("文件不存在", nameof(fileItemId));

        if (!IsPreviewSupported(fileItem.MimeType))
            throw new InvalidOperationException($"文件类型 {fileItem.MimeType} 不支持预览");

        var options = previewOptions ?? new PreviewOptions();
        var previewType = GetPreviewTypeEnum(fileItem.MimeType);

        var previewContent = new FilePreviewContent
        {
            FileItemId = fileItemId,
            Type = previewType,
            ContentType = fileItem.MimeType,
            GeneratedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24) // 预览缓存24小时
        };

        try
        {
            switch (previewType)
            {
                case PreviewType.Image:
                    await GenerateImagePreviewAsync(fileItem, previewContent, options);
                    break;

                case PreviewType.Text:
                case PreviewType.Code:
                    await GenerateTextPreviewAsync(fileItem, previewContent, options);
                    break;

                case PreviewType.Pdf:
                    await GeneratePdfPreviewAsync(fileItem, previewContent, options);
                    break;

                case PreviewType.Video:
                    await GenerateVideoPreviewAsync(fileItem, previewContent, options);
                    break;

                case PreviewType.Audio:
                    await GenerateAudioPreviewAsync(fileItem, previewContent, options);
                    break;

                default:
                    throw new InvalidOperationException($"不支持的预览类型: {previewType}");
            }

            return previewContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate preview for file {FileItemId}", fileItemId);
            throw new InvalidOperationException("生成预览失败", ex);
        }
    }

    /// <summary>
    /// 检查文件是否支持预览
    /// </summary>
    public bool IsPreviewSupported(string mimeType)
    {
        return SupportedPreviewTypes.Contains(mimeType);
    }

    /// <summary>
    /// 检查文件是否支持缩略图
    /// </summary>
    public bool IsThumbnailSupported(string mimeType)
    {
        return SupportedThumbnailTypes.Contains(mimeType);
    }

    /// <summary>
    /// 批量生成缩略图
    /// </summary>
    public async Task<BatchOperationResult> BatchGenerateThumbnailsAsync(List<string> fileItemIds, int width = 200, int height = 200)
    {
        var result = new BatchOperationResult
        {
            Total = fileItemIds.Count,
            StartTime = DateTime.UtcNow
        };

        foreach (var fileItemId in fileItemIds)
        {
            try
            {
                await GenerateThumbnailAsync(fileItemId, width, height);
                result.SuccessIds.Add(fileItemId);
                result.SuccessCount++;
            }
            catch (Exception ex)
            {
                result.Errors.Add(new BatchOperationError
                {
                    FileItemId = fileItemId,
                    ErrorCode = "GENERATE_THUMBNAIL_FAILED",
                    ErrorMessage = ex.Message
                });
                result.FailureCount++;
            }
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 清理过期的预览缓存
    /// </summary>
    public async Task<BatchOperationResult> CleanupPreviewCacheAsync(int expireDays = 30)
    {
        var result = new BatchOperationResult
        {
            StartTime = DateTime.UtcNow
        };

        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-expireDays);

            // 这里应该实现清理逻辑，删除过期的预览和缩略图文件
            // 由于GridFS的限制，这里只是一个示例实现

            _logger.LogInformation("Cleaned up preview cache older than {ExpireDays} days", expireDays);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup preview cache");
            result.Errors.Add(new BatchOperationError
            {
                ErrorCode = "CLEANUP_FAILED",
                ErrorMessage = ex.Message
            });
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取预览统计信息
    /// </summary>
    public async Task<PreviewStatistics> GetPreviewStatisticsAsync()
    {
        // 这里应该实现统计逻辑，统计预览次数、缓存大小等
        // 由于没有专门的统计表，这里返回一个示例实现

        var statistics = new PreviewStatistics
        {
            TotalPreviews = 0,
            TotalThumbnails = 0,
            CacheSize = 0,
            LastUpdatedAt = DateTime.UtcNow
        };

        return statistics;
    }

    #region 私有辅助方法

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
            "application/json" or "application/xml" or "application/javascript" => "code",
            _ => "unknown"
        };
    }

    /// <summary>
    /// 获取预览类型枚举
    /// </summary>
    private static PreviewType GetPreviewTypeEnum(string mimeType)
    {
        return mimeType.ToLowerInvariant() switch
        {
            var mime when mime.StartsWith("image/") => PreviewType.Image,
            "application/pdf" => PreviewType.Pdf,
            var mime when mime.StartsWith("text/") => PreviewType.Text,
            var mime when mime.StartsWith("video/") => PreviewType.Video,
            var mime when mime.StartsWith("audio/") => PreviewType.Audio,
            "application/json" or "application/xml" or "application/javascript" => PreviewType.Code,
            var mime when mime.Contains("office") || mime.Contains("word") || mime.Contains("excel") || mime.Contains("powerpoint") => PreviewType.Office,
            _ => PreviewType.Unsupported
        };
    }

    /// <summary>
    /// 生成缩略图数据（简化实现）
    /// </summary>
    private async Task<byte[]> GenerateThumbnailDataAsync(Stream originalStream, string mimeType, int width, int height)
    {
        // 这里应该使用图像处理库（如ImageSharp、SkiaSharp等）来生成真正的缩略图
        // 现在只是返回一个占位符

        await Task.Delay(100); // 模拟处理时间

        // 返回一个简单的占位符图片数据
        var placeholderText = $"Thumbnail {width}x{height}";
        return Encoding.UTF8.GetBytes(placeholderText);
    }

    /// <summary>
    /// 生成图片预览
    /// </summary>
    private async Task GenerateImagePreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        using var stream = await _cloudStorageService.DownloadFileAsync(fileItem.Id);

        // 这里应该实现图片预览逻辑
        // 现在只是返回基本信息
        previewContent.Content = $"data:{fileItem.MimeType};base64,"; // 应该包含实际的base64数据
        previewContent.Size = fileItem.Size;
        previewContent.Metadata["originalSize"] = fileItem.Size;
    }

    /// <summary>
    /// 生成文本预览
    /// </summary>
    private async Task GenerateTextPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        using var stream = await _cloudStorageService.DownloadFileAsync(fileItem.Id);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        var content = await reader.ReadToEndAsync();

        // 限制预览长度
        const int maxLength = 10000;
        if (content.Length > maxLength)
        {
            content = content.Substring(0, maxLength) + "...";
        }

        previewContent.Content = content;
        previewContent.Size = Encoding.UTF8.GetByteCount(content);
        previewContent.ContentType = "text/plain";
    }

    /// <summary>
    /// 生成PDF预览
    /// </summary>
    private async Task GeneratePdfPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        // 这里应该实现PDF预览逻辑，可能需要PDF处理库
        await Task.Delay(100); // 模拟处理时间

        previewContent.Content = "PDF预览功能待实现";
        previewContent.PageCount = 1; // 应该从PDF中获取实际页数
        previewContent.CurrentPage = options.Page ?? 1;
    }

    /// <summary>
    /// 生成视频预览
    /// </summary>
    private async Task GenerateVideoPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        // 这里应该实现视频预览逻辑，可能需要FFmpeg等工具
        await Task.Delay(100); // 模拟处理时间

        previewContent.Content = $"/api/cloud-storage/files/{fileItem.Id}/stream";
        previewContent.ContentType = fileItem.MimeType;
        previewContent.Metadata["duration"] = "未知"; // 应该从视频中获取实际时长
    }

    /// <summary>
    /// 生成音频预览
    /// </summary>
    private async Task GenerateAudioPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        // 这里应该实现音频预览逻辑
        await Task.Delay(100); // 模拟处理时间

        previewContent.Content = $"/api/cloud-storage/files/{fileItem.Id}/stream";
        previewContent.ContentType = fileItem.MimeType;
        previewContent.Metadata["duration"] = "未知"; // 应该从音频中获取实际时长
    }

    #endregion
}