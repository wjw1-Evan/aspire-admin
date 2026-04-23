using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ApiService.Services;
using System.IO;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天消息控制器
/// </summary>
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

    /// <summary>
    /// 获取会话消息列表
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="request">消息查询参数</param>
    /// <returns>消息列表</returns>
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

    /// <summary>
    /// 发送聊天消息
    /// </summary>
    /// <param name="request">消息内容</param>
    /// <returns>发送的消息</returns>
    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest request)
    {
        var message = await _chatService.SendMessageAsync(request);
        return Success(message);
    }

    /// <summary>
    /// 上传会话附件
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="file">附件文件</param>
    /// <returns>附件信息</returns>
    [HttpPost("{sessionId}/attachments")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAttachment(string sessionId, [FromForm] IFormFile file)
    {
        var attachment = await _chatService.UploadAttachmentAsync(sessionId, file);
        return Success(new UploadAttachmentResponse { Attachment = attachment });
    }

    /// <summary>
    /// 下载会话附件
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="storageObjectId">存储对象ID</param>
    /// <returns>附件文件流</returns>
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
    /// 标记会话为已读
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="request">已读请求</param>
    /// <returns>操作结果</returns>
    [HttpPost("{sessionId}/read")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(string sessionId, [FromBody] MarkSessionReadRequest request)
    {
        await _chatService.MarkSessionReadAsync(sessionId, request.LastMessageId);
        return Success(null, "已更新会话已读状态");
    }

    /// <summary>
    /// 删除会话消息
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <param name="messageId">消息ID</param>
    /// <returns>操作结果</returns>
    [HttpDelete("{sessionId}/{messageId}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteMessage(string sessionId, string messageId)
    {
        await _chatService.DeleteMessageAsync(sessionId, messageId);
        return Success(null, "消息已删除");
    }
}
