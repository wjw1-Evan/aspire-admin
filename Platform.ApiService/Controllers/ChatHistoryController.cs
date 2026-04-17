using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 小科聊天历史控制器
/// </summary>
[ApiController]
[Route("api/xiaoke/chat-history")]
public class ChatHistoryController : BaseApiController
{
    private readonly IChatHistoryService _chatHistoryService;

    public ChatHistoryController(IChatHistoryService chatHistoryService)
    {
        _chatHistoryService = chatHistoryService;
    }

    /// <summary>
    /// 获取聊天历史列表
    /// </summary>
    /// <param name="request">分页参数</param>
    /// <returns>聊天历史列表</returns>
    [HttpGet("list")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistory([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
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

    /// <summary>
    /// 获取聊天历史详情
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <returns>聊天历史详情</returns>
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

    /// <summary>
    /// 删除聊天历史
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    /// <returns>操作结果</returns>
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
