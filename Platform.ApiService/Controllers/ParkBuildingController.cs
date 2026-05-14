using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/park")]
public class ParkBuildingController : BaseApiController
{
    private readonly IParkAssetService _assetService;
    private readonly ILogger<ParkBuildingController> _logger;

    public ParkBuildingController(IParkAssetService assetService, ILogger<ParkBuildingController> logger)
    {
        _assetService = assetService ?? throw new ArgumentNullException(nameof(assetService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("buildings/list")]
    [RequireMenu("park-management-building")]
    public async Task<IActionResult> GetBuildings([FromQuery] ProTableRequest request)
    {
        var result = await _assetService.GetBuildingsAsync(request);
        return Success(result);
    }

    [HttpGet("buildings/{id}")]
    [RequireMenu("park-management-building")]
    public async Task<IActionResult> GetBuilding(string id)
    {
        var result = await _assetService.GetBuildingByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpPost("buildings")]
    [RequireMenu("park-management-building")]
    public async Task<IActionResult> CreateBuilding([FromBody] CreateBuildingRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("楼宇名称不能为空", nameof(request));

        var result = await _assetService.CreateBuildingAsync(request);
        return Success(result);
    }

    [HttpPut("buildings/{id}")]
    [RequireMenu("park-management-building")]
    public async Task<IActionResult> UpdateBuilding(string id, [FromBody] UpdateBuildingRequest request)
    {
        var result = await _assetService.UpdateBuildingAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpDelete("buildings/{id}")]
    [RequireMenu("park-management-building")]
    public async Task<IActionResult> DeleteBuilding(string id)
    {
        var result = await _assetService.DeleteBuildingAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    [HttpGet("asset/statistics")]
    [RequireMenu("park-management-building", "park-management-property")]
    public async Task<IActionResult> GetAssetStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _assetService.GetAssetStatisticsAsync(startDate, endDate);
        return Success(result);
    }
}
