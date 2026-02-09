using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 项目统计报表控制器
/// </summary>
[ApiController]
[Route("api/project/statistics")]
[Authorize]
public class ProjectStatisticsController : BaseApiController
{
    private readonly IProjectStatisticsService _statisticsService;
    private readonly IUserService _userService;
    private readonly ILogger<ProjectStatisticsController> _logger;

    /// <summary>
    /// 初始化项目统计报表控制器
    /// </summary>
    /// <param name="statisticsService">项目统计服务</param>
    /// <param name="userService">用户服务</param>
    /// <param name="logger">日志记录器</param>
    public ProjectStatisticsController(
        IProjectStatisticsService statisticsService,
        IUserService userService,
        ILogger<ProjectStatisticsController> logger)
    {
        _statisticsService = statisticsService;
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// 获取仪表盘统计数据
    /// </summary>
    /// <param name="period">统计周期</param>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    /// <returns>仪表盘统计数据</returns>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStatistics(
        [FromQuery] StatisticsPeriod period = StatisticsPeriod.Month,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = GetRequiredUserId();
            var user = await _userService.GetUserByIdAsync(userId);
            if (user?.CurrentCompanyId == null)
            {
                return ValidationError("无法获取企业信息的统计数据");
            }

            var stats = await _statisticsService.GetDashboardStatisticsAsync(user.CurrentCompanyId, period, startDate, endDate);
            return Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取项目统计数据失败");
            return Error("Failed to get project statistics", ex.Message);
        }
    }

    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    /// <param name="period">统计周期</param>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    /// <param name="statisticsData">前台传递的统计数据（可选）</param>
    /// <returns>AI 生成的markdown 报告</returns>
    [HttpPost("ai-report")]
    public async Task<IActionResult> GenerateAiReport(
        [FromQuery] StatisticsPeriod period = StatisticsPeriod.Month,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromBody] object? statisticsData = null)
    {
        try
        {
            var userId = GetRequiredUserId();
            var user = await _userService.GetUserByIdAsync(userId);
            if (user?.CurrentCompanyId == null)
            {
                return ValidationError("无法获取企业信息的统计数据");
            }

            var report = await _statisticsService.GenerateAiReportAsync(user.CurrentCompanyId, period, startDate, endDate, statisticsData);
            return Success(data: report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成 AI 报告失败");
            return Error("Failed to generate AI report", ex.Message);
        }
    }
}
