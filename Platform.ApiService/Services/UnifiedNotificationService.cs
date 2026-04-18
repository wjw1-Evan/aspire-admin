using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using System.Text.Json;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务实现
/// </summary>
public class UnifiedNotificationService : IUnifiedNotificationService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IChatSseConnectionManager _sseConnectionManager;
    private readonly ILogger<UnifiedNotificationService> _logger;

    public UnifiedNotificationService(
        DbContext context, 
        ITenantContext tenantContext, 
        IChatSseConnectionManager sseConnectionManager,
        ILogger<UnifiedNotificationService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _sseConnectionManager = sseConnectionManager;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<NoticeIconItem>> GetUnifiedNotificationsAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string filterType = "all")
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var filterTypeLower = filterType?.ToLowerInvariant() ?? "all";
        var applyTaskVisibility = filterTypeLower is "all" or "unread";
        var onlyMyTasks = filterTypeLower == "task";

        Expression<Func<NoticeIconItem, bool>> BuildFilter(bool unreadOnly)
        {
            return n =>
                (filterTypeLower == "notification" ? n.Type == NoticeIconItemType.Notification :
                 filterTypeLower == "message" ? n.Type == NoticeIconItemType.Message :
                 filterTypeLower == "todo" ? n.IsTodo :
                 filterTypeLower == "task" ? n.Type == NoticeIconItemType.Task :
                 filterTypeLower == "system" ? n.IsSystemMessage :
                 filterTypeLower == "unread" ? !n.Read :
                 true) &&
                (!applyTaskVisibility || n.Type != NoticeIconItemType.Task || n.RelatedUserIds.Contains(currentUserId)) &&
                (!onlyMyTasks || (n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(currentUserId))) &&
                (!unreadOnly || !n.Read);
        }

        var query = _context.Set<NoticeIconItem>().Where(BuildFilter(false));

        return query.ToPagedList(request);
    }

    /// <inheritdoc/>
    public Task<System.Linq.Dynamic.Core.PagedResult<NoticeIconItem>> GetTodosAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string sortBy = "dueDate")
    {
        var query = _context.Set<NoticeIconItem>().Where(n => n.IsTodo);

        return Task.FromResult(query.ToPagedList(request));
    }

    /// <inheritdoc/>
    public Task<System.Linq.Dynamic.Core.PagedResult<NoticeIconItem>> GetSystemMessagesAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var query = _context.Set<NoticeIconItem>().Where(n => n.IsSystemMessage).OrderByDescending(n => n.Datetime);
        return Task.FromResult(query.ToPagedList(request));
    }

    /// <inheritdoc/>
    public Task<System.Linq.Dynamic.Core.PagedResult<NoticeIconItem>> GetTaskNotificationsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var query = _context.Set<NoticeIconItem>()
            .Where(n => n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(currentUserId))
            .OrderByDescending(n => n.Datetime);

        return Task.FromResult(query.ToPagedList(request));
    }

    /// <inheritdoc/>
    public async Task<NoticeIconItem> CreateTodoAsync(CreateTodoRequest request)
    {
        var todo = new NoticeIconItem
        {
            Title = request.Title,
            Description = request.Description,
            Type = NoticeIconItemType.Event,
            IsTodo = true,
            TodoPriority = request.Priority,
            TodoDueDate = request.DueDate,
            Datetime = DateTime.UtcNow,
            Read = false,
            ClickClose = false
        };

        await _context.Set<NoticeIconItem>().AddAsync(todo);
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return todo;
    }

    /// <inheritdoc/>
    public async Task<NoticeIconItem?> UpdateTodoAsync(string id, UpdateTodoRequest request)
    {
        var todo = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (todo == null) return null;

        if (!string.IsNullOrEmpty(request.Title)) todo.Title = request.Title;
        if (!string.IsNullOrEmpty(request.Description)) todo.Description = request.Description;
        if (request.Priority.HasValue) todo.TodoPriority = request.Priority;
        if (request.DueDate.HasValue) todo.TodoDueDate = request.DueDate;
        if (request.IsCompleted.HasValue) todo.Read = request.IsCompleted.Value;
        if (request.Tags != null && request.Tags.Count > 0) todo.Extra = string.Join(",", request.Tags);

        await _context.SaveChangesAsync();
        return todo;
    }

    /// <inheritdoc/>
    public async Task<bool> CompleteTodoAsync(string id)
    {
        var todo = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (todo == null) return false;

        todo.Read = true;
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteTodoAsync(string id)
    {
        var todo = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (todo == null) return false;

        _context.Set<NoticeIconItem>().Remove(todo);
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<NoticeIconItem> CreateTaskNotificationAsync(
        string taskId,
        string taskName,
        string actionType,
        int priority,
        int status,
        string? assignedTo = null,
        IEnumerable<string>? relatedUserIds = null,
        string? remarks = null)
    {
        var (title, description) = GenerateTaskNotificationContent(actionType, taskName, remarks);

        var notification = new NoticeIconItem
        {
            Title = title,
            Description = description,
            Type = NoticeIconItemType.Task,
            TaskId = taskId,
            TaskPriority = priority,
            TaskStatus = status,
            ActionType = actionType,
            Datetime = DateTime.UtcNow,
            Read = false,
            ClickClose = true
        };

        var notifyUsers = new HashSet<string>();
        if (!string.IsNullOrEmpty(assignedTo))
        {
            notification.RelatedUserIds.Add(assignedTo);
            notifyUsers.Add(assignedTo);
        }
        if (relatedUserIds != null)
        {
            foreach (var uid in relatedUserIds)
            {
                if (!string.IsNullOrWhiteSpace(uid) && !notification.RelatedUserIds.Contains(uid))
                {
                    notification.RelatedUserIds.Add(uid);
                    notifyUsers.Add(uid);
                }
            }
        }

        await _context.Set<NoticeIconItem>().AddAsync(notification);
        await _context.SaveChangesAsync();

        foreach (var userId in notifyUsers)
        {
            await BroadcastToUserAsync(userId);
        }

        return notification;
    }

    /// <inheritdoc/>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        var item = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return false;

        item.Read = true;
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> MarkMultipleAsReadAsync(List<string> ids)
    {
        var items = await _context.Set<NoticeIconItem>().Where(x => ids.Contains(x.Id!)).ToListAsync();
        foreach (var item in items) item.Read = true;
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<int> GetUnreadCountAsync()
    {
        return (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read);
    }

    /// <inheritdoc/>
    public async Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync()
    {
        return await GetUnreadCountStatisticsInternalAsync(null);
    }

    /// <inheritdoc/>
    public async Task<UnreadCountStatistics> GetUnreadCountStatisticsByUserIdAsync(string userId)
    {
        _logger.LogInformation("GetUnreadCountStatisticsByUserIdAsync: userId={UserId}", userId);
        var result = await GetUnreadCountStatisticsInternalAsync(userId);
        _logger.LogInformation("GetUnreadCountStatisticsByUserIdAsync 结果: Total={Total}, System={System}, Notification={Notification}, Message={Message}, Task={Task}, Todo={Todo}",
            result.Total, result.SystemMessages, result.Notifications, result.Messages, result.TaskNotifications, result.Todos);
        return result;
    }

    private async Task<UnreadCountStatistics> GetUnreadCountStatisticsInternalAsync(string? specificUserId)
    {
        var uid = specificUserId ?? _tenantContext.GetCurrentUserId();
        if (string.IsNullOrEmpty(uid))
        {
            return new UnreadCountStatistics
            {
                Total = 0,
                SystemMessages = 0,
                Notifications = 0,
                Messages = 0,
                Todos = 0,
                TaskNotifications = 0
            };
        }

        _logger.LogInformation("GetUnreadCountStatisticsInternalAsync: uid={Uid}", uid);

        var systemMessagesCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.IsSystemMessage);
        var notificationsCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Notification);
        var messagesCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Message);
        var taskNotificationsCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Task && n.RelatedUserIds != null && n.RelatedUserIds.Contains(uid));
        var todosCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.IsTodo);

        _logger.LogInformation("统计结果: system={System}, notification={Notification}, message={Message}, task={Task}, todo={Todo}",
            systemMessagesCount, notificationsCount, messagesCount, taskNotificationsCount, todosCount);

        return new UnreadCountStatistics
        {
            Total = systemMessagesCount + notificationsCount + messagesCount + taskNotificationsCount + todosCount,
            SystemMessages = systemMessagesCount,
            Notifications = notificationsCount,
            Messages = messagesCount,
            Todos = todosCount,
            TaskNotifications = taskNotificationsCount
        };
    }

    /// <inheritdoc/>
    public async Task<NoticeIconItem> CreateWorkflowNotificationAsync(
        string workflowInstanceId,
        string documentTitle,
        string actionType,
        IEnumerable<string> relatedUserIds,
        string? remarks = null)
    {
        var (title, description) = GenerateWorkflowNotificationContent(actionType, documentTitle, remarks);

        var notification = new NoticeIconItem
        {
            Title = title,
            Description = description,
            Type = NoticeIconItemType.Notification,
            Extra = workflowInstanceId,
            ActionType = actionType,
            Datetime = DateTime.UtcNow,
            Read = false,
            ClickClose = true
        };

        if (relatedUserIds != null)
        {
            foreach (var uid in relatedUserIds)
            {
                if (!string.IsNullOrWhiteSpace(uid) && !notification.RelatedUserIds.Contains(uid))
                    notification.RelatedUserIds.Add(uid);
            }
        }

        await _context.Set<NoticeIconItem>().AddAsync(notification);
        await _context.SaveChangesAsync();
        await BroadcastUnreadStatisticsAsync();
        return notification;
    }

    private (string title, string description) GenerateTaskNotificationContent(string actionType, string taskName, string? remarks)
    {
        return actionType switch
        {
            "task_created" => ("新任务创建", $"任务 \"{taskName}\" 已创建"),
            "task_assigned" => ("任务已分配", $"任务 \"{taskName}\" 已分配给您"),
            "task_started" => ("任务已开始", $"任务 \"{taskName}\" 已开始执行"),
            "task_completed" => ("任务已完成", $"任务 \"{taskName}\" 已完成"),
            "task_cancelled" => ("任务已取消", $"任务 \"{taskName}\" 已取消"),
            "task_failed" => ("任务失败", $"任务 \"{taskName}\" 执行失败"),
            "task_paused" => ("任务已暂停", $"任务 \"{taskName}\" 已暂停"),
            _ => ("任务通知", $"任务 \"{taskName}\" 有新的更新")
        };
    }

    private (string title, string description) GenerateWorkflowNotificationContent(string actionType, string documentTitle, string? remarks)
    {
        var baseDescription = $"公文 \"{documentTitle}\"";
        var remarkText = string.IsNullOrEmpty(remarks) ? "" : $" ({remarks})";

        return actionType switch
        {
            "workflow_started" => ("公文已提交审批", $"{baseDescription} 已提交审批流程{remarks}"),
            "workflow_approval_required" => ("待审批公文", $"{baseDescription} 需要您审批{remarks}"),
            "workflow_approved" => ("公文审批通过", $"{baseDescription} 已审批通过{remarks}"),
            "workflow_rejected" => ("公文审批拒绝", $"{baseDescription} 审批被拒绝{remarks}"),
            "workflow_returned" => ("公文已退回", $"{baseDescription} 已退回{remarks}"),
            "workflow_delegated" => ("公文已转办", $"{baseDescription} 已转办{remarks}"),
            "workflow_completed" => ("公文审批完成", $"{baseDescription} 审批流程已完成{remarks}"),
            "workflow_cancelled" => ("公文审批取消", $"{baseDescription} 审批流程已取消{remarks}"),
            _ => ("工作流通知", $"{baseDescription} 有新的更新{remarks}")
        };
    }

    private async Task BroadcastUnreadStatisticsAsync()
    {
        try
        {
            var userId = _tenantContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return;

            var statistics = await GetUnreadCountStatisticsAsync();
            var json = JsonSerializer.Serialize(statistics);
            var message = $"event: NotificationUpdated\ndata: {json}\n\n";
            await _sseConnectionManager.SendToUserAsync(userId, message);
        }
        catch
        {
        }
    }

    private async Task BroadcastToUserAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId))
            return;

        try
        {
            var statistics = await GetUnreadCountStatisticsInternalAsync(userId);
            var json = JsonSerializer.Serialize(statistics);
            var message = $"event: NotificationUpdated\ndata: {json}\n\n";
            await _sseConnectionManager.SendToUserAsync(userId, message);
        }
        catch
        {
        }
    }
}
