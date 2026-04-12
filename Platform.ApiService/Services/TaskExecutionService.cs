using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskExecutionResult = Platform.ApiService.Models.TaskExecutionResult;

namespace Platform.ApiService.Services;

public class TaskExecutionService : ITaskExecutionService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ITaskStatisticsService _statisticsService;

    public TaskExecutionService(DbContext context, IUserService userService,
        IUnifiedNotificationService notificationService, IServiceProvider serviceProvider,
        ITaskStatisticsService statisticsService)
    {
        _context = context;
        _userService = userService;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
        _statisticsService = statisticsService;
    }

    public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.AssignedTo = request.AssignedTo;
        task.AssignedAt = DateTime.UtcNow;
        task.Status = Models.TaskStatus.Assigned;
        if (!string.IsNullOrEmpty(request.Remarks)) task.Remarks = request.Remarks;

        await _context.SaveChangesAsync();

        var related = GetRelatedUsers(task);

        await _notificationService.CreateTaskNotificationAsync(
            task.Id!, task.TaskName, "task_assigned",
            (int)task.Priority, (int)task.Status, task.AssignedTo,
            related.Distinct(), request.Remarks);

        return await GetTaskDtoAsync(task);
    }

    public async Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.Status = (Models.TaskStatus)request.Status;
        if (request.Status == (int)Models.TaskStatus.InProgress && task.ActualStartTime == null)
            task.ActualStartTime = DateTime.UtcNow;

        if (request.CompletionPercentage.HasValue)
            task.CompletionPercentage = request.CompletionPercentage.Value;

        await _context.SaveChangesAsync();

        await _statisticsService.LogTaskExecutionAsync(request.TaskId, TaskExecutionResult.Success, request.Message, request.CompletionPercentage ?? 0);

        if (!string.IsNullOrEmpty(task.ProjectId) && request.CompletionPercentage.HasValue)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(task.ProjectId);
        }

        var action = (Models.TaskStatus)task.Status switch
        {
            Models.TaskStatus.InProgress => "task_started",
            Models.TaskStatus.Completed => "task_completed",
            Models.TaskStatus.Cancelled => "task_cancelled",
            Models.TaskStatus.Failed => "task_failed",
            Models.TaskStatus.Paused => "task_paused",
            _ => "task_updated"
        };

        var related = GetRelatedUsers(task);
        await _notificationService.CreateTaskNotificationAsync(
            task.Id!, task.TaskName, action,
            (int)task.Priority, (int)task.Status, task.AssignedTo,
            related.Distinct(), request.Message);

        return await GetTaskDtoAsync(task);
    }

    public async Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var now = DateTime.UtcNow;
        task.Status = Models.TaskStatus.Completed;
        task.ExecutionResult = (TaskExecutionResult)request.ExecutionResult;
        task.ActualEndTime = now;
        task.CompletionPercentage = 100;

        if (task.ActualStartTime.HasValue)
            task.ActualDuration = (int)(now - task.ActualStartTime.Value).TotalMinutes;

        if (!string.IsNullOrEmpty(request.Remarks)) task.Remarks = request.Remarks;
        await _context.SaveChangesAsync();

        await _statisticsService.LogTaskExecutionAsync(request.TaskId, (TaskExecutionResult)request.ExecutionResult, request.Remarks, 100);

        if (!string.IsNullOrEmpty(task.ProjectId))
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(task.ProjectId);
        }

        var related = GetRelatedUsers(task);
        await _notificationService.CreateTaskNotificationAsync(
            task.Id!, task.TaskName, "task_completed",
            (int)task.Priority, (int)task.Status, task.AssignedTo,
            related.Distinct(), request.Remarks);

        return await GetTaskDtoAsync(task);
    }

    public async Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        if (task == null) throw new KeyNotFoundException($"任务 {taskId} 不存在");

        task.Status = Models.TaskStatus.Cancelled;
        if (!string.IsNullOrEmpty(remarks)) task.Remarks = remarks;
        await _context.SaveChangesAsync();

        var related = GetRelatedUsers(task);
        await _notificationService.CreateTaskNotificationAsync(
            task.Id!, task.TaskName, "task_cancelled",
            (int)task.Priority, (int)task.Status, task.AssignedTo,
            related.Distinct(), remarks);

        return await GetTaskDtoAsync(task);
    }

    public async Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress)
    {
        var t = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        if (t == null) throw new KeyNotFoundException($"任务 {taskId} 不存在");

        t.CompletionPercentage = Math.Max(0, Math.Min(100, progress));
        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(t.ProjectId))
            await _serviceProvider.GetRequiredService<IProjectService>().CalculateProjectProgressAsync(t.ProjectId);

        return await GetTaskDtoAsync(t);
    }

    private List<string> GetRelatedUsers(WorkTask task)
    {
        var related = new List<string>();
        if (!string.IsNullOrEmpty(task.CreatedBy)) related.Add(task.CreatedBy);
        if (!string.IsNullOrEmpty(task.AssignedTo)) related.Add(task.AssignedTo);
        if (task.ParticipantIds != null) related.AddRange(task.ParticipantIds);
        return related;
    }

    private async Task<TaskDto> GetTaskDtoAsync(WorkTask task)
    {
        var dto = new TaskDto
        {
            Id = task.Id,
            TaskName = task.TaskName,
            Description = task.Description,
            TaskType = task.TaskType,
            Status = (int)task.Status,
            StatusName = GetStatusName(task.Status),
            Priority = (int)task.Priority,
            PriorityName = GetPriorityName(task.Priority),
            CreatedBy = task.CreatedBy ?? "",
            AssignedTo = task.AssignedTo,
            AssignedAt = task.AssignedAt,
            PlannedStartTime = task.PlannedStartTime,
            PlannedEndTime = task.PlannedEndTime,
            ActualStartTime = task.ActualStartTime,
            ActualEndTime = task.ActualEndTime,
            EstimatedDuration = task.EstimatedDuration,
            ActualDuration = task.ActualDuration,
            ExecutionResult = (int)task.ExecutionResult,
            ExecutionResultName = GetExecutionResultName(task.ExecutionResult),
            CompletionPercentage = task.CompletionPercentage,
            Remarks = task.Remarks,
            ParticipantIds = task.ParticipantIds,
            Tags = task.Tags,
            UpdatedBy = task.UpdatedBy,
            ProjectId = task.ProjectId,
            ParentTaskId = task.ParentTaskId,
            SortOrder = task.SortOrder,
            Duration = task.Duration
        };

        if (!string.IsNullOrEmpty(task.CreatedBy))
        {
            var u = await _userService.GetUserByIdAsync(task.CreatedBy);
            if (u != null) dto.CreatedByName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : $"{u.Username} ({u.Name})";
        }
        if (!string.IsNullOrEmpty(task.AssignedTo))
        {
            var u = await _userService.GetUserByIdAsync(task.AssignedTo);
            if (u != null) dto.AssignedToName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : $"{u.Username} ({u.Name})";
        }

        return dto;
    }

    private static string GetStatusName(Models.TaskStatus s) => s switch
    {
        Models.TaskStatus.Pending => "待分配",
        Models.TaskStatus.Assigned => "已分配",
        Models.TaskStatus.InProgress => "执行中",
        Models.TaskStatus.Completed => "已完成",
        Models.TaskStatus.Cancelled => "已取消",
        Models.TaskStatus.Failed => "失败",
        Models.TaskStatus.Paused => "暂停",
        _ => "未知"
    };

    private static string GetPriorityName(TaskPriority p) => p switch
    {
        TaskPriority.Low => "低",
        TaskPriority.Medium => "中",
        TaskPriority.High => "高",
        TaskPriority.Urgent => "紧急",
        _ => "未知"
    };

    private static string GetExecutionResultName(TaskExecutionResult r) => r switch
    {
        TaskExecutionResult.NotExecuted => "未执行",
        TaskExecutionResult.Success => "成功",
        TaskExecutionResult.Failed => "失败",
        TaskExecutionResult.Timeout => "超时",
        TaskExecutionResult.Interrupted => "被中断",
        _ => "未知"
    };
}
