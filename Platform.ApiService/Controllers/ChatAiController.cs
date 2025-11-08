using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天 AI 能力入口。
/// </summary>
[ApiController]
[Route("api/chat/ai")]
[Authorize]
public class ChatAiController : BaseApiController
{
    private readonly IAiSuggestionService _aiSuggestionService;

    /// <summary>
    /// 初始化 AI 控制器。
    /// </summary>
    /// <param name="aiSuggestionService">AI 建议服务。</param>
    public ChatAiController(IAiSuggestionService aiSuggestionService)
    {
        _aiSuggestionService = aiSuggestionService;
    }

    /// <summary>
    /// 获取智能回复候选。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <returns>智能回复建议列表。</returns>
    [HttpPost("smart-replies")]
    [ProducesResponseType(typeof(Platform.ServiceDefaults.Models.ApiResponse<AiSuggestionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSmartReplies([FromBody] AiSmartReplyRequest request)
    {
        request.EnsureNotNull(nameof(request));
        var currentUserId = GetRequiredUserId();
        var response = await _aiSuggestionService.GenerateSmartRepliesAsync(request, currentUserId);
        return Success(response);
    }
}

