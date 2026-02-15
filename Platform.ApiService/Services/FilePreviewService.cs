using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Text;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件预览服务实现
/// </summary>
public class FilePreviewService : IFilePreviewService
{
    private readonly ICloudStorageService _cloudStorageService;
    private readonly IDataFactory<FileItem> _fileItemFactory;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<FilePreviewService> _logger;

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
        IDataFactory<FileItem> fileItemFactory,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext,
        ILogger<FilePreviewService> logger)
    {
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _fileItemFactory = fileItemFactory ?? throw new ArgumentNullException(nameof(fileItemFactory));
        _fileStorageFactory = fileStorageFactory ?? throw new ArgumentNullException(nameof(fileStorageFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
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

            var thumbnailData = await GenerateThumbnailDataAsync(originalStream, fileItem.MimeType, width, height);

            // 上传缩略图到存储
            var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
            var metadata = new Dictionary<string, object>
            {
                ["originalFileId"] = fileItemId,
                ["width"] = width,
                ["height"] = height,
                ["generatedAt"] = DateTime.UtcNow,
                ["companyId"] = companyId ?? string.Empty
            };

            using var thumbnailStream = new MemoryStream(thumbnailData);
            var thumbnailGridFSId = await _fileStorageFactory.UploadAsync(
                thumbnailStream,
                $"thumbnail_{fileItem.Name}",
                "image/png",
                metadata,
                "cloud_storage_thumbnails");

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

        try
        {
            var bytes = await _fileStorageFactory.DownloadAsBytesAsync(fileItem!.ThumbnailGridFSId, "cloud_storage_thumbnails");
            return new MemoryStream(bytes);
        }
        catch
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
            // 由于当前的 IFileStorageFactory 不支持列出文件，无法有效地遍历和清理孤立的缩略图
            // 这里我们只做日志记录，提示功能受限
            _logger.LogWarning("CleanupPreviewCacheAsync is partially implemented. Orphaned thumbnails cannot be cleaned up without ListFiles capability in IFileStorageFactory.");

            // 未来如果 IFileStorageFactory 支持 ListFiles，可以遍历 cloud_storage_thumbnails 桶
            // 并删除不在 FileItems.ThumbnailGridFSId 中的文件

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup preview cache");
            result.Errors.Add(new BatchOperationError
            {
                ErrorCode = "CLEANUP_FAILED",
                ErrorMessage = ex.Message
            });
            result.FailureCount++;
        }

        result.EndTime = DateTime.UtcNow;
        return result;
    }

    /// <summary>
    /// 获取预览统计信息
    /// </summary>
    public async Task<PreviewStatistics> GetPreviewStatisticsAsync()
    {
        var statistics = new PreviewStatistics
        {
            LastUpdatedAt = DateTime.UtcNow
        };

        // 统计生成的缩略图数量 (ThumbnailGridFSId 不为空)
        statistics.TotalThumbnails = await _fileItemFactory.CountAsync(f => f.ThumbnailGridFSId != null && f.ThumbnailGridFSId != "");

        // 统计总预览次数 (DownloadCount 并不完全等同于预览，但作为近似值)
        var totalDownloads = await _fileItemFactory.SumAsync(null, f => (long)f.DownloadCount);
        statistics.TotalPreviews = totalDownloads;

        // 统计按类型分布 (需要聚合查询，这里简化通过多次查询或后续优化)
        // 暂时只统计总数

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
    /// 生成缩略图数据
    /// </summary>
    private async Task<byte[]> GenerateThumbnailDataAsync(Stream originalStream, string mimeType, int width, int height)
    {
        // 仅处理图片类型
        if (mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                if (originalStream.CanSeek)
                    originalStream.Position = 0;

                using var image = await Image.LoadAsync(originalStream);

                var options = new ResizeOptions
                {
                    Size = new Size(width, height),
                    Mode = ResizeMode.Max
                };

                image.Mutate(x => x.Resize(options));

                using var ms = new MemoryStream();
                await image.SaveAsPngAsync(ms);
                return ms.ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate thumbnail for image {MimeType}", mimeType);
            }
        }

        // 对于不支持的类型或处理失败的情况，返回一个简单的占位符
        // 注意：实际生产中可能需要根据类型生成默认图标
        var placeholderText = $"Thumbnail placeholder for {mimeType}";
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
        try
        {
            // 由于缺乏专门的PDF处理库，我们生成一个带文字的图片作为预览
            var width = options.MaxWidth ?? 800;
            var height = options.MaxHeight ?? 600;

            using var image = new Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);

            // 填充白色背景
            image.Mutate(x => x.BackgroundColor(SixLabors.ImageSharp.Color.White));

            // 绘制文字 (简单模拟，不使用字体库以避免依赖问题，或者画简单的形状)
            // 由于ImageSharp.Drawing需要字体，这里简化为只返回基本信息
            // 如果项目中引入了字体，可以使用 TextGraphics

            // 简单起见，我们生成一个带有 "PDF Preview" 字样颜色块的图片
            image.Mutate(x => x.Fill(SixLabors.ImageSharp.Color.LightGray, new Rectangle(0, 0, width, 50)));

            using var ms = new MemoryStream();
            await image.SaveAsPngAsync(ms);
            var base64 = Convert.ToBase64String(ms.ToArray());

            previewContent.Content = $"data:image/png;base64,{base64}";
            previewContent.ContentType = "image/png";
            previewContent.PageCount = 1;
            previewContent.CurrentPage = 1;
            previewContent.Metadata["note"] = "Preview generated as placeholder";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to generate PDF placeholder for {FileId}", fileItem.Id);
            previewContent.Content = "PDF预览生成失败";
        }
    }

    /// <summary>
    /// 生成视频预览
    /// </summary>
    private async Task GenerateVideoPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        // 返回流地址供前端播放器使用
        previewContent.Content = $"/api/cloud-storage/files/{fileItem.Id}/download";
        previewContent.ContentType = fileItem.MimeType;
        previewContent.Metadata["duration"] = "未知"; // 需要FFmpeg等工具分析
        previewContent.Metadata["streamingUrl"] = $"/api/cloud-storage/files/{fileItem.Id}/download";

        await Task.CompletedTask;
    }

    /// <summary>
    /// 生成音频预览
    /// </summary>
    private async Task GenerateAudioPreviewAsync(FileItem fileItem, FilePreviewContent previewContent, PreviewOptions options)
    {
        // 返回流地址供前端播放器使用
        previewContent.Content = $"/api/cloud-storage/files/{fileItem.Id}/download";
        previewContent.ContentType = fileItem.MimeType;
        previewContent.Metadata["duration"] = "未知";
        previewContent.Metadata["streamingUrl"] = $"/api/cloud-storage/files/{fileItem.Id}/download";

        await Task.CompletedTask;
    }

    #endregion
}