using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 提供附近的人与定位相关的接口。
/// </summary>
[ApiController]
[Route("api/social")]

public class SocialController : BaseApiController
{
    private readonly ISocialService _socialService;

    /// <summary>
    /// 初始化社交控制器。
    /// </summary>
    /// <param name="socialService">社交业务服务。</param>
    public SocialController(ISocialService socialService)
    {
        _socialService = socialService ?? throw new ArgumentNullException(nameof(socialService));
    }

    /// <summary>
    /// 上报当前设备位置。
    /// </summary>
    /// <param name="request">定位信标信息。</param>
    /// <returns>标准 API 响应。</returns>
    /// <remarks>
    /// 请求示例：
    ///
    /// ```json
    /// {
    ///   "latitude": 30.27415,
    ///   "longitude": 120.15515,
    ///   "accuracy": 15
    /// }
    /// ```
    /// </remarks>
    [HttpPost("location/beacon")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateLocation([FromBody] UpdateLocationBeaconRequest request)
    {
        await _socialService.UpdateLocationAsync(request);
        return Success("定位已更新");
    }

    /// <summary>
    /// 上报当前设备位置（兼容端点，支持 JSON 和表单数据）。
    /// </summary>
    /// <param name="request">定位信标信息（JSON 格式）。</param>
    /// <param name="latitude">纬度（表单格式）。</param>
    /// <param name="longitude">经度（表单格式）。</param>
    /// <param name="accuracy">定位精度（表单格式）。</param>
    /// <param name="altitude">海拔高度（表单格式）。</param>
    /// <param name="heading">航向角（表单格式）。</param>
    /// <param name="speed">移动速度（表单格式）。</param>
    /// <param name="timestamp">原始时间戳（表单格式）。</param>
    /// <returns>标准 API 响应。</returns>
    /// <remarks>
    /// 此端点为兼容旧版前端代码而保留，功能与 location/beacon 相同。
    /// 支持 JSON 和 application/x-www-form-urlencoded 两种格式。
    /// 请求示例（JSON）：
    ///
    /// ```json
    /// {
    ///   "latitude": 30.27415,
    ///   "longitude": 120.15515,
    ///   "accuracy": 15
    /// }
    /// ```
    /// </remarks>
    [HttpPost("location/report")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReportLocation(
        [FromBody] UpdateLocationBeaconRequest? request = null,
        [FromForm] double? latitude = null,
        [FromForm] double? longitude = null,
        [FromForm] double? accuracy = null,
        [FromForm] double? altitude = null,
        [FromForm] double? heading = null,
        [FromForm] double? speed = null,
        [FromForm] long? timestamp = null)
    {
        UpdateLocationBeaconRequest locationRequest;

        // 判断是否为表单数据：检查 Content-Type 和是否有表单参数
        var contentType = Request.ContentType?.ToLowerInvariant() ?? string.Empty;
        var isFormData = contentType.Contains("application/x-www-form-urlencoded")
                         && latitude.HasValue && longitude.HasValue;

        if (isFormData)
        {
            // 从表单参数构建请求（已确认 latitude 和 longitude 有值）
            var lat = latitude!.Value;
            var lon = longitude!.Value;
            locationRequest = new UpdateLocationBeaconRequest
            {
                Latitude = lat,
                Longitude = lon,
                Accuracy = accuracy,
                Altitude = altitude,
                Heading = heading,
                Speed = speed,
                Timestamp = timestamp
            };
        }
        else if (request != null)
        {
            // 使用 JSON 请求体
            locationRequest = request;
        }
        else
        {
            return Error("INVALID_REQUEST", "请求参数无效：需要提供有效的定位信息");
        }

        await _socialService.UpdateLocationAsync(locationRequest);
        return Success("定位已更新");
    }

    /// <summary>
    /// 获取附近的用户列表。
    /// </summary>
    /// <param name="request">搜索参数。</param>
    /// <returns>附近用户列表。</returns>
    /// <remarks>
    /// 请求示例：
    ///
    /// ```json
    /// {
    ///   "center": { "latitude": 30.27415, "longitude": 120.15515 },
    ///   "radiusMeters": 2000,
    ///   "limit": 20
    /// }
    /// ```
    /// </remarks>
    [HttpPost("nearby-users")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNearbyUsers([FromBody] NearbyUsersRequest request)
    {
        var response = await _socialService.GetNearbyUsersAsync(request);
        return Success(response);
    }

    /// <summary>
    /// 获取当前用户的位置信标（包含详细坐标，仅用于内部使用）。
    /// </summary>
    /// <returns>当前用户的位置信标信息。</returns>
    [HttpGet("location/beacon")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUserLocation()
    {
        var location = await _socialService.GetCurrentUserLocationAsync();
        return Success(location);
    }

    /// <summary>
    /// 获取当前用户的位置信息（仅包含城市和国家，不包含详细坐标）。
    /// 返回最后一次保存位置时解析的城市和国家信息，无需实时解析。
    /// </summary>
    /// <returns>用户位置信息（包含最后一次保存的城市名称和国家名称）。</returns>
    [HttpGet("location/info")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUserLocationInfo()
    {
        var locationInfo = await _socialService.GetCurrentUserLocationInfoAsync();
        return Success(locationInfo);
    }
}

