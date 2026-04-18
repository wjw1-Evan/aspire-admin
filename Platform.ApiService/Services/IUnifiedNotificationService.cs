using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;
using System.Collections.Generic;

namespace Platform.ApiService.Services;

/// <summary>
/// 统一通知/待办/任务查询服务接口
/// </summary>
public interface IUnifiedNotificationService
{
    /// <summary>
    /// 获取统一的通知/待办/任务中心数据
    /// </summary>
    Task<PagedResult<NoticeIconItem>> GetUnifiedNotificationsAsync(ProTableRequest request, string filterType = "all");

    /// <summary>
    /// 获取待办项列表
    /// </summary>
    Task<PagedResult<NoticeIconItem>> GetTodosAsync(ProTableRequest request, string sortBy = "dueDate");

    /// <summary>
    /// 获取系统消息列表
    /// </summary>
    Task<PagedResult<NoticeIconItem>> GetSystemMessagesAsync(ProTableRequest request);

    /// <summary>
    /// 获取任务相关通知列表
    /// </summary>
    Task<PagedResult<NoticeIconItem>> GetTaskNotificationsAsync(ProTableRequest request);

    /// <summary>
    /// 创建待办项
    /// </summary>
    Task<NoticeIconItem> CreateTodoAsync(CreateTodoRequest request);

    /// <summary>
    /// 更新待办项
    /// </summary>
    Task<NoticeIconItem?> UpdateTodoAsync(string id, UpdateTodoRequest request);

    /// <summary>
    /// 完成待办项
    /// </summary>
    Task<bool> CompleteTodoAsync(string id);

    /// <summary>
    /// 删除待办项
    /// </summary>
    Task<bool> DeleteTodoAsync(string id);

    /// <summary>
    /// 创建任务相关通知
    /// </summary>
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
    /// </summary>
    Task<NoticeIconItem> CreateWorkflowNotificationAsync(
        string workflowInstanceId,
        string documentTitle,
        string actionType,
        IEnumerable<string> relatedUserIds,
        string? remarks = null);

    /// <summary>
    /// 标记通知为已读
    /// </summary>
    Task<bool> MarkAsReadAsync(string id);

    /// <summary>
    /// 标记多个通知为已读
    /// </summary>
    Task<bool> MarkMultipleAsReadAsync(List<string> ids);

    /// <summary>
    /// 获取未读通知数量
    /// </summary>
    Task<int> GetUnreadCountAsync();

    /// <summary>
    /// 获取未读通知数量统计（按类型）
    /// </summary>
    Task<UnreadCountStatistics> GetUnreadCountStatisticsAsync();

    /// <summary>
    /// 根据指定用户ID获取未读通知数量统计（用于 SSE 推送，不依赖 TenantContext）
    /// </summary>
    Task<UnreadCountStatistics> GetUnreadCountStatisticsByUserIdAsync(string userId);
}

/// <summary>
/// 创建待办项请求
/// </summary>
public class CreateTodoRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Priority { get; set; } = 1;
    public DateTime? DueDate { get; set; }
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// 更新待办项请求
/// </summary>
public class UpdateTodoRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Priority { get; set; }
    public DateTime? DueDate { get; set; }
    public bool? IsCompleted { get; set; }
    public List<string>? Tags { get; set; }
}

/// <summary>
/// 未读通知数量统计
/// </summary>
public class UnreadCountStatistics
{
    public int Total { get; set; }
    public int SystemMessages { get; set; }
    public int Notifications { get; set; }
    public int Messages { get; set; }
    public int Todos { get; set; }
    public int TaskNotifications { get; set; }
}