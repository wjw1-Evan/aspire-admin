using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天历史记录管理控制器
/// </summary>
[ApiController]
[Route("api/xiaoke/chat-history")]

public class ChatHistoryController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly IDataFactory<ChatMessage> _messageFactory;

    /// <summary>
    /// 初始化聊天历史记录管理控制器
    /// </summary>
    /// <param name="chatService">聊天服务</param>
    /// <param name="sessionFactory">聊天会话数据工厂</param>
    /// <param name="messageFactory">聊天消息数据工厂</param>
    public ChatHistoryController(
        IChatService chatService,
        IDataFactory<ChatSession> sessionFactory,
        IDataFactory<ChatMessage> messageFactory)
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
    }

    /// <summary>
    /// 获取聊天历史会话列表（支持多种过滤条件）
    /// </summary>
    /// <param name="request">查询请求参数</param>
    /// <returns>分页会话列表结果</returns>
    [HttpPost("list")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistory([FromBody] ChatHistoryQueryRequest request)
    {
        if (request.Current < 1 || request.Current > 10000)
            return ValidationError("页码必须在 1-10000 之间");

        if (request.PageSize < 1 || request.PageSize > 100)
            return ValidationError("每页数量必须在 1-100 之间");

        if (request.StartTime.HasValue && request.EndTime.HasValue && request.StartTime.Value > request.EndTime.Value)
        {
            return Error("INVALID_DATE_RANGE", "开始时间不能晚于结束时间");
        }

        Expression<Func<ChatSession, bool>>? filter = null;

        if (!string.IsNullOrEmpty(request.SessionId))
        {
            filter = s => s.Id == request.SessionId;
        }

        if (!string.IsNullOrEmpty(request.UserId))
        {
            var userId = request.UserId;
            filter = filter == null
                ? s => s.Participants != null && s.Participants.Contains(userId)
                : s => (filter.Compile()(s) && s.Participants != null && s.Participants.Contains(userId));
        }

        if (request.StartTime.HasValue)
        {
            var startTime = request.StartTime.Value;
            filter = filter == null
                ? s => s.LastMessageAt >= startTime
                : s => (filter.Compile()(s) && s.LastMessageAt >= startTime);
        }

        if (request.EndTime.HasValue)
        {
            var endTime = request.EndTime.Value;
            filter = filter == null
                ? s => s.LastMessageAt <= endTime
                : s => (filter.Compile()(s) && s.LastMessageAt <= endTime);
        }

        List<string>? matchedSessionIds = null;
        if (!string.IsNullOrEmpty(request.Content))
        {
            var content = request.Content;
            Expression<Func<ChatMessage, bool>> messageFilter = m => m.Content != null && m.Content.Contains(content);
            var messages = await _messageFactory.FindAsync(messageFilter);
            matchedSessionIds = messages.Where(m => !string.IsNullOrEmpty(m.SessionId)).Select(m => m.SessionId!).Distinct().ToList();

            if (!matchedSessionIds.Any())
            {
                return Success(new ChatHistoryListResponse
                {
                    Data = new List<ChatHistoryListItemDto>(),
                    Total = 0,
                    Success = true,
                    PageSize = request.PageSize,
                    Current = request.Current
                });
            }

            filter = filter == null
                ? s => matchedSessionIds.Contains(s.Id!)
                : s => (filter.Compile()(s) && matchedSessionIds.Contains(s.Id!));
        }

        var total = await _sessionFactory.CountAsync(filter);

        var orderBy = (IQueryable<ChatSession> query) => query
            .OrderByDescending(s => s.LastMessageAt)
            .ThenByDescending(s => s.CreatedAt);

        var (sessions, _) = await _sessionFactory.FindPagedAsync(filter, orderBy, request.Current, request.PageSize);

        var sessionIds = sessions.Select(s => s.Id!).ToList();
        var messageCounts = new Dictionary<string, int>();
        if (sessionIds.Any())
        {
            Expression<Func<ChatMessage, bool>> messageFilter = m => sessionIds.Contains(m.SessionId!);
            var messages = await _messageFactory.FindAsync(messageFilter);
            messageCounts = messages
                .GroupBy(m => m.SessionId!)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        var listItems = sessions.Select(s => new ChatHistoryListItemDto
        {
            SessionId = s.Id,
            Participants = s.Participants,
            ParticipantNames = s.ParticipantNames,
            LastMessageExcerpt = s.LastMessageExcerpt,
            LastMessageAt = s.LastMessageAt,
            MessageCount = messageCounts.GetValueOrDefault(s.Id!, 0),
            CreatedAt = s.CreatedAt
        }).ToList();

        var response = new ChatHistoryListResponse
        {
            Data = listItems,
            Total = (int)total,
            Success = true,
            PageSize = request.PageSize,
            Current = request.Current
        };

        return Success(response);
    }

    /// <summary>
    /// 获取聊天历史会话详情（包含消息列表）
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <returns>包含会话和消息详情的结果</returns>
    [HttpGet("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistoryDetail(string sessionId)
    {
        var session = await _sessionFactory.GetByIdAsync(sessionId);
        if (session == null)
        {
            return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
        }

        var messageRequest = new ChatMessageListRequest
        {
            Limit = 1000
        };

        var (messages, _, _) = await _chatService.GetMessagesAsync(sessionId, messageRequest);

        var response = new ChatHistoryDetailResponse
        {
            Session = session,
            Messages = messages
        };

        return Success(response);
    }

    /// <summary>
    /// 删除（软删除）指定的聊天历史会话
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <returns>操作结果</returns>
    [HttpDelete("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> DeleteChatHistory(string sessionId)
    {
        var result = await _sessionFactory.SoftDeleteAsync(sessionId);

        if (!result)
        {
            return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
        }

        return Success();
    }
}
