using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务实现
/// </summary>
public class UnifiedNotificationService : IUnifiedNotificationService
{
    private readonly IDataFactory<NoticeIconItem> _noticeFactory;
    private readonly IDataFactory<AppUser> _userFactory;

    /// <summary>
    /// 初始化统一通知服务
    /// </summary>
    public UnifiedNotificationService(
        IDataFactory<NoticeIconItem> noticeFactory,
        IDataFactory<AppUser> userFactory)
    {
        _noticeFactory = noticeFactory;
        _userFactory = userFactory;
    }

    /// <summary>
    /// 获取统一的通知/待办/任务中心数据
    /// </summary>
    public async Task<UnifiedNotificationListResponse> GetUnifiedNotificationsAsync(
        int page = 1,
        int pageSize = 10,
        string filterType = "all",
        string sortBy = "datetime")
    {
        var currentUserId = _noticeFactory.GetRequiredUserId();
        var filterTypeLower = filterType?.ToLowerInvariant() ?? "all";
        var applyTaskVisibility = filterTypeLower is "all" or "unread";
        var onlyMyTasks = filterTypeLower == "task";

        // 构建过滤器（LINQ）
        System.Linq.Expressions.Expression<Func<NoticeIconItem, bool>> BuildFilter(bool unreadOnly)
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

        var filter = BuildFilter(unreadOnly: false);

        // 构建排序条件
        Func<IQueryable<NoticeIconItem>, IOrderedQueryable<NoticeIconItem>> sort = sortBy switch
        {
            "priority" => query => query.OrderByDescending(n => n.Datetime),
            "dueDate" => query => query
                .OrderBy(n => n.TodoDueDate)
                .ThenByDescending(n => n.Datetime),
            _ => query => query.OrderByDescending(n => n.Datetime)
        };

        // 获取分页数据与总数
        var (items, total) = await _noticeFactory.FindPagedAsync(filter, sort, page, pageSize);

        // 获取未读数量（与列表相同的可见性规则）
        var unreadCount = await _noticeFactory.CountAsync(BuildFilter(unreadOnly: true));

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

    /// <summary>
    /// 获取待办项列表
    /// </summary>
    public async Task<TodoListResponse> GetTodosAsync(
        int page = 1,
        int pageSize = 10,
        string sortBy = "dueDate")
    {
        System.Linq.Expressions.Expression<Func<NoticeIconItem, bool>> filter = n => n.IsTodo;

        // 构建排序条件
        Func<IQueryable<NoticeIconItem>, IOrderedQueryable<NoticeIconItem>> sort = sortBy switch
        {
            "priority" => query => query
                .OrderByDescending(n => n.TodoPriority ?? 0)
                .ThenBy(n => n.TodoDueDate),
            "datetime" => query => query.OrderByDescending(n => n.Datetime),
            _ => query => query
                .OrderBy(n => n.TodoDueDate)
                .ThenByDescending(n => n.Datetime)
        };

        // 获取分页数据
        var (todos, total) = await _noticeFactory.FindPagedAsync(filter, sort, page, pageSize);

        return new TodoListResponse
        {
            Todos = todos,
            Total = (int)total,
            Page = page,
            PageSize = pageSize,
            Success = true
        };
    }

    /// <summary>
    /// 获取系统消息列表
    /// </summary>
    public async Task<SystemMessageListResponse> GetSystemMessagesAsync(
        int page = 1,
        int pageSize = 10)
    {
        System.Linq.Expressions.Expression<Func<NoticeIconItem, bool>> filter = n => n.IsSystemMessage;

        // 按时间倒序
        Func<IQueryable<NoticeIconItem>, IOrderedQueryable<NoticeIconItem>> sort =
            query => query.OrderByDescending(n => n.Datetime);

        // 获取分页数据
        var (messages, total) = await _noticeFactory.FindPagedAsync(filter, sort, page, pageSize);

        return new SystemMessageListResponse
        {
            Messages = messages,
            Total = (int)total,
            Page = page,
            PageSize = pageSize,
            Success = true
        };
    }

    /// <summary>
    /// 获取任务相关通知列表
    /// </summary>
    public async Task<TaskNotificationListResponse> GetTaskNotificationsAsync(
        int page = 1,
        int pageSize = 10)
    {
        var currentUserId = _noticeFactory.GetRequiredUserId();
        System.Linq.Expressions.Expression<Func<NoticeIconItem, bool>> filter = n =>
            n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(currentUserId);

        // 按时间倒序
        Func<IQueryable<NoticeIconItem>, IOrderedQueryable<NoticeIconItem>> sort =
            query => query.OrderByDescending(n => n.Datetime);

        // 获取分页数据
        var (notifications, total) = await _noticeFactory.FindPagedAsync(filter, sort, page, pageSize);

        return new TaskNotificationListResponse
        {
            Notifications = notifications,
            Total = (int)total,
            Page = page,
            PageSize = pageSize,
            Success = true
        };
    }

    /// <summary>
    /// 创建待办项
    /// </summary>
    public async Task<NoticeIconItem> CreateTodoAsync(CreateTodoRequest request)
    {
        var currentUserId = _noticeFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId)
            ?? throw new UnauthorizedAccessException("未找到当前用户信息");
        if (string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");

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
            ClickClose = false,
            CompanyId = currentUser.CurrentCompanyId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _noticeFactory.CreateAsync(todo);
    }

    /// <summary>
    /// 更新待办项
    /// </summary>
    public async Task<NoticeIconItem?> UpdateTodoAsync(string id, UpdateTodoRequest request)
    {
        return await _noticeFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Title))
                entity.Title = request.Title;

