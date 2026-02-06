namespace Platform.ApiService.Validators;

/// <summary>
/// 文件验证辅助类
/// </summary>
public static class FileValidator
{
    /// <summary>
    /// 允许的文件扩展名
    /// </summary>
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // 图片文件
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
        
        // 文档文件
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", 
        ".txt", ".rtf", ".odt", ".ods", ".odp",
        
        // 压缩文件
        ".zip", ".rar", ".7z", ".tar", ".gz",
        
        // 音频文件
        ".mp3", ".wav", ".flac", ".aac", ".ogg",
        
        // 视频文件
        ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv",
        
        // 代码文件
        ".cs", ".js", ".ts", ".html", ".css", ".json", ".xml", 
        ".py", ".java", ".cpp", ".h", ".sql", ".md"
    };

    /// <summary>
    /// 允许的MIME类型
    /// </summary>
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // 图片类型
        "image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg+xml",
        
        // 文档类型
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain", "text/rtf",
        
        // 压缩文件
        "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
        
        // 音频文件
        "audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/ogg",
        
        // 视频文件
        "video/mp4", "video/avi", "video/x-matroska", "video/quicktime", "video/x-ms-wmv",
        
        // 代码和文本文件
        "text/html", "text/css", "application/javascript", "text/javascript",
        "application/json", "application/xml", "text/xml", "text/markdown"
    };

    /// <summary>
    /// 最大文件大小 (100MB)
    /// </summary>
    public const long MaxFileSizeBytes = 100L * 1024 * 1024;

    /// <summary>
    /// 验证文件
    /// </summary>
    /// <param name="file">待验证的文件</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
    public static (bool isValid, string? errorMessage) ValidateFile(Microsoft.AspNetCore.Http.IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return (false, "文件不能为空");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return (false, $"文件大小不能超过 {MaxFileSizeBytes / (1024 * 1024)}MB");
        }

        var fileName = file.FileName;
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return (false, "文件名不能为空");
        }

        var extension = Path.GetExtension(fileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return (false, $"不支持的文件类型: {extension}");
        }

        // 验证MIME类型（如果可用）
        var contentType = file.ContentType;
        if (!string.IsNullOrWhiteSpace(contentType) && !AllowedMimeTypes.Contains(contentType))
        {
            return (false, $"不支持的MIME类型: {contentType}");
        }

        return (true, null);
    }

    /// <summary>
    /// 检查文件扩展名是否允许
    /// </summary>
    /// <param name="fileName">文件名</param>
    /// <returns>是否允许</returns>
    public static bool IsExtensionAllowed(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return AllowedExtensions.Contains(extension);
    }

    /// <summary>
    /// 检查MIME类型是否允许
    /// </summary>
    /// <param name="contentType">MIME类型</param>
    /// <returns>是否允许</returns>
    public static bool IsMimeTypeAllowed(string contentType)
    {
        return !string.IsNullOrWhiteSpace(contentType) && AllowedMimeTypes.Contains(contentType);
    }

    /// <summary>
    /// 获取允许的文件扩展名列表
    /// </summary>
    /// <returns>允许的扩展名数组</returns>
    public static string[] GetAllowedExtensions()
    {
        return AllowedExtensions.ToArray();
    }
}