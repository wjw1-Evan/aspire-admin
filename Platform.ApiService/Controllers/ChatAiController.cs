using System.Text.Json;
using System.Text.Json.Serialization;
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
    private readonly IChatService _chatService;
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// 初始化 AI 控制器。
    /// </summary>
    /// <param name="aiSuggestionService">AI 建议服务。</param>
    /// <param name="chatService">聊天服务。</param>
    public ChatAiController(IAiSuggestionService aiSuggestionService, IChatService chatService)
    {
        _aiSuggestionService = aiSuggestionService;
        _chatService = chatService;
    }

    /// <summary>
    /// 获取智能回复候选。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>智能回复结果。</returns>
    [HttpPost("smart-replies")]
    public async Task<IActionResult> GetSmartReplies([FromBody] AiSmartReplyRequest request, CancellationToken cancellationToken)
    {
        request.EnsureNotNull(nameof(request));
        var currentUserId = GetRequiredUserId();
        var result = await _aiSuggestionService.GetSmartRepliesAsync(request, currentUserId, cancellationToken);
        return Success(result);
    }

    /// <summary>
    /// 获取 AI 匹配推荐列表。
    /// </summary>
    /// <param name="request">匹配请求参数。</param>
    /// <returns>推荐结果。</returns>
    [HttpPost("match-suggestions")]
    public async Task<IActionResult> GetMatchSuggestions([FromBody] MatchSuggestionRequest request)
    {
        request.EnsureNotNull(nameof(request));
        var currentUserId = GetRequiredUserId();
        var response = await _aiSuggestionService.GetMatchSuggestionsAsync(request, currentUserId);
        return Success(response);
    }

    /// <summary>
    /// 以 SSE (Server-Sent Events) 形式获取小科助手的流式回复。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>异步任务。</returns>
    [HttpPost("assistant-reply/stream")]
    public async Task StreamAssistantReply([FromBody] AssistantReplyStreamRequest request, CancellationToken cancellationToken)
    {
        request.EnsureNotNull(nameof(request));
        var currentUserId = GetRequiredUserId();

        Response.StatusCode = StatusCodes.Status200OK;
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["Content-Type"] = "text/event-stream; charset=utf-8";
        Response.Headers["X-Accel-Buffering"] = "no";

        await foreach (var chunk in _chatService.StreamAssistantReplyAsync(request, currentUserId, cancellationToken)
            .WithCancellation(cancellationToken))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var payload = JsonSerializer.Serialize(chunk, _jsonOptions);
            await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}

