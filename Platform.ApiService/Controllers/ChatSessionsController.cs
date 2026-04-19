using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天会话控制器
/// </summary>
[ApiController]
[Route("api/chat/sessions")]
public class ChatSessionsController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatSessionsController> _logger;

    public ChatSessionsController(
        IChatService chatService,
        ILogger<ChatSessionsController> logger
    )
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 获取聊天会话列表
    /// </summary>
    /// <param name="request">分页参数</param>
    /// <returns>会话列表</returns>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessions([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var result = await _chatService.GetSessionsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取或创建与小科的会话
    /// </summary>
    /// <returns>会话实体</returns>
    [HttpGet("assistant")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrCreateAssistantSession()
    {
        var session = await _chatService.GetOrCreateAssistantSessionAsync();
        return Success(session);
    }
}
