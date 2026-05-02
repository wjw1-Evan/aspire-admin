using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 看板版本管理控制器
/// 提供看板版本历史、恢复、比较等功能
/// </summary>
[ApiController]
[Route("api/dashboard-version")]
[RequireMenu("data-dashboard")]
public class DashboardVersionController : BaseApiController
{
    private readonly IDashboardVersionService _versionService;
    private readonly ILogger<DashboardVersionController> _logger;

    public DashboardVersionController(
        IDashboardVersionService versionService,
        ILogger<DashboardVersionController> logger)
    {
        _versionService = versionService ?? throw new ArgumentNullException(nameof(versionService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 版本管理

    /// <summary>
    /// 获取看板版本列表（分页）
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> GetVersionList([FromQuery] string dashboardId, [FromQuery] ProTableRequest request)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        var pagedResult = await _versionService.GetVersionHistoryPaginatedAsync(dashboardId, request);
        return Success(pagedResult);
    }

    /// <summary>
    /// 创建看板版本快照
    /// </summary>
    [HttpPost("{dashboardId}/versions")]
    public async Task<IActionResult> CreateVersion(string dashboardId, [FromBody] CreateDashboardVersionRequest request)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        var userId = RequiredUserId;
        try
        {
            var version = await _versionService.CreateVersionAsync(dashboardId, userId, request?.Comment);
            return Success(version, "版本创建成功");
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建看板版本失败, DashboardId: {DashboardId}", dashboardId);
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 获取看板版本历史
    /// </summary>
    [HttpGet("{dashboardId}/versions")]
    public async Task<IActionResult> GetVersionHistory(string dashboardId)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        try
        {
            var versions = await _versionService.GetVersionHistoryAsync(dashboardId);
            return Success(versions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本历史失败, DashboardId: {DashboardId}", dashboardId);
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 获取版本详情
    /// </summary>
    [HttpGet("versions/{versionId}")]
    public async Task<IActionResult> GetVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            throw new ArgumentException("版本ID不能为空");

        try
        {
            var version = await _versionService.GetVersionAsync(versionId);
            if (version == null)
                throw new ArgumentException($"版本 {versionId} 不存在");

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
    [HttpPost("{dashboardId}/versions/{versionNumber}/restore")]
    public async Task<IActionResult> RestoreVersion(string dashboardId, int versionNumber)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        if (versionNumber < 1)
            throw new ArgumentException("版本号必须大于0");

        var userId = RequiredUserId;
        try
        {
            var version = await _versionService.RestoreVersionAsync(dashboardId, versionNumber, userId);
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
            _logger.LogError(ex, "恢复版本失败, DashboardId: {DashboardId}", dashboardId);
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 删除指定版本
    /// </summary>
    [HttpDelete("versions/{versionId}")]
    public async Task<IActionResult> DeleteVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            throw new ArgumentException("版本ID不能为空");

        var userId = RequiredUserId;
        try
        {
            await _versionService.DeleteVersionAsync(versionId, userId);
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
    /// 比较两个版本的差异
    /// </summary>
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
            var comparison = await _versionService.CompareVersionsAsync(versionId1, versionId2);
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
    /// 获取看板的当前版本
    /// </summary>
    [HttpGet("{dashboardId}/current-version")]
    public async Task<IActionResult> GetCurrentVersion(string dashboardId)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        try
        {
            var version = await _versionService.GetCurrentVersionAsync(dashboardId);
            if (version == null)
                throw new ArgumentException($"看板 {dashboardId} 暂无版本记录");

            return Success(version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取当前版本失败, DashboardId: {DashboardId}", dashboardId);
            throw new ArgumentException("服务器内部错误");
        }
    }

    /// <summary>
    /// 设置版本为当前版本
    /// </summary>
    [HttpPost("versions/{versionId}/set-current")]
    public async Task<IActionResult> SetAsCurrentVersion(string versionId)
    {
        if (string.IsNullOrWhiteSpace(versionId))
            throw new ArgumentException("版本ID不能为空");

        var userId = RequiredUserId;
        try
        {
            var version = await _versionService.SetAsCurrentVersionAsync(versionId, userId);
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

    #region 版本统计

    /// <summary>
    /// 获取版本统计信息
    /// </summary>
    [HttpGet("{dashboardId}/statistics")]
    public async Task<IActionResult> GetVersionStatistics(string dashboardId)
    {
        if (string.IsNullOrWhiteSpace(dashboardId))
            throw new ArgumentException("看板ID不能为空");

        try
        {
            var statistics = await _versionService.GetVersionStatisticsAsync(dashboardId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取版本统计失败, DashboardId: {DashboardId}", dashboardId);
            throw new ArgumentException("服务器内部错误");
        }
    }

    #endregion
}
