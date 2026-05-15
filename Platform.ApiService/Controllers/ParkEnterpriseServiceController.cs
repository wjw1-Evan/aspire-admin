using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/park/services")]
public class ParkEnterpriseServiceController : BaseApiController
{
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly ILogger<ParkEnterpriseServiceController> _logger;

    public ParkEnterpriseServiceController(IParkEnterpriseServiceService enterpriseService, ILogger<ParkEnterpriseServiceController> logger)
    {
        _enterpriseService = enterpriseService ?? throw new ArgumentNullException(nameof(enterpriseService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region AI 智能分类

    [HttpPost("categories/suggest")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> SuggestCategory([FromBody] SuggestCategoryRequest request)
    {
        var result = await _enterpriseService.SuggestCategoryAsync(request.Description);
        return Success(result);
    }

    #endregion

    #region 服务申请管理

    [HttpGet("requests/list")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetRequests([FromQuery] ProTableRequest request, [FromQuery] string? tenantId = null)
    {
        var result = await _enterpriseService.GetRequestsAsync(request, tenantId);
        return Success(result);
    }

    [HttpGet("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetRequest(string id)
    {
        var result = await _enterpriseService.GetRequestByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpPost("requests")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateServiceRequestRequest request)
    {
        var result = await _enterpriseService.CreateRequestAsync(request);
        return Success(result);
    }

    [HttpPut("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> UpdateRequest(string id, [FromBody] CreateServiceRequestRequest request)
    {
        var result = await _enterpriseService.UpdateRequestAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpPut("requests/{id}/status")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> UpdateRequestStatus(string id, [FromBody] UpdateServiceRequestStatusRequest request)
    {
        var result = await _enterpriseService.UpdateRequestStatusAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpDelete("requests/{id}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> DeleteRequest(string id)
    {
        var result = await _enterpriseService.DeleteRequestAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    [HttpDelete("requests/{id}/status-history/{index}")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> DeleteStatusHistory(string id, int index)
    {
        var result = await _enterpriseService.DeleteStatusHistoryAsync(id, index);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

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

    #region 统计

    [HttpGet("statistics")]
    [RequireMenu("park-management-enterprise-service")]
    public async Task<IActionResult> GetServiceStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _enterpriseService.GetStatisticsAsync(startDate, endDate);
        return Success(result);
    }

    #endregion
}
