using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 文件版本控制器
/// 提供文件版本管理、历史记录、版本比较等功能
/// </summary>
[ApiController]
[Route("api/file-version")]
[RequireMenu("cloud-storage-files")]
public class FileVersionController : BaseApiController
{
    private readonly IFileVersionService _fileVersionService;
    private readonly ILogger<FileVersionController> _logger;

    /// <summary>
    /// 初始化文件版本控制器
    /// </summary>
    public FileVersionController(
        IFileVersionService fileVersionService,
        ILogger<FileVersionController> logger)
    {
        _fileVersionService = fileVersionService ?? throw new ArgumentNullException(nameof(fileVersionService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 版本管理

    /// <summary>
    /// 创建文件版本
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <param name="request">创建版本请求</param>
    /// <returns>创建的版本信息</returns>
    [HttpPost("{fileId}/versions")]
    public async Task<IActionResult> CreateVersion(string fileId, [FromForm] CreateVersionRequest request)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var version = await _fileVersionService.CreateVersionAsync(fileId, request.File, request.Comment);
            LogOperation("CreateVersion", version.Id, new { fileId, request.Comment });
            return Success(version, "版本创建成功");
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
            LogError("CreateVersion", ex, fileId);
            return ServerError("创建版本失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件版本历史
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <returns>版本历史列表</returns>
    [HttpGet("{fileId}/versions")]
    public async Task<IActionResult> GetVersionHistory(string fileId)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        try
        {
            var versions = await _fileVersionService.GetVersionHistoryAsync(fileId);
            return Success(versions);
        }
        catch (Exception ex)
        {
            LogError("GetVersionHistory", ex, fileId);
            return ServerError("获取版本历史失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取版本详情
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>版本详情</returns>
    [HttpGet("versions/{versionId}")]
    public async Task<IActionResult> GetVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            return ValidationError("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.GetVersionAsync(versionId);
            if (version == null)
                return NotFoundError("版本", versionId);

            return Success(version);
        }
        catch (Exception ex)
        {
            LogError("GetVersion", ex, versionId);
            return ServerError("获取版本详情失败，请稍后重试");
        }
    }

    /// <summary>
    /// 恢复到指定版本
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <param name="versionNumber">版本号</param>
    /// <returns>恢复后的版本信息</returns>
    [HttpPost("{fileId}/versions/{versionNumber}/restore")]
    public async Task<IActionResult> RestoreVersion(string fileId, int versionNumber)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        if (versionNumber < 1)
            return ValidationError("版本号必须大于0");

        try
        {
            var version = await _fileVersionService.RestoreVersionAsync(fileId, versionNumber);
            LogOperation("RestoreVersion", version.Id, new { fileId, versionNumber });
            return Success(version, "版本恢复成功");
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
            LogError("RestoreVersion", ex, fileId);
            return ServerError("版本恢复失败，请稍后重试");
        }
    }

    /// <summary>
    /// 删除指定版本
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("versions/{versionId}")]
    public async Task<IActionResult> DeleteVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            return ValidationError("版本ID不能为空");

        try
        {
            await _fileVersionService.DeleteVersionAsync(versionId);
            LogOperation("DeleteVersion", versionId);
            return Success("版本已删除");
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
            LogError("DeleteVersion", ex, versionId);
            return ServerError("删除版本失败，请稍后重试");
        }
    }

    /// <summary>
    /// 下载指定版本的文件
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>文件流</returns>
    [HttpGet("versions/{versionId}/download")]
    public async Task<IActionResult> DownloadVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            return ValidationError("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.GetVersionAsync(versionId);
            if (version == null)
                return NotFoundError("版本", versionId);

            var stream = await _fileVersionService.DownloadVersionAsync(versionId);
            LogOperation("DownloadVersion", versionId);

            var fileName = $"version_{version.VersionNumber}_{DateTime.Now:yyyyMMdd_HHmmss}";
            return File(stream, "application/octet-stream", fileName);
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
            LogError("DownloadVersion", ex, versionId);
            return ServerError("下载版本失败，请稍后重试");
        }
    }

    /// <summary>
    /// 比较两个版本的差异
    /// </summary>
    /// <param name="versionId1">版本1 ID</param>
    /// <param name="versionId2">版本2 ID</param>
    /// <returns>版本比较结果</returns>
    [HttpGet("versions/{versionId1}/compare/{versionId2}")]
    public async Task<IActionResult> CompareVersions(string versionId1, string versionId2)
    {
        if (string.IsNullOrWhiteSpace(versionId1))
            return ValidationError("版本1 ID不能为空");

        if (string.IsNullOrWhiteSpace(versionId2))
            return ValidationError("版本2 ID不能为空");

        if (versionId1 == versionId2)
            return ValidationError("不能比较相同的版本");

        try
        {
            var comparison = await _fileVersionService.CompareVersionsAsync(versionId1, versionId2);
            LogOperation("CompareVersions", null, new { versionId1, versionId2 });
            return Success(comparison);
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
            LogError("CompareVersions", ex);
            return ServerError("版本比较失败，请稍后重试");
        }
    }

    /// <summary>
    /// 获取文件的当前版本
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <returns>当前版本信息</returns>
    [HttpGet("{fileId}/current-version")]
    public async Task<IActionResult> GetCurrentVersion(string fileId)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        try
        {
            var version = await _fileVersionService.GetCurrentVersionAsync(fileId);
            if (version == null)
                return NotFoundError("当前版本", fileId);

            return Success(version);
        }
        catch (Exception ex)
        {
            LogError("GetCurrentVersion", ex, fileId);
            return ServerError("获取当前版本失败，请稍后重试");
        }
    }

