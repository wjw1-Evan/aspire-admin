using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 头像管理控制器
/// 负责处理用户头像的上传和查看，使用独立的全局数据库和 GridFS Bucket 存储，确保跨租户和匿名访问
/// </summary>
[Route("api/avatar")]
[ApiController]
public class AvatarController : BaseApiController
{
    private readonly IUserService _userService;
    private readonly GridFSBucket _avatarBucket;
    private readonly ILogger<AvatarController> _logger;

    /// <summary>
    /// 初始化头像控制器
    /// </summary>
    public AvatarController(
        IUserService userService,
        IMongoClient mongoClient, // 直接注入 MongoClient 以绕过租户隔离
        ILogger<AvatarController> logger)
    {
        _userService = userService;
        _logger = logger;

        // 使用该特定的公共数据库存储头像，确保匿名访问时也能找到文件
        // 避开基于 ITenantContext 的自动数据库路由
        var publicDatabase = mongoClient.GetDatabase("platform_public");

        // 使用独立的 Bucket 存储头像
        _avatarBucket = new GridFSBucket(publicDatabase, new GridFSBucketOptions
        {
            BucketName = "user_avatars"
        });
    }

    /// <summary>
    /// 上传头像
    /// </summary>
    /// <param name="file">头像文件</param>
    /// <returns>头像URL</returns>
    [HttpPost("upload")]
    [Authorize]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("请选择要上传的文件");
        }

        // 验证文件类型
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest("仅支持 JPG, PNG, GIF, WEBP 格式的图片");
        }

        // 验证文件大小 (5MB)
        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest("图片大小不能超过 5MB");
        }

        try
        {
            var userId = GetRequiredUserId();
            var fileName = $"{userId}_{DateTime.UtcNow.Ticks}{extension}";

            // 上传到 GridFS (platform_public db)
            using (var stream = file.OpenReadStream())
            {
                var options = new GridFSUploadOptions
                {
                    Metadata = new MongoDB.Bson.BsonDocument
                    {
                        { "userId", userId },
                        { "contentType", file.ContentType },
                        { "originalName", file.FileName },
                        { "uploadedAt", DateTime.UtcNow }
                    }
                };
                await _avatarBucket.UploadFromStreamAsync(fileName, stream, options);
            }

            // 构建公开访问 URL (保持原有格式)
            var avatarUrl = $"/api/avatar/view/{fileName}";

            // 仅返回文件URL，不在此更新用户信息
            return Success(new { url = avatarUrl }, "头像上传成功");
        }
        catch (Exception ex)
        {
            if (_logger.IsEnabled(LogLevel.Error))
            {
                _logger.LogError(ex, "头像上传失败");
            }
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
    public async Task<IActionResult> ViewAvatar(string fileName)
    {
        if (string.IsNullOrEmpty(fileName))
        {
            return NotFound("文件名不能为空");
        }

        try
        {
            // 从 GridFS (platform_public db) 下载
            var stream = new MemoryStream();
            await _avatarBucket.DownloadToStreamByNameAsync(fileName, stream);
            stream.Position = 0;

            // 根据文件名判断 ContentType
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            return File(stream, contentType);
        }
        catch (GridFSFileNotFoundException)
        {
            return NotFound("头像文件不存在");
        }
        catch (Exception ex)
        {
            if (_logger.IsEnabled(LogLevel.Error))
            {
                _logger.LogError(ex, "读取头像失败: {FileName}", fileName);
            }
            return NotFound("读取头像失败");
        }
    }
}
