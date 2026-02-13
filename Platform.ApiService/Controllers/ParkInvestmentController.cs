using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区招商管理控制器
/// </summary>
[ApiController]
[Route("api/park/investment")]
public class ParkInvestmentController : BaseApiController
{
    private readonly IParkInvestmentService _investmentService;
    private readonly ILogger<ParkInvestmentController> _logger;

    /// <summary>
    /// 初始化招商管理控制器
    /// </summary>
    /// <param name="investmentService">招商管理服务</param>
    /// <param name="logger">日志服务</param>
    public ParkInvestmentController(IParkInvestmentService investmentService, ILogger<ParkInvestmentController> logger)
    {
        _investmentService = investmentService;
        _logger = logger;
    }

    #region 线索管理

    /// <summary>
    /// 获取线索列表
    /// </summary>
    [HttpPost("leads/list")]
    public async Task<IActionResult> GetLeads([FromBody] InvestmentLeadListRequest request)
    {
        try
        {
            var result = await _investmentService.GetLeadsAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取线索列表失败");
            return Error("ERROR", "获取线索列表失败");
        }
    }

    /// <summary>
    /// 获取单个线索
    /// </summary>
    [HttpGet("leads/{id}")]
    public async Task<IActionResult> GetLead(string id)
    {
        try
        {
            var result = await _investmentService.GetLeadByIdAsync(id);
            if (result == null)
                return Error("ERROR", "线索不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取线索详情失败: {Id}", id);
            return Error("ERROR", "获取线索详情失败");
        }
    }

    /// <summary>
    /// 创建线索
    /// </summary>
    [HttpPost("leads")]
    public async Task<IActionResult> CreateLead([FromBody] CreateInvestmentLeadRequest request)
    {
        try
        {
            var result = await _investmentService.CreateLeadAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建线索失败");
            return Error("ERROR", "创建线索失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新线索
    /// </summary>
    [HttpPut("leads/{id}")]
    public async Task<IActionResult> UpdateLead(string id, [FromBody] CreateInvestmentLeadRequest request)
    {
        try
        {
            var result = await _investmentService.UpdateLeadAsync(id, request);
            if (result == null)
                return Error("ERROR", "线索不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新线索失败: {Id}", id);
            return Error("ERROR", "更新线索失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除线索
    /// </summary>
    [HttpDelete("leads/{id}")]
    public async Task<IActionResult> DeleteLead(string id)
    {
        try
        {
            var result = await _investmentService.DeleteLeadAsync(id);
            if (!result)
                return Error("ERROR", "线索不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除线索失败: {Id}", id);
            return Error("ERROR", "删除线索失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 将线索转化为项目
    /// </summary>
    [HttpPost("leads/{id}/convert")]
    public async Task<IActionResult> ConvertLeadToProject(string id)
    {
        try
        {
            var result = await _investmentService.ConvertLeadToProjectAsync(id);
            if (result == null)
                return Error("ERROR", "线索不存在或状态不正确");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "转化线索失败: {Id}", id);
            return Error("ERROR", "转化线索失败: " + ex.Message);
        }
    }

    #endregion

    #region 项目管理

    /// <summary>
    /// 获取项目列表
    /// </summary>
    [HttpPost("projects/list")]
    public async Task<IActionResult> GetProjects([FromBody] InvestmentProjectListRequest request)
    {
        try
        {
            var result = await _investmentService.GetProjectsAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取项目列表失败");
            return Error("ERROR", "获取项目列表失败");
        }
    }

    /// <summary>
    /// 获取单个项目
    /// </summary>
    [HttpGet("projects/{id}")]
    public async Task<IActionResult> GetProject(string id)
    {
        try
        {
            var result = await _investmentService.GetProjectByIdAsync(id);
            if (result == null)
                return Error("ERROR", "项目不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取项目详情失败: {Id}", id);
            return Error("ERROR", "获取项目详情失败");
        }
    }

    /// <summary>
    /// 创建项目
    /// </summary>
    [HttpPost("projects")]
    public async Task<IActionResult> CreateProject([FromBody] CreateInvestmentProjectRequest request)
    {
        try
        {
            var result = await _investmentService.CreateProjectAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建项目失败");
            return Error("ERROR", "创建项目失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 更新项目
    /// </summary>
    [HttpPut("projects/{id}")]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] CreateInvestmentProjectRequest request)
    {
        try
        {
            var result = await _investmentService.UpdateProjectAsync(id, request);
            if (result == null)
                return Error("ERROR", "项目不存在");
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新项目失败: {Id}", id);
            return Error("ERROR", "更新项目失败: " + ex.Message);
        }
    }

    /// <summary>
    /// 删除项目
    /// </summary>
    [HttpDelete("projects/{id}")]
    public async Task<IActionResult> DeleteProject(string id)
    {
        try
        {
            var result = await _investmentService.DeleteProjectAsync(id);
            if (!result)
                return Error("ERROR", "项目不存在或无法删除");
            return Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除项目失败: {Id}", id);
            return Error("ERROR", "删除项目失败: " + ex.Message);
        }
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取招商统计
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetInvestmentStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var result = await _investmentService.GetStatisticsAsync(startDate, endDate);
            return Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取招商统计失败");
            return Error("ERROR", "获取招商统计失败");
        }
    }

    #endregion
}
