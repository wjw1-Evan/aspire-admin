using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区资产管理控制器
/// </summary>
[ApiController]
[Route("api/park")]
[Authorize]
public class ParkAssetController : ControllerBase
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
        _assetService = assetService;
        _logger = logger;
    }

    #region 楼宇管理

    /// <summary>
    /// 获取楼宇列表
    /// </summary>
    [HttpPost("buildings/list")]
    public async Task<ActionResult<ApiResponse<BuildingListResponse>>> GetBuildings([FromBody] BuildingListRequest request)
    {
        try
        {
            var result = await _assetService.GetBuildingsAsync(request);
            return Ok(ApiResponse<BuildingListResponse>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取楼宇列表失败");
            return Ok(ApiResponse<BuildingListResponse>.ErrorResult("ERROR", "获取楼宇列表失败"));
        }
    }

    /// <summary>
    /// 获取单个楼宇
    /// </summary>
    [HttpGet("buildings/{id}")]
    public async Task<ActionResult<ApiResponse<BuildingDto>>> GetBuilding(string id)
    {
        try
        {
            var result = await _assetService.GetBuildingByIdAsync(id);
            if (result == null)
                return Ok(ApiResponse<BuildingDto>.ErrorResult("ERROR", "楼宇不存在"));
            return Ok(ApiResponse<BuildingDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取楼宇详情失败: {Id}", id);
            return Ok(ApiResponse<BuildingDto>.ErrorResult("ERROR", "获取楼宇详情失败"));
        }
    }

    /// <summary>
    /// 创建楼宇
    /// </summary>
    [HttpPost("buildings")]
    public async Task<ActionResult<ApiResponse<BuildingDto>>> CreateBuilding([FromBody] CreateBuildingRequest request)
    {
        try
        {
            var result = await _assetService.CreateBuildingAsync(request);
            return Ok(ApiResponse<BuildingDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建楼宇失败");
            return Ok(ApiResponse<BuildingDto>.ErrorResult("ERROR", "创建楼宇失败: " + ex.Message));
        }
    }

    /// <summary>
    /// 更新楼宇
    /// </summary>
    [HttpPut("buildings/{id}")]
    public async Task<ActionResult<ApiResponse<BuildingDto>>> UpdateBuilding(string id, [FromBody] UpdateBuildingRequest request)
    {
        try
        {
            var result = await _assetService.UpdateBuildingAsync(id, request);
            if (result == null)
                return Ok(ApiResponse<BuildingDto>.ErrorResult("ERROR", "楼宇不存在"));
            return Ok(ApiResponse<BuildingDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新楼宇失败: {Id}", id);
            return Ok(ApiResponse<BuildingDto>.ErrorResult("ERROR", "更新楼宇失败: " + ex.Message));
        }
    }

    /// <summary>
    /// 删除楼宇
    /// </summary>
    [HttpDelete("buildings/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteBuilding(string id)
    {
        try
        {
            var result = await _assetService.DeleteBuildingAsync(id);
            if (!result)
                return Ok(ApiResponse<bool>.ErrorResult("ERROR", "楼宇不存在或无法删除"));
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除楼宇失败: {Id}", id);
            return Ok(ApiResponse<bool>.ErrorResult("ERROR", "删除楼宇失败: " + ex.Message));
        }
    }

    #endregion

    #region 房源管理

    /// <summary>
    /// 获取房源列表
    /// </summary>
    [HttpPost("properties/list")]
    public async Task<ActionResult<ApiResponse<PropertyUnitListResponse>>> GetProperties([FromBody] PropertyUnitListRequest request)
    {
        try
        {
            var result = await _assetService.GetPropertyUnitsAsync(request);
            return Ok(ApiResponse<PropertyUnitListResponse>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取房源列表失败");
            return Ok(ApiResponse<PropertyUnitListResponse>.ErrorResult("ERROR", "获取房源列表失败"));
        }
    }

    /// <summary>
    /// 获取单个房源
    /// </summary>
    [HttpGet("properties/{id}")]
    public async Task<ActionResult<ApiResponse<PropertyUnitDto>>> GetProperty(string id)
    {
        try
        {
            var result = await _assetService.GetPropertyUnitByIdAsync(id);
            if (result == null)
                return Ok(ApiResponse<PropertyUnitDto>.ErrorResult("ERROR", "房源不存在"));
            return Ok(ApiResponse<PropertyUnitDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取房源详情失败: {Id}", id);
            return Ok(ApiResponse<PropertyUnitDto>.ErrorResult("ERROR", "获取房源详情失败"));
        }
    }

    /// <summary>
    /// 创建房源
    /// </summary>
    [HttpPost("properties")]
    public async Task<ActionResult<ApiResponse<PropertyUnitDto>>> CreateProperty([FromBody] CreatePropertyUnitRequest request)
    {
        try
        {
            var result = await _assetService.CreatePropertyUnitAsync(request);
            return Ok(ApiResponse<PropertyUnitDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建房源失败");
            return Ok(ApiResponse<PropertyUnitDto>.ErrorResult("ERROR", "创建房源失败: " + ex.Message));
        }
    }

    /// <summary>
    /// 更新房源
    /// </summary>
    [HttpPut("properties/{id}")]
    public async Task<ActionResult<ApiResponse<PropertyUnitDto>>> UpdateProperty(string id, [FromBody] CreatePropertyUnitRequest request)
    {
        try
        {
            var result = await _assetService.UpdatePropertyUnitAsync(id, request);
            if (result == null)
                return Ok(ApiResponse<PropertyUnitDto>.ErrorResult("ERROR", "房源不存在"));
            return Ok(ApiResponse<PropertyUnitDto>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新房源失败: {Id}", id);
            return Ok(ApiResponse<PropertyUnitDto>.ErrorResult("ERROR", "更新房源失败: " + ex.Message));
        }
    }

    /// <summary>
    /// 删除房源
    /// </summary>
    [HttpDelete("properties/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProperty(string id)
    {
        try
        {
            var result = await _assetService.DeletePropertyUnitAsync(id);
            if (!result)
                return Ok(ApiResponse<bool>.ErrorResult("ERROR", "房源不存在或无法删除"));
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除房源失败: {Id}", id);
            return Ok(ApiResponse<bool>.ErrorResult("ERROR", "删除房源失败: " + ex.Message));
        }
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取资产统计
    /// </summary>
    /// <param name="period">统计周期</param>
    [HttpGet("asset/statistics")]
    public async Task<ActionResult<ApiResponse<AssetStatisticsResponse>>> GetAssetStatistics([FromQuery] StatisticsPeriod period = StatisticsPeriod.Month)
    {
        try
        {
            var result = await _assetService.GetAssetStatisticsAsync(period);
            return Ok(ApiResponse<AssetStatisticsResponse>.SuccessResult(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取资产统计失败");
            return Ok(ApiResponse<AssetStatisticsResponse>.ErrorResult("ERROR", "获取资产统计失败"));
        }
    }

    #endregion
}
