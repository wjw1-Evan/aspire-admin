using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

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
        _logger.LogInformation("创建文件夹, FolderId: {FolderId}", folder.Id);
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
        _logger.LogInformation("上传文件, FileId: {FileId}, FileName: {FileName}", fileItem.Id, request.File.FileName);
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
            return ValidationError("文件列表不能为空");

        var result = await _cloudStorageService.UploadMultipleFilesAsync(files, parentId ?? string.Empty);
        _logger.LogInformation("批量上传文件, Count: {Count}", files.Count);
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
            return ValidationError("文件项ID不能为空");

        var fileItem = await _cloudStorageService.GetFileItemAsync(id);
        if (fileItem == null)
            return NotFoundError("文件项", id);

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
    public async Task<IActionResult> GetFileItems([FromQuery] string? parentId, [FromQuery] FileListQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        var result = await _cloudStorageService.GetFileItemsAsync(parentId ?? string.Empty, query);
        return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
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
            return ValidationError("文件项ID不能为空");

        var fileItem = await _cloudStorageService.RenameFileItemAsync(id, request.NewName);
        _logger.LogInformation("重命名文件, Id: {Id}", id);
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
            return ValidationError("文件项ID不能为空");

        var fileItem = await _cloudStorageService.MoveFileItemAsync(id, request.NewParentId);
        _logger.LogInformation("移动文件, Id: {Id}", id);
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
            return ValidationError("文件项ID不能为空");

        var fileItem = await _cloudStorageService.CopyFileItemAsync(id, request.NewParentId, request.NewName);
        _logger.LogInformation("复制文件, Id: {Id}", id);
        return Success(fileItem, "复制成功");
    }

    [HttpDelete("items/{id}")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        await _cloudStorageService.DeleteFileItemAsync(id);
        _logger.LogInformation("删除文件项 (移动到回收站), Id: {Id}", id);
        return Success(null, "已移动到回收站");
    }

    #endregion

    #region 文件下载和预览

    [HttpGet("items/{id}/download")]
    public async Task<IActionResult> DownloadFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

        var fileItem = await _cloudStorageService.GetFileItemAsync(id);
        if (fileItem == null)
            return NotFoundError("文件", id);

        var stream = await _cloudStorageService.DownloadFileAsync(id);
        _logger.LogInformation("下载文件, Id: {Id}", id);

        return File(stream, fileItem.MimeType, fileItem.Name);
    }

    [HttpGet("folders/{id}/download")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DownloadFolderAsZip(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件夹ID不能为空");

        var stream = await _cloudStorageService.DownloadFolderAsZipAsync(id);
        _logger.LogInformation("下载文件夹ZIP, Id: {Id}", id);
        return File(stream, "application/zip", $"folder-{id}.zip");
    }

    [HttpGet("items/{id}/preview")]
    public async Task<IActionResult> PreviewFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

        var previewInfo = await _cloudStorageService.GetPreviewInfoAsync(id);
        return Success(previewInfo);
    }

    [HttpGet("items/{id}/thumbnail")]
    public async Task<IActionResult> GetThumbnail(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

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
    public async Task<IActionResult> SearchFiles([FromQuery] FileSearchQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        try
        {
            var result = await _cloudStorageService.SearchFilesAsync(query);
            return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "搜索失败");
            return ServerError("搜索失败，请稍后重试");
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
            return ValidationError("返回数量必须在 1-100 之间");

        try
        {
            var files = await _cloudStorageService.GetRecentFilesAsync(count);
            return Success(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取最近文件失败");
            return ServerError("获取最近文件失败，请稍后重试");
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
            return ServerError("获取回收站统计失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取回收站项目列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <param name="sortBy">排序字段</param>
    /// <param name="sortOrder">排序顺序</param>
    /// <param name="type">文件类型筛选</param>
    /// <returns>分页回收站项目列表</returns>
    [HttpGet("recycle")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleItems(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "deletedAt",
        [FromQuery] string sortOrder = "desc",
        [FromQuery] FileItemType? type = null)
    {
        var query = new RecycleBinQuery
        {
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortOrder = sortOrder,
            Type = type
        };
        var result = await _cloudStorageService.GetRecycleBinItemsAsync(query);
        return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
    }

    /// <summary>
    /// 获取回收站项目 (通过查询对象)
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>分页回收站项目列表</returns>
    [HttpGet("recycle-bin")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleBinItems([FromQuery] RecycleBinQuery query)
    {
        var result = await _cloudStorageService.GetRecycleBinItemsAsync(query);
        return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
    }

    [HttpPost("recycle-bin/{id}/restore")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> RestoreFileItem(string id, [FromBody] RestoreRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        var fileItem = await _cloudStorageService.RestoreFileItemAsync(id, request?.NewParentId);
        _logger.LogInformation("恢复文件, Id: {Id}", id);
        return Success(fileItem, "恢复成功");
    }

    [HttpDelete("recycle-bin/{id}")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> PermanentDeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        await _cloudStorageService.PermanentDeleteFileItemAsync(id);
        _logger.LogInformation("永久删除文件, Id: {Id}", id);
        return Success(null, "文件已永久删除");
    }

    [HttpDelete("recycle-bin/empty")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> EmptyRecycleBin()
    {
        await _cloudStorageService.EmptyRecycleBinAsync();
        _logger.LogInformation("清空回收站");
        return Success(null, "回收站已清空");
    }

    [HttpPost("recycle-bin/auto-cleanup")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> AutoCleanupRecycleBin([FromQuery] int? expireDays = null)
    {
        var days = expireDays ?? 30;
        var result = await _cloudStorageService.CleanupExpiredRecycleBinItemsAsync(days);
        _logger.LogInformation("自动清理回收站, Days: {Days}, Deleted: {Count}", days, result.deletedCount);
        return Success(new { deletedCount = result.deletedCount, freedSpace = result.freedSpace },
            $"自动清理完成，删除 {result.deletedCount} 个文件，释放 {result.freedSpace} 字节");
    }

    #endregion

    #region 存储统计

    [HttpGet("quota/usage")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetStorageUsage([FromQuery] string? userId = null)
    {
        var usage = await _cloudStorageService.GetStorageUsageAsync(userId);
        return Success(usage);
    }

    #endregion

    #region 批量操作

    [HttpPost("recycle-bin/batch-permanent-delete")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> BatchPermanentDelete([FromBody] BatchOperationRequest request)
    {
        if (request?.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

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

        _logger.LogInformation("批量永久删除, Success: {SuccessCount}, Failure: {FailureCount}", successCount, failureCount);

        return Success(new { successCount, failureCount, errors },
            $"批量永久删除完成，成功 {successCount} 个，失败 {failureCount} 个");
    }

    [HttpPost("items/batch-delete")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchDelete([FromBody] BatchOperationRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchDeleteAsync(request.Ids);
        _logger.LogInformation("批量删除, Success: {SuccessCount}, Failure: {FailureCount}", result.SuccessCount, result.FailureCount);
        return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    [HttpPost("items/batch-move")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchMove([FromBody] BatchMoveRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchMoveAsync(request.Ids, request.TargetParentId);
        _logger.LogInformation("批量移动, Success: {SuccessCount}, Failure: {FailureCount}", result.SuccessCount, result.FailureCount);
        return Success(result, $"批量移动完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    [HttpPost("items/batch-copy")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchCopy([FromBody] BatchCopyRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        var result = await _cloudStorageService.BatchCopyAsync(request.Ids, request.TargetParentId);
        _logger.LogInformation("批量复制, Success: {SuccessCount}, Failure: {FailureCount}", result.SuccessCount, result.FailureCount);
        return Success(null, $"批量复制完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
    }

    #endregion
}

#region 请求模型

/// <summary>
/// 创建文件夹请求模型
/// </summary>
public class CreateFolderRequest
{
    /// <summary>文件夹名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>父文件夹ID</summary>
    public string ParentId { get; set; } = string.Empty;
}

/// <summary>
/// 上传文件请求模型
/// </summary>
public class UploadFileRequest
{
    /// <summary>上传的文件</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>父文件夹ID</summary>
    public string ParentId { get; set; } = string.Empty;

    /// <summary>是否覆盖同名文件</summary>
    public bool Overwrite { get; set; } = false;
}

/// <summary>
/// 重命名请求模型
/// </summary>
public class RenameRequest
{
    /// <summary>新名称</summary>
    public string NewName { get; set; } = string.Empty;
}

/// <summary>
/// 移动请求模型
/// </summary>
public class MoveRequest
{
    /// <summary>新的父文件夹ID</summary>
    public string NewParentId { get; set; } = string.Empty;
}

/// <summary>
/// 复制请求模型
/// </summary>
public class CopyRequest
{
    /// <summary>目标父文件夹ID</summary>
    public string NewParentId { get; set; } = string.Empty;

    /// <summary>新名称（可选）</summary>
    public string? NewName { get; set; }
}

/// <summary>
/// 恢复请求模型
/// </summary>
public class RestoreRequest
{
    /// <summary>新的父文件夹ID（可选）</summary>
    public string? NewParentId { get; set; }
}

/// <summary>
/// 批量操作请求模型
/// </summary>
public class BatchOperationRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];
}

/// <summary>
/// 批量移动请求模型
/// </summary>
public class BatchMoveRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];

    /// <summary>目标父文件夹ID</summary>
    public string TargetParentId { get; set; } = string.Empty;
}

/// <summary>
/// 批量复制请求模型
/// </summary>
public class BatchCopyRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];

    /// <summary>目标父文件夹ID</summary>
    public string TargetParentId { get; set; } = string.Empty;
}

#endregion