            if (!string.IsNullOrEmpty(request.Description))
                entity.Description = request.Description;

            if (request.Priority.HasValue)
                entity.TodoPriority = request.Priority;

            if (request.DueDate.HasValue)
                entity.TodoDueDate = request.DueDate;

            if (request.IsCompleted.HasValue)
                entity.Read = request.IsCompleted.Value;

            if (request.Tags != null && request.Tags.Count > 0)
            {
                entity.Extra = string.Join(",", request.Tags);
            }

            entity.UpdatedAt = DateTime.UtcNow;
        });
    }

    /// <summary>
    /// 完成待办项
    /// </summary>
    public async Task<bool> CompleteTodoAsync(string id)
    {
        var result = await _noticeFactory.UpdateAsync(id, entity =>
        {
            entity.Read = true;
            entity.UpdatedAt = DateTime.UtcNow;
        });
        return result != null;
    }

    /// <summary>
    /// 删除待办项
    /// </summary>
    public async Task<bool> DeleteTodoAsync(string id)
    {
        return await _noticeFactory.SoftDeleteAsync(id);
    }

    /// <summary>
    /// 创建任务相关通知
    /// </summary>
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
        var currentUserId = _noticeFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId)
            ?? throw new UnauthorizedAccessException("未找到当前用户信息");
        if (string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            throw new UnauthorizedAccessException("未找到当前企业信息");

        // 根据操作类型生成标题和描述
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
            ClickClose = true,
            CompanyId = currentUser.CurrentCompanyId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 如果指定了分配给的用户，添加到相关用户列表
        if (!string.IsNullOrEmpty(assignedTo))
        {
            notification.RelatedUserIds.Add(assignedTo);
        }

        // 添加额外的相关用户（创建者、参与者等）
        if (relatedUserIds != null)
        {
            foreach (var uid in relatedUserIds)
            {
                if (!string.IsNullOrWhiteSpace(uid) && !notification.RelatedUserIds.Contains(uid))
                {
                    notification.RelatedUserIds.Add(uid);
                }
            }
        }

        var created = await _noticeFactory.CreateAsync(notification);
        return created;
    }

    /// <summary>
    /// 标记通知为已读
    /// </summary>
    public async Task<bool> MarkAsReadAsync(string id)
    {
        var result = await _noticeFactory.UpdateAsync(id, entity =>
        {
            entity.Read = true;
            entity.UpdatedAt = DateTime.UtcNow;
        });
        return result != null;
    }

    /// <summary>
    /// 标记多个通知为已读
    /// </summary>
    public async Task<bool> MarkMultipleAsReadAsync(List<string> ids)
    {
        foreach (var id in ids)
        {
            await MarkAsReadAsync(id);
        }
        return true;
    }

    /// <summary>
    /// 获取未读通知数量
    /// </summary>
    public async Task<int> GetUnreadCountAsync()
    {
        return (int)await _noticeFactory.CountAsync(n => !n.Read);
    }

    /// <summary>
    /// 获取未读通知数量统计（按类型）
    /// </summary>
    public async Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync()
    {
        var uid = _noticeFactory.GetRequiredUserId();

        // 系统消息未读数（按租户/软删除自动过滤）
        var systemMessagesCount = (int)await _noticeFactory.CountAsync(n =>
            !n.Read && n.IsSystemMessage);

        // 普通通知未读数（非任务/消息/系统）
        var notificationsCount = (int)await _noticeFactory.CountAsync(n =>
            !n.Read && n.Type == NoticeIconItemType.Notification);

        // 消息未读数
        var messagesCount = (int)await _noticeFactory.CountAsync(n =>
            !n.Read && n.Type == NoticeIconItemType.Message);

        // 任务通知未读数（仅统计与当前用户相关的任务通知）
        var taskNotificationsCount = (int)await _noticeFactory.CountAsync(n =>
            !n.Read && n.Type == NoticeIconItemType.Task && n.RelatedUserIds.Contains(uid));

        // 待办已下线：不计入统计
        var todosCount = 0;

        var total = systemMessagesCount + notificationsCount + messagesCount + taskNotificationsCount;

        return new UnreadCountStatistics
        {
            Total = total,
            SystemMessages = systemMessagesCount,
            Notifications = notificationsCount,
            Messages = messagesCount,
            Todos = todosCount,
            TaskNotifications = taskNotificationsCount
        };
    }

    /// <summary>
    /// 创建工作流相关通知
    /// </summary>
    public async Task<NoticeIconItem> CreateWorkflowNotificationAsync(
        string workflowInstanceId,
        string documentTitle,
        string actionType,
        IEnumerable<string> relatedUserIds,
        string? remarks = null,
        string? companyId = null)
    {
        // 获取企业ID
        string finalCompanyId;
        if (!string.IsNullOrEmpty(companyId))
        {
            finalCompanyId = companyId;
        }
        else
        {
            var currentUserId = _noticeFactory.GetRequiredUserId();
            var currentUser = await _userFactory.GetByIdAsync(currentUserId)
                ?? throw new UnauthorizedAccessException("未找到当前用户信息");
            if (string.IsNullOrEmpty(currentUser.CurrentCompanyId))
                throw new UnauthorizedAccessException("未找到当前企业信息");
            finalCompanyId = currentUser.CurrentCompanyId;
        }

        // 根据操作类型生成标题和描述
        var (title, description) = GenerateWorkflowNotificationContent(actionType, documentTitle, remarks);

        var notification = new NoticeIconItem
        {
            Title = title,
            Description = description,
            Type = NoticeIconItemType.Notification,
            Extra = workflowInstanceId, // 将工作流实例ID存储在Extra字段中
            ActionType = actionType,
            Datetime = DateTime.UtcNow,
            Read = false,
            ClickClose = true,
            CompanyId = finalCompanyId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 添加相关用户
        if (relatedUserIds != null)
        {
            foreach (var uid in relatedUserIds)
            {
                if (!string.IsNullOrWhiteSpace(uid) && !notification.RelatedUserIds.Contains(uid))
                {
                    notification.RelatedUserIds.Add(uid);
                }
            }
        }

        var created = await _noticeFactory.CreateAsync(notification);
        return created;
    }

    /// <summary>
    /// 根据操作类型生成任务通知内容
    /// </summary>
    private (string title, string description) GenerateTaskNotificationContent(
        string actionType,
        string taskName,
        string? remarks)
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

    /// <summary>
    /// 根据操作类型生成工作流通知内容
    /// </summary>
    private (string title, string description) GenerateWorkflowNotificationContent(
        string actionType,
        string documentTitle,
        string? remarks)
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

