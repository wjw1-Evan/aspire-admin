using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天会话接口
/// </summary>
[ApiController]
[Route("api/chat/sessions")]
[Authorize]
public class ChatSessionsController : BaseApiController
{
    private readonly IChatService _chatService;

    /// <summary>
    /// 初始化聊天会话控制器
    /// </summary>
    /// <param name="chatService">聊天服务</param>
    public ChatSessionsController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>
    /// 获取当前用户的会话列表
    /// </summary>
    /// <param name="request">查询参数</param>
    /// <returns>会话分页结果</returns>
    /// <remarks>
    /// 示例请求：
    /// 
    /// ```
    /// GET /api/chat/sessions?page=1&amp;pageSize=20
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "data": [
    ///       {
    ///         "id": "64f...",
    ///         "participants": ["64f...", "64a..."],
    ///         "lastMessageExcerpt": "你好",
    ///         "lastMessageAt": "2025-11-07T10:15:00Z",
    ///         "unreadCounts": {"64a...": 2}
    ///       }
    ///     ],
    ///     "total": 1,
    ///     "page": 1,
    ///     "pageSize": 20
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <response code="200">成功返回会话列表</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<ChatSession>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessions([FromQuery] ChatSessionListRequest request)
    {
        var (sessions, total) = await _chatService.GetSessionsAsync(request);
        var response = new PaginatedResponse<ChatSession>
        {
            Data = sessions,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };

        return Success(response);
    }
}

