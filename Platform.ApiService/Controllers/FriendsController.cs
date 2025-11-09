using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 好友管理接口
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : BaseApiController
{
    private readonly IFriendService _friendService;

    /// <summary>
    /// 初始化好友控制器
    /// </summary>
    /// <param name="friendService">好友服务</param>
    public FriendsController(IFriendService friendService)
    {
        _friendService = friendService;
    }

    /// <summary>
    /// 获取好友列表
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<FriendSummaryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFriends()
    {
        var friends = await _friendService.GetFriendsAsync();
        return Success(friends);
    }

    /// <summary>
    /// 根据手机号或关键字搜索用户
    /// </summary>
    /// <param name="phone">手机号（可选）</param>
    /// <param name="keyword">姓名或用户名关键字（可选）</param>
    [HttpGet("search")]
    [ProducesResponseType(typeof(ApiResponse<List<FriendSearchResult>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] string? phone, [FromQuery] string? keyword)
    {
        var results = await _friendService.SearchAsync(phone, keyword);
        return Success(results);
    }

    /// <summary>
    /// 发送好友请求
    /// </summary>
    /// <param name="request">请求参数</param>
    [HttpPost("requests")]
    [ProducesResponseType(typeof(ApiResponse<FriendRequestResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendRequest([FromBody] CreateFriendRequestRequest request)
    {
        var result = await _friendService.SendFriendRequestAsync(request);
        return Success(result, "好友请求已发送");
    }

    /// <summary>
    /// 获取待处理好友请求
    /// </summary>
    /// <param name="direction">请求方向（incoming/outgoing）</param>
    [HttpGet("requests")]
    [ProducesResponseType(typeof(ApiResponse<List<FriendRequestResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRequests([FromQuery] FriendRequestDirection direction = FriendRequestDirection.Incoming)
    {
        var requests = await _friendService.GetFriendRequestsAsync(direction);
        return Success(requests);
    }

    /// <summary>
    /// 接受好友请求
    /// </summary>
    /// <param name="requestId">请求标识</param>
    [HttpPost("requests/{requestId}/approve")]
    [ProducesResponseType(typeof(ApiResponse<FriendRequestResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(string requestId)
    {
        var result = await _friendService.ApproveRequestAsync(requestId);
        return Success(result, "已添加好友");
    }

    /// <summary>
    /// 拒绝好友请求
    /// </summary>
    /// <param name="requestId">请求标识</param>
    [HttpPost("requests/{requestId}/reject")]
    [ProducesResponseType(typeof(ApiResponse<FriendRequestResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(string requestId)
    {
        var result = await _friendService.RejectRequestAsync(requestId);
        return Success(result, "已拒绝好友请求");
    }

    /// <summary>
    /// 创建或获取与好友的聊天会话
    /// </summary>
    /// <param name="friendUserId">好友用户ID</param>
    [HttpPost("{friendUserId}/session")]
    [ProducesResponseType(typeof(ApiResponse<FriendSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> EnsureSession(string friendUserId)
    {
        var session = await _friendService.EnsureDirectSessionAsync(friendUserId);
        return Success(session);
    }
}

