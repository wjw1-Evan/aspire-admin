using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 任务管理控制器 - 处理任务创建、分配、执行和监控
/// </summary>
[ApiController]
[Route("api/task")]
[Authorize]
public class TaskController : BaseApiController
{
    private readonly ITaskService _taskService;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化任务管理控制器
    /// </summary>
    /// <param name="taskService">任务服务</param>
    /// <param name="userService">用户服务</param>
    public TaskController(ITaskService taskService, IUserService userService)
    {
        _taskService = taskService ?? throw new ArgumentNullException(nameof(taskService));
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    }

    /// <summary>
    /// 创建新任务
    /// </summary>
    /// <param name="request">创建任务请求</param>
    /// <remarks>
    /// 创建一个新的任务。任务创建者可以指定任务的基本信息、优先级、计划时间等。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>创建的任务信息</returns>
    /// <response code="200">成功创建任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足</response>
    [HttpPost("create")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskName))
            return BadRequest("任务名称不能为空");

        try
        {
            var userId = CurrentUserId;
            var user = await _userService.GetUserByIdAsync(userId!);
            if (user?.CurrentCompanyId == null)
                return BadRequest("无法获取企业信息");

            var task = await _taskService.CreateTaskAsync(request, userId!, user.CurrentCompanyId);
            return Success(task);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 获取任务详情
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <remarks>
    /// 获取指定任务的详细信息，包括任务的所有属性、参与者、附件等。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>任务详情</returns>
    /// <response code="200">成功获取任务详情</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpGet("{taskId}")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> GetTask(string taskId)
    {
        try
        {
            var task = await _taskService.GetTaskByIdAsync(taskId);
            if (task == null)
                return NotFound("任务不存在");

            return Success(task);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 查询任务列表
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <remarks>
    /// 查询任务列表，支持多条件过滤和排序。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>任务列表</returns>
    /// <response code="200">成功获取任务列表</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPost("query")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> QueryTasks([FromBody] TaskQueryRequest request)
    {
        try
        {
            var userId = CurrentUserId;
            var user = await _userService.GetUserByIdAsync(userId!);
            if (user?.CurrentCompanyId == null)
                return BadRequest("无法获取企业信息");

            var result = await _taskService.QueryTasksAsync(request, user.CurrentCompanyId);
            return Success(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 更新任务
    /// </summary>
    /// <param name="request">更新请求</param>
    /// <remarks>
    /// 更新任务的信息。只有任务创建者或管理员可以更新任务。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>更新后的任务</returns>
    /// <response code="200">成功更新任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpPut("update")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> UpdateTask([FromBody] UpdateTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            return BadRequest("任务ID不能为空");

        try
        {
            var userId = CurrentUserId;
            var task = await _taskService.UpdateTaskAsync(request, userId!);
            return Success(task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 分配任务
    /// </summary>
    /// <param name="request">分配请求</param>
    /// <remarks>
    /// 将任务分配给指定的用户。分配后任务状态变为"已分配"。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>分配后的任务</returns>
    /// <response code="200">成功分配任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务或用户不存在</response>
    [HttpPost("assign")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> AssignTask([FromBody] AssignTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId) || string.IsNullOrEmpty(request.AssignedTo))
            return BadRequest("任务ID和分配用户不能为空");

        try
        {
            var userId = CurrentUserId;
            var task = await _taskService.AssignTaskAsync(request, userId!);
            return Success(task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 执行任务
    /// </summary>
    /// <param name="request">执行请求</param>
    /// <remarks>
    /// 更新任务的执行状态和进度。通常用于标记任务为"执行中"或更新进度。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>执行后的任务</returns>
    /// <response code="200">成功执行任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpPost("execute")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> ExecuteTask([FromBody] ExecuteTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            return BadRequest("任务ID不能为空");

        try
        {
            var userId = CurrentUserId;
            var task = await _taskService.ExecuteTaskAsync(request, userId!);
            return Success(task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 完成任务
    /// </summary>
    /// <param name="request">完成请求</param>
    /// <remarks>
    /// 标记任务为已完成。需要指定执行结果（成功/失败/超时等）。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>完成后的任务</returns>
    /// <response code="200">成功完成任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpPost("complete")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> CompleteTask([FromBody] CompleteTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            return BadRequest("任务ID不能为空");

        try
        {
            var userId = CurrentUserId;
            var task = await _taskService.CompleteTaskAsync(request, userId!);
            return Success(task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 取消任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="remarks">取消备注</param>
    /// <remarks>
    /// 取消指定的任务。任务状态变为"已取消"。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>取消后的任务</returns>
    /// <response code="200">成功取消任务</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpDelete("{taskId}/cancel")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> CancelTask(string taskId, [FromQuery] string? remarks = null)
    {
        try
        {
            var userId = CurrentUserId;
            var task = await _taskService.CancelTaskAsync(taskId, userId!, remarks);
            return Success(task);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 删除任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <remarks>
    /// 删除指定的任务。这是软删除，任务数据仍保留在数据库中。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>删除结果</returns>
    /// <response code="200">成功删除任务</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpDelete("{taskId}")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> DeleteTask(string taskId)
    {
        try
        {
            var userId = CurrentUserId;
            var result = await _taskService.DeleteTaskAsync(taskId, userId!);
            if (!result)
                return NotFound("任务不存在");

            return Success(new { message = "任务已删除" });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="userId">用户ID（可选）</param>
    /// <remarks>
    /// 获取企业或用户的任务统计信息，包括各状态任务数、完成率、平均完成时间等。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>统计信息</returns>
    /// <response code="200">成功获取统计信息</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("statistics")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> GetStatistics([FromQuery] string? userId = null)
    {
        try
        {
            var currentUserId = CurrentUserId;
            var user = await _userService.GetUserByIdAsync(currentUserId!);
            if (user?.CurrentCompanyId == null)
                return BadRequest("无法获取企业信息");

            var statistics = await _taskService.GetTaskStatisticsAsync(user.CurrentCompanyId, userId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 获取任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <remarks>
    /// 获取指定任务的执行日志列表。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>执行日志列表</returns>
    /// <response code="200">成功获取执行日志</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("{taskId}/logs")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> GetExecutionLogs(string taskId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            var (logs, total) = await _taskService.GetTaskExecutionLogsAsync(taskId, page, pageSize);
            return Success(new { logs, total, page, pageSize });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 获取用户的待办任务
    /// </summary>
    /// <remarks>
    /// 获取当前用户的待办任务列表（已分配且未完成的任务）。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>待办任务列表</returns>
    /// <response code="200">成功获取待办任务</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("my/todo")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> GetMyTodoTasks()
    {
        try
        {
            var userId = CurrentUserId;
            var user = await _userService.GetUserByIdAsync(userId!);
            if (user?.CurrentCompanyId == null)
                return BadRequest("无法获取企业信息");

            var tasks = await _taskService.GetUserTodoTasksAsync(userId!, user.CurrentCompanyId);
            return Success(tasks);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 获取用户创建的任务
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页数量</param>
    /// <remarks>
    /// 获取当前用户创建的任务列表。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>创建的任务列表</returns>
    /// <response code="200">成功获取创建的任务</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("my/created")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> GetMyCreatedTasks([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            var userId = CurrentUserId;
            var user = await _userService.GetUserByIdAsync(userId!);
            if (user?.CurrentCompanyId == null)
                return BadRequest("无法获取企业信息");

            var (tasks, total) = await _taskService.GetUserCreatedTasksAsync(userId!, user.CurrentCompanyId, page, pageSize);
            return Success(new { tasks, total, page, pageSize });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 批量更新任务状态
    /// </summary>
    /// <param name="request">批量更新任务状态请求</param>
    /// <remarks>
    /// 批量更新多个任务的状态。
    /// 
    /// 权限要求：需要 task-management 菜单权限
    /// </remarks>
    /// <returns>更新的任务数量</returns>
    /// <response code="200">成功更新任务状态</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPost("batch-update-status")]
    [RequireMenu("task-management")]
    public async Task<IActionResult> BatchUpdateTaskStatus([FromBody] BatchUpdateTaskStatusRequest request)
    {
        if (request.TaskIds == null || request.TaskIds.Count == 0)
            return BadRequest("任务ID列表不能为空");

        try
        {
            var userId = CurrentUserId;
            var count = await _taskService.BatchUpdateTaskStatusAsync(
                request.TaskIds,
                (Models.TaskStatus)request.Status,
                userId!);

            return Success(new { message = $"已更新 {count} 个任务" });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

/// <summary>
/// 批量更新任务状态请求DTO
/// </summary>
public class BatchUpdateTaskStatusRequest
{
    /// <summary>任务ID列表</summary>
    public List<string> TaskIds { get; set; } = new();

    /// <summary>新状态</summary>
    public int Status { get; set; }
}

