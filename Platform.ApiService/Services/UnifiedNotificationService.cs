using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务实现
/// </summary>
public class UnifiedNotificationService : IUnifiedNotificationService
{
    private readonly IDatabaseOperationFactory<NoticeIconItem> _noticeFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;

    /// <summary>
    /// 初始化统一通知服务
    /// </summary>
    public UnifiedNotificationService(
        IDatabaseOperationFactory<NoticeIconItem> noticeFactory,
        IDatabaseOperationFactory<AppUser> userFactory)
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
        // 构建过滤器
        var fb = _noticeFactory.CreateFilterBuilder();
        switch (filterType)
        {
            case "notification":
                fb.Equal(n => n.Type, NoticeIconItemType.Notification);
                break;
            case "message":
                fb.Equal(n => n.Type, NoticeIconItemType.Message);
                break;
            case "todo":
                fb.Equal(n => n.IsTodo, true);
                break;
            case "task":
                fb.Equal(n => n.Type, NoticeIconItemType.Task);
                break;
            case "system":
                fb.Equal(n => n.IsSystemMessage, true);
                break;
        }
        var filter = fb.Build();

        var currentUserId = _noticeFactory.GetRequiredUserId();
        // 确保“全部”列表不会显示其它人的任务通知：只显示与当前用户相关的任务通知
        if (string.Equals(filterType, "all", StringComparison.OrdinalIgnoreCase))
        {
            var builder = Builders<NoticeIconItem>.Filter;
            var onlyMyTasksOrNonTask = builder.Or(
                builder.Ne(n => n.Type, NoticeIconItemType.Task),
                builder.And(
                    builder.Eq(n => n.Type, NoticeIconItemType.Task),
                    builder.AnyEq(n => n.RelatedUserIds, currentUserId)
                )
            );
            filter = filter == Builders<NoticeIconItem>.Filter.Empty ? onlyMyTasksOrNonTask : builder.And(filter, onlyMyTasksOrNonTask);
        }
        else if (string.Equals(filterType, "task", StringComparison.OrdinalIgnoreCase))
        {
            var builder = Builders<NoticeIconItem>.Filter;
            var myTaskFilter = builder.And(
                builder.Eq(n => n.Type, NoticeIconItemType.Task),
                builder.AnyEq(n => n.RelatedUserIds, currentUserId)
            );
            filter = filter == Builders<NoticeIconItem>.Filter.Empty ? myTaskFilter : builder.And(filter, myTaskFilter);
        }

        // 构建排序条件
        var sortBuilder = _noticeFactory.CreateSortBuilder();
        var sort = sortBy switch
        {
            "priority" => sortBuilder.Descending(n => n.Datetime).Build(),
            "dueDate" => sortBuilder.Ascending(n => n.TodoDueDate)
                .Descending(n => n.Datetime)
                .Build(),
            _ => sortBuilder.Descending(n => n.Datetime).Build()
        };

        // 获取分页数据与总数
        var (items, total) = await _noticeFactory.FindPagedAsync(filter, sort, page, pageSize);

