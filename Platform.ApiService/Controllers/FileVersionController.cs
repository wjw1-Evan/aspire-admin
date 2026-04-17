using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Dynamic.Core;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

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
    /// 获取文件版本列表（分页）
    /// </summary>
    /// <param name="fileId">文件ID</param>
    /// <returns>版本列表</returns>
    /// <param name="request">分页请求参数</param>
    [HttpGet("list")]
    public async Task<IActionResult> GetVersionList([FromQuery] string fileId, [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            throw new ArgumentException("文件ID不能为空");

        if (request.Page < 1 || request.PageSize < 1 || request.PageSize > 500)
            throw new ArgumentException("分页参数不合法");

        try
        {
            var pagedResult = await _fileVersionService.GetVersionHistoryPaginatedAsync(fileId, request);
            return Success(pagedResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本列表失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
        }
    }

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
            throw new ArgumentException("文件ID不能为空");

        var validation = ValidateModelState();
        if (validation != null) return validation;

        try
        {
            var version = await _fileVersionService.CreateVersionAsync(fileId, request.File, request.Comment);
            return Success(version, "版本创建成功");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建版本失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("文件ID不能为空");

        try
        {
            var versions = await _fileVersionService.GetVersionHistoryAsync(fileId);
            return Success(versions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本历史失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.GetVersionAsync(versionId);
            if (version == null)
                throw new ArgumentException("版本 {versionId} 不存在");

            return Success(version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本详情失败, VersionId: {VersionId}", versionId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("文件ID不能为空");

        if (versionNumber < 1)
            throw new ArgumentException("版本号必须大于0");

        try
        {
            var version = await _fileVersionService.RestoreVersionAsync(fileId, versionNumber);
            return Success(version, "版本恢复成功");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "恢复版本失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本ID不能为空");

        try
        {
            await _fileVersionService.DeleteVersionAsync(versionId);
            return Success(null, "版本已删除");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除版本失败, VersionId: {VersionId}", versionId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.GetVersionAsync(versionId);
            if (version == null)
                throw new ArgumentException("版本 {versionId} 不存在");

            var stream = await _fileVersionService.DownloadVersionAsync(versionId);

            var fileName = $"version_{version.VersionNumber}_{DateTime.Now:yyyyMMdd_HHmmss}";
            return File(stream, "application/octet-stream", fileName);
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "下载版本失败, VersionId: {VersionId}", versionId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本1 ID不能为空");

        if (string.IsNullOrWhiteSpace(versionId2))
            throw new ArgumentException("版本2 ID不能为空");

        if (versionId1 == versionId2)
            throw new ArgumentException("不能比较相同的版本");

        try
        {
            var comparison = await _fileVersionService.CompareVersionsAsync(versionId1, versionId2);
            return Success(comparison);
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "版本比较失败");
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("文件ID不能为空");

        try
        {
            var version = await _fileVersionService.GetCurrentVersionAsync(fileId);
            if (version == null)
                throw new ArgumentException("当前版本 {fileId} 不存在");

            return Success(version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取当前版本失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本ID不能为空");

        try
        {
            var version = await _fileVersionService.SetAsCurrentVersionAsync(versionId);
            return Success(version, "已设置为当前版本");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "设置当前版本失败, VersionId: {VersionId}", versionId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("文件ID不能为空");

        try
        {
            var statistics = await _fileVersionService.GetVersionStatisticsAsync(fileId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本统计失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("文件ID不能为空");

        if (keepCount < 1 || keepCount > 100)
            throw new ArgumentException("保留版本数量必须在 1-100 之间");

        try
        {
            var result = await _fileVersionService.CleanupOldVersionsAsync(fileId, keepCount);
            return Success(result, $"清理完成，删除了 {result.SuccessCount} 个旧版本");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "清理版本失败, FileId: {FileId}", fileId);
            throw new ArgumentException("服务器内部错误");
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
            throw new ArgumentException("版本ID列表不能为空");

        if (request.VersionIds.Count > 100)
            throw new ArgumentException("批量操作最多支持100个版本");

        try
        {
            var result = await _fileVersionService.BatchDeleteVersionsAsync(request.VersionIds);
            return Success(result, $"批量删除完成，成功 {result.SuccessCount} 个，失败 {result.FailureCount} 个");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量删除版本失败");
            throw new ArgumentException("服务器内部错误");
        }
    }

    #endregion
}
