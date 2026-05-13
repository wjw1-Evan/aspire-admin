using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 企业服务管理控制器
/// </summary>
[ApiController]
[Route("api/park/services")]
public class ParkEnterpriseServiceController : BaseApiController
{
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly ILogger<ParkEnterpriseServiceController> _logger;

    /// <summary>
    /// 初始化企业服务控制器
    /// </summary>
    public ParkEnterpriseServiceController(IParkEnterpriseServiceService enterpriseService, ILogger<ParkEnterpriseServiceController> logger)
    {
        _enterpriseService = enterpriseService ?? throw new ArgumentNullException(nameof(enterpriseService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 服务类别管理

    /// <summary>
    /// 获取服务类别列表
    /// </summary>
    [HttpGet("categories")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _enterpriseService.GetCategoriesAsync();
        return Success(result);
    }

    /// <summary>
    /// 创建服务类别
    /// </summary>
    [HttpPost("categories")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateServiceCategoryRequest request)
    {
        var result = await _enterpriseService.CreateCategoryAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新服务类别
    /// </summary>
    [HttpPut("categories/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] CreateServiceCategoryRequest request)
    {
        var result = await _enterpriseService.UpdateCategoryAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除服务类别
    /// </summary>
    [HttpDelete("categories/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        var result = await _enterpriseService.DeleteCategoryAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    /// <summary>
    /// 切换服务类别状态
    /// </summary>
    [HttpPut("categories/{id}/toggle")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> ToggleCategoryStatus(string id)
    {
        var result = await _enterpriseService.ToggleCategoryStatusAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region 服务申请管理

    /// <summary>
    /// 获取服务申请列表
    /// </summary>
    [HttpGet("requests/list")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetRequests([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _enterpriseService.GetRequestsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个服务申请
    /// </summary>
    [HttpGet("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetRequest(string id)
    {
        var result = await _enterpriseService.GetRequestByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建服务申请
    /// </summary>
    [HttpPost("requests")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestRequest request)
    {
        var result = await _enterpriseService.CreateRequestAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新服务申请
    /// </summary>
    [HttpPut("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> UpdateRequest(string id, [FromBody] CreateServiceRequestRequest request)
    {
        var result = await _enterpriseService.UpdateRequestAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 更新服务申请状态
    /// </summary>
    [HttpPut("requests/{id}/status")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> UpdateRequestStatus(string id, [FromBody] UpdateServiceRequestStatusRequest request)
    {
        var result = await _enterpriseService.UpdateRequestStatusAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除服务申请
    /// </summary>
    [HttpDelete("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> DeleteRequest(string id)
    {
        var result = await _enterpriseService.DeleteRequestAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    /// <summary>
    /// 评价服务
    /// </summary>
    [HttpPost("requests/{id}/rate")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> RateRequest(string id, [FromBody] RateServiceRequest request)
    {
        var result = await _enterpriseService.RateRequestAsync(id, request.Rating, request.Feedback);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region AI 智能分类

    /// <summary>
    /// AI 智能建议服务类别
    /// </summary>
    [HttpPost("categories/suggest")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> SuggestCategory([FromBody] SuggestCategoryRequest request)
    {
        var result = await _enterpriseService.SuggestCategoryAsync(request.Description);
        return Success(result);
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取服务统计
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetServiceStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _enterpriseService.GetStatisticsAsync(startDate, endDate);
        return Success(result);
    }

    #endregion
}
