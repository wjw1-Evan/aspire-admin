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
[Authorize]
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
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateLocation([FromBody] UpdateLocationBeaconRequest request)
    {
        await _socialService.UpdateLocationAsync(request);
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
    [ProducesResponseType(typeof(ApiResponse<NearbyUsersResponse>), StatusCodes.Status200OK)]
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
    [ProducesResponseType(typeof(ApiResponse<UserLocationBeacon>), StatusCodes.Status200OK)]
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
    [ProducesResponseType(typeof(ApiResponse<UserLocationInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUserLocationInfo()
    {
        var locationInfo = await _socialService.GetCurrentUserLocationInfoAsync();
        return Success(locationInfo);
    }
}

