using Microsoft.AspNetCore.Mvc;
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
[RequireMenu("cloud-storage")]
public class CloudStorageController : BaseApiController
{
    private readonly ICloudStorageService _cloudStorageService;
    private readonly ILogger<CloudStorageController> _logger;

    /// <summary>
    /// 初始化云存储控制器
    /// </summary>
    public CloudStorageController(
        ICloudStorageService cloudStorageService,
        ILogger<CloudStorageController> logger)
    {
        _cloudStorageService = cloudStorageService ?? throw new ArgumentNullException(nameof(cloudStorageService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 文件和文件夹管理

    /// <summary>
    /// 创建文件夹
    /// </summary>
    /// <param name="request">创建文件夹请求</param>
    /// <returns>创建的文件夹信息</returns>
    [HttpPost("folders")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var folder = await _cloudStorageService.CreateFolderAsync(request.Name, request.ParentId);
            LogOperation("CreateFolder", folder.Id, new { request.Name, request.ParentId });
            return Success(folder, "文件夹创建成功");
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
            LogError("CreateFolder", ex);
            return ServerError("创建文件夹失败，请稍后重试");
        }
    }

    /// <summary>
    /// 上传文件
    /// </summary>
    /// <param name="request">上传文件请求</param>
    /// <returns>上传的文件信息</returns>
    [HttpPost("upload")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> UploadFile([FromForm] UploadFileRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var fileItem = await _cloudStorageService.UploadFileAsync(request.File, request.ParentId, request.Overwrite);
            LogOperation("UploadFile", fileItem.Id, new { request.File.FileName, request.ParentId, request.Overwrite });
            return Success(fileItem, "文件上传成功");
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
            LogError("UploadFile", ex);
            return ServerError("文件上传失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件项详情
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>文件项详情</returns>
    [HttpGet("{id}")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> GetFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        try
        {
            var fileItem = await _cloudStorageService.GetFileItemAsync(id);
            if (fileItem == null)
                return NotFoundError("文件项", id);

            return Success(fileItem);
        }
        catch (Exception ex)
        {
            LogError("GetFileItem", ex, id);
            return ServerError("获取文件项失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件项列表
    /// </summary>
    /// <param name="parentId">父文件夹ID</param>
    /// <param name="query">查询参数</param>
    /// <returns>文件项列表</returns>
    [HttpGet("list")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> GetFileItems([FromQuery] string? parentId, [FromQuery] FileListQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        try
        {
            var result = await _cloudStorageService.GetFileItemsAsync(parentId ?? string.Empty, query);
            return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            LogError("GetFileItems", ex);
            return ServerError("获取文件列表失败，请稍后重试");
        }
    }

    /// <summary>
    /// 重命名文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">重命名请求</param>
    /// <returns>重命名后的文件项</returns>
    [HttpPut("{id}/rename")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> RenameFileItem(string id, [FromBody] RenameRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var fileItem = await _cloudStorageService.RenameFileItemAsync(id, request.NewName);
            LogOperation("RenameFileItem", id, new { request.NewName });
            return Success(fileItem, "重命名成功");
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
            LogError("RenameFileItem", ex, id);
            return ServerError("重命名失败，请稍后重试");
        }
    }

    /// <summary>
    /// 移动文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">移动请求</param>
    /// <returns>移动后的文件项</returns>
    [HttpPut("{id}/move")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> MoveFileItem(string id, [FromBody] MoveRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var fileItem = await _cloudStorageService.MoveFileItemAsync(id, request.NewParentId);
            LogOperation("MoveFileItem", id, new { request.NewParentId });
            return Success(fileItem, "移动成功");
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
            LogError("MoveFileItem", ex, id);
            return ServerError("移动失败，请稍后重试");
        }
    }

    /// <summary>
    /// 复制文件或文件夹
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">复制请求</param>
    /// <returns>复制后的文件项</returns>
    [HttpPost("{id}/copy")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> CopyFileItem(string id, [FromBody] CopyRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var fileItem = await _cloudStorageService.CopyFileItemAsync(id, request.NewParentId, request.NewName);
            LogOperation("CopyFileItem", id, new { request.NewParentId, request.NewName });
            return Success(fileItem, "复制成功");
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
            LogError("CopyFileItem", ex, id);
            return ServerError("复制失败，请稍后重试");
        }
    }

    /// <summary>
    /// 删除文件或文件夹（移动到回收站）
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("{id}")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        try
        {
            await _cloudStorageService.DeleteFileItemAsync(id);
            LogOperation("DeleteFileItem", id);
            return Success("文件已移动到回收站");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("DeleteFileItem", ex, id);
            return ServerError("删除失败，请稍后重试");
        }
    }

    #endregion

    #region 文件下载和预览

    /// <summary>
    /// 下载文件
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>文件流</returns>
    [HttpGet("{id}/download")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> DownloadFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

        try
        {
            var fileItem = await _cloudStorageService.GetFileItemAsync(id);
            if (fileItem == null)
                return NotFoundError("文件", id);

            var stream = await _cloudStorageService.DownloadFileAsync(id);
            LogOperation("DownloadFile", id);

            return File(stream, fileItem.MimeType, fileItem.Name);
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
            LogError("DownloadFile", ex, id);
            return ServerError("下载失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件预览信息
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>预览信息</returns>
    [HttpGet("{id}/preview")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> PreviewFile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

        try
        {
            var previewInfo = await _cloudStorageService.GetPreviewInfoAsync(id);
            return Success(previewInfo);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("PreviewFile", ex, id);
            return ServerError("获取预览信息失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件缩略图
    /// </summary>
    /// <param name="id">文件ID</param>
    /// <returns>缩略图流</returns>
    [HttpGet("{id}/thumbnail")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> GetThumbnail(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件ID不能为空");

        try
        {
            var stream = await _cloudStorageService.GetThumbnailAsync(id);
            return File(stream, "image/jpeg");
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
            LogError("GetThumbnail", ex, id);
            return ServerError("获取缩略图失败，请稍后重试");
        }
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
            LogError("SearchFiles", ex);
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
            LogError("GetRecentFiles", ex);
            return ServerError("获取最近文件失败，请稍后重试");
        }
    }

    #endregion

    #region 回收站管理

    /// <summary>
    /// 获取回收站文件列表
    /// </summary>
    /// <param name="query">查询参数</param>
    /// <returns>回收站文件列表</returns>
    [HttpGet("recycle-bin")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> GetRecycleBinItems([FromQuery] RecycleBinQuery query)
    {
        // 验证分页参数
        if (query.Page < 1 || query.Page > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (query.PageSize < 1 || query.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        try
        {
            var result = await _cloudStorageService.GetRecycleBinItemsAsync(query);
            return SuccessPaged(result.Data, result.Total, result.Page, result.PageSize);
        }
        catch (Exception ex)
        {
            LogError("GetRecycleBinItems", ex);
            return ServerError("获取回收站列表失败，请稍后重试");
        }
    }

    /// <summary>
    /// 从回收站恢复文件
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <param name="request">恢复请求</param>
    /// <returns>恢复后的文件项</returns>
    [HttpPost("{id}/restore")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> RestoreFileItem(string id, [FromBody] RestoreRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        try
        {
            var fileItem = await _cloudStorageService.RestoreFileItemAsync(id, request?.NewParentId);
            LogOperation("RestoreFileItem", id, new { request?.NewParentId });
            return Success(fileItem, "恢复成功");
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
            LogError("RestoreFileItem", ex, id);
            return ServerError("恢复失败，请稍后重试");
        }
    }

    /// <summary>
    /// 永久删除文件
    /// </summary>
    /// <param name="id">文件项ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("{id}/permanent")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> PermanentDeleteFileItem(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return ValidationError("文件项ID不能为空");

        try
        {
            await _cloudStorageService.PermanentDeleteFileItemAsync(id);
            LogOperation("PermanentDeleteFileItem", id);
            return Success("文件已永久删除");
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            LogError("PermanentDeleteFileItem", ex, id);
            return ServerError("永久删除失败，请稍后重试");
        }
    }

    /// <summary>
    /// 清空回收站
    /// </summary>
    /// <returns>清空结果</returns>
    [HttpDelete("recycle-bin/empty")]
    [RequireMenu("cloud-storage-recycle")]
    public async Task<IActionResult> EmptyRecycleBin()
    {
        try
        {
            await _cloudStorageService.EmptyRecycleBinAsync();
            LogOperation("EmptyRecycleBin");
            return Success("回收站已清空");
        }
        catch (Exception ex)
        {
            LogError("EmptyRecycleBin", ex);
            return ServerError("清空回收站失败，请稍后重试");
        }
    }

    #endregion

    #region 存储统计

    /// <summary>
    /// 获取存储使用情况
    /// </summary>
    /// <param name="userId">用户ID（可选）</param>
    /// <returns>存储使用信息</returns>
    [HttpGet("storage/usage")]
    [RequireMenu("cloud-storage-quota")]
    public async Task<IActionResult> GetStorageUsage([FromQuery] string? userId = null)
    {
        try
        {
            var usage = await _cloudStorageService.GetStorageUsageAsync(userId);
            return Success(usage);
        }
        catch (Exception ex)
        {
            LogError("GetStorageUsage", ex);
            return ServerError("获取存储使用情况失败，请稍后重试");
        }
    }

    #endregion

    #region 批量操作

    /// <summary>
    /// 批量删除文件项
    /// </summary>
    /// <param name="request">批量操作请求</param>
    /// <returns>删除结果</returns>
    [HttpPost("batch/delete")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchDelete([FromBody] BatchOperationRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        if (request.Ids.Count > 100)
            return ValidationError("批量操作最多支持100个文件项");

        try
        {
            var result = await _cloudStorageService.BatchDeleteAsync(request.Ids);
            LogOperation("BatchDelete", null, new { request.Ids, result.SuccessCount, result.FailureCount });
            return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            LogError("BatchDelete", ex);
            return ServerError("批量删除失败，请稍后重试");
        }
    }

    /// <summary>
    /// 批量移动文件项
    /// </summary>
    /// <param name="request">批量移动请求</param>
    /// <returns>移动结果</returns>
    [HttpPost("batch/move")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchMove([FromBody] BatchMoveRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        if (request.Ids.Count > 100)
            return ValidationError("批量操作最多支持100个文件项");

        try
        {
            var result = await _cloudStorageService.BatchMoveAsync(request.Ids, request.TargetParentId);
            LogOperation("BatchMove", null, new { request.Ids, request.TargetParentId, result.SuccessCount, result.FailureCount });
            return Success(result, $"批量移动完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            LogError("BatchMove", ex);
            return ServerError("批量移动失败，请稍后重试");
        }
    }

    /// <summary>
    /// 批量复制文件项
    /// </summary>
    /// <param name="request">批量复制请求</param>
    /// <returns>复制结果</returns>
    [HttpPost("batch/copy")]
    [RequireMenu("cloud-storage-files")]
    public async Task<IActionResult> BatchCopy([FromBody] BatchCopyRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.Ids == null || request.Ids.Count == 0)
            return ValidationError("文件项ID列表不能为空");

        if (request.Ids.Count > 100)
            return ValidationError("批量操作最多支持100个文件项");

        try
        {
            var result = await _cloudStorageService.BatchCopyAsync(request.Ids, request.TargetParentId);
            LogOperation("BatchCopy", null, new { request.Ids, request.TargetParentId, result.SuccessCount, result.FailureCount });
            return Success(result, $"批量复制完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            LogError("BatchCopy", ex);
            return ServerError("批量复制失败，请稍后重试");
        }
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