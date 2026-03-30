using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务实现
/// </summary>
public class UnifiedNotificationService : IUnifiedNotificationService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;

    public UnifiedNotificationService(DbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    /// <inheritdoc/>
    public async Task<UnifiedNotificationListResponse> GetUnifiedNotificationsAsync(
        int page = 1,
        int pageSize = 10,
        string filterType = "all",
        string sortBy = "datetime")
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

        query = sortBy switch
        {
            "priority" => query.OrderByDescending(n => n.Datetime),
            "dueDate" => query.OrderBy(n => n.TodoDueDate).ThenByDescending(n => n.Datetime),
            _ => query.OrderByDescending(n => n.Datetime)
        };

        var total = await query.LongCountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var unreadCount = await _context.Set<NoticeIconItem>().LongCountAsync(BuildFilter(true));

        return new UnifiedNotificationListResponse
        {
            Items = items,
            Total = (int)total,
            Page = page,
            PageSize = pageSize,
            UnreadCount = (int)unreadCount,
            Success = true
        };
    }

    /// <inheritdoc/>
    public async Task<TodoListResponse> GetTodosAsync(int page = 1, int pageSize = 10, string sortBy = "dueDate")
    {
        var query = _context.Set<NoticeIconItem>().Where(n => n.IsTodo);

        query = sortBy switch
        {
            "priority" => query.OrderByDescending(n => n.TodoPriority ?? 0).ThenBy(n => n.TodoDueDate),
            "datetime" => query.OrderByDescending(n => n.Datetime),
            _ => query.OrderBy(n => n.TodoDueDate).ThenByDescending(n => n.Datetime)
        };

        var total = await query.LongCountAsync();
        var todos = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new TodoListResponse { Todos = todos, Total = (int)total, Page = page, PageSize = pageSize, Success = true };
    }

    /// <inheritdoc/>
    public async Task<SystemMessageListResponse> GetSystemMessagesAsync(int page = 1, int pageSize = 10)
    {
        var query = _context.Set<NoticeIconItem>().Where(n => n.IsSystemMessage).OrderByDescending(n => n.Datetime);
        var total = await query.LongCountAsync();
        var messages = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new SystemMessageListResponse { Messages = messages, Total = (int)total, Page = page, PageSize = pageSize, Success = true };
    }

    /// <inheritdoc/>
    public async Task<TaskNotificationListResponse> GetTaskNotificationsAsync(int page = 1, int pageSize = 10)
    {
        var currentUserId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var query = _context.Set<NoticeIconItem>()
            .Where(n => n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(currentUserId))
            .OrderByDescending(n => n.Datetime);

        var total = await query.LongCountAsync();
        var notifications = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new TaskNotificationListResponse { Notifications = notifications, Total = (int)total, Page = page, PageSize = pageSize, Success = true };
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
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteTodoAsync(string id)
    {
        var todo = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (todo == null) return false;

        _context.Set<NoticeIconItem>().Remove(todo);
        await _context.SaveChangesAsync();
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

        if (!string.IsNullOrEmpty(assignedTo)) notification.RelatedUserIds.Add(assignedTo);
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
        return notification;
    }

    /// <inheritdoc/>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        var item = await _context.Set<NoticeIconItem>().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return false;

        item.Read = true;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> MarkMultipleAsReadAsync(List<string> ids)
    {
        var items = await _context.Set<NoticeIconItem>().Where(x => ids.Contains(x.Id!)).ToListAsync();
        foreach (var item in items) item.Read = true;
        await _context.SaveChangesAsync();
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
        var uid = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        var systemMessagesCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.IsSystemMessage);
        var notificationsCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Notification);
        var messagesCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Message);
        var taskNotificationsCount = (int)await _context.Set<NoticeIconItem>().LongCountAsync(n => !n.Read && n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(uid));

        return new UnreadCountStatistics
        {
            Total = systemMessagesCount + notificationsCount + messagesCount + taskNotificationsCount,
            SystemMessages = systemMessagesCount,
            Notifications = notificationsCount,
            Messages = messagesCount,
            Todos = 0,
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
            "workflow_started" => ("公文已提交审批", $"{baseDescription} 已提交审批流程{remarkText}"),
            "workflow_approval_required" => ("待审批公文", $"{baseDescription} 需要您审批{remarkText}"),
            "workflow_approved" => ("公文审批通过", $"{baseDescription} 已审批通过{remarkText}"),
            "workflow_rejected" => ("公文审批拒绝", $"{baseDescription} 审批被拒绝{remarkText}"),
            "workflow_returned" => ("公文已退回", $"{baseDescription} 已退回{remarkText}"),
            "workflow_delegated" => ("公文已转办", $"{baseDescription} 已转办{remarkText}"),
            "workflow_completed" => ("公文审批完成", $"{baseDescription} 审批流程已完成{remarkText}"),
            "workflow_cancelled" => ("公文审批取消", $"{baseDescription} 审批流程已取消{remarkText}"),
            _ => ("工作流通知", $"{baseDescription} 有新的更新{remarkText}")
        };
    }
}
