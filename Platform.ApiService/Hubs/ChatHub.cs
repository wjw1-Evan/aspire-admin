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
    public async Task SendMessageAsync(SendChatMessageRequest request)
    {
        if (request == null)
        {
            _logger.LogError("SendMessageAsync 收到 null 请求: 连接ID {ConnectionId}", Context.ConnectionId);
            throw new ArgumentNullException(nameof(request));
        }

        // 记录请求信息，便于调试
        _logger.LogInformation(
            "SendMessageAsync 收到请求: 连接ID {ConnectionId}, 会话 {SessionId}, 类型 {Type}, 内容长度 {ContentLength}, 附件 {AttachmentId}, 客户端消息ID {ClientMessageId}",
            Context.ConnectionId,
            request.SessionId,
            request.Type,
            request.Content?.Length ?? 0,
            request.AttachmentId ?? "无",
            request.ClientMessageId ?? "无");

        string? userId = null;
        try
        {
            // 提前验证用户上下文，提供更详细的错误信息
            try
            {
                userId = _sessionFactory.GetRequiredUserId();
                _logger.LogDebug("SendMessageAsync 获取用户ID成功: {UserId}, 连接ID {ConnectionId}", userId, Context.ConnectionId);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogError(ex, "SendMessageAsync 无法获取用户ID: 连接ID {ConnectionId}, 会话 {SessionId}", 
                    Context.ConnectionId, request.SessionId);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SendMessageAsync 获取用户ID时发生未预期的错误: 连接ID {ConnectionId}, 会话 {SessionId}, 错误: {ErrorMessage}",
                    Context.ConnectionId, request.SessionId, ex.Message);
                throw;
            }

            // 验证请求数据
            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                _logger.LogWarning("SendMessageAsync 会话ID为空: 用户 {UserId}, 连接ID {ConnectionId}", userId, Context.ConnectionId);
                throw new ArgumentException("会话标识不能为空", nameof(request.SessionId));
            }

            // 调用聊天服务发送消息
            var message = await _chatService.SendMessageAsync(request);
            _logger.LogInformation("通过 SignalR 成功发送消息: 用户 {UserId}, 会话 {SessionId}, 消息ID {MessageId}", 
                userId, request.SessionId, message.Id);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "SendMessageAsync 参数验证失败: 用户 {UserId}, 会话 {SessionId}", userId, request.SessionId);
            throw;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "SendMessageAsync 权限验证失败: 用户 {UserId}, 会话 {SessionId}", userId, request.SessionId);
            throw;
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "SendMessageAsync 资源不存在: 用户 {UserId}, 会话 {SessionId}", userId, request.SessionId);
            throw;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "SendMessageAsync 操作无效: 用户 {UserId}, 会话 {SessionId}", userId, request.SessionId);
            throw;
        }
        catch (Exception ex)
        {
            // 记录详细的错误信息，包括堆栈跟踪和上下文信息
            _logger.LogError(
                ex,
                "SendMessageAsync 发生未预期的错误: 用户 {UserId}, 会话 {SessionId}, 消息类型 {Type}, 内容长度 {ContentLength}, 连接ID {ConnectionId}, 错误类型: {ExceptionType}, 错误消息: {ErrorMessage}, 堆栈跟踪: {StackTrace}",
                userId,
                request?.SessionId ?? "未知",
                request?.Type.ToString() ?? "未知",
                request?.Content?.Length ?? 0,
                Context.ConnectionId,
                ex.GetType().Name,
                ex.Message,
                ex.StackTrace);
            throw;
        }
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

