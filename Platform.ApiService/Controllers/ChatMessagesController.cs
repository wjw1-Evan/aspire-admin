using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.IO;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/chat/messages")]
public class ChatMessagesController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatMessagesController> _logger;

    public ChatMessagesController(
        IChatService chatService,
        ILogger<ChatMessagesController> logger
    )
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("{sessionId}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(string sessionId, [FromQuery] ChatMessageListRequest request)
    {
        var (messages, hasMore, nextCursor) = await _chatService.GetMessagesAsync(sessionId, request);
        var response = new ChatMessageTimelineResponse
        {
            Items = messages,
            HasMore = hasMore,
            NextCursor = nextCursor
        };

        return Success(response);
    }

    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest request, [FromQuery] bool stream = false)
    {
        if (stream && request.Type == ChatMessageType.Text &&
            !string.IsNullOrWhiteSpace(request.SessionId))
        {
            return await SendMessageWithStreamingResponseAsync(request);
        }

        var message = await _chatService.SendMessageAsync(request);
        return Success(message);
    }

    private async Task<IActionResult> SendMessageWithStreamingResponseAsync(SendChatMessageRequest request)
    {
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.ContentType = "text/event-stream";

        if (Response.Body.CanSeek)
        {
            Response.Body.SetLength(0);
        }

        var cancellationToken = HttpContext.RequestAborted;

        try
        {
            var currentUserId = CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");
            var session = await _chatService.GetSessionByIdAsync(request.SessionId);
            if (session == null || !session.Participants.Contains(currentUserId))
            {
                await WriteSseEventAsync("Error", new { error = "会话不存在或无权访问" }, cancellationToken);
                return new EmptyResult();
            }

            string? assistantMessageId = null;

            Func<string, string, string, Task> onChunk = async (sessionId, messageId, delta) =>
            {
                if (assistantMessageId == null && !string.IsNullOrEmpty(messageId))
                {
                    assistantMessageId = messageId;
                    await WriteSseEventAsync("AssistantMessageStart", new
                    {
                        sessionId,
                        message = new
                        {
                            id = messageId,
                            sessionId = sessionId,
                            senderId = AiAssistantConstants.AssistantUserId,
                            type = "Text",
                            content = string.Empty,
                            createdAt = DateTime.UtcNow
                        }
                    }, cancellationToken);
                }

                await WriteSseEventAsync("AssistantMessageChunk", new { sessionId, messageId, delta }, cancellationToken);
            };

            Func<ChatMessage, Task> onComplete = async (completedMessage) =>
            {
                await WriteSseEventAsync("AssistantMessageComplete", new { message = completedMessage }, cancellationToken);
            };

            var (userMessage, _) = await _chatService.SendMessageWithStreamingReplyAsync(
                request,
                onChunk,
                onComplete,
                cancellationToken);

            await WriteSseEventAsync("UserMessage", new { message = userMessage }, cancellationToken);

            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "流式发送消息失败: 会话 {SessionId}", request.SessionId);
            await WriteSseEventAsync("Error", new { error = "发送消息失败", message = ex.Message }, cancellationToken);
            return new EmptyResult();
        }
    }

    private async Task WriteSseEventAsync(string eventType, object? data, CancellationToken cancellationToken)
    {
        try
        {
            var json = data != null ? JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }) : "null";

            var message = $"event: {eventType}\ndata: {json}\n\n";
            var bytes = Encoding.UTF8.GetBytes(message);

            await Response.Body.WriteAsync(bytes, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SSE 写入失败: {EventType}", eventType);
        }
    }

    [HttpPost("{sessionId}/attachments")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAttachment(string sessionId, [FromForm] IFormFile file)
    {
        var attachment = await _chatService.UploadAttachmentAsync(sessionId, file);
        return Success(new UploadAttachmentResponse { Attachment = attachment });
    }

    [HttpGet("{sessionId}/attachments/{storageObjectId}")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadAttachment(string sessionId, string storageObjectId)
    {
        var result = await _chatService.DownloadAttachmentAsync(sessionId, storageObjectId);

        if (result.Content.CanSeek)
        {
            result.Content.Seek(0, SeekOrigin.Begin);
        }

        Response.ContentLength = result.ContentLength;

        return File(result.Content, result.ContentType, result.FileName, enableRangeProcessing: true);
    }

    [HttpPost("{sessionId}/read")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(string sessionId, [FromBody] MarkSessionReadRequest request)
    {
        await _chatService.MarkSessionReadAsync(sessionId, request.LastMessageId);
        return Success(null, "已更新会话已读状态");
    }

    [HttpDelete("{sessionId}/{messageId}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteMessage(string sessionId, string messageId)
    {
        await _chatService.DeleteMessageAsync(sessionId, messageId);
        return Success(null, "消息已删除");
    }
}
