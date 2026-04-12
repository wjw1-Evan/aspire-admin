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
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>创建的任务信息</returns>
    /// <response code="200">成功创建任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="403">权限不足</response>
    [HttpPost("create")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
      
        return Success(await _taskService.CreateTaskAsync(request));
    }

    [HttpGet("{taskId}")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetTask(string taskId)
    {
        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task == null)
            throw new ArgumentException($"任务 {taskId} 不存在");
        return Success(task);
    }

    /// <summary>
    /// 获取任务列表
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <remarks>
    /// 查询任务列表，支持多条件过滤和排序。
    ///
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>任务列表</returns>
    /// <response code="200">成功获取任务列表</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("list")]
    [HttpGet("query")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> QueryTasks([FromQuery] Platform.ServiceDefaults.Models.PageParams request)
    {
        try
        {
            var result = await _taskService.QueryTasksAsync(request);
            return Success(result);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 更新任务
    /// </summary>
    /// <param name="request">更新请求</param>
    /// <remarks>
    /// 更新任务的信息。只有任务创建者或管理员可以更新任务。
    ///
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>更新后的任务</returns>
    /// <response code="200">成功更新任务</response>
    /// <response code="400">请求参数错误</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">任务不存在</response>
    [HttpPut("update")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> UpdateTask([FromBody] UpdateTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            throw new ArgumentException("任务ID不能为空");

        var task = await _taskService.UpdateTaskAsync(request, RequiredUserId);
        return Success(task);
    }

    [HttpPost("assign")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> AssignTask([FromBody] AssignTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId) || string.IsNullOrEmpty(request.AssignedTo))
            throw new ArgumentException("任务ID和分配用户不能为空");

        return Success(await _taskService.AssignTaskAsync(request));
    }

    [HttpPost("execute")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> ExecuteTask([FromBody] ExecuteTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            throw new ArgumentException("任务ID不能为空");

        return Success(await _taskService.ExecuteTaskAsync(request));
    }

    [HttpPost("complete")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> CompleteTask([FromBody] CompleteTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.TaskId))
            throw new ArgumentException("任务ID不能为空");
        return Success(await _taskService.CompleteTaskAsync(request));
    }

    [HttpPost("{taskId}/cancel")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> CancelTask(string taskId, [FromQuery] string? remarks = null)
        => Success(await _taskService.CancelTaskAsync(taskId, remarks));

    [HttpDelete("{taskId}")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> DeleteTask(string taskId)
    {
        var result = await _taskService.DeleteTaskAsync(taskId, RequiredUserId);
        if (!result)
            throw new ArgumentException($"任务 {taskId} 不存在");
        return Success(new { message = "任务已删除" });
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="userId">用户ID（可选）</param>
    /// <remarks>
    /// 获取企业或用户的任务统计信息，包括各状态任务数、完成率、平均完成时间等。
    ///
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>统计信息</returns>
    /// <response code="200">成功获取统计信息</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("statistics")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetStatistics([FromQuery] string? userId = null)
    {
        try
        {
            var currentUserId = RequiredUserId;
            var statistics = await _taskService.GetTaskStatisticsAsync(userId ?? currentUserId);
            return Success(statistics);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="request">分页参数</param>
    /// <remarks>
    /// 获取指定任务的执行日志列表。
    ///
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>执行日志列表</returns>
    /// <response code="200">成功获取执行日志</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPost("{taskId}/logs")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetExecutionLogs(string taskId, [FromBody] Platform.ServiceDefaults.Models.PageParams request)
    {
        var result = await _taskService.GetTaskExecutionLogsAsync(taskId, request);
        return Success(result);
    }

    /// <summary>
    /// 获取用户的待办任务
    /// </summary>
    /// <remarks>
    /// 获取当前用户的待办任务列表（已分配且未完成的任务）。
    ///
    /// 权限要求：需要 project-management-task 菜单权限
    /// </remarks>
    /// <returns>待办任务列表</returns>
    /// <response code="200">成功获取待办任务</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("my/todo")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetMyTodoTasks()
        => Success(await _taskService.GetUserTodoTasksAsync(RequiredUserId));

    [HttpPost("created")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetUserCreatedTasks([FromBody] Platform.ServiceDefaults.Models.PageParams request)
        => Success(await _taskService.GetUserCreatedTasksAsync(RequiredUserId, request));

    [HttpPost("my/created")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetMyCreatedTasks([FromBody] Platform.ServiceDefaults.Models.PageParams request)
        => Success(await _taskService.GetUserCreatedTasksAsync(RequiredUserId, request));

    [HttpPost("batch-update-status")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> BatchUpdateTaskStatus([FromBody] BatchUpdateTaskStatusRequest request)
    {
        if (request.TaskIds == null || request.TaskIds.Count == 0)
            throw new ArgumentException("任务ID列表不能为空");

        try
        {
            var count = await _taskService.BatchUpdateTaskStatusAsync(
                request.TaskIds,
                (Models.TaskStatus)request.Status);

            return Success(new { message = $"已更新 {count} 个任务" });
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取项目的任务树
    /// </summary>
    [HttpGet("project/{projectId}")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetTasksByProjectId(string projectId)
        => Success(await _taskService.GetTasksByProjectIdAsync(projectId));

    [HttpGet("tree")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetTaskTree([FromQuery] string? projectId = null)
        => Success(await _taskService.GetTaskTreeAsync(projectId));

    [HttpPut("{id}/progress")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> UpdateTaskProgress(string id, [FromBody] UpdateTaskProgressRequest request)
        => Success(await _taskService.UpdateTaskProgressAsync(id, request.Progress));

    [HttpPost("dependency")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> AddTaskDependency([FromBody] AddTaskDependencyRequest request)
    {
        if (ValidateModelState() is { } validationError)
            return validationError;

        var dependencyId = await _taskService.AddTaskDependencyAsync(
            request.PredecessorTaskId, request.SuccessorTaskId, request.DependencyType, request.LagDays);
        return Success(new { id = dependencyId });
    }

    [HttpDelete("dependency/{id}")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> RemoveTaskDependency(string id)
    {
        var removed = await _taskService.RemoveTaskDependencyAsync(id);
        if (!removed)
            throw new ArgumentException($"依赖关系 {id} 不存在");
        return Success(null, "依赖关系已移除");
    }

    [HttpGet("{taskId}/dependencies")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetTaskDependencies(string taskId)
        => Success(await _taskService.GetTaskDependenciesAsync(taskId));

    /// <summary>
    /// 计算关键路径
    /// </summary>
    [HttpGet("project/{projectId}/critical-path")]
    [RequireMenu("project-management-task")]
    public async Task<IActionResult> GetCriticalPath(string projectId)
    {
        try
        {
            var criticalPath = await _taskService.CalculateCriticalPathAsync(projectId);
            return Success(criticalPath);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }
}
