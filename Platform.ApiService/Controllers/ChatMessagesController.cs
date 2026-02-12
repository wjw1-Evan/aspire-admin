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

/// <summary>
/// 聊天消息接口
/// </summary>
[ApiController]
[Route("api/chat/messages")]

public class ChatMessagesController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly ILogger<ChatMessagesController> _logger;

    /// <summary>
    /// 初始化聊天消息控制器
    /// </summary>
    /// <param name="chatService">聊天服务</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    public ChatMessagesController(
        IChatService chatService,
        IDataFactory<ChatSession> sessionFactory,
        ILogger<ChatMessagesController> logger)
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 获取会话消息时间线
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="request">分页参数</param>
    /// <returns>消息时间线</returns>
    /// <remarks>
    /// 示例请求：
    /// ```
    /// GET /api/chat/messages/64f...?limit=30&amp;cursor=64f...
    /// Authorization: Bearer {token}
    /// ```
    /// </remarks>
    /// <response code="200">成功返回消息时间线</response>
    [HttpGet("{sessionId}")]
    [ProducesResponseType(typeof(ApiResponse<ChatMessageTimelineResponse>), StatusCodes.Status200OK)]
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

    /// <summary>
    /// 发送消息（支持流式返回 AI 回复）
    /// </summary>
    /// <param name="request">发送请求</param>
    /// <param name="stream">是否使用 SSE 流式返回 AI 回复（默认：false）</param>
    /// <returns>已发送的消息，如果 stream=true 则通过 SSE 流式返回 AI 回复</returns>
    /// <remarks>
    /// 示例请求：
    /// ```json
    /// {
    ///   "sessionId": "64f...",
    ///   "type": "text",
    ///   "content": "你好"
    /// }
    /// ```
    /// 
    /// 如果 stream=true，响应头会设置为 text/event-stream，并通过 SSE 事件流式返回：
    /// - UserMessage: 用户消息已保存
    /// - AssistantMessageStart: AI 回复开始
    /// - AssistantMessageChunk: AI 回复增量内容
    /// - AssistantMessageComplete: AI 回复完成
    /// </remarks>
    /// <response code="200">成功返回发送结果</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ChatMessage>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest request, [FromQuery] bool stream = false)
    {
        // 如果启用流式返回，使用 SSE 流式响应
        if (stream && request.Type == ChatMessageType.Text &&
            !string.IsNullOrWhiteSpace(request.SessionId))
        {
            return await SendMessageWithStreamingResponseAsync(request);
        }

        // 否则使用传统方式：保存消息并异步触发 AI 回复（通过 SSE 连接推送）
        var message = await _chatService.SendMessageAsync(request);
        return Success(message);
    }

    /// <summary>
    /// 发送消息并流式返回 AI 回复
    /// </summary>
    private async Task<IActionResult> SendMessageWithStreamingResponseAsync(SendChatMessageRequest request)
    {
        // 禁用响应缓冲，确保流式输出立即发送
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no"; // 禁用 Nginx 缓冲
        Response.ContentType = "text/event-stream";

        // 禁用 ASP.NET Core 响应缓冲
        if (Response.Body.CanSeek)
        {
            Response.Body.SetLength(0);
        }

        var cancellationToken = HttpContext.RequestAborted;

        try
        {
            // 1. 保存用户消息（但不触发 AI 回复，因为我们要在同一个流中返回）
            var currentUserId = _sessionFactory.GetRequiredUserId();
            var session = await _sessionFactory.GetByIdAsync(request.SessionId);
            if (session == null || !session.Participants.Contains(currentUserId))
            {
                await WriteSseEventAsync("Error", new { error = "会话不存在或无权访问" }, cancellationToken);
                return new EmptyResult();
            }

            // 存储 AI 消息 ID，用于发送开始事件
            string? assistantMessageId = null;

            // 流式输出回调：每个增量立即发送到前端
            Func<string, string, string, Task> onChunk = async (sessionId, messageId, delta) =>
            {
                // 首次发送开始事件
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

                // 立即发送增量内容
                await WriteSseEventAsync("AssistantMessageChunk", new { sessionId, messageId, delta }, cancellationToken);
            };

            // 创建完成回调函数
            Func<ChatMessage, Task> onComplete = async (completedMessage) =>
            {
                // 发送完成事件
                await WriteSseEventAsync("AssistantMessageComplete", new { message = completedMessage }, cancellationToken);
            };

            // 1. 发送消息并流式生成 AI 回复
            var (userMessage, _) = await _chatService.SendMessageWithStreamingReplyAsync(
                request,
                onChunk,
                onComplete,
                cancellationToken);

            // 发送用户消息事件
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
            // 连接已关闭，忽略
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SSE 写入失败: {EventType}", eventType);
        }
    }

    /// <summary>
    /// 上传附件
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="file">上传文件</param>
    /// <returns>附件元数据</returns>
    /// <remarks>
    /// Content-Type: multipart/form-data
    /// </remarks>
    /// <response code="200">成功返回附件信息</response>
    [HttpPost("{sessionId}/attachments")]
    [ProducesResponseType(typeof(ApiResponse<UploadAttachmentResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAttachment(string sessionId, [FromForm] IFormFile file)
    {
        var attachment = await _chatService.UploadAttachmentAsync(sessionId, file);
        return Success(new UploadAttachmentResponse { Attachment = attachment });
    }

    /// <summary>
    /// 下载附件
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="storageObjectId">附件存储标识</param>
    /// <returns>文件流</returns>
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

    /// <summary>
    /// 将会话标记为已读
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="request">已读请求</param>
    /// <returns>操作结果</returns>
    /// <response code="200">操作成功</response>
    [HttpPost("{sessionId}/read")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(string sessionId, [FromBody] MarkSessionReadRequest request)
    {
        await _chatService.MarkSessionReadAsync(sessionId, request.LastMessageId);
        return Success("已更新会话已读状态");
    }

    /// <summary>
    /// 删除消息（软删除）
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <param name="messageId">消息标识</param>
    /// <returns>操作结果</returns>
    /// <response code="200">删除成功</response>
    [HttpDelete("{sessionId}/{messageId}")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteMessage(string sessionId, string messageId)
    {
        await _chatService.DeleteMessageAsync(sessionId, messageId);
        return Success("消息已删除");
    }
}
