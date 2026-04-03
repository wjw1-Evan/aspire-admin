using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 统一通知/待办/任务管理控制器
/// 将系统消息、通知、待办和任务管理整合到一个统一的接口中
/// </summary>
[ApiController]
[Route("api/unified-notification")]

public class UnifiedNotificationController : BaseApiController
{
    private readonly IUnifiedNotificationService _unifiedNotificationService;

    /// <summary>
    /// 初始化统一通知控制器
    /// </summary>
    public UnifiedNotificationController(IUnifiedNotificationService unifiedNotificationService)
    {
        _unifiedNotificationService = unifiedNotificationService ?? throw new ArgumentNullException(nameof(unifiedNotificationService));
    }

    /// <summary>
    /// 获取统一的通知/待办/任务中心数据
    /// </summary>
    /// <param name="filterType">过滤类型：all, notification, message, todo, task, system, unread</param>
    /// <returns>统一的通知/待办/任务列表</returns>
    /// <param name="request">分页请求参数</param>
    [HttpGet("center")]
    public async Task<IActionResult> GetUnifiedNotifications(
        [FromQuery] Platform.ServiceDefaults.Models.PageParams request,
        [FromQuery] string filterType = "all")
    {
        var result = await _unifiedNotificationService.GetUnifiedNotificationsAsync(request, filterType);
        return Success(result);
    }

    /// <summary>
    /// 获取待办项列表
    /// </summary>
    /// <returns>待办项列表</returns>
    [HttpGet("todos")]
    public async Task<IActionResult> GetTodos(
        [FromQuery] Platform.ServiceDefaults.Models.PageParams request,
        [FromQuery] string sortBy = "dueDate")
    {
        var result = await _unifiedNotificationService.GetTodosAsync(request, sortBy);
        return Success(result);
    }

    /// <summary>
    /// 获取系统消息列表
    /// </summary>
    /// <returns>系统消息列表</returns>
    [HttpGet("system-messages")]
    public async Task<IActionResult> GetSystemMessages(
        [FromQuery] Platform.ServiceDefaults.Models.PageParams request)
    {
        var result = await _unifiedNotificationService.GetSystemMessagesAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取任务相关通知列表
    /// </summary>
    /// <returns>任务相关通知列表</returns>
    [HttpGet("task-notifications")]
    public async Task<IActionResult> GetTaskNotifications(
        [FromQuery] Platform.ServiceDefaults.Models.PageParams request)
    {
        var result = await _unifiedNotificationService.GetTaskNotificationsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 创建待办项
    /// </summary>
    /// <param name="request">创建待办项请求</param>
    /// <returns>创建的待办项</returns>
    [HttpPost("todos")]
    public async Task<IActionResult> CreateTodo([FromBody] CreateTodoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("待办项标题不能为空");

        var todo = await _unifiedNotificationService.CreateTodoAsync(request);
        return Success(todo, "待办项创建成功");
    }

    /// <summary>
    /// 更新待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <param name="request">更新待办项请求</param>
    /// <returns>更新后的待办项</returns>
    [HttpPut("todos/{id}")]
    public async Task<IActionResult> UpdateTodo(string id, [FromBody] UpdateTodoRequest request)
    {
        var todo = await _unifiedNotificationService.UpdateTodoAsync(id, request);
        if (todo == null)
            throw new ArgumentException("待办项 {id} 不存在");

        return Success(todo, "待办项更新成功");
    }

    /// <summary>
    /// 完成待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <returns>是否成功</returns>
    [HttpPost("todos/{id}/complete")]
    public async Task<IActionResult> CompleteTodo(string id)
    {
        var success = await _unifiedNotificationService.CompleteTodoAsync(id);
        if (!success)
            throw new ArgumentException("待办项 {id} 不存在");

        return Success(null, "待办项已完成");
    }

    /// <summary>
    /// 删除待办项
    /// </summary>
    /// <param name="id">待办项ID</param>
    /// <returns>是否成功</returns>
    [HttpDelete("todos/{id}")]
    public async Task<IActionResult> DeleteTodo(string id)
    {
        var success = await _unifiedNotificationService.DeleteTodoAsync(id);
        if (!success)
            throw new ArgumentException("待办项 {id} 不存在");

        return Success(null, "待办项已删除");
    }

    /// <summary>
    /// 标记通知为已读
    /// </summary>
    /// <param name="id">通知ID</param>
    /// <returns>是否成功</returns>
    [HttpPost("{id}/mark-as-read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var success = await _unifiedNotificationService.MarkAsReadAsync(id);
        if (!success)
            throw new ArgumentException("通知 {id} 不存在");

        return Success(null, "通知已标记为已读");
    }

    /// <summary>
    /// 标记多个通知为已读
    /// </summary>
    /// <param name="request">包含通知ID列表的请求</param>
    /// <returns>是否成功</returns>
    [HttpPost("mark-multiple-as-read")]
    public async Task<IActionResult> MarkMultipleAsRead([FromBody] MarkMultipleAsReadRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            throw new ArgumentException("通知ID列表不能为空");

        var success = await _unifiedNotificationService.MarkMultipleAsReadAsync(request.Ids);
        return Success(null, "通知已标记为已读");
    }

    /// <summary>
    /// 获取未读通知数量
    /// </summary>
    /// <returns>未读通知数量</returns>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _unifiedNotificationService.GetUnreadCountAsync();
        return Success(new { unreadCount = count });
    }

    /// <summary>
    /// 获取未读通知数量统计（按类型）
    /// </summary>
    /// <returns>各类型的未读数量统计</returns>
    [HttpGet("unread-statistics")]
    public async Task<IActionResult> GetUnreadStatistics()
    {
        var statistics = await _unifiedNotificationService.GetUnreadCountStatisticsAsync();
        return Success(statistics);
    }
}
