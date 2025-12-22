using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务接口
/// 将系统消息、通知、待办和任务管理整合到一个统一的接口中
/// </summary>
public interface IUnifiedNotificationService
{
    /// <summary>
    /// 获取统一的通知/待办/任务中心数据
    /// 包括：系统消息、待办项、任务相关通知
    /// </summary>
    /// <param name="page">页码（从1开始）</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="filterType">过滤类型：all, notification, message, todo, task, system</param>
    /// <param name="sortBy">排序字段：datetime, priority, dueDate</param>
    /// <returns>统一的通知/待办/任务列表</returns>
    Task<UnifiedNotificationListResponse> GetUnifiedNotificationsAsync(
        int page = 1,
        int pageSize = 10,
        string filterType = "all",
        string sortBy = "datetime");

    /// <summary>
    /// 获取待办项列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <param name="sortBy">排序字段：dueDate, priority, datetime</param>
    /// <returns>待办项列表</returns>
    Task<TodoListResponse> GetTodosAsync(
        int page = 1,
        int pageSize = 10,
        string sortBy = "dueDate");

    /// <summary>
    /// 获取系统消息列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>系统消息列表</returns>
    Task<SystemMessageListResponse> GetSystemMessagesAsync(
        int page = 1,
        int pageSize = 10);

    /// <summary>
    /// 获取任务相关通知列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>任务相关通知列表</returns>
    Task<TaskNotificationListResponse> GetTaskNotificationsAsync(
        int page = 1,
        int pageSize = 10);

    /// <summary>
    /// 创建待办项
    /// </summary>
    /// <param name="request">创建待办项请求</param>
    /// <returns>创建的待办项</returns>
    Task<NoticeIconItem> CreateTodoAsync(CreateTodoRequest request);

    /// <summary>
    /// 更新待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <param name="request">更新待办项请求</param>
    /// <returns>更新后的待办项</returns>
    Task<NoticeIconItem?> UpdateTodoAsync(string id, UpdateTodoRequest request);

    /// <summary>
    /// 完成待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <returns>是否成功</returns>
    Task<bool> CompleteTodoAsync(string id);

    /// <summary>
    /// 删除待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <returns>是否成功</returns>
    Task<bool> DeleteTodoAsync(string id);

    /// <summary>
    /// 创建任务相关通知
    /// 当任务状态变化时自动调用此方法
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="taskName">任务名称</param>
    /// <param name="actionType">操作类型：task_created, task_assigned, task_started, task_completed, task_cancelled, task_failed</param>
    /// <param name="priority">任务优先级</param>
    /// <param name="status">任务状态</param>
    /// <param name="assignedTo">分配给的用户ID</param>
    /// <param name="relatedUserIds">额外相关用户ID列表（创建者/参与者等）</param>
    /// <param name="remarks">备注</param>
    /// <returns>创建的通知</returns>
    Task<NoticeIconItem> CreateTaskNotificationAsync(
        string taskId,
        string taskName,
        string actionType,
        int priority,
        int status,
        string? assignedTo = null,
        IEnumerable<string>? relatedUserIds = null,
        string? remarks = null);

    /// <summary>
    /// 创建工作流相关通知
    /// 当工作流状态变化时自动调用此方法
    /// </summary>
    /// <param name="workflowInstanceId">工作流实例ID</param>
    /// <param name="documentTitle">公文标题</param>
    /// <param name="actionType">操作类型：workflow_started, workflow_approved, workflow_rejected, workflow_returned, workflow_delegated, workflow_completed, workflow_cancelled, workflow_approval_required</param>
    /// <param name="relatedUserIds">相关用户ID列表（审批人/发起人等）</param>
    /// <param name="remarks">备注</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>创建的通知</returns>
    Task<NoticeIconItem> CreateWorkflowNotificationAsync(
        string workflowInstanceId,
        string documentTitle,
        string actionType,
        IEnumerable<string> relatedUserIds,
        string? remarks = null,
        string? companyId = null);

    /// <summary>
    /// 标记通知为已读
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功</returns>
    Task<bool> MarkAsReadAsync(string id);

    /// <summary>
    /// 标记多个通知为已读
    /// </summary>
    /// <param name="ids">通知ID列表</param>
    /// <returns>是否成功</returns>
    Task<bool> MarkMultipleAsReadAsync(List<string> ids);

    /// <summary>
    /// 获取未读通知数量
    /// </summary>
    /// <returns>未读通知数量</returns>
    Task<int> GetUnreadCountAsync();

    /// <summary>
    /// 获取未读通知数量统计（按类型）
    /// </summary>
    /// <returns>各类型的未读数量统计</returns>
    Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync();
}

/// <summary>
/// 统一通知/待办/任务列表响应
/// </summary>
public class UnifiedNotificationListResponse
{
    /// <summary>
    /// 通知/待办/任务列表
    /// </summary>
    public List<NoticeIconItem> Items { get; set; } = new();

    /// <summary>
    /// 总数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 未读数量
    /// </summary>
    public int UnreadCount { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
}

/// <summary>
/// 待办项列表响应
/// </summary>
public class TodoListResponse
{
    /// <summary>
    /// 待办项列表
    /// </summary>
    public List<NoticeIconItem> Todos { get; set; } = new();

    /// <summary>
    /// 总数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
}

/// <summary>
/// 系统消息列表响应
/// </summary>
public class SystemMessageListResponse
{
    /// <summary>
    /// 系统消息列表
    /// </summary>
    public List<NoticeIconItem> Messages { get; set; } = new();

    /// <summary>
    /// 总数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
}

/// <summary>
/// 任务相关通知列表响应
/// </summary>
public class TaskNotificationListResponse
{
    /// <summary>
    /// 任务相关通知列表
    /// </summary>
    public List<NoticeIconItem> Notifications { get; set; } = new();

    /// <summary>
    /// 总数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 当前页码
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
}

/// <summary>
/// 创建待办项请求
/// </summary>
public class CreateTodoRequest
{
    /// <summary>
    /// 标题
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int Priority { get; set; } = 1;

    /// <summary>
    /// 截止日期
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// 标签
    /// </summary>
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// 更新待办项请求
/// </summary>
public class UpdateTodoRequest
{
    /// <summary>
    /// 标题
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 优先级（0=低, 1=中, 2=高, 3=紧急）
    /// </summary>
    public int? Priority { get; set; }

    /// <summary>
    /// 截止日期
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// 是否已完成
    /// </summary>
    public bool? IsCompleted { get; set; }

    /// <summary>
    /// 标签
    /// </summary>
    public List<string>? Tags { get; set; }
}

/// <summary>
/// 未读通知数量统计
/// </summary>
public class UnreadCountStatistics
{
    /// <summary>
    /// 总未读数
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 系统消息未读数
    /// </summary>
    public int SystemMessages { get; set; }

    /// <summary>
    /// 通知未读数
    /// </summary>
    public int Notifications { get; set; }

    /// <summary>
    /// 消息未读数
    /// </summary>
    public int Messages { get; set; }

    /// <summary>
    /// 待办项未读数
    /// </summary>
    public int Todos { get; set; }

    /// <summary>
    /// 任务相关通知未读数
    /// </summary>
    public int TaskNotifications { get; set; }
}

