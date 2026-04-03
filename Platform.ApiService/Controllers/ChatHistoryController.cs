using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/xiaoke/chat-history")]
public class ChatHistoryController : BaseApiController
{
    private readonly IChatHistoryService _chatHistoryService;

    public ChatHistoryController(IChatHistoryService chatHistoryService)
    {
        _chatHistoryService = chatHistoryService;
    }

    [HttpPost("list")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistory([FromBody] Platform.ServiceDefaults.Models.PageParams request)
    {
        try
        {
            var result = await _chatHistoryService.GetChatHistoryAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    [HttpGet("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistoryDetail(string sessionId)
    {
        try
        {
            var result = await _chatHistoryService.GetChatHistoryDetailAsync(sessionId);
            if (result == null)
            {
                throw new ArgumentException($"会话 {sessionId} 不存在");
            }

            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    [HttpDelete("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> DeleteChatHistory(string sessionId)
    {
        try
        {
            var result = await _chatHistoryService.DeleteChatHistoryAsync(sessionId);
            if (!result)
            {
                throw new ArgumentException($"会话 {sessionId} 不存在");
            }

            return Success(true);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }
}
