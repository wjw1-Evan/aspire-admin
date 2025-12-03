using Microsoft.AspNetCore.SignalR;
using Platform.ApiService.Hubs;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一的通知广播器，封装了通过 SignalR 向指定用户分组推送通知的逻辑。
/// </summary>
public class UnifiedNotificationBroadcaster
{
    private readonly IHubContext<NotificationHub> _hub;

    /// <summary>
    /// 初始化通知广播器。
    /// </summary>
    /// <param name="hub">通知 Hub 上下文。</param>
    public UnifiedNotificationBroadcaster(IHubContext<NotificationHub> hub)
    {
        _hub = hub;
    }

    /// <summary>
    /// 向与通知相关的用户推送“创建通知”的事件。
    /// </summary>
    /// <param name="notice">通知实体。</param>
    public async Task BroadcastCreatedAsync(NoticeIconItem notice)
    {
        if (notice.RelatedUserIds == null || notice.RelatedUserIds.Count == 0)
            return;

        var payload = new
        {
            id = notice.Id,
            title = notice.Title,
            description = notice.Description,
            avatar = notice.Avatar,
            extra = notice.Extra,
            status = notice.Status,
            datetime = notice.Datetime,
            type = notice.Type.ToString(),
            read = notice.Read,
            clickClose = notice.ClickClose,
            taskId = notice.TaskId,
            taskPriority = notice.TaskPriority,
            taskStatus = notice.TaskStatus,
            isSystemMessage = notice.IsSystemMessage,
            messagePriority = notice.MessagePriority,
            actionType = notice.ActionType,
            relatedUserIds = notice.RelatedUserIds
        };

        foreach (var uid in notice.RelatedUserIds)
        {
            await _hub.Clients.Group(NotificationHub.GetUserGroupName(uid))
                .SendAsync(NotificationHub.NotificationCreatedEvent, payload);
        }
    }

    /// <summary>
    /// 向指定用户推送“通知已读”的事件。
    /// </summary>
    /// <param name="id">通知标识。</param>
    /// <param name="userIds">需要同步的用户标识集合。</param>
    public async Task BroadcastReadAsync(string id, IEnumerable<string> userIds)
    {
        foreach (var uid in userIds)
        {
            await _hub.Clients.Group(NotificationHub.GetUserGroupName(uid))
                .SendAsync(NotificationHub.NotificationReadEvent, new { id });
        }
    }
}
