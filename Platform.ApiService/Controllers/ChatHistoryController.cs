using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Platform.ApiService.Attributes;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 聊天记录管理控制器 - 处理聊天记录的管理操作
/// </summary>
[ApiController]
[Route("api/xiaoke/chat-history")]
[Authorize]
public class ChatHistoryController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IDatabaseOperationFactory<ChatMessage> _messageFactory;

    /// <summary>
    /// 初始化聊天记录管理控制器
    /// </summary>
    /// <param name="chatService">聊天服务</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="messageFactory">消息数据操作工厂</param>
    public ChatHistoryController(
        IChatService chatService,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<ChatMessage> messageFactory)
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _sessionFactory = sessionFactory ?? throw new ArgumentNullException(nameof(sessionFactory));
        _messageFactory = messageFactory ?? throw new ArgumentNullException(nameof(messageFactory));
    }

    /// <summary>
    /// 获取聊天记录列表（支持搜索、筛选）
    /// </summary>
    /// <param name="request">查询请求</param>
    [HttpPost("list")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistory([FromBody] ChatHistoryQueryRequest request)
    {
        // 验证分页参数
        if (request.Current < 1 || request.Current > 10000)
            throw new ArgumentException("页码必须在 1-10000 之间");
        
        if (request.PageSize < 1 || request.PageSize > 100)
            throw new ArgumentException("每页数量必须在 1-100 之间");

        // 验证时间范围
        if (request.StartTime.HasValue && request.EndTime.HasValue && request.StartTime.Value > request.EndTime.Value)
        {
            return Error("INVALID_DATE_RANGE", "开始时间不能晚于结束时间");
        }

        var filterBuilder = _sessionFactory.CreateFilterBuilder();

        // 按会话ID搜索
        if (!string.IsNullOrEmpty(request.SessionId))
        {
            filterBuilder = filterBuilder.Equal(s => s.Id, request.SessionId);
        }

        // 按用户ID搜索（参与者）
        if (!string.IsNullOrEmpty(request.UserId))
        {
            filterBuilder = filterBuilder.Custom(
                Builders<ChatSession>.Filter.AnyEq(s => s.Participants, request.UserId));
        }

        // 按时间范围筛选
        if (request.StartTime.HasValue)
        {
            filterBuilder = filterBuilder.GreaterThanOrEqual(s => s.LastMessageAt, request.StartTime.Value);
        }

        if (request.EndTime.HasValue)
        {
            filterBuilder = filterBuilder.LessThanOrEqual(s => s.LastMessageAt, request.EndTime.Value);
        }

        // 如果按消息内容搜索，需要先找到匹配的会话ID
        List<string>? matchedSessionIds = null;
        if (!string.IsNullOrEmpty(request.Content))
        {
            var content = request.Content; // 明确提取非空值
            // 调用 Regex 方法并构建过滤器（使用链式调用避免中间变量）
            var messageFilter = _messageFactory.CreateFilterBuilder()
                .Regex(m => m.Content, content, "i")
                .Build();

            // ✅ 数据工厂会自动添加企业过滤（因为 ChatMessage 实现了 IMultiTenant）
            var messages = await _messageFactory.FindAsync(messageFilter);
            matchedSessionIds = messages.Select(m => m.SessionId).Distinct().ToList();

            if (!matchedSessionIds.Any())
            {
                // 没有匹配的消息，直接返回空结果
                return Success(new ChatHistoryListResponse
                {
                    Data = new List<ChatHistoryListItemDto>(),
                    Total = 0,
                    Success = true,
                    PageSize = request.PageSize,
                    Current = request.Current
                });
            }

            // 添加会话ID过滤
            filterBuilder = filterBuilder.In(s => s.Id, matchedSessionIds);
        }

        var filter = filterBuilder.Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 ChatSession 实现了 IMultiTenant）
        // 获取总数
        var total = await _sessionFactory.CountAsync(filter);

        // 分页 - FindPagedAsync 期望的是 page（页码），而不是 skip
        var sortBuilder = _sessionFactory.CreateSortBuilder();
        // 先按 LastMessageAt 降序排序，如果 LastMessageAt 为 null，MongoDB 会将其排在最后
        // 然后按 CreatedAt 降序排序作为次要排序，确保有 LastMessageAt 的记录优先显示
        sortBuilder.Descending(s => s.LastMessageAt);
        sortBuilder.Descending(s => s.CreatedAt);
        var (sessions, _) = await _sessionFactory.FindPagedAsync(filter, sortBuilder.Build(), request.Current, request.PageSize);

        // 统计每个会话的消息数量
        var sessionIds = sessions.Select(s => s.Id).ToList();
        var messageCounts = new Dictionary<string, int>();
        if (sessionIds.Any())
        {
            var messageFilter = _messageFactory.CreateFilterBuilder()
                .In(m => m.SessionId, sessionIds)
                .Build();

            var messages = await _messageFactory.FindAsync(messageFilter);
            messageCounts = messages
                .GroupBy(m => m.SessionId)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        var listItems = sessions.Select(s => new ChatHistoryListItemDto
        {
            SessionId = s.Id,
            Participants = s.Participants,
            ParticipantNames = s.ParticipantNames,
            LastMessageExcerpt = s.LastMessageExcerpt,
            LastMessageAt = s.LastMessageAt,
            MessageCount = messageCounts.GetValueOrDefault(s.Id, 0),
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
    /// 获取会话详情和消息
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    [HttpGet("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> GetChatHistoryDetail(string sessionId)
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 ChatSession 实现了 IMultiTenant）
        var session = await _sessionFactory.GetByIdAsync(sessionId);
        if (session == null)
        {
            return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
        }

        // 获取消息列表
        var messageRequest = new ChatMessageListRequest
        {
            Limit = 1000 // 管理后台可以查看更多消息
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
    /// 删除会话（软删除）
    /// </summary>
    /// <param name="sessionId">会话ID</param>
    [HttpDelete("{sessionId}")]
    [RequireMenu("xiaoke-management-chat-history")]
    public async Task<IActionResult> DeleteChatHistory(string sessionId)
    {
        var filter = _sessionFactory.CreateFilterBuilder()
            .Equal(s => s.Id, sessionId)
            .Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 ChatSession 实现了 IMultiTenant）
        var result = await _sessionFactory.FindOneAndSoftDeleteAsync(filter);
        
        if (result == null)
        {
            return Error("SESSION_NOT_FOUND", $"会话 {sessionId} 不存在");
        }

        return Success();
    }
}
