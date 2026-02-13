using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区统计报表控制器
/// </summary>
[ApiController]
[Route("api/park/statistics")]
public class ParkStatisticsController : BaseApiController
{
    private readonly IParkStatisticsService _statisticsService;
    private readonly ILogger<ParkStatisticsController> _logger;

    /// <summary>
    /// 初始化园区统计报表控制器
    /// </summary>
    /// <param name="statisticsService">统计服务</param>
    /// <param name="logger">日志记录器</param>
    public ParkStatisticsController(IParkStatisticsService statisticsService, ILogger<ParkStatisticsController> logger)
    {
        _statisticsService = statisticsService;
        _logger = logger;
    }

    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    [HttpPost("ai-report")]
    public async Task<IActionResult> GenerateAiReport(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromBody] object? statisticsData = null)
    {
        try
        {
            var result = await _statisticsService.GenerateAiReportAsync(startDate, endDate, statisticsData);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成 AI 报告失败");
            return Error("ERROR", "生成 AI 报告失败");
        }
    }
}
