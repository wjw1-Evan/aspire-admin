using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Hubs;

/// <summary>
/// 通知推送 Hub（基于用户分组推送）
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    /// <summary>
    /// 通知创建事件（推送新的通知给用户）
    /// </summary>
    public const string NotificationCreatedEvent = "NotificationCreated";

    /// <summary>
    /// 通知已读事件（同步通知的已读状态）
    /// </summary>
    public const string NotificationReadEvent = "NotificationRead";

    private readonly IDatabaseOperationFactory<NoticeIconItem> _noticeFactory;

    /// <summary>
    /// 初始化通知推送 Hub
    /// </summary>
    /// <param name="noticeFactory">通知数据工厂</param>
    public NotificationHub(IDatabaseOperationFactory<NoticeIconItem> noticeFactory)
    {
        _noticeFactory = noticeFactory ?? throw new ArgumentNullException(nameof(noticeFactory));
    }

    /// <summary>
    /// 连接成功时将当前连接加入用户分组
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        // 从连接的 Claims 中解析用户标识，避免在 Hub 上下文中依赖 HttpContextAccessor
        var user = Context?.User;
        var userId = user?.FindFirst("userId")?.Value
                  ?? user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? user?.FindFirst("sub")?.Value
                  ?? throw new UnauthorizedAccessException("未找到当前用户信息");

        var connectionId = Context?.ConnectionId;
        if (string.IsNullOrEmpty(connectionId))
        {
            throw new InvalidOperationException("连接上下文不可用");
        }
        await Groups.AddToGroupAsync(connectionId, GetUserGroupName(userId));
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// 根据用户标识获取对应的 SignalR 分组名
    /// </summary>
    /// <param name="userId">用户标识</param>
    /// <returns>分组名称</returns>
    public static string GetUserGroupName(string userId) => $"user:{userId}";
}
