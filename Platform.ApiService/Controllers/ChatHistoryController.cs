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
    public async Task<IActionResult> GetChatHistory([FromBody] ChatHistoryQueryRequest request)
    {
        if (request.StartTime.HasValue && request.EndTime.HasValue && request.StartTime.Value > request.EndTime.Value)
        {
            return Error("INVALID_DATE_RANGE", "开始时间不能晚于结束时间");
        }

        try
        {
            var result = await _chatHistoryService.GetChatHistoryAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
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
                return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
            }

            return Success(result);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
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
                return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
            }

            return Success();
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }
}
