using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 文件分享控制器
/// 提供文件分享、权限控制、公开访问等功能
/// </summary>
[ApiController]
[Route("api/file-share")]
public class FileShareController : BaseApiController
{
    private readonly IFileShareService _fileShareService;
    private readonly ILogger<FileShareController> _logger;

    /// <summary>
    /// 初始化文件分享控制器
    /// </summary>
    public FileShareController(
        IFileShareService fileShareService,
        ILogger<FileShareController> logger)
    {
        _fileShareService = fileShareService ?? throw new ArgumentNullException(nameof(fileShareService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 分享管理（需要认证）

    /// <summary>
    /// 创建文件分享
    /// </summary>
    /// <param name="fileItemId">文件项ID</param>
    /// <param name="request">分享创建请求</param>
    /// <returns>创建的分享信息</returns>
    [HttpPost("{fileItemId}")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> CreateShare(string fileItemId, [FromBody] CreateShareRequest request)
    {
        if (string.IsNullOrWhiteSpace(fileItemId))
            return ValidationError("文件项ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var share = await _fileShareService.CreateShareAsync(fileItemId, request);
            LogOperation("CreateShare", share.Id, new { fileItemId, request.Type, request.Permission });
            return Success(share, "分享创建成功");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("CreateShare", ex, fileItemId);
            return ServerError("创建分享失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取分享详情
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <returns>分享详情</returns>
    [HttpGet("{id}")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> GetShare(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("分享ID不能为空");

        try
        {
            var share = await _fileShareService.GetShareByIdAsync(id);
            if (share == null)
                return NotFoundError("分享", id);

            return Success(share);
        }
        catch (Exception ex)
        {
            LogError("GetShare", ex, id);
            return ServerError("获取分享信息失败，请稍后重试");
        }
    }

    /// <summary>
    /// 更新分享设置
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>更新后的分享信息</returns>
    [HttpPut("{id}")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> UpdateShare(string id, [FromBody] UpdateShareRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("分享ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var share = await _fileShareService.UpdateShareAsync(id, request);
            LogOperation("UpdateShare", id, new { request.Permission, request.IsActive });
            return Success(share, "分享更新成功");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("UpdateShare", ex, id);
            return ServerError("更新分享失败，请稍后重试");
        }
    }

    /// <summary>
    /// 删除分享
    /// </summary>
    /// <param name="id">分享ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("{id}")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> DeleteShare(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("分享ID不能为空");

        try
        {
            await _fileShareService.DeleteShareAsync(id);
            LogOperation("DeleteShare", id);
            return Success("分享已删除");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("DeleteShare", ex, id);
            return ServerError("删除分享失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取我创建的分享列表
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>分享列表</returns>
    [HttpGet("my-shares")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> GetMyShares([FromQuery] ShareListQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        try
        {
            var result = await _fileShareService.GetMySharesAsync(query);
            return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            LogError("GetMyShares", ex);
            return ServerError("获取分享列表失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取分享给我的文件列表
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>分享文件列表</returns>
    [HttpGet("shared-with-me")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> GetSharedWithMe([FromQuery] ShareListQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        try
        {
            var result = await _fileShareService.GetSharedWithMeAsync(query);
            return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            LogError("GetSharedWithMe", ex);
            return ServerError("获取共享文件列表失败，请稍后重试");
        }
    }

    /// <summary>
    /// 批量删除分享
    /// </summary>
    /// <param name="request">批量删除请求</param>
    /// <returns>删除结果</returns>
    [HttpPost("batch/delete")]
    [RequireMenu("cloud-storage-shared")]
    public async Task<IActionResult> BatchDeleteShares([FromBody] BatchDeleteSharesRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("分享ID列表不能为空");

        if (request.Ids.Count > 100)
            return ValidationError("批量操作最多支持100个分享");

        try
        {
            var result = await _fileShareService.BatchDeleteSharesAsync(request.Ids);
            LogOperation("BatchDeleteShares", null, new { request.Ids, result.SuccessCount, result.FailureCount });
            return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            LogError("BatchDeleteShares", ex);
            return ServerError("批量删除分享失败，请稍后重试");
        }
    }

    #endregion

    #region 公开访问（无需认证）

    /// <summary>
    /// 访问公开分享
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>分享文件信息</returns>
    [HttpGet("public/{shareToken}")]
    [AllowAnonymous]
    public async Task<IActionResult> AccessPublicShare(string shareToken, [FromQuery] string? password = null)
    {
        if (string.IsNullOrWhiteSpace(shareToken))
            return ValidationError("分享令牌不能为空");

        try
        {
            // 验证分享访问权限
            var hasAccess = await _fileShareService.ValidateShareAccessAsync(shareToken, password);
            if (!hasAccess)
                return ForbiddenError("分享链接无效、已过期或密码错误");

            // 获取分享和文件信息
            var share = await _fileShareService.GetShareAsync(shareToken);
            var fileInfo = await _fileShareService.GetSharedFileInfoAsync(shareToken, password);
            if (share == null || fileInfo == null)
                return NotFoundError("分享文件", shareToken);

            // 记录访问日志
            var accessorInfo = $"IP: {GetClientIpAddress()}, UserAgent: {GetUserAgent()}";
            await _fileShareService.RecordShareAccessAsync(shareToken, accessorInfo);

            // 包含权限信息，便于前端判断下载/预览能力
            var accessType = share.Permission switch
            {
                SharePermission.Download => "download",
                SharePermission.Edit or SharePermission.Full => "edit",
                _ => "view"
            };

            var response = new
            {
                fileId = fileInfo.Id,
                fileName = fileInfo.Name,
                fileSize = fileInfo.Size,
                mimeType = fileInfo.MimeType,
                accessType,
                permission = share.Permission,
                canDownload = share.Permission != SharePermission.View,
                canView = true,
                shareType = share.Type,
                expiresAt = share.ExpiresAt,
                isActive = share.IsActive
            };

            return Success(response);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "访问公开分享失败: {ShareToken}", shareToken);
            return ServerError("访问分享失败，请稍后重试");
        }
    }

    /// <summary>
    /// 下载分享的文件
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>文件流</returns>
    [HttpGet("public/{shareToken}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadSharedFile(string shareToken, [FromQuery] string? password = null)
    {
        if (string.IsNullOrWhiteSpace(shareToken))
            return ValidationError("分享令牌不能为空");

        try
        {
            // 验证分享访问权限
            var hasAccess = await _fileShareService.ValidateShareAccessAsync(shareToken, password);
            if (!hasAccess)
                return ForbiddenError("分享链接无效、已过期或密码错误");

            // 获取分享文件信息
            var fileInfo = await _fileShareService.GetSharedFileInfoAsync(shareToken, password);
            if (fileInfo == null)
                return NotFoundError("分享文件", shareToken);

            // 获取文件流
            var stream = await _fileShareService.GetSharedFileContentAsync(shareToken, password);

            // 记录访问日志
            var accessorInfo = $"IP: {GetClientIpAddress()}, UserAgent: {GetUserAgent()}, Action: Download";
            await _fileShareService.RecordShareAccessAsync(shareToken, accessorInfo);

            return File(stream, fileInfo.MimeType, fileInfo.Name);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "下载分享文件失败: {ShareToken}", shareToken);
            return ServerError("下载失败，请稍后重试");
        }
    }

    /// <summary>
    /// 预览分享的文件
    /// </summary>
    /// <param name="shareToken">分享令牌</param>
    /// <param name="password">分享密码（可选）</param>
    /// <returns>预览信息</returns>
    [HttpGet("public/{shareToken}/preview")]
    [AllowAnonymous]
    public async Task<IActionResult> PreviewSharedFile(string shareToken, [FromQuery] string? password = null)
    {
        if (string.IsNullOrWhiteSpace(shareToken))
            return ValidationError("分享令牌不能为空");

        try
        {
            // 验证分享访问权限
            var hasAccess = await _fileShareService.ValidateShareAccessAsync(shareToken, password);
            if (!hasAccess)
                return ForbiddenError("分享链接无效、已过期或密码错误");

            // 获取分享文件信息
            var fileInfo = await _fileShareService.GetSharedFileInfoAsync(shareToken, password);
            if (fileInfo == null)
                return NotFoundError("分享文件", shareToken);

            // 记录访问日志
            var accessorInfo = $"IP: {GetClientIpAddress()}, UserAgent: {GetUserAgent()}, Action: Preview";
            await _fileShareService.RecordShareAccessAsync(shareToken, accessorInfo);

            // 构建预览信息
            var previewInfo = new
            {
                fileInfo.Id,
                fileInfo.Name,
                fileInfo.MimeType,
                fileInfo.Size,
                PreviewUrl = $"/api/file-share/public/{shareToken}/preview",
                DownloadUrl = $"/api/file-share/public/{shareToken}/download",
                IsPreviewable = IsPreviewableFile(fileInfo.MimeType)
            };

            return Success(previewInfo);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "预览分享文件失败: {ShareToken}", shareToken);
            return ServerError("预览失败，请稍后重试");
        }
    }

    #endregion

    #region 私有方法

    /// <summary>
    /// 检查文件是否支持预览
    /// </summary>
    /// <param name="mimeType">MIME类型</param>
    /// <returns>是否支持预览</returns>
    private static bool IsPreviewableFile(string mimeType)
    {
        if (string.IsNullOrWhiteSpace(mimeType))
            return false;

        var previewableMimeTypes = new[]
        {
            // 图片
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg+xml",
            // PDF
            "application/pdf",
            // 文本
            "text/plain", "text/html", "text/css", "text/javascript", "text/xml", "text/csv",
            "application/json", "application/xml",
            // Office文档
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            // 视频
            "video/mp4", "video/webm", "video/ogg",
            // 音频
            "audio/mp3", "audio/wav", "audio/ogg", "audio/mpeg"
        };

        return previewableMimeTypes.Contains(mimeType.ToLowerInvariant());
    }

    #endregion
}

#region 请求模型

/// <summary>
/// 批量删除分享请求模型
/// </summary>
public class BatchDeleteSharesRequest
{
    /// <summary>分享ID列表</summary>
    public List<string> Ids { get; set; } = [];
}

#endregion
