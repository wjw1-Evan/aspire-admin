using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 云存储控制器
/// 提供文件和文件夹管理、上传下载、搜索等功能
/// </summary>
[ApiController]
[Route("api/cloud-storage")]
public class CloudStorageController : BaseApiController
{
    private readonly ICloudStorageService _cloudStorageService;
    private readonly ILogger<CloudStorageController> _logger;

    /// <summary>
    /// 初始化云存储控制器
    /// </summary>
    [ActivatorUtilitiesConstructor]
    public CloudStorageController(
        ICloudStorageService cloudStorageService,
        ILogger<CloudStorageController> logger)
    {
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 文件和文件夹管理

    /// <summary>
    /// 获取存储使用统计
    /// </summary>
    /// <param name="userId">指定用户ID（可选，不传则使用当前用户）</param>
    /// <returns>存储使用信息</returns>
    [HttpGet("statistics")]
    [RequireMenu("cloud-storage")]
    public async Task<IActionResult> GetStatistics([FromQuery] string? userId = null)
    {
        var stats = await _cloudStorageService.GetStorageUsageAsync(userId);
        return Success(stats);
    }

    /// <summary>
    /// 创建文件夹
    /// </summary>
    /// <param name="request">创建文件夹请求</param>
    /// <returns>创建的文件夹信息</returns>
    [HttpPost("folders")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var folder = await _cloudStorageService.CreateFolderAsync(request.Name, request.ParentId);
        return Success(folder, "文件夹创建成功");
    }

    /// <summary>
    /// 上传文件
    /// </summary>
    /// <param name="request">上传文件请求</param>
    /// <returns>上传的文件信息</returns>
    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile([FromForm] UploadFileRequest request)
    {
        var fileItem = await _cloudStorageService.UploadFileAsync(request.File, request.ParentId, request.Overwrite);
        return Success(fileItem, "文件上传成功");
    }

    /// <summary>
    /// 批量上传文件
    /// </summary>
    /// <param name="files">文件列表</param>
    /// <param name="parentId">父文件夹ID（可选）</param>
    /// <returns>上传结果</returns>
    [HttpPost("batch-upload")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchUploadFiles([FromForm] IList<IFormFile> files, [FromForm] string? parentId = null)
    {
        if (files == null || files.Count == 0)
            throw new ArgumentException("文件列表不能为空");

        var result = await _cloudStorageService.UploadMultipleFilesAsync(files, parentId ?? string.Empty);
        return Success(result, "批量上传成功");
    }

    /// <summary>
    /// 获取文件项详情
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>文件项详情</returns>
    [HttpGet("files/{id}")]
    public async Task<IActionResult> GetFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        var fileItem = await _cloudStorageService.GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件项 {id} 不存在");

        return Success(fileItem);
    }

    /// <summary>
    /// 获取文件项列表
    /// </summary>
    /// <param name="parentId">父文件夹ID</param>
    /// <param name="query">查询参数</param>
    /// <returns>文件项列表</returns>
    [HttpGet("list")]
    [HttpGet("files")] // 兼容客户端使用 /files 路径
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> GetFileItems([FromQuery] string? parentId, [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest query)
    {
        var result = await _cloudStorageService.GetFileItemsAsync(parentId ?? string.Empty, query);
        return Success(result);
    }

    /// <summary>
    /// 重命名文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">重命名请求</param>
    /// <returns>重命名后的文件项</returns>
    [HttpPut("items/{id}/rename")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> RenameFileItem(string id, [FromBody] RenameRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        var fileItem = await _cloudStorageService.RenameFileItemAsync(id, request.NewName);
        return Success(fileItem, "重命名成功");
    }

    /// <summary>
    /// 移动文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">移动请求</param>
    /// <returns>移动后的文件项</returns>
    [HttpPut("items/{id}/move")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> MoveFileItem(string id, [FromBody] MoveRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        var fileItem = await _cloudStorageService.MoveFileItemAsync(id, request.NewParentId);
        return Success(fileItem, "移动成功");
    }

    /// <summary>
    /// 复制文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">复制请求</param>
    /// <returns>复制后的文件项</returns>
    [HttpPost("items/{id}/copy")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> CopyFileItem(string id, [FromBody] CopyRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        var fileItem = await _cloudStorageService.CopyFileItemAsync(id, request.NewParentId, request.NewName);
        return Success(fileItem, "复制成功");
    }

    /// <summary>
    /// 删除文件或文件夹（移至回收站）
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("items/{id}")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        await _cloudStorageService.DeleteFileItemAsync(id);
        return Success(null, "已移动到回收站");
    }

    #endregion

    #region 文件下载和预览

    /// <summary>
    /// 下载文件
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>文件流</returns>
    [HttpGet("items/{id}/download")]
    public async Task<IActionResult> DownloadFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件ID不能为空");

        var fileItem = await _cloudStorageService.GetFileItemAsync(id);
        if (fileItem == null)
            throw new ArgumentException("文件 {id} 不存在");

        var stream = await _cloudStorageService.DownloadFileAsync(id);

        return File(stream, fileItem.MimeType, fileItem.Name);
    }

    /// <summary>
    /// 下载文件夹（打包为ZIP）
    /// </summary>
    /// <param name="id">文件夹ID</param>
    /// <returns>ZIP 文件流</returns>
    [HttpGet("folders/{id}/download")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DownloadFolderAsZip(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件夹ID不能为空");

        var stream = await _cloudStorageService.DownloadFolderAsZipAsync(id);
        return File(stream, "application/zip", $"folder-{id}.zip");
    }

    /// <summary>
    /// 预览文件
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>预览信息</returns>
    [HttpGet("items/{id}/preview")]
    public async Task<IActionResult> PreviewFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件ID不能为空");

        var previewInfo = await _cloudStorageService.GetPreviewInfoAsync(id);
        return Success(previewInfo);
    }

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>缩略图流</returns>
    [HttpGet("items/{id}/thumbnail")]
    public async Task<IActionResult> GetThumbnail(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件ID不能为空");

        var stream = await _cloudStorageService.GetThumbnailAsync(id);
        return File(stream, "image/jpeg");
    }

    #endregion

    #region 搜索和筛选

    /// <summary>
    /// 搜索文件
    /// </summary>
    /// <param name="query">搜索查询参数</param>
    /// <returns>搜索结果</returns>
    [HttpGet("search")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> SearchFiles([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest query)
    {
        try
        {
            var result = await _cloudStorageService.SearchFilesAsync(query);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "搜索失败");
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 获取最近访问的文件
    /// </summary>
    /// <param name="count">返回数量</param>
    /// <returns>最近文件列表</returns>
    [HttpGet("recent")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> GetRecentFiles([FromQuery] int count = 10)
    {
        if (count < 1 || count > 100)
            throw new ArgumentException("返回数量必须在 1-100 之间");

        try
        {
            var files = await _cloudStorageService.GetRecentFilesAsync(count);
            return Success(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取最近文件失败");
            throw new ArgumentException("服务器内部错误");
        }
    }

    #endregion

    #region 回收站管理

    /// <summary>
    /// 获取回收站统计信息
    /// </summary>
    /// <returns>回收站统计</returns>
    [HttpGet("recycle/statistics")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleStatistics()
    {
        try
        {
            var stats = await _cloudStorageService.GetRecycleStatisticsAsync();
            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取回收站统计失败");
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 获取回收站项目列表
    /// </summary>
    /// <param name="request">分页参数</param>
    /// <param name="type">文件类型筛选</param>
    /// <returns>分页回收站项目列表</returns>
    [HttpGet("recycle")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleItems(
        [FromQuery] ProTableRequest request,
        [FromQuery] FileItemType? type = null)
    {
        var result = await _cloudStorageService.GetRecycleBinItemsAsync(request, type);
        return Success(result);
    }

    /// <summary>
    /// 获取回收站项目 (通过查询对象)
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>分页回收站项目列表</returns>
    [HttpGet("recycle-bin")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleBinItems([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest query)
    {
        var result = await _cloudStorageService.GetRecycleBinItemsAsync(query);
        return Success(result);
    }

    /// <summary>
    /// 恢复文件项
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">恢复请求</param>
    /// <returns>恢复的文件项</returns>
    [HttpPost("recycle-bin/{id}/restore")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> RestoreFileItem(string id, [FromBody] RestoreRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        var fileItem = await _cloudStorageService.RestoreFileItemAsync(id, request?.NewParentId);
        return Success(fileItem, "恢复成功");
    }

    /// <summary>
    /// 永久删除文件项
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("recycle-bin/{id}")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> PermanentDeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("文件项ID不能为空");

        await _cloudStorageService.PermanentDeleteFileItemAsync(id);
        return Success(null, "文件已永久删除");
    }

    /// <summary>
    /// 清空回收站
    /// </summary>
    /// <returns>清理结果</returns>
    [HttpDelete("recycle-bin/empty")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> EmptyRecycleBin()
    {
        await _cloudStorageService.EmptyRecycleBinAsync();
        return Success(null, "回收站已清空");
    }

    /// <summary>
    /// 自动清理过期回收站项目
    /// </summary>
    /// <param name="expireDays">过期天数（可选，默认 30 天）</param>
    /// <returns>清理结果</returns>
    [HttpPost("recycle-bin/auto-cleanup")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> AutoCleanupRecycleBin([FromQuery] int? expireDays = null)
    {
        var days = expireDays ?? 30;
        var result = await _cloudStorageService.CleanupExpiredRecycleBinItemsAsync(days);
        return Success(new { deletedCount = result.deletedCount, freedSpace = result.freedSpace },
            $"自动清理完成，删除 {result.deletedCount} 个文件，释放 {result.freedSpace} 字节");
    }

    #endregion

    #region 存储统计

    /// <summary>
    /// 获取用户存储使用统计信息
    /// </summary>
    /// <param name="userId">可选的用户ID（管理员可用）</param>
    /// <returns>存储使用情况</returns>
    [HttpGet("usage")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetStorageUsage([FromQuery] string? userId = null)
    {
        var usage = await _cloudStorageService.GetStorageUsageAsync(userId);
        return Success(usage);
    }

    #endregion

    #region 批量操作

    /// <summary>
    /// 批量永久删除文件项
    /// </summary>
    /// <param name="request">批量操作请求</param>
    /// <returns>批量操作结果</returns>
    [HttpPost("recycle-bin/batch-permanent-delete")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> BatchPermanentDelete([FromBody] BatchOperationRequest request)
    {
        if (request?.Ids == null || request.Ids.Count == 0)
            throw new ArgumentException("文件项ID列表不能为空");

        var successCount = 0;
        var failureCount = 0;
        var errors = new List<string>();

        foreach (var id in request.Ids)
        {
            try
            {
                await _cloudStorageService.PermanentDeleteFileItemAsync(id);
                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                errors.Add($"{id}: {ex.Message}");
            }
        }


        return Success(new { successCount, failureCount, errors },
            $"批量永久删除完成，成功 {successCount} 个，失败 {failureCount} 个");
    }

    /// <summary>
    /// 批量删除文件项（移至回收站）
    /// </summary>
    /// <param name="request">批量操作请求</param>
    /// <returns>批量操作结果</returns>
    [HttpPost("items/batch-delete")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchDelete([FromBody] BatchOperationRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            throw new ArgumentException("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchDeleteAsync(request.Ids);
        return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    /// <summary>
    /// 批量移动文件项
    /// </summary>
    /// <param name="request">批量移动请求</param>
    /// <returns>批量操作结果</returns>
    [HttpPost("items/batch-move")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchMove([FromBody] BatchMoveRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            throw new ArgumentException("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchMoveAsync(request.Ids, request.TargetParentId);
        return Success(result, $"批量移动完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    /// <summary>
    /// 批量复制文件项
    /// </summary>
    /// <param name="request">批量复制请求</param>
    /// <returns>批量操作结果</returns>
    [HttpPost("items/batch-copy")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchCopy([FromBody] BatchCopyRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            throw new ArgumentException("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchCopyAsync(request.Ids, request.TargetParentId);
        return Success(null, $"批量复制完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    #endregion
}
