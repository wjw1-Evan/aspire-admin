using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 任务管理服务实现
/// </summary>
public class TaskService : ITaskService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TaskService> _logger;

    public TaskService(DbContext context,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        IServiceProvider serviceProvider,
        ILogger<TaskService> logger)
    {
        _context = context;
        _userService = userService;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<TaskDto> CreateTaskAsync(CreateTaskRequest request)
    {
        var task = new WorkTask
        {
            TaskName = request.TaskName,
            Description = request.Description,
            TaskType = request.TaskType,
            Priority = (TaskPriority)request.Priority,
            AssignedTo = request.AssignedTo,
            PlannedStartTime = request.PlannedStartTime,
            PlannedEndTime = request.PlannedEndTime,
            EstimatedDuration = request.EstimatedDuration,
            ParticipantIds = request.ParticipantIds ?? new List<string>(),
            Tags = request.Tags ?? new List<string>(),
            Remarks = request.Remarks,
            Status = string.IsNullOrEmpty(request.AssignedTo) ? Models.TaskStatus.Pending : Models.TaskStatus.Assigned,
            ProjectId = request.ProjectId,
            ParentTaskId = request.ParentTaskId,
            SortOrder = request.SortOrder,
            Duration = request.Duration,
        };

        if (!string.IsNullOrEmpty(request.AssignedTo))
        {
            task.AssignedAt = DateTime.UtcNow;
        }

        await _context.Set<WorkTask>().AddAsync(task);
        await _context.SaveChangesAsync();

        try
        {
            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                await _notificationService.CreateTaskNotificationAsync(
                    task.Id!,
                    task.TaskName,
                    "task_assigned",
                    (int)task.Priority,
                    (int)task.Status,
                    task.AssignedTo,
                    null,
                    string.IsNullOrWhiteSpace(request.Remarks) ? "任务已分配给您" : request.Remarks
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_assigned", task.Id);
        }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<TaskDto?> GetTaskByIdAsync(string taskId)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        return task == null ? null : await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<TaskListResponse> QueryTasksAsync(TaskQueryRequest request)
    {
        string search = request.Search?.ToLower() ?? "";
        var onlyRoot = request.OnlyRoot ?? string.IsNullOrEmpty(request.Search);

        var q = _context.Set<WorkTask>().AsQueryable();

        if (!string.IsNullOrEmpty(search))
            q = q.Where(t => t.TaskName.ToLower().Contains(search) || (t.Description != null && t.Description.ToLower().Contains(search)));
        
        if (!string.IsNullOrEmpty(request.ProjectId)) q = q.Where(t => t.ProjectId == request.ProjectId);
        if (request.Status.HasValue) q = q.Where(t => t.Status == (Models.TaskStatus)request.Status.Value);
        if (request.Priority.HasValue) q = q.Where(t => t.Priority == (TaskPriority)request.Priority.Value);
        if (!string.IsNullOrEmpty(request.AssignedTo)) q = q.Where(t => t.AssignedTo == request.AssignedTo);
        if (!string.IsNullOrEmpty(request.CreatedBy)) q = q.Where(t => t.CreatedBy == request.CreatedBy);
        if (!string.IsNullOrEmpty(request.TaskType)) q = q.Where(t => t.TaskType == request.TaskType);
        if (onlyRoot) q = q.Where(t => string.IsNullOrEmpty(t.ParentTaskId));
        if (request.StartDate.HasValue) q = q.Where(t => t.CreatedAt >= request.StartDate.Value);
        if (request.EndDate.HasValue) q = q.Where(t => t.CreatedAt <= request.EndDate.Value);
        if (request.Tags != null && request.Tags.Count > 0) q = q.Where(t => t.Tags.Any(tag => request.Tags.Contains(tag)));

        var isAsc = request.SortOrder?.ToLower() == "asc";
        q = request.SortBy?.ToLower() switch
        {
            "taskname" => isAsc ? q.OrderBy(t => t.TaskName) : q.OrderByDescending(t => t.TaskName),
            "priority" => isAsc ? q.OrderBy(t => t.Priority) : q.OrderByDescending(t => t.Priority),
            "status" => isAsc ? q.OrderBy(t => t.Status) : q.OrderByDescending(t => t.Status),
            "plannedstarttime" => isAsc ? q.OrderBy(t => t.PlannedStartTime) : q.OrderByDescending(t => t.PlannedStartTime),
            "plannedendtime" => isAsc ? q.OrderBy(t => t.PlannedEndTime) : q.OrderByDescending(t => t.PlannedEndTime),
            "sortorder" => isAsc ? q.OrderBy(t => t.SortOrder) : q.OrderByDescending(t => t.SortOrder),
            _ => isAsc ? q.OrderBy(t => t.CreatedAt) : q.OrderByDescending(t => t.CreatedAt)
        };

        var total = await q.LongCountAsync();
        var tasks = await q.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync();
        var taskDtos = await ConvertToTaskDtosAsync(tasks);

        if (onlyRoot)
        {
            var parentIds = tasks.Select(t => t.Id!).ToList();
            var children = await _context.Set<WorkTask>()
                .Where(t => parentIds.Contains(t.ParentTaskId!))
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.CreatedAt)
                .ToListAsync();

            if (children.Any())
            {
                var childDtos = await ConvertToTaskDtosAsync(children);
                var childMap = childDtos.GroupBy(c => c.ParentTaskId!).ToDictionary(g => g.Key, g => g.ToList());
                foreach (var dto in taskDtos)
                {
                    if (childMap.TryGetValue(dto.Id!, out var dtoChildren)) dto.Children = dtoChildren;
                }
            }
        }

        return new TaskListResponse { Tasks = taskDtos, Total = (int)total, Page = request.Page, PageSize = request.PageSize };
    }

    /// <inheritdoc/>
    public async Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        if (task.CreatedBy != userId && task.AssignedTo != userId && (task.ParticipantIds == null || !task.ParticipantIds.Contains(userId)))
            throw new UnauthorizedAccessException("无权更新此任务");

        if (!string.IsNullOrEmpty(request.TaskName)) task.TaskName = request.TaskName;
        if (request.Description != null) task.Description = request.Description;
        if (!string.IsNullOrEmpty(request.TaskType)) task.TaskType = request.TaskType;
        if (request.Priority.HasValue) task.Priority = (TaskPriority)request.Priority.Value;
        if (request.Status.HasValue) task.Status = (Models.TaskStatus)request.Status.Value;

        if (request.AssignedTo != null)
        {
            if (string.IsNullOrWhiteSpace(request.AssignedTo))
            {
                task.AssignedTo = null;
                task.AssignedAt = null;
                if (task.Status == Models.TaskStatus.Assigned) task.Status = Models.TaskStatus.Pending;
            }
            else
            {
                task.AssignedTo = request.AssignedTo;
                task.AssignedAt = DateTime.UtcNow;
                if (task.Status == Models.TaskStatus.Pending) task.Status = Models.TaskStatus.Assigned;
            }
        }

        if (request.PlannedStartTime.HasValue) task.PlannedStartTime = request.PlannedStartTime;
        if (request.PlannedEndTime.HasValue) task.PlannedEndTime = request.PlannedEndTime;
        if (request.CompletionPercentage.HasValue) task.CompletionPercentage = request.CompletionPercentage.Value;
        if (request.ParticipantIds != null) task.ParticipantIds = request.ParticipantIds;
        if (request.Tags != null) task.Tags = request.Tags;
        if (request.Remarks != null) task.Remarks = request.Remarks;
        if (request.ProjectId != null) task.ProjectId = request.ProjectId;
        if (request.ParentTaskId != null) task.ParentTaskId = request.ParentTaskId;
        if (request.SortOrder.HasValue) task.SortOrder = request.SortOrder.Value;
        if (request.Duration.HasValue) task.Duration = request.Duration.Value;

        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(task.ProjectId) && request.CompletionPercentage.HasValue)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(task.ProjectId);
        }

        try
        {
            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                await _notificationService.CreateTaskNotificationAsync(
                    task.Id!,
                    task.TaskName,
                    "task_assigned",
                    (int)task.Priority,
                    (int)task.Status,
                    task.AssignedTo,
                    null,
                    string.IsNullOrWhiteSpace(request.Remarks) ? "任务已分配给您" : request.Remarks
                );
            }
        }
        catch (Exception ex) { _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}", task.Id); }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<TaskDto> AssignTaskAsync(AssignTaskRequest request)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.AssignedTo = request.AssignedTo;
        task.AssignedAt = DateTime.UtcNow;
        task.Status = Models.TaskStatus.Assigned;
        if (!string.IsNullOrEmpty(request.Remarks)) task.Remarks = request.Remarks;

        await _context.SaveChangesAsync();

        try
        {
            var related = new List<string>();
            if (!string.IsNullOrEmpty(task.CreatedBy)) related.Add(task.CreatedBy);
            if (!string.IsNullOrEmpty(task.AssignedTo)) related.Add(task.AssignedTo);
            if (task.ParticipantIds != null) related.AddRange(task.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                task.Id!,
                task.TaskName,
                "task_assigned",
                (int)task.Priority,
                (int)task.Status,
                task.AssignedTo,
                related.Distinct(),
                request.Remarks
            );
        }
        catch (Exception ex) { _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}", task.Id); }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        task.Status = (Models.TaskStatus)request.Status;
        if (request.Status == (int)Models.TaskStatus.InProgress && task.ActualStartTime == null)
            task.ActualStartTime = DateTime.UtcNow;

        if (request.CompletionPercentage.HasValue) task.CompletionPercentage = request.CompletionPercentage.Value;
        
        await _context.SaveChangesAsync();

        await LogTaskExecutionAsync(request.TaskId, TaskExecutionResult.Success, request.Message, request.CompletionPercentage ?? 0);

        if (!string.IsNullOrEmpty(task.ProjectId) && request.CompletionPercentage.HasValue)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(task.ProjectId);
        }

        try
        {
            var action = (Models.TaskStatus)task.Status switch
            {
                Models.TaskStatus.InProgress => "task_started",
                Models.TaskStatus.Completed => "task_completed",
                Models.TaskStatus.Cancelled => "task_cancelled",
                Models.TaskStatus.Failed => "task_failed",
                Models.TaskStatus.Paused => "task_paused",
                _ => "task_updated"
            };

            var related = new List<string>();
            if (!string.IsNullOrEmpty(task.CreatedBy)) related.Add(task.CreatedBy);
            if (!string.IsNullOrEmpty(task.AssignedTo)) related.Add(task.AssignedTo);
            if (task.ParticipantIds != null) related.AddRange(task.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                task.Id!, task.TaskName, action, (int)task.Priority, (int)task.Status, task.AssignedTo, related.Distinct(), request.Message);
        }
        catch (Exception ex) { _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}", task.Id); }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
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

        await LogTaskExecutionAsync(request.TaskId, (TaskExecutionResult)request.ExecutionResult, request.Remarks, 100);

        if (!string.IsNullOrEmpty(task.ProjectId))
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(task.ProjectId);
        }

        try
        {
            var related = new List<string>();
            if (!string.IsNullOrEmpty(task.CreatedBy)) related.Add(task.CreatedBy);
            if (!string.IsNullOrEmpty(task.AssignedTo)) related.Add(task.AssignedTo);
            if (task.ParticipantIds != null) related.AddRange(task.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                task.Id!, task.TaskName, "task_completed", (int)task.Priority, (int)task.Status, task.AssignedTo, related.Distinct(), request.Remarks);
        }
        catch (Exception ex) { _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}", task.Id); }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        if (task == null) throw new KeyNotFoundException($"任务 {taskId} 不存在");

        task.Status = Models.TaskStatus.Cancelled;
        if (!string.IsNullOrEmpty(remarks)) task.Remarks = remarks;
        await _context.SaveChangesAsync();

        try
        {
            var related = new List<string>();
            if (!string.IsNullOrEmpty(task.CreatedBy)) related.Add(task.CreatedBy);
            if (!string.IsNullOrEmpty(task.AssignedTo)) related.Add(task.AssignedTo);
            if (task.ParticipantIds != null) related.AddRange(task.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                task.Id!, task.TaskName, "task_cancelled", (int)task.Priority, (int)task.Status, task.AssignedTo, related.Distinct(), remarks);
        }
        catch (Exception ex) { _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}", task.Id); }

        return await ConvertToTaskDtoAsync(task);
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteTaskAsync(string taskId, string userId)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        if (task == null) return false;
        if (task.CreatedBy != userId) throw new UnauthorizedAccessException("无权删除他人的任务");

        var ids = new List<string> { taskId };
        await GetAllDescendantIdsAsync(taskId, ids);

        var tasks = await _context.Set<WorkTask>().Where(t => ids.Contains(t.Id!)).ToListAsync();
        foreach (var t in tasks) _context.Set<WorkTask>().Remove(t);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task GetAllDescendantIdsAsync(string pid, List<string> all)
    {
        var children = await _context.Set<WorkTask>().Where(t => t.ParentTaskId == pid).ToListAsync();
        foreach (var c in children)
        {
            if (!string.IsNullOrEmpty(c.Id))
            {
                all.Add(c.Id);
                await GetAllDescendantIdsAsync(c.Id, all);
            }
        }
    }

    /// <inheritdoc/>
    public async Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null)
    {
        var q = _context.Set<WorkTask>().AsQueryable();
        if (!string.IsNullOrEmpty(userId)) q = q.Where(t => t.AssignedTo == userId || t.CreatedBy == userId);
        var tasks = await q.ToListAsync();

        var stats = new TaskStatistics
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(t => t.Status == Models.TaskStatus.Pending),
            InProgressTasks = tasks.Count(t => t.Status == Models.TaskStatus.InProgress),
            CompletedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Completed),
            FailedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Failed),
        };

        var completed = tasks.Where(t => t.Status == Models.TaskStatus.Completed && t.ActualDuration.HasValue).ToList();
        if (completed.Count > 0) stats.AverageCompletionTime = completed.Average(t => t.ActualDuration!.Value);
        if (stats.TotalTasks > 0) stats.CompletionRate = (double)stats.CompletedTasks / stats.TotalTasks * 100;

        stats.TasksByPriority = new Dictionary<string, int>
        {
            { "Low", tasks.Count(t => t.Priority == TaskPriority.Low) },
            { "Medium", tasks.Count(t => t.Priority == TaskPriority.Medium) },
            { "High", tasks.Count(t => t.Priority == TaskPriority.High) },
            { "Urgent", tasks.Count(t => t.Priority == TaskPriority.Urgent) }
        };

        stats.TasksByStatus = Enum.GetValues<Models.TaskStatus>().ToDictionary(s => s.ToString(), s => tasks.Count(t => t.Status == s));
        return stats;
    }

    /// <inheritdoc/>
    public async Task<(List<TaskExecutionLogDto> logs, int total)> GetTaskExecutionLogsAsync(string taskId, int page = 1, int pageSize = 10)
    {
        var q = _context.Set<TaskExecutionLog>().Where(l => l.TaskId == taskId);
        var total = await q.LongCountAsync();
        var logs = await q.OrderByDescending(l => l.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var dtos = new List<TaskExecutionLogDto>();
        foreach (var l in logs) dtos.Add(await ConvertToTaskExecutionLogDtoAsync(l));
        return (dtos, (int)total);
    }

    /// <inheritdoc/>
    public async Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, TaskExecutionResult status, string? msg = null, int progress = 0)
    {
        var log = new TaskExecutionLog { TaskId = taskId, StartTime = DateTime.UtcNow, Status = status, Message = msg, ProgressPercentage = progress };
        await _context.Set<TaskExecutionLog>().AddAsync(log);
        await _context.SaveChangesAsync();
        return await ConvertToTaskExecutionLogDtoAsync(log);
    }

    /// <inheritdoc/>
    public async Task<List<TaskDto>> GetUserTodoTasksAsync(string userId)
    {
        var tasks = await _context.Set<WorkTask>()
            .Where(t => t.AssignedTo == userId && (t.Status == Models.TaskStatus.Assigned || t.Status == Models.TaskStatus.InProgress))
            .OrderByDescending(t => t.Priority)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();
        return await ConvertToTaskDtosAsync(tasks);
    }

    /// <inheritdoc/>
    public async Task<(List<TaskDto> tasks, int total)> GetUserCreatedTasksAsync(string userId, int page = 1, int pageSize = 10)
    {
        var q = _context.Set<WorkTask>().Where(t => t.CreatedBy == userId);
        var total = await q.LongCountAsync();
        var tasks = await q.OrderByDescending(t => t.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (await ConvertToTaskDtosAsync(tasks), (int)total);
    }

    /// <inheritdoc/>
    public async Task<int> BatchUpdateTaskStatusAsync(List<string> ids, Models.TaskStatus status)
    {
        var tasks = await _context.Set<WorkTask>().Where(t => ids.Contains(t.Id!)).ToListAsync();
        foreach (var t in tasks) t.Status = status;
        await _context.SaveChangesAsync();
        return tasks.Count;
    }

    private async Task<List<TaskDto>> ConvertToTaskDtosAsync(IEnumerable<WorkTask> tasks)
    {
        var list = tasks.ToList();
        if (!list.Any()) return new List<TaskDto>();

        var userIds = list.SelectMany(t => (t.ParticipantIds ?? new List<string>()).Concat(new[] { t.CreatedBy, t.AssignedTo })).Where(id => !string.IsNullOrEmpty(id)).Select(id => id!).Distinct();
        var pIds = list.Select(t => t.ProjectId).Where(id => !string.IsNullOrEmpty(id)).Select(id => id!).Distinct();

        var userMap = await _userService.GetUsersByIdsAsync(userIds);
        var pMap = new Dictionary<string, string>();
        if (pIds.Any())
        {
            var pService = _serviceProvider.GetRequiredService<IProjectService>();
            foreach (var pid in pIds)
            {
                try { var p = await pService.GetProjectByIdAsync(pid!); if (p != null) pMap[pid!] = p.Name; } catch { }
            }
        }

        return list.Select(t => ConvertToTaskDtoWithCache(t, userMap, pMap)).ToList();
    }

    private TaskDto ConvertToTaskDtoWithCache(WorkTask t, Dictionary<string, AppUser> uMap, Dictionary<string, string> pMap)
    {
        var dto = MapToDto(t);
        if (!string.IsNullOrEmpty(t.CreatedBy) && uMap.TryGetValue(t.CreatedBy, out var u1)) dto.CreatedByName = string.IsNullOrWhiteSpace(u1.Name) ? u1.Username : $"{u1.Username} ({u1.Name})";
        if (!string.IsNullOrEmpty(t.AssignedTo) && uMap.TryGetValue(t.AssignedTo, out var u2)) dto.AssignedToName = string.IsNullOrWhiteSpace(u2.Name) ? u2.Username : $"{u2.Username} ({u2.Name})";
        if (t.ParticipantIds?.Any() == true)
        {
            foreach (var pid in t.ParticipantIds)
                if (uMap.TryGetValue(pid, out var u)) dto.Participants.Add(new ParticipantInfo { UserId = pid, Username = u.Username, Email = u.Email });
        }
        if (!string.IsNullOrEmpty(t.ProjectId) && pMap.TryGetValue(t.ProjectId, out var pn)) dto.ProjectName = pn;
        return dto;
    }

    private async Task<TaskDto> ConvertToTaskDtoAsync(WorkTask t)
    {
        var dto = MapToDto(t);
        try
        {
            if (!string.IsNullOrEmpty(t.CreatedBy))
            {
                var u = await _userService.GetUserByIdAsync(t.CreatedBy);
                if (u != null) dto.CreatedByName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : $"{u.Username} ({u.Name})";
            }
            if (!string.IsNullOrEmpty(t.AssignedTo))
            {
                var u = await _userService.GetUserByIdAsync(t.AssignedTo);
                if (u != null) dto.AssignedToName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : $"{u.Username} ({u.Name})";
            }
            if (t.ParticipantIds?.Any() == true)
            {
                foreach (var id in t.ParticipantIds)
                {
                    var u = await _userService.GetUserByIdAsync(id);
                    if (u != null) dto.Participants.Add(new ParticipantInfo { UserId = id, Username = u.Username, Email = u.Email });
                }
            }
            if (!string.IsNullOrEmpty(t.ProjectId))
            {
                var ps = _serviceProvider.GetRequiredService<IProjectService>();
                var p = await ps.GetProjectByIdAsync(t.ProjectId);
                if (p != null) dto.ProjectName = p.Name;
            }
        }
        catch (Exception ex) { _logger.LogDebug(ex, "转换 TaskDto 失败: {Id}", t.Id); }
        return dto;
    }

    private TaskDto MapToDto(WorkTask t) => new TaskDto
    {
        Id = t.Id, TaskName = t.TaskName, Description = t.Description, TaskType = t.TaskType,
        Status = (int)t.Status, StatusName = GetStatusName(t.Status),
        Priority = (int)t.Priority, PriorityName = GetPriorityName(t.Priority),
        CreatedBy = t.CreatedBy ?? "", CreatedAt = t.CreatedAt, AssignedTo = t.AssignedTo, AssignedAt = t.AssignedAt,
        PlannedStartTime = t.PlannedStartTime, PlannedEndTime = t.PlannedEndTime, ActualStartTime = t.ActualStartTime, ActualEndTime = t.ActualEndTime,
        EstimatedDuration = t.EstimatedDuration, ActualDuration = t.ActualDuration, ExecutionResult = (int)t.ExecutionResult, ExecutionResultName = GetExecutionResultName(t.ExecutionResult),
        CompletionPercentage = t.CompletionPercentage, Remarks = t.Remarks, ParticipantIds = t.ParticipantIds, Tags = t.Tags,
        UpdatedAt = t.UpdatedAt, UpdatedBy = t.UpdatedBy, ProjectId = t.ProjectId, ParentTaskId = t.ParentTaskId, SortOrder = t.SortOrder, Duration = t.Duration,
        Attachments = t.Attachments?.Select(a => new TaskAttachmentDto { Id = a.Id, FileName = a.FileName, FileUrl = a.FileUrl, FileSize = a.FileSize, UploadedAt = a.UploadedAt, UploadedBy = a.UploadedBy }).ToList() ?? new List<TaskAttachmentDto>()
    };

    private async Task<TaskExecutionLogDto> ConvertToTaskExecutionLogDtoAsync(TaskExecutionLog l)
    {
        var dto = new TaskExecutionLogDto { Id = l.Id, TaskId = l.TaskId, ExecutedBy = l.ExecutedBy, StartTime = l.StartTime, EndTime = l.EndTime, Status = (int)l.Status, StatusName = GetExecutionResultName(l.Status), Message = l.Message, ErrorMessage = l.ErrorMessage, ProgressPercentage = l.ProgressPercentage, CreatedAt = l.CreatedAt };
        if (!string.IsNullOrEmpty(l.ExecutedBy))
        {
            try { var u = await _userService.GetUserByIdAsync(l.ExecutedBy); if (u != null) dto.ExecutedByName = string.IsNullOrWhiteSpace(u.Name) ? u.Username : $"{u.Username} ({u.Name})"; } catch { }
        }
        return dto;
    }

    public async Task<List<TaskDto>> GetTasksByProjectIdAsync(string pid) => BuildTaskTree(await ConvertToTaskDtosAsync((await _context.Set<WorkTask>().Where(t => t.ProjectId == pid).ToListAsync()).OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt)));
    public async Task<List<TaskDto>> GetTaskTreeAsync(string? pid = null) => BuildTaskTree(await ConvertToTaskDtosAsync((await _context.Set<WorkTask>().Where(t => string.IsNullOrEmpty(pid) || t.ProjectId == pid).ToListAsync()).OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt)));

    private List<TaskDto> BuildTaskTree(List<TaskDto> all)
    {
        var map = all.ToDictionary(t => t.Id!);
        var roots = new List<TaskDto>();
        foreach (var t in all)
        {
            if (string.IsNullOrEmpty(t.ParentTaskId) || !map.ContainsKey(t.ParentTaskId)) roots.Add(t);
            else { var p = map[t.ParentTaskId]; p.Children ??= new List<TaskDto>(); p.Children.Add(t); }
        }
        foreach (var t in all) if (t.Children != null) t.Children = t.Children.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt).ToList();
        return roots.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt).ToList();
    }

    public async Task<string> AddTaskDependencyAsync(string pId, string sId, int type, int lag)
    {
        if (!await _context.Set<WorkTask>().AnyAsync(x => x.Id == pId)) throw new KeyNotFoundException($"前置任务 {pId} 不存在");
        if (!await _context.Set<WorkTask>().AnyAsync(x => x.Id == sId)) throw new KeyNotFoundException($"后续任务 {sId} 不存在");
        if (await HasCircularDependencyAsync(pId, sId)) throw new InvalidOperationException("检测到循环依赖");

        var dep = new TaskDependency { PredecessorTaskId = pId, SuccessorTaskId = sId, DependencyType = (TaskDependencyType)type, LagDays = lag };
        await _context.Set<TaskDependency>().AddAsync(dep);
        await _context.SaveChangesAsync();
        return dep.Id;
    }

    private async Task<bool> HasCircularDependencyAsync(string start, string end)
    {
        var visited = new HashSet<string> { start };
        var q = new Queue<string>(); q.Enqueue(start);
        while (q.Any())
        {
            var cur = q.Dequeue(); if (cur == end) return true;
            var deps = await _context.Set<TaskDependency>().Where(d => d.PredecessorTaskId == cur).ToListAsync();
            foreach (var d in deps) if (visited.Add(d.SuccessorTaskId)) q.Enqueue(d.SuccessorTaskId);
        }
        return false;
    }

    public async Task<bool> RemoveTaskDependencyAsync(string id)
    {
        var dep = await _context.Set<TaskDependency>().FirstOrDefaultAsync(x => x.Id == id);
        if (dep == null) return false;
        _context.Set<TaskDependency>().Remove(dep);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string tid)
    {
        var deps = await _context.Set<TaskDependency>().Where(d => d.PredecessorTaskId == tid || d.SuccessorTaskId == tid).ToListAsync();
        var dtos = new List<TaskDependencyDto>();
        foreach (var d in deps)
        {
            var p = await GetTaskByIdAsync(d.PredecessorTaskId);
            var s = await GetTaskByIdAsync(d.SuccessorTaskId);
            dtos.Add(new TaskDependencyDto { Id = d.Id, PredecessorTaskId = d.PredecessorTaskId, PredecessorTaskName = p?.TaskName, SuccessorTaskId = d.SuccessorTaskId, SuccessorTaskName = s?.TaskName, DependencyType = (int)d.DependencyType, DependencyTypeName = GetDependencyTypeName(d.DependencyType), LagDays = d.LagDays });
        }
        return dtos;
    }

    public async Task<List<string>> CalculateCriticalPathAsync(string pid)
    {
        var tasks = await _context.Set<WorkTask>().Where(t => t.ProjectId == pid).ToListAsync();
        if (!tasks.Any()) return new List<string>();
        var deps = await _context.Set<TaskDependency>().Where(d => tasks.Select(t => t.Id).Contains(d.PredecessorTaskId) || tasks.Select(t => t.Id).Contains(d.SuccessorTaskId)).ToListAsync();
        
        var graph = tasks.ToDictionary(t => t.Id!, t => new List<string>());
        var inDeg = tasks.ToDictionary(t => t.Id!, t => 0);
        foreach (var d in deps) if (graph.ContainsKey(d.PredecessorTaskId) && graph.ContainsKey(d.SuccessorTaskId)) { graph[d.PredecessorTaskId].Add(d.SuccessorTaskId); inDeg[d.SuccessorTaskId]++; }

        var eStart = tasks.ToDictionary(t => t.Id!, t => 0);
        var q = new Queue<string>(tasks.Where(t => inDeg[t.Id!] == 0).Select(t => t.Id!));
        while (q.Any())
        {
            var cur = q.Dequeue();
            foreach (var next in graph[cur])
            {
                var tCur = tasks.First(t => t.Id == cur);
                var dur = tCur.Duration ?? (tCur.PlannedEndTime.HasValue && tCur.PlannedStartTime.HasValue ? (int)(tCur.PlannedEndTime.Value - tCur.PlannedStartTime.Value).TotalDays : 1);
                eStart[next] = Math.Max(eStart[next], eStart[cur] + dur);
                if (--inDeg[next] == 0) q.Enqueue(next);
            }
        }

        var lStart = tasks.ToDictionary(t => t.Id!, t => eStart.Values.Max());
        var rGraph = tasks.ToDictionary(t => t.Id!, t => new List<string>());
        foreach (var d in deps) if (rGraph.ContainsKey(d.SuccessorTaskId) && rGraph.ContainsKey(d.PredecessorTaskId)) rGraph[d.SuccessorTaskId].Add(d.PredecessorTaskId);
        
        var ends = tasks.Where(t => !graph[t.Id!].Any()).ToList();
        if (ends.Any())
        {
            var maxE = ends.Max(t => eStart[t.Id!] + (t.Duration ?? (t.PlannedEndTime.HasValue && t.PlannedStartTime.HasValue ? (int)(t.PlannedEndTime.Value - t.PlannedStartTime.Value).TotalDays : 1)));
            foreach (var e in ends) lStart[e.Id!] = maxE - (e.Duration ?? (e.PlannedEndTime.HasValue && e.PlannedStartTime.HasValue ? (int)(e.PlannedEndTime.Value - e.PlannedStartTime.Value).TotalDays : 1));
            
            var visited = new HashSet<string>(); q = new Queue<string>(ends.Select(t => t.Id!));
            while (q.Any())
            {
                var cur = q.Dequeue(); if (!visited.Add(cur)) continue;
                foreach (var prev in rGraph[cur])
                {
                    var tP = tasks.First(t => t.Id == prev);
                    var dur = tP.Duration ?? (tP.PlannedEndTime.HasValue && tP.PlannedStartTime.HasValue ? (int)(tP.PlannedEndTime.Value - tP.PlannedStartTime.Value).TotalDays : 1);
                    lStart[prev] = Math.Min(lStart[prev], lStart[cur] - dur);
                    if (!visited.Contains(prev)) q.Enqueue(prev);
                }
            }
        }
        return tasks.Where(t => lStart[t.Id!] == eStart[t.Id!]).Select(t => t.Id!).ToList();
    }

    public async Task<TaskDto> UpdateTaskProgressAsync(string tid, int p)
    {
        var t = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == tid);
        if (t == null) throw new KeyNotFoundException($"任务 {tid} 不存在");
        t.CompletionPercentage = Math.Max(0, Math.Min(100, p));
        await _context.SaveChangesAsync();
        if (!string.IsNullOrEmpty(t.ProjectId)) await _serviceProvider.GetRequiredService<IProjectService>().CalculateProjectProgressAsync(t.ProjectId);
        return await ConvertToTaskDtoAsync(t);
    }

    private static string GetStatusName(Models.TaskStatus s) => s switch { Models.TaskStatus.Pending => "待分配", Models.TaskStatus.Assigned => "已分配", Models.TaskStatus.InProgress => "执行中", Models.TaskStatus.Completed => "已完成", Models.TaskStatus.Cancelled => "已取消", Models.TaskStatus.Failed => "失败", Models.TaskStatus.Paused => "暂停", _ => "未知" };
    private static string GetPriorityName(TaskPriority p) => p switch { TaskPriority.Low => "低", TaskPriority.Medium => "中", TaskPriority.High => "高", TaskPriority.Urgent => "紧急", _ => "未知" };
    private static string GetExecutionResultName(TaskExecutionResult r) => r switch { TaskExecutionResult.NotExecuted => "未执行", TaskExecutionResult.Success => "成功", TaskExecutionResult.Failed => "失败", TaskExecutionResult.Timeout => "超时", TaskExecutionResult.Interrupted => "被中断", _ => "未知" };
    private static string GetDependencyTypeName(TaskDependencyType t) => t switch { TaskDependencyType.FinishToStart => "完成到开始", TaskDependencyType.StartToStart => "开始到开始", TaskDependencyType.FinishToFinish => "完成到完成", TaskDependencyType.StartToFinish => "开始到完成", _ => "未知" };
}
