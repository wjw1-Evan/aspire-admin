using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using System.Text.Json;

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
    /// 以 SSE（Server-Sent Events）流式获取智能回复候选。
    /// </summary>
    /// <param name="request">请求参数。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>异步任务。</returns>
    [HttpPost("smart-replies/stream")]
    public async Task StreamSmartReplies([FromBody] AiSmartReplyRequest request, CancellationToken cancellationToken)
    {
        request.EnsureNotNull(nameof(request));
        var currentUserId = GetRequiredUserId();

        Response.StatusCode = StatusCodes.Status200OK;
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["Content-Type"] = "text/event-stream; charset=utf-8";
        Response.Headers["X-Accel-Buffering"] = "no"; // 禁用 Nginx 缓冲

        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        await foreach (var chunk in _aiSuggestionService.StreamSmartRepliesAsync(request, currentUserId, cancellationToken)
            .WithCancellation(cancellationToken))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var payload = JsonSerializer.Serialize(chunk, options);
            await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}