    /// <summary>
    /// 设置版本为当前版本
    /// </summary>
    /// <param name="versionId">版本ID</param>
    /// <returns>设置后的版本信息</returns>
    [HttpPost("versions/{versionId}/set-current")]
    public async Task<IActionResult> SetAsCurrentVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            return ValidationError("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.SetAsCurrentVersionAsync(versionId);
            LogOperation("SetAsCurrentVersion", versionId);
            return Success(version, "已设置为当前版本");
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
            LogError("SetAsCurrentVersion", ex, versionId);
            return ServerError("设置当前版本失败，请稍后重试");
        }
    }

    #endregion

    #region 版本统计和管理

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <returns>版本统计信息</returns>
    [HttpGet("{fileId}/statistics")]
    public async Task<IActionResult> GetVersionStatistics(string fileId)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        try
        {
            var statistics = await _fileVersionService.GetVersionStatisticsAsync(fileId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            LogError("GetVersionStatistics", ex, fileId);
            return ServerError("获取版本统计失败，请稍后重试");
        }
    }

    /// <summary>
    /// 清理过期版本
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <param name="keepCount">保留版本数量</param>
    /// <returns>清理结果</returns>
    [HttpPost("{fileId}/cleanup")]
    public async Task<IActionResult> CleanupOldVersions(string fileId, [FromQuery] int keepCount = 10)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return ValidationError("文件ID不能为空");

        if (keepCount < 1 || keepCount > 100)
            return ValidationError("保留版本数量必须在 1-100 之间");

        try
        {
            var result = await _fileVersionService.CleanupOldVersionsAsync(fileId, keepCount);
            LogOperation("CleanupOldVersions", fileId, new { keepCount, result.SuccessCount });
            return Success(result, $"清理完成，删除了 {result.SuccessCount} 个旧版本");
        }
        catch (Exception ex)
        {
            LogError("CleanupOldVersions", ex, fileId);
            return ServerError("清理版本失败，请稍后重试");
        }
    }

    /// <summary>
    /// 批量删除版本
    /// </summary>
    /// <param name="request">批量删除请求</param>
    /// <returns>删除结果</returns>
    [HttpPost("batch/delete")]
    public async Task<IActionResult> BatchDeleteVersions([FromBody] BatchDeleteVersionsRequest request)
    {
        var validation = ValidateModelState();
        if (validation != null) return validation;

        if (request.VersionIds == null || request.VersionIds.Count == 0)
            return ValidationError("版本ID列表不能为空");

        if (request.VersionIds.Count > 100)
            return ValidationError("批量操作最多支持100个版本");

        try
        {
            var result = await _fileVersionService.BatchDeleteVersionsAsync(request.VersionIds);
            LogOperation("BatchDeleteVersions", null, new { request.VersionIds, result.SuccessCount, result.FailureCount });
            return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            LogError("BatchDeleteVersions", ex);
            return ServerError("批量删除版本失败，请稍后重试");
        }
    }

    #endregion
}

#region 请求模型

/// <summary>
/// 创建版本请求模型
/// </summary>
public class CreateVersionRequest
{
    /// <summary>文件内容</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>版本说明</summary>
    public string? Comment { get; set; }
}

/// <summary>
/// 批量删除版本请求模型
/// </summary>
public class BatchDeleteVersionsRequest
{
    /// <summary>版本ID列表</summary>
    public List<string> VersionIds { get; set; } = [];
}

#endregion