using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 头像管理控制器
/// 负责处理用户头像的上传和查看，使用 IFileStorageFactory 存储
/// </summary>
[Route("api/avatar")]
[ApiController]
public class AvatarController : BaseApiController
{
    private readonly IUserService _userService;
    private readonly IFileStorageFactory _fileStorage;
    private readonly ILogger<AvatarController> _logger;
    private const string AvatarBucketName = "user_avatars";

    /// <summary>
    /// 初始化头像控制器
    /// </summary>
    public AvatarController(
        IUserService userService,
        IFileStorageFactory fileStorage,
        ILogger<AvatarController> logger)
    {
        _userService = userService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    /// <summary>
    /// 上传头像
    /// </summary>
    /// <param name="file">头像文件</param>
    /// <returns>头像URL</returns>
    [HttpPost("upload")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return ValidationError("请选择要上传的文件");
        }

        // 验证文件类型
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        if (!allowedExtensions.Contains(extension))
        {
            return ValidationError("仅支持 JPG, PNG, GIF, WEBP 格式的图片");
        }

        // 验证文件大小 (5MB)
        if (file.Length > 5 * 1024 * 1024)
        {
            return ValidationError("图片大小不能超过 5MB");
        }

        try
        {
            var userId = GetRequiredUserId();
            var fileName = $"{userId}_{DateTime.UtcNow.Ticks}{extension}";

            // 上传到 GridFS
            using (var stream = file.OpenReadStream())
            {
                var metadata = new Dictionary<string, object>
                {
                    { "userId", userId },
                    { "originalName", file.FileName },
                    { "uploadedAt", DateTime.UtcNow }
                };

                await _fileStorage.UploadAsync(
                    stream,
                    fileName,
                    file.ContentType,
                    metadata,
                    AvatarBucketName);
            }

            // 构建公开访问 URL
            var avatarUrl = $"/api/avatar/view/{fileName}";

            return Success(new { url = avatarUrl }, "头像上传成功");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "头像上传失败");
            return ServerError($"头像上传失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 查看头像 (公开)
    /// </summary>
    /// <param name="fileName">文件名</param>
    /// <returns>图片流</returns>
    [HttpGet("view/{fileName}")]
    [AllowAnonymous]
    [Platform.ApiService.Attributes.SkipGlobalAuthentication("Avatar view is public")]
    public async Task<IActionResult> ViewAvatar(string fileName)
    {
        if (string.IsNullOrEmpty(fileName))
        {
            return ValidationError("文件名不能为空");
        }

        try
        {
            // 根据文件名查找文件
            var fileInfo = await _fileStorage.FindByFileNameAsync(fileName, AvatarBucketName);

            if (fileInfo == null)
            {
                return NotFoundError("头像文件", fileName);
            }

            // 下载文件到流
            var stream = new MemoryStream();
            await _fileStorage.DownloadAsync(fileInfo.Id, stream, AvatarBucketName);
            stream.Position = 0;

            // 优先使用存储的 ContentType，否则根据文件名判断
            var contentType = !string.IsNullOrEmpty(fileInfo.ContentType)
                ? fileInfo.ContentType
                : GetContentTypeFromFileName(fileName);

            return File(stream, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "读取头像失败: {FileName}", fileName);
            return NotFoundError("头像文件", fileName);
        }
    }

    /// <summary>
    /// 根据文件名获取 ContentType
    /// </summary>
    private static string GetContentTypeFromFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }
}
