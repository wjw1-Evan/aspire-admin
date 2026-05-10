using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
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
    public ParkInvestmentController(IParkInvestmentService investmentService, ILogger<ParkInvestmentController> logger)
    {
        _investmentService = investmentService ?? throw new ArgumentNullException(nameof(investmentService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 线索管理

    /// <summary>
    /// 获取线索列表
    /// </summary>
    [HttpGet("leads/list")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> GetLeads([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _investmentService.GetLeadsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个线索
    /// </summary>
    [HttpGet("leads/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> GetLead(string id)
    {
        var result = await _investmentService.GetLeadByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建线索
    /// </summary>
    [HttpPost("leads")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> CreateLead([FromBody] CreateInvestmentLeadRequest request)
    {
        var result = await _investmentService.CreateLeadAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新线索
    /// </summary>
    [HttpPut("leads/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> UpdateLead(string id, [FromBody] CreateInvestmentLeadRequest request)
    {
        var result = await _investmentService.UpdateLeadAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除线索
    /// </summary>
    [HttpDelete("leads/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> DeleteLead(string id)
    {
        var result = await _investmentService.DeleteLeadAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    /// <summary>
    /// 将线索转化为项目
    /// </summary>
    [HttpPost("leads/{id}/convert")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> ConvertLeadToProject(string id)
    {
        var result = await _investmentService.ConvertLeadToProjectAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    #endregion

    #region 项目管理

    /// <summary>
    /// 获取项目列表
    /// </summary>
    [HttpGet("projects/list")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> GetProjects([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _investmentService.GetProjectsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个项目
    /// </summary>
    [HttpGet("projects/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> GetProject(string id)
    {
        var result = await _investmentService.GetProjectByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建项目
    /// </summary>
    [HttpPost("projects")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> CreateProject([FromBody] CreateInvestmentProjectRequest request)
    {
        var result = await _investmentService.CreateProjectAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新项目
    /// </summary>
    [HttpPut("projects/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] CreateInvestmentProjectRequest request)
    {
        var result = await _investmentService.UpdateProjectAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除项目
    /// </summary>
    [HttpDelete("projects/{id}")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> DeleteProject(string id)
    {
        var result = await _investmentService.DeleteProjectAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取招商统计
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("park-management-investment")]
    public async Task<IActionResult> GetInvestmentStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _investmentService.GetStatisticsAsync(startDate, endDate);
        return Success(result);
    }

    #endregion
}
