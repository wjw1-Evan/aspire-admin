using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using System.IO;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天消息接口
/// </summary>
[ApiController]
[Route("api/chat/messages")]
[Authorize]
public class ChatMessagesController : BaseApiController
{
    private readonly IChatService _chatService;

    /// <summary>
    /// 初始化聊天消息控制器
    /// </summary>
    /// <param name="chatService">聊天服务</param>
    public ChatMessagesController(IChatService chatService)
    {
        _chatService = chatService;
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
    /// 发送消息
    /// </summary>
    /// <param name="request">发送请求</param>
    /// <returns>已发送的消息</returns>
    /// <remarks>
    /// 示例请求：
    /// ```json
    /// {
    ///   "sessionId": "64f...",
    ///   "type": "text",
    ///   "content": "你好"
    /// }
    /// ```
    /// </remarks>
    /// <response code="200">成功返回发送结果</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ChatMessage>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest request)
    {
        var message = await _chatService.SendMessageAsync(request);
        return Success(message);
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

