using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/park")]
public class ParkPropertyController : BaseApiController
{
    private readonly IParkAssetService _assetService;
    private readonly ILogger<ParkPropertyController> _logger;

    public ParkPropertyController(IParkAssetService assetService, ILogger<ParkPropertyController> logger)
    {
        _assetService = assetService ?? throw new ArgumentNullException(nameof(assetService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("properties/list")]
    [RequireMenu("park-management-property")]
    public async Task<IActionResult> GetProperties([FromQuery] ProTableRequest request)
    {
        var result = await _assetService.GetPropertyUnitsAsync(request);
        return Success(result);
    }

    [HttpGet("properties/{id}")]
    [RequireMenu("park-management-property")]
    public async Task<IActionResult> GetProperty(string id)
    {
        var result = await _assetService.GetPropertyUnitByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpPost("properties")]
    [RequireMenu("park-management-property")]
    public async Task<IActionResult> CreateProperty([FromBody] CreatePropertyUnitRequest request)
    {
        var result = await _assetService.CreatePropertyUnitAsync(request);
        return Success(result);
    }

    [HttpPut("properties/{id}")]
    [RequireMenu("park-management-property")]
    public async Task<IActionResult> UpdateProperty(string id, [FromBody] CreatePropertyUnitRequest request)
    {
        var result = await _assetService.UpdatePropertyUnitAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    [HttpDelete("properties/{id}")]
    [RequireMenu("park-management-property")]
    public async Task<IActionResult> DeleteProperty(string id)
    {
        var result = await _assetService.DeletePropertyUnitAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }
}