        // 获取未读数量（与列表相同的可见性规则）
        var unreadFilter = Builders<NoticeIconItem>.Filter.And(
            filter,
            Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false)
        );
        var unreadCount = await _noticeFactory.CountAsync(unreadFilter);

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
        var fb = _noticeFactory.CreateFilterBuilder();
        fb.Equal(n => n.IsTodo, true);
        var filter = fb.Build();

        // 构建排序条件
        var sortBuilder = _noticeFactory.CreateSortBuilder();
        var sort = sortBy switch
        {
            "priority" => sortBuilder.Descending(n => n.TodoPriority ?? 0)
                .Ascending(n => n.TodoDueDate)
                .Build(),
            "datetime" => sortBuilder.Descending(n => n.Datetime).Build(),
            _ => sortBuilder.Ascending(n => n.TodoDueDate)
                .Descending(n => n.Datetime)
                .Build()
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
        var fb = _noticeFactory.CreateFilterBuilder();
        fb.Equal(n => n.IsSystemMessage, true);
        var filter = fb.Build();

        // 按时间倒序
        var sortBuilder = _noticeFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(n => n.Datetime).Build();

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
        var filter = Builders<NoticeIconItem>.Filter.And(
            Builders<NoticeIconItem>.Filter.Eq(n => n.Type, NoticeIconItemType.Task),
            Builders<NoticeIconItem>.Filter.AnyEq(n => n.RelatedUserIds, currentUserId)
        );

        // 按时间倒序
        var sortBuilder = _noticeFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(n => n.Datetime).Build();

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
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();

        var updateBuilder = _noticeFactory.CreateUpdateBuilder();
        
        if (!string.IsNullOrEmpty(request.Title))
            updateBuilder.Set(n => n.Title, request.Title);

        if (!string.IsNullOrEmpty(request.Description))
            updateBuilder.Set(n => n.Description, request.Description);

        if (request.Priority.HasValue)
            updateBuilder.Set(n => n.TodoPriority, request.Priority);

        if (request.DueDate.HasValue)
            updateBuilder.Set(n => n.TodoDueDate, request.DueDate);

        if (request.IsCompleted.HasValue)
            updateBuilder.Set(n => n.Read, request.IsCompleted.Value);

        if (request.Tags != null && request.Tags.Count > 0)
        {
            updateBuilder.Set(n => n.Extra, string.Join(",", request.Tags));
        }

        updateBuilder.Set(n => n.UpdatedAt, DateTime.UtcNow);

        var update = updateBuilder.Build();
        var options = new FindOneAndUpdateOptions<NoticeIconItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        return await _noticeFactory.FindOneAndUpdateAsync(filter, update, options);
    }

    /// <summary>
    /// 完成待办项
    /// </summary>
    public async Task<bool> CompleteTodoAsync(string id)
    {
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();

        var update = _noticeFactory.CreateUpdateBuilder()
            .Set(n => n.Read, true)
            .Set(n => n.UpdatedAt, DateTime.UtcNow)
            .Build();

        var options = new FindOneAndUpdateOptions<NoticeIconItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var result = await _noticeFactory.FindOneAndUpdateAsync(filter, update, options);
        return result != null;
    }

    /// <summary>
    /// 删除待办项
    /// </summary>
    public async Task<bool> DeleteTodoAsync(string id)
    {
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();

        var result = await _noticeFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
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
        var filter = _noticeFactory.CreateFilterBuilder()
            .Equal(n => n.Id, id)
            .Build();

        var update = _noticeFactory.CreateUpdateBuilder()
            .Set(n => n.Read, true)
            .Set(n => n.UpdatedAt, DateTime.UtcNow)
            .Build();

        var options = new FindOneAndUpdateOptions<NoticeIconItem>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var result = await _noticeFactory.FindOneAndUpdateAsync(filter, update, options);
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
        var fb = _noticeFactory.CreateFilterBuilder();
        fb.Equal(n => n.Read, false);
        return (int)await _noticeFactory.CountAsync(fb.Build());
    }

    /// <summary>
    /// 获取未读通知数量统计（按类型）
    /// </summary>
    public async Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync()
    {
        var uid = _noticeFactory.GetRequiredUserId();

        // 系统消息未读数（按租户/软删除自动过滤）
        var systemMessagesCount = (int)await _noticeFactory.CountAsync(
            Builders<NoticeIconItem>.Filter.And(
                Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false),
                Builders<NoticeIconItem>.Filter.Eq(n => n.IsSystemMessage, true)
            )
        );

        // 普通通知未读数（非任务/消息/系统）
        var notificationsCount = (int)await _noticeFactory.CountAsync(
            Builders<NoticeIconItem>.Filter.And(
                Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false),
                Builders<NoticeIconItem>.Filter.Eq(n => n.Type, NoticeIconItemType.Notification)
            )
        );

        // 消息未读数
        var messagesCount = (int)await _noticeFactory.CountAsync(
            Builders<NoticeIconItem>.Filter.And(
                Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false),
                Builders<NoticeIconItem>.Filter.Eq(n => n.Type, NoticeIconItemType.Message)
            )
        );

        // 任务通知未读数（仅统计与当前用户相关的任务通知）
        var taskNotificationsCount = (int)await _noticeFactory.CountAsync(
            Builders<NoticeIconItem>.Filter.And(
                Builders<NoticeIconItem>.Filter.Eq(n => n.Read, false),
                Builders<NoticeIconItem>.Filter.Eq(n => n.Type, NoticeIconItemType.Task),
                Builders<NoticeIconItem>.Filter.AnyEq(n => n.RelatedUserIds, uid)
            )
        );

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
}

