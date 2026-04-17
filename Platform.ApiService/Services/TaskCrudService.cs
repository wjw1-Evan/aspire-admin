using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskExecutionResult = Platform.ApiService.Models.TaskExecutionResult;

namespace Platform.ApiService.Services;

public class TaskCrudService : ITaskCrudService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TaskCrudService> _logger;

    public TaskCrudService(DbContext context, IUserService userService,
        IUnifiedNotificationService notificationService, IServiceProvider serviceProvider,
        ILogger<TaskCrudService> logger)
    {
        _context = context;
        _userService = userService;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

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
            Duration = request.Duration
        };

        if (!string.IsNullOrEmpty(request.AssignedTo)) task.AssignedAt = DateTime.UtcNow;

        await _context.Set<WorkTask>().AddAsync(task);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(task.AssignedTo))
        {
            await _notificationService.CreateTaskNotificationAsync(
                task.Id!, task.TaskName, "task_assigned",
                (int)task.Priority, (int)task.Status, task.AssignedTo, null,
                string.IsNullOrWhiteSpace(request.Remarks) ? "任务已分配给您" : request.Remarks);
        }

        return await ConvertToTaskDtoAsync(task);
    }

    public async Task<TaskDto?> GetTaskByIdAsync(string taskId)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == taskId);
        return task == null ? null : await ConvertToTaskDtoAsync(task);
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> QueryTasksAsync(ProTableRequest request)
    {
        var q = _context.Set<WorkTask>().AsQueryable();
        var pagedResult = q.ToPagedList(request);
        var tasks = await pagedResult.Queryable.ToListAsync();
        var total = pagedResult.RowCount;
        var taskDtos = await ConvertToTaskDtosAsync(tasks);

        var parentIds = tasks.Select(t => t.Id!).ToList();
        var children = await _context.Set<WorkTask>()
            .Where(t => parentIds.Contains(t.ParentTaskId!))
            .OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt).ToListAsync();

        if (children.Any())
        {
            var childDtos = await ConvertToTaskDtosAsync(children);
            var childMap = childDtos.GroupBy(c => c.ParentTaskId!).ToDictionary(g => g.Key, g => g.ToList());
            foreach (var dto in taskDtos)
                if (childMap.TryGetValue(dto.Id!, out var dtoChildren)) dto.Children = dtoChildren;
        }

        return new System.Linq.Dynamic.Core.PagedResult<TaskDto>
        {
            Queryable = taskDtos.AsQueryable(),
            CurrentPage = request.Page,
            PageSize = request.PageSize,
            RowCount = total,
            PageCount = (int)Math.Ceiling((double)total / request.PageSize)
        };
    }

    public async Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId)
    {
        var task = await _context.Set<WorkTask>().FirstOrDefaultAsync(x => x.Id == request.TaskId);
        if (task == null) throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        if (task.CreatedBy != userId && task.AssignedTo != userId &&
            (task.ParticipantIds == null || !task.ParticipantIds.Contains(userId)))
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

        if (!string.IsNullOrEmpty(task.AssignedTo))
        {
            await _notificationService.CreateTaskNotificationAsync(
                task.Id!, task.TaskName, "task_assigned",
                (int)task.Priority, (int)task.Status, task.AssignedTo, null,
                string.IsNullOrWhiteSpace(request.Remarks) ? "任务已分配给您" : request.Remarks);
        }

        return await ConvertToTaskDtoAsync(task);
    }

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

    public async Task<int> BatchUpdateTaskStatusAsync(List<string> ids, Models.TaskStatus status)
    {
        var tasks = await _context.Set<WorkTask>().Where(t => ids.Contains(t.Id!)).ToListAsync();
        foreach (var t in tasks) t.Status = status;
        await _context.SaveChangesAsync();
        return tasks.Count;
    }

    public async Task<List<TaskDto>> GetUserTodoTasksAsync(string userId)
    {
        var tasks = await _context.Set<WorkTask>()
            .Where(t => t.AssignedTo == userId &&
                (t.Status == Models.TaskStatus.Assigned || t.Status == Models.TaskStatus.InProgress))
            .OrderByDescending(t => t.Priority)
            .ThenByDescending(t => t.CreatedAt).ToListAsync();
        return await ConvertToTaskDtosAsync(tasks);
    }

    public async Task<System.Linq.Dynamic.Core.PagedResult<TaskDto>> GetUserCreatedTasksAsync(string userId, ProTableRequest request)
    {
        var q = _context.Set<WorkTask>().Where(t => t.CreatedBy == userId);
        var pagedResult = q.ToPagedList(request);
        var tasks = await pagedResult.Queryable.ToListAsync();
        var dtos = await ConvertToTaskDtosAsync(tasks);
        return new System.Linq.Dynamic.Core.PagedResult<TaskDto>
        {
            Queryable = dtos.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    private async Task<List<TaskDto>> ConvertToTaskDtosAsync(IEnumerable<WorkTask> tasks)
    {
        var list = tasks.ToList();
        if (!list.Any()) return new List<TaskDto>();

        var userIds = list.SelectMany(t =>
            (t.ParticipantIds ?? new List<string>()).Concat(new[] { t.CreatedBy, t.AssignedTo }))
            .Where(id => !string.IsNullOrEmpty(id)).Select(id => id!).Distinct();
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
        if (!string.IsNullOrEmpty(t.CreatedBy) && uMap.TryGetValue(t.CreatedBy, out var u1))
            dto.CreatedByName = string.IsNullOrWhiteSpace(u1.Name) ? u1.Username : $"{u1.Username} ({u1.Name})";
        if (!string.IsNullOrEmpty(t.AssignedTo) && uMap.TryGetValue(t.AssignedTo, out var u2))
            dto.AssignedToName = string.IsNullOrWhiteSpace(u2.Name) ? u2.Username : $"{u2.Username} ({u2.Name})";
        if (t.ParticipantIds?.Any() == true)
        {
            foreach (var pid in t.ParticipantIds)
                if (uMap.TryGetValue(pid, out var u))
                    dto.Participants.Add(new ParticipantInfo { UserId = pid, Username = u.Username, Email = u.Email });
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
        Id = t.Id,
        TaskName = t.TaskName,
        Description = t.Description,
        TaskType = t.TaskType,
        Status = (int)t.Status,
        StatusName = GetStatusName(t.Status),
        Priority = (int)t.Priority,
        PriorityName = GetPriorityName(t.Priority),
        CreatedBy = t.CreatedBy ?? "",
        AssignedTo = t.AssignedTo,
        AssignedAt = t.AssignedAt,
        PlannedStartTime = t.PlannedStartTime,
        PlannedEndTime = t.PlannedEndTime,
        ActualStartTime = t.ActualStartTime,
        ActualEndTime = t.ActualEndTime,
        EstimatedDuration = t.EstimatedDuration,
        ActualDuration = t.ActualDuration,
        ExecutionResult = (int)t.ExecutionResult,
        ExecutionResultName = GetExecutionResultName(t.ExecutionResult),
        CompletionPercentage = t.CompletionPercentage,
        Remarks = t.Remarks,
        ParticipantIds = t.ParticipantIds,
        Tags = t.Tags,
        UpdatedBy = t.UpdatedBy,
        ProjectId = t.ProjectId,
        ParentTaskId = t.ParentTaskId,
        SortOrder = t.SortOrder,
        Duration = t.Duration,
        Attachments = t.Attachments?.Select(a => new TaskAttachmentDto { Id = a.Id, FileName = a.FileName, FileUrl = a.FileUrl, FileSize = a.FileSize, UploadedAt = a.UploadedAt, UploadedBy = a.UploadedBy }).ToList() ?? new List<TaskAttachmentDto>()
    };

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
