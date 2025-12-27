using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件预览服务接口
/// </summary>
public interface IFilePreviewService
{
    /// <summary>
    /// 获取文件预览信息
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <returns>预览信息</returns>
    Task<FilePreviewInfo> GetPreviewInfoAsync(string fileItemId);

    /// <summary>
    /// 生成文件缩略图
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="width">缩略图宽度</param>
    /// <param name="height">缩略图高度</param>
    /// <returns>缩略图GridFS ID</returns>
    Task<string> GenerateThumbnailAsync(string fileItemId, int width = 200, int height = 200);

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <returns>缩略图流</returns>
    Task<Stream> GetThumbnailAsync(string fileItemId);

    /// <summary>
    /// 获取文件预览内容
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="previewOptions">预览选项</param>
    /// <returns>预览内容</returns>
    Task<FilePreviewContent> GetPreviewContentAsync(string fileItemId, PreviewOptions? previewOptions = null);

    /// <summary>
    /// 检查文件是否支持预览
    /// </summary>
    /// <param name="mimeType">MIME类型</param>
    /// <returns>是否支持预览</returns>
    bool IsPreviewSupported(string mimeType);

    /// <summary>
    /// 检查文件是否支持缩略图
    /// </summary>
    /// <param name="mimeType">MIME类型</param>
    /// <returns>是否支持缩略图</returns>
    bool IsThumbnailSupported(string mimeType);

    /// <summary>
    /// 批量生成缩略图
    /// </summary>
    /// <param name="fileItemIds">文件项ID列表</param>
    /// <param name="width">缩略图宽度</param>
    /// <param name="height">缩略图高度</param>
    /// <returns>批量操作结果</returns>
    Task<BatchOperationResult> BatchGenerateThumbnailsAsync(List<string> fileItemIds, int width = 200, int height = 200);

    /// <summary>
    /// 清理过期的预览缓存
    /// </summary>
    /// <param name="expireDays">过期天数</param>
    /// <returns>清理结果</returns>
    Task<BatchOperationResult> CleanupPreviewCacheAsync(int expireDays = 30);

    /// <summary>
    /// 获取预览统计信息
    /// </summary>
    /// <returns>预览统计</returns>
    Task<PreviewStatistics> GetPreviewStatisticsAsync();
}

/// <summary>
/// 预览选项
/// </summary>
public class PreviewOptions
{
    /// <summary>预览页数（PDF等多页文档）</summary>
    public int? Page { get; set; }

    /// <summary>预览质量（1-100）</summary>
    public int Quality { get; set; } = 80;

    /// <summary>最大宽度</summary>
    public int? MaxWidth { get; set; }

    /// <summary>最大高度</summary>
    public int? MaxHeight { get; set; }

    /// <summary>是否包含元数据</summary>
    public bool IncludeMetadata { get; set; } = false;

    /// <summary>预览格式</summary>
    public string Format { get; set; } = "image/jpeg";
}

/// <summary>
/// 文件预览内容
/// </summary>
public class FilePreviewContent
{
    /// <summary>文件项ID</summary>
    public string FileItemId { get; set; } = string.Empty;

    /// <summary>预览类型</summary>
    public PreviewType Type { get; set; } = PreviewType.Image;

    /// <summary>预览内容（Base64编码或URL）</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>内容类型</summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>预览大小（字节）</summary>
    public long Size { get; set; } = 0;

    /// <summary>预览宽度</summary>
    public int? Width { get; set; }

    /// <summary>预览高度</summary>
    public int? Height { get; set; }

    /// <summary>页数（多页文档）</summary>
    public int? PageCount { get; set; }

    /// <summary>当前页（多页文档）</summary>
    public int? CurrentPage { get; set; }

    /// <summary>文件元数据</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];

    /// <summary>生成时间</summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>缓存过期时间</summary>
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 预览类型枚举
/// </summary>
public enum PreviewType
{
    /// <summary>图片</summary>
    Image = 0,

    /// <summary>文本</summary>
    Text = 1,

    /// <summary>PDF</summary>
    Pdf = 2,

    /// <summary>视频</summary>
    Video = 3,

    /// <summary>音频</summary>
    Audio = 4,

    /// <summary>Office文档</summary>
    Office = 5,

    /// <summary>代码</summary>
    Code = 6,

    /// <summary>不支持</summary>
    Unsupported = 99
}

/// <summary>
/// 预览统计信息
/// </summary>
public class PreviewStatistics
{
    /// <summary>总预览次数</summary>
    public long TotalPreviews { get; set; } = 0;

    /// <summary>缩略图总数</summary>
    public long TotalThumbnails { get; set; } = 0;

    /// <summary>预览缓存大小（字节）</summary>
    public long CacheSize { get; set; } = 0;

    /// <summary>按文件类型统计预览次数</summary>
    public Dictionary<string, long> PreviewsByType { get; set; } = [];

    /// <summary>按预览类型统计</summary>
    public Dictionary<PreviewType, long> PreviewsByPreviewType { get; set; } = [];

    /// <summary>最近7天预览趋势</summary>
    public Dictionary<DateTime, long> RecentTrend { get; set; } = [];

    /// <summary>最后更新时间</summary>
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}