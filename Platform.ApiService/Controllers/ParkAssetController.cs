using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区资产管理控制器
/// </summary>
[ApiController]
[Route("api/park")]
public class ParkAssetController : BaseApiController
{
    private readonly IParkAssetService _assetService;
    private readonly ILogger<ParkAssetController> _logger;

    /// <summary>
    /// 初始化资产管理控制器
    /// </summary>
    /// <param name="assetService">资产管理服务</param>
    /// <param name="logger">日志服务</param>
    public ParkAssetController(IParkAssetService assetService, ILogger<ParkAssetController> logger)
    {
        _assetService = assetService ?? throw new ArgumentNullException(nameof(assetService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 楼宇管理

    /// <summary>
    /// 获取楼宇列表
    /// </summary>
    [HttpGet("buildings/list")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> GetBuildings([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _assetService.GetBuildingsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个楼宇
    /// </summary>
    [HttpGet("buildings/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> GetBuilding(string id)
    {
        var result = await _assetService.GetBuildingByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建楼宇
    /// </summary>
    [HttpPost("buildings")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> CreateBuilding([FromBody] CreateBuildingRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("楼宇名称不能为空", nameof(request));

        var result = await _assetService.CreateBuildingAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新楼宇
    /// </summary>
    [HttpPut("buildings/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> UpdateBuilding(string id, [FromBody] UpdateBuildingRequest request)
    {
        var result = await _assetService.UpdateBuildingAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除楼宇
    /// </summary>
    [HttpDelete("buildings/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> DeleteBuilding(string id)
    {
        var result = await _assetService.DeleteBuildingAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region 房源管理

    /// <summary>
    /// 获取房源列表
    /// </summary>
    [HttpGet("properties/list")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> GetProperties([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _assetService.GetPropertyUnitsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取单个房源
    /// </summary>
    [HttpGet("properties/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> GetProperty(string id)
    {
        var result = await _assetService.GetPropertyUnitByIdAsync(id);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 创建房源
    /// </summary>
    [HttpPost("properties")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> CreateProperty([FromBody] CreatePropertyUnitRequest request)
    {
        var result = await _assetService.CreatePropertyUnitAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新房源
    /// </summary>
    [HttpPut("properties/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> UpdateProperty(string id, [FromBody] CreatePropertyUnitRequest request)
    {
        var result = await _assetService.UpdatePropertyUnitAsync(id, request);
        if (result == null)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(result);
    }

    /// <summary>
    /// 删除房源
    /// </summary>
    [HttpDelete("properties/{id}")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> DeleteProperty(string id)
    {
        var result = await _assetService.DeletePropertyUnitAsync(id);
        if (!result)
            throw new KeyNotFoundException(ErrorCode.ResourceNotFound);
        return Success(true);
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取资产统计
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    [HttpGet("asset/statistics")]
    [RequireMenu("park-management-asset")]
    public async Task<IActionResult> GetAssetStatistics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var result = await _assetService.GetAssetStatisticsAsync(startDate, endDate);
        return Success(result);
    }

    #endregion
}