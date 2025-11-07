using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Bson;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Hubs;

/// <summary>
/// 聊天实时通信 Hub
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    /// <summary>
    /// 会话消息事件名称
    /// </summary>
    public const string ReceiveMessageEvent = "ReceiveMessage";

    /// <summary>
    /// 会话更新事件名称
    /// </summary>
    public const string SessionUpdatedEvent = "SessionUpdated";

    /// <summary>
    /// 消息删除事件名称
    /// </summary>
    public const string MessageDeletedEvent = "MessageDeleted";

    /// <summary>
    /// 会话已读事件名称
    /// </summary>
    public const string SessionReadEvent = "SessionRead";

    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IChatService _chatService;
    private readonly ILogger<ChatHub> _logger;

    /// <summary>
    /// 初始化聊天 Hub
    /// </summary>
    /// <param name="sessionFactory">会话数据工厂</param>
    /// <param name="chatService">聊天服务</param>
    /// <param name="logger">日志记录器</param>
    public ChatHub(
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IChatService chatService,
        ILogger<ChatHub> logger)
    {
        _sessionFactory = sessionFactory;
        _chatService = chatService;
        _logger = logger;
    }

    /// <summary>
    /// 连接成功时自动加入用户组
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = _sessionFactory.GetRequiredUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// 加入聊天会话组
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    public async Task JoinSessionAsync(string sessionId)
    {
        ValidateSessionId(sessionId);

        var session = await _sessionFactory.GetByIdAsync(sessionId)
            ?? throw new KeyNotFoundException("会话不存在");

        var userId = _sessionFactory.GetRequiredUserId();

        if (!session.Participants.Contains(userId))
        {
            throw new UnauthorizedAccessException("当前用户不属于该会话");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GetSessionGroupName(sessionId));
    }

    /// <summary>
    /// 离开聊天会话组
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    public Task LeaveSessionAsync(string sessionId)
    {
        ValidateSessionId(sessionId);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, GetSessionGroupName(sessionId));
    }

    /// <summary>
    /// 通过 SignalR 发送消息（持久化后由服务广播）
    /// </summary>
    /// <param name="request">发送请求</param>
    public Task SendMessageAsync(SendChatMessageRequest request)
    {
        return _chatService.SendMessageAsync(request ?? throw new ArgumentNullException(nameof(request)));
    }

    /// <summary>
    /// 获取会话组名称
    /// </summary>
    /// <param name="sessionId">会话标识</param>
    /// <returns>组名称</returns>
    public static string GetSessionGroupName(string sessionId) => $"session:{sessionId}";

    /// <summary>
    /// 获取用户组名称
    /// </summary>
    /// <param name="userId">用户标识</param>
    /// <returns>组名称</returns>
    public static string GetUserGroupName(string userId) => $"user:{userId}";

    private void ValidateSessionId(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId) || !ObjectId.TryParse(sessionId, out _))
        {
            throw new ArgumentException("会话标识格式不正确", nameof(sessionId));
        }
    }
}

