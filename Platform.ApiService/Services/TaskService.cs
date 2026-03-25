using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 任务管理服务实现
/// </summary>
public class TaskService : ITaskService
{
    private readonly IDataFactory<WorkTask> _taskFactory;
    private readonly IDataFactory<TaskExecutionLog> _executionLogFactory;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TaskService> _logger;

    /// <summary>
    /// 初始化 TaskService 实例
    /// </summary>
    public TaskService(
        IDataFactory<WorkTask> taskFactory,
        IDataFactory<TaskExecutionLog> executionLogFactory,
        IUserService userService,
        IUserActivityLogService userActivityLogService,
        IUnifiedNotificationService notificationService,
        IServiceProvider serviceProvider,
        ITenantContext tenantContext,
        ILogger<TaskService> logger)
    {
        _taskFactory = taskFactory;
        _executionLogFactory = executionLogFactory;
        _userService = userService;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// 创建新任务
    /// </summary>
    /// <param name="request">创建任务请求</param>
    /// <returns>创建的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CreateTaskAsync(CreateTaskRequest request)
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
            ParticipantIds = request.ParticipantIds ?? new(),
            Tags = request.Tags ?? new(),
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

        await _taskFactory.CreateAsync(task);

        // 如果在创建时已指派给某人，发送任务分配通知
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

    /// <summary>
    /// 根据任务ID获取任务详情
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <returns>任务信息，如果不存在则返回 null</returns>
    public async System.Threading.Tasks.Task<TaskDto?> GetTaskByIdAsync(string taskId)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);

        if (task == null)
            return null;

        return await ConvertToTaskDtoAsync(task);
    }

    /// <summary>
    /// 查询任务列表
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <returns>任务列表响应</returns>
    public async System.Threading.Tasks.Task<TaskListResponse> QueryTasksAsync(TaskQueryRequest request)
    {
        var search = request.Search?.ToLower();
        var onlyRoot = request.OnlyRoot ?? string.IsNullOrEmpty(request.Search);

        // 构建过滤器（LINQ）
        System.Linq.Expressions.Expression<Func<WorkTask, bool>> filter = t =>
            (string.IsNullOrEmpty(search) || (t.TaskName != null && t.TaskName.ToLower().Contains(search)) || (t.Description != null && t.Description.ToLower().Contains(search))) &&
            (string.IsNullOrEmpty(request.ProjectId) || t.ProjectId == request.ProjectId) &&
            (!request.Status.HasValue || t.Status == (Models.TaskStatus)request.Status.Value) &&
            (!request.Priority.HasValue || t.Priority == (TaskPriority)request.Priority.Value) &&
            (string.IsNullOrEmpty(request.AssignedTo) || t.AssignedTo == request.AssignedTo) ||
            (string.IsNullOrEmpty(request.CreatedBy) || t.CreatedBy == request.CreatedBy) ||
            (string.IsNullOrEmpty(request.TaskType) || t.TaskType == request.TaskType) &&
            (!onlyRoot || string.IsNullOrEmpty(t.ParentTaskId)) &&
            (!request.StartDate.HasValue || t.CreatedAt >= request.StartDate.Value) &&
            (!request.EndDate.HasValue || t.CreatedAt <= request.EndDate.Value) &&
            (request.Tags == null || request.Tags.Count == 0 || t.Tags.Any(tag => request.Tags.Contains(tag)));

        // 排序处理
        Func<IQueryable<WorkTask>, IOrderedQueryable<WorkTask>> orderBy = query =>
        {
            var isAsc = request.SortOrder?.ToLower() == "asc";
            return request.SortBy?.ToLower() switch
            {
                "taskname" => isAsc ? query.OrderBy(t => t.TaskName) : query.OrderByDescending(t => t.TaskName),
                "priority" => isAsc ? query.OrderBy(t => t.Priority) : query.OrderByDescending(t => t.Priority),
                "status" => isAsc ? query.OrderBy(t => t.Status) : query.OrderByDescending(t => t.Status),
                "plannedstarttime" => isAsc ? query.OrderBy(t => t.PlannedStartTime) : query.OrderByDescending(t => t.PlannedStartTime),
                "plannedendtime" => isAsc ? query.OrderBy(t => t.PlannedEndTime) : query.OrderByDescending(t => t.PlannedEndTime),
                "sortorder" => isAsc ? query.OrderBy(t => t.SortOrder) : query.OrderByDescending(t => t.SortOrder),
                _ => isAsc ? query.OrderBy(t => t.CreatedAt) : query.OrderByDescending(t => t.CreatedAt)
            };
        };

        // 分页查询
        var (tasks, total) = await _taskFactory.FindPagedAsync(
            filter,
            orderBy,
            request.Page,
            request.PageSize);

        var taskDtos = await ConvertToTaskDtosAsync(tasks);

        if (onlyRoot)
        {
            var parentIds = tasks.Where(t => !string.IsNullOrEmpty(t.Id)).Select(t => t.Id!).ToList();
            var children = await _taskFactory.FindAsync(
                t => parentIds.Contains(t.ParentTaskId!),
                q => q.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt));

            if (children.Any())
            {
                var childDtos = await ConvertToTaskDtosAsync(children);
                var childMap = childDtos.GroupBy(c => c.ParentTaskId!).ToDictionary(g => g.Key, g => g.ToList());

                foreach (var dto in taskDtos)
                {
                    if (childMap.TryGetValue(dto.Id!, out var dtoChildren))
                    {
                        dto.Children = dtoChildren;
                    }
                }
            }
        }

        return new TaskListResponse
        {
            Tasks = taskDtos,
            Total = (int)total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    /// <summary>
    /// 更新任务信息
    /// </summary>
    /// <param name="request">更新任务请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);

        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        // 验证权限：创建者、负责人或参与者可以更新
        var isCreator = task.CreatedBy == userId;
        var isAssignee = task.AssignedTo == userId;
        var isParticipant = task.ParticipantIds?.Contains(userId) == true;
        
        if (!isCreator && !isAssignee && !isParticipant)
            throw new UnauthorizedAccessException("无权更新此任务");

        var updatedTask = await _taskFactory.UpdateAsync(request.TaskId, t =>
        {

            if (!string.IsNullOrEmpty(request.TaskName))
                t.TaskName = request.TaskName;

            if (request.Description != null)
                t.Description = request.Description;

            if (!string.IsNullOrEmpty(request.TaskType))
                t.TaskType = request.TaskType;

            if (request.Priority.HasValue)
                t.Priority = (TaskPriority)request.Priority.Value;

            if (request.Status.HasValue)
                t.Status = (Models.TaskStatus)request.Status.Value;

            // 处理指派用户：null 表示不更新；空字符串表示清空指派
            if (request.AssignedTo != null)
            {
                if (string.IsNullOrWhiteSpace(request.AssignedTo))
                {
                    t.AssignedTo = null;
                    t.AssignedAt = null;
                    // 若任务处于已分配状态且未开始执行，清空指派后恢复为待分配
                    if (t.Status == Models.TaskStatus.Assigned)
                        t.Status = Models.TaskStatus.Pending;
                }
                else
                {
                    t.AssignedTo = request.AssignedTo;
                    t.AssignedAt = DateTime.UtcNow;
                    if (t.Status == Models.TaskStatus.Pending)
                        t.Status = Models.TaskStatus.Assigned;
                }
            }

            if (request.PlannedStartTime.HasValue)
                t.PlannedStartTime = request.PlannedStartTime;

            if (request.PlannedEndTime.HasValue)
                t.PlannedEndTime = request.PlannedEndTime;

            if (request.CompletionPercentage.HasValue)
                t.CompletionPercentage = request.CompletionPercentage.Value;

            if (request.ParticipantIds != null)
                t.ParticipantIds = request.ParticipantIds;

            if (request.Tags != null)
                t.Tags = request.Tags;

            if (request.Remarks != null)
                t.Remarks = request.Remarks;

            if (request.ProjectId != null)
                t.ProjectId = request.ProjectId;

            if (request.ParentTaskId != null)
                t.ParentTaskId = request.ParentTaskId;

            if (request.SortOrder.HasValue)
                t.SortOrder = request.SortOrder.Value;

            if (request.Duration.HasValue)
                t.Duration = request.Duration.Value;
        });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 如果任务属于项目，且进度有更新，更新项目进度
        if (!string.IsNullOrEmpty(updatedTask.ProjectId) && request.CompletionPercentage.HasValue)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(updatedTask.ProjectId);
        }

        // 发送任务分配通知
        try
        {
            if (!string.IsNullOrEmpty(updatedTask.AssignedTo))
            {
                await _notificationService.CreateTaskNotificationAsync(
                    updatedTask.Id!,
                    updatedTask.TaskName,
                    "task_assigned",
                    (int)updatedTask.Priority,
                    (int)updatedTask.Status,
                    updatedTask.AssignedTo,
                    null,
                    string.IsNullOrWhiteSpace(request.Remarks) ? "任务已分配给您" : request.Remarks
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_assigned", updatedTask.Id);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 分配任务给用户
    /// </summary>
    /// <param name="request">分配任务请求</param>
    /// <returns>分配后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> AssignTaskAsync(AssignTaskRequest request)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);

        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updatedTask = await _taskFactory.UpdateAsync(request.TaskId, t =>
        {
            t.AssignedTo = request.AssignedTo;
            t.AssignedAt = DateTime.UtcNow;
            t.Status = Models.TaskStatus.Assigned;

            if (!string.IsNullOrEmpty(request.Remarks))
                t.Remarks = request.Remarks;
        });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 分配后发送任务分配通知
        try
        {
            var relatedUsers = new List<string>();
            if (!string.IsNullOrEmpty(updatedTask.CreatedBy)) relatedUsers.Add(updatedTask.CreatedBy);
            if (!string.IsNullOrEmpty(updatedTask.AssignedTo)) relatedUsers.Add(updatedTask.AssignedTo);
            if (updatedTask.ParticipantIds != null && updatedTask.ParticipantIds.Count > 0)
                relatedUsers.AddRange(updatedTask.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                updatedTask.Id!,
                updatedTask.TaskName,
                "task_assigned",
                (int)updatedTask.Priority,
                (int)updatedTask.Status,
                updatedTask.AssignedTo,
                relatedUsers.Distinct(),
                request.Remarks
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_assigned", updatedTask.Id);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 执行任务
    /// </summary>
    /// <param name="request">执行任务请求</param>
    /// <returns>执行后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);

        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updatedTask = await _taskFactory.UpdateAsync(request.TaskId, t =>
        {
            t.Status = (Models.TaskStatus)request.Status;

            if (request.Status == (int)Models.TaskStatus.InProgress && t.ActualStartTime == null)
                t.ActualStartTime = DateTime.UtcNow;

            if (request.CompletionPercentage.HasValue)
                t.CompletionPercentage = request.CompletionPercentage.Value;
        });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 记录执行日志
        await LogTaskExecutionAsync(
            request.TaskId,
            TaskExecutionResult.Success,
            request.Message,
            request.CompletionPercentage ?? 0);

        // 如果任务属于项目，且进度有更新，更新项目进度
        if (!string.IsNullOrEmpty(updatedTask.ProjectId) && request.CompletionPercentage.HasValue)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(updatedTask.ProjectId);
        }

        // 发送状态变更通知（执行中等）
        try
        {
            var actionType = ((Models.TaskStatus)updatedTask.Status) switch
            {
                Models.TaskStatus.InProgress => "task_started",
                Models.TaskStatus.Completed => "task_completed",
                Models.TaskStatus.Cancelled => "task_cancelled",
                Models.TaskStatus.Failed => "task_failed",
                Models.TaskStatus.Paused => "task_paused",
                _ => "task_updated"
            };

            var relatedUsers = new List<string>();
            if (!string.IsNullOrEmpty(updatedTask.CreatedBy)) relatedUsers.Add(updatedTask.CreatedBy);
            if (!string.IsNullOrEmpty(updatedTask.AssignedTo)) relatedUsers.Add(updatedTask.AssignedTo);
            if (updatedTask.ParticipantIds != null && updatedTask.ParticipantIds.Count > 0)
                relatedUsers.AddRange(updatedTask.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                updatedTask.Id!,
                updatedTask.TaskName,
                actionType,
                (int)updatedTask.Priority,
                (int)updatedTask.Status,
                updatedTask.AssignedTo,
                relatedUsers.Distinct(),
                request.Message
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_status_changed", updatedTask.Id);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 完成任务
    /// </summary>
    /// <param name="request">完成任务请求</param>
    /// <returns>完成后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);

        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var now = DateTime.UtcNow;
        var updatedTask = await _taskFactory.UpdateAsync(request.TaskId, t =>
        {
            t.Status = Models.TaskStatus.Completed;
            t.ExecutionResult = (TaskExecutionResult)request.ExecutionResult;
            t.ActualEndTime = now;
            t.CompletionPercentage = 100;

            if (t.ActualStartTime.HasValue)
            {
                t.ActualDuration = (int)(now - t.ActualStartTime.Value).TotalMinutes;
            }

            if (!string.IsNullOrEmpty(request.Remarks))
                t.Remarks = request.Remarks;
        });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 记录执行日志
        await LogTaskExecutionAsync(
            request.TaskId,
            (TaskExecutionResult)request.ExecutionResult,
            request.Remarks,
            100);

        // 如果任务属于项目，更新项目进度（任务完成时进度为100%）
        if (!string.IsNullOrEmpty(updatedTask.ProjectId))
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(updatedTask.ProjectId);
        }

        // 发送任务完成通知
        try
        {
            var relatedUsers = new List<string>();
            if (!string.IsNullOrEmpty(updatedTask.CreatedBy)) relatedUsers.Add(updatedTask.CreatedBy);
            if (!string.IsNullOrEmpty(updatedTask.AssignedTo)) relatedUsers.Add(updatedTask.AssignedTo);
            if (updatedTask.ParticipantIds != null && updatedTask.ParticipantIds.Count > 0)
                relatedUsers.AddRange(updatedTask.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                updatedTask.Id!,
                updatedTask.TaskName,
                "task_completed",
                (int)updatedTask.Priority,
                (int)updatedTask.Status,
                updatedTask.AssignedTo,
                relatedUsers.Distinct(),
                request.Remarks
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_completed", updatedTask.Id);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 取消任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="remarks">取消备注</param>
    /// <returns>取消后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CancelTaskAsync(string taskId, string? remarks = null)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);

        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        var updatedTask = await _taskFactory.UpdateAsync(taskId, t =>
        {
            t.Status = Models.TaskStatus.Cancelled;

            if (!string.IsNullOrEmpty(remarks))
                t.Remarks = remarks;
        });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {taskId} 不存在");
        }

        // 发送任务取消通知
        try
        {
            var relatedUsers = new List<string>();
            if (!string.IsNullOrEmpty(updatedTask.CreatedBy)) relatedUsers.Add(updatedTask.CreatedBy);
            if (!string.IsNullOrEmpty(updatedTask.AssignedTo)) relatedUsers.Add(updatedTask.AssignedTo);
            if (updatedTask.ParticipantIds != null && updatedTask.ParticipantIds.Count > 0)
                relatedUsers.AddRange(updatedTask.ParticipantIds);

            await _notificationService.CreateTaskNotificationAsync(
                updatedTask.Id!,
                updatedTask.TaskName,
                "task_cancelled",
                (int)updatedTask.Priority,
                (int)updatedTask.Status,
                updatedTask.AssignedTo,
                relatedUsers.Distinct(),
                remarks
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "通知发送失败: TaskId={TaskId}, Action=task_cancelled", updatedTask.Id);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 删除任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>删除是否成功</returns>
    public async System.Threading.Tasks.Task<bool> DeleteTaskAsync(string taskId, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);
        if (task == null)
            return false;

        // 验证是否是任务创建者
        if (task.CreatedBy != userId)
            throw new UnauthorizedAccessException("无权删除他人的任务");

        // 收集所有需要删除的任务ID（包括任务本身及其所有后代任务）
        var idsToDelete = new List<string> { taskId };
        await GetAllDescendantIdsAsync(taskId, idsToDelete);

        // 执行批量软删除
        var modifiedCount = await _taskFactory.SoftDeleteManyAsync(t => idsToDelete.Contains(t.Id));
        return modifiedCount > 0;
    }

    /// <summary>
    /// 递归获取所有后代任务的ID
    /// </summary>
    private async System.Threading.Tasks.Task GetAllDescendantIdsAsync(string parentId, List<string> allIds)
    {
        var children = await _taskFactory.FindAsync(t => t.ParentTaskId == parentId);

        foreach (var child in children)
        {
            if (!string.IsNullOrEmpty(child.Id))
            {
                allIds.Add(child.Id);
                await GetAllDescendantIdsAsync(child.Id, allIds);
            }
        }
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="userId">用户ID（可选，为空时统计全公司）</param>
    /// <returns>任务统计信息</returns>
    public async System.Threading.Tasks.Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null)
    {
        System.Linq.Expressions.Expression<Func<WorkTask, bool>> filter = t =>
            string.IsNullOrEmpty(userId) || (t.AssignedTo == userId || t.CreatedBy == userId);

        var tasks = await _taskFactory.FindAsync(filter);

        var statistics = new TaskStatistics
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(t => t.Status == Models.TaskStatus.Pending),
            InProgressTasks = tasks.Count(t => t.Status == Models.TaskStatus.InProgress),
            CompletedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Completed),
            FailedTasks = tasks.Count(t => t.Status == Models.TaskStatus.Failed),
        };

        // 计算平均完成时间
        var completedTasks = tasks.Where(t => t.Status == Models.TaskStatus.Completed && t.ActualDuration.HasValue).ToList();
        if (completedTasks.Count > 0)
        {
            statistics.AverageCompletionTime = completedTasks.Average(t => t.ActualDuration ?? 0);
        }

        // 计算完成率
        if (statistics.TotalTasks > 0)
        {
            statistics.CompletionRate = (double)statistics.CompletedTasks / statistics.TotalTasks * 100;
        }

        // 按优先级统计
        statistics.TasksByPriority = new Dictionary<string, int>
        {
            { "Low", tasks.Count(t => t.Priority == TaskPriority.Low) },
            { "Medium", tasks.Count(t => t.Priority == TaskPriority.Medium) },
            { "High", tasks.Count(t => t.Priority == TaskPriority.High) },
            { "Urgent", tasks.Count(t => t.Priority == TaskPriority.Urgent) }
        };

        // 按状态统计
        statistics.TasksByStatus = new Dictionary<string, int>
        {
            { "Pending", statistics.PendingTasks },
            { "Assigned", tasks.Count(t => t.Status == Models.TaskStatus.Assigned) },
            { "InProgress", statistics.InProgressTasks },
            { "Completed", statistics.CompletedTasks },
            { "Cancelled", tasks.Count(t => t.Status == Models.TaskStatus.Cancelled) },
            { "Failed", statistics.FailedTasks },
            { "Paused", tasks.Count(t => t.Status == Models.TaskStatus.Paused) }
        };

        return statistics;
    }

    /// <summary>
    /// 获取任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>执行日志列表和总数</returns>
    public async System.Threading.Tasks.Task<(List<TaskExecutionLogDto> logs, int total)> GetTaskExecutionLogsAsync(string taskId, int page = 1, int pageSize = 10)
    {
        var (logs, total) = await _executionLogFactory.FindPagedAsync(
            l => l.TaskId == taskId,
            q => q.OrderByDescending(l => l.CreatedAt),
            page,
            pageSize);

        var logDtos = new List<TaskExecutionLogDto>();
        foreach (var log in logs)
        {
            logDtos.Add(await ConvertToTaskExecutionLogDtoAsync(log));
        }

        return (logDtos, (int)total);
    }

    /// <summary>
    /// 记录任务执行日志
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="status">执行结果状态</param>
    /// <param name="message">执行消息</param>
    /// <param name="progressPercentage">进度百分比</param>
    /// <returns>执行日志信息</returns>
    public async System.Threading.Tasks.Task<TaskExecutionLogDto> LogTaskExecutionAsync(
        string taskId,
        TaskExecutionResult status,
        string? message = null,
        int progressPercentage = 0)
    {
        var log = new TaskExecutionLog
        {
            TaskId = taskId,
            StartTime = DateTime.UtcNow,
            Status = status,
            Message = message,
            ProgressPercentage = progressPercentage
        };

        await _executionLogFactory.CreateAsync(log);
        return await ConvertToTaskExecutionLogDtoAsync(log);
    }

    /// <summary>
    /// 获取用户待办任务列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>待办任务列表</returns>
    public async System.Threading.Tasks.Task<List<TaskDto>> GetUserTodoTasksAsync(string userId)
    {
        var tasks = await _taskFactory.FindAsync(
            t => t.AssignedTo == userId && (t.Status == Models.TaskStatus.Assigned || t.Status == Models.TaskStatus.InProgress),
            q => q.OrderByDescending(t => t.Priority).ThenByDescending(t => t.CreatedAt));

        return await ConvertToTaskDtosAsync(tasks);
    }

    /// <summary>
    /// 获取用户创建的任务列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>创建的任务列表和总数</returns>
    public async System.Threading.Tasks.Task<(List<TaskDto> tasks, int total)> GetUserCreatedTasksAsync(string userId, int page = 1, int pageSize = 10)
    {
        var (tasks, total) = await _taskFactory.FindPagedAsync(
            t => t.CreatedBy == userId,
            q => q.OrderByDescending(t => t.CreatedAt),
            page,
            pageSize);

        var taskDtos = await ConvertToTaskDtosAsync(tasks);
        return (taskDtos, (int)total);
    }

    /// <summary>
    /// 批量更新任务状态
    /// </summary>
    /// <param name="taskIds">任务ID列表</param>
    /// <param name="status">新状态</param>
    /// <returns>更新的任务数量</returns>
    public async System.Threading.Tasks.Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, Models.TaskStatus status)
    {
        return (int)await _taskFactory.UpdateManyAsync(t => taskIds.Contains(t.Id!), t =>
        {
            t.Status = status;
        });
    }

    private async System.Threading.Tasks.Task<List<TaskDto>> ConvertToTaskDtosAsync(IEnumerable<WorkTask> tasks)
    {
        var taskList = tasks.ToList();
        if (taskList.Count == 0)
        {
            return new List<TaskDto>();
        }

        var userIds = new HashSet<string>();
        var projectIds = new HashSet<string>();

        foreach (var task in taskList)
        {
            if (!string.IsNullOrEmpty(task.CreatedBy)) userIds.Add(task.CreatedBy);
            if (!string.IsNullOrEmpty(task.AssignedTo)) userIds.Add(task.AssignedTo);
            if (task.ParticipantIds != null)
            {
                foreach (var pid in task.ParticipantIds)
                {
                    if (!string.IsNullOrEmpty(pid)) userIds.Add(pid);
                }
            }
            if (!string.IsNullOrEmpty(task.ProjectId)) projectIds.Add(task.ProjectId);
        }

        var userMap = await _userService.GetUsersByIdsAsync(userIds);

        Dictionary<string, string> projectMap = new();
        if (projectIds.Count > 0)
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            foreach (var projectId in projectIds)
            {
                try
                {
                    var project = await projectService.GetProjectByIdAsync(projectId);
                    if (project != null)
                    {
                        projectMap[projectId] = project.Name;
                    }
                }
                catch
                {
                    // Ignore project fetch errors
                }
            }
        }

        var result = new List<TaskDto>();
        foreach (var task in taskList)
        {
            result.Add(ConvertToTaskDtoWithCache(task, userMap, projectMap));
        }

        return result;
    }

    private TaskDto ConvertToTaskDtoWithCache(WorkTask task, Dictionary<string, AppUser> userMap, Dictionary<string, string> projectMap)
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
            CreatedBy = task.CreatedBy ?? string.Empty,
            CreatedAt = task.CreatedAt,
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
            UpdatedAt = task.UpdatedAt,
            UpdatedBy = task.UpdatedBy,
            ProjectId = task.ProjectId,
            ParentTaskId = task.ParentTaskId,
            SortOrder = task.SortOrder,
            Duration = task.Duration
        };

        if (!string.IsNullOrEmpty(task.CreatedBy) && userMap.TryGetValue(task.CreatedBy, out var createdByUser))
        {
            dto.CreatedByName = !string.IsNullOrWhiteSpace(createdByUser.Name)
                ? $"{createdByUser.Username} ({createdByUser.Name})"
                : createdByUser.Username;
        }

        if (!string.IsNullOrEmpty(task.AssignedTo) && userMap.TryGetValue(task.AssignedTo, out var assignedToUser))
        {
            dto.AssignedToName = !string.IsNullOrWhiteSpace(assignedToUser.Name)
                ? $"{assignedToUser.Username} ({assignedToUser.Name})"
                : assignedToUser.Username;
        }

        if (task.ParticipantIds?.Count > 0)
        {
            foreach (var participantId in task.ParticipantIds)
            {
                if (!string.IsNullOrEmpty(participantId) && userMap.TryGetValue(participantId, out var participant))
                {
                    dto.Participants.Add(new ParticipantInfo
                    {
                        UserId = participantId,
                        Username = participant.Username,
                        Email = participant.Email
                    });
                }
            }
        }

        if (task.Attachments?.Count > 0)
        {
            dto.Attachments = task.Attachments.Select(a => new TaskAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                FileSize = a.FileSize,
                UploadedAt = a.UploadedAt,
                UploadedBy = a.UploadedBy
            }).ToList();
        }

        if (!string.IsNullOrEmpty(task.ProjectId) && projectMap.TryGetValue(task.ProjectId, out var projectName))
        {
            dto.ProjectName = projectName;
        }

        return dto;
    }

    private async System.Threading.Tasks.Task<TaskDto> ConvertToTaskDtoAsync(WorkTask task)
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
            CreatedBy = task.CreatedBy ?? string.Empty,
            CreatedAt = task.CreatedAt,
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
            UpdatedAt = task.UpdatedAt,
            UpdatedBy = task.UpdatedBy,
            ProjectId = task.ProjectId,
            ParentTaskId = task.ParentTaskId,
            SortOrder = task.SortOrder,
            Duration = task.Duration
        };

        // 获取用户信息
        try
        {
            if (!string.IsNullOrEmpty(task.CreatedBy))
            {
                var createdByUser = await _userService.GetUserByIdAsync(task.CreatedBy);
                if (createdByUser != null)
                {
                    // 显示格式：用户名 (昵称)，如果昵称为空则只显示用户名
                    dto.CreatedByName = !string.IsNullOrWhiteSpace(createdByUser.Name)
                        ? $"{createdByUser.Username} ({createdByUser.Name})"
                        : createdByUser.Username;
                }
            }

            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                var assignedToUser = await _userService.GetUserByIdAsync(task.AssignedTo);
                if (assignedToUser != null)
                {
                    // 显示格式：用户名 (昵称)，如果昵称为空则只显示用户名
                    dto.AssignedToName = !string.IsNullOrWhiteSpace(assignedToUser.Name)
                        ? $"{assignedToUser.Username} ({assignedToUser.Name})"
                        : assignedToUser.Username;
                }
            }

            // 获取参与者信息
            if (task.ParticipantIds.Count > 0)
            {
                foreach (var participantId in task.ParticipantIds)
                {
                    var participant = await _userService.GetUserByIdAsync(participantId);
                    if (participant != null)
                    {
                        dto.Participants.Add(new ParticipantInfo
                        {
                            UserId = participantId,
                            Username = participant.Username,
                            Email = participant.Email
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "获取用户信息失败: TaskId={TaskId}", task.Id);
        }

        // 转换附件
        if (task.Attachments.Count > 0)
        {
            dto.Attachments = task.Attachments.Select(a => new TaskAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                FileSize = a.FileSize,
                UploadedAt = a.UploadedAt,
                UploadedBy = a.UploadedBy
            }).ToList();
        }

        // 获取项目信息
        if (!string.IsNullOrEmpty(task.ProjectId))
        {
            try
            {
                var projectService = _serviceProvider.GetRequiredService<IProjectService>();
                var project = await projectService.GetProjectByIdAsync(task.ProjectId);
                if (project != null)
                {
                    dto.ProjectName = project.Name;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "获取项目信息失败: TaskId={TaskId}, ProjectId={ProjectId}", task.Id, task.ProjectId);
            }
        }

        return dto;
    }

    private async System.Threading.Tasks.Task<TaskExecutionLogDto> ConvertToTaskExecutionLogDtoAsync(TaskExecutionLog log)
    {
        var dto = new TaskExecutionLogDto
        {
            Id = log.Id,
            TaskId = log.TaskId,
            ExecutedBy = log.ExecutedBy,
            StartTime = log.StartTime,
            EndTime = log.EndTime,
            Status = (int)log.Status,
            StatusName = GetExecutionResultName(log.Status),
            Message = log.Message,
            ErrorMessage = log.ErrorMessage,
            ProgressPercentage = log.ProgressPercentage,
            CreatedAt = log.CreatedAt
        };

        // 获取执行者信息
        try
        {
            if (!string.IsNullOrEmpty(log.ExecutedBy))
            {
                var user = await _userService.GetUserByIdAsync(log.ExecutedBy);
                if (user != null)
                {
                    // 显示格式：用户名 (昵称)，如果昵称为空则只显示用户名
                    dto.ExecutedByName = !string.IsNullOrWhiteSpace(user.Name)
                        ? $"{user.Username} ({user.Name})"
                        : user.Username;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "获取执行日志用户信息失败: LogId={LogId}", log.Id);
        }

        return dto;
    }

    private static string GetStatusName(Models.TaskStatus status) => status switch
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

    private static string GetPriorityName(TaskPriority priority) => priority switch
    {
        TaskPriority.Low => "低",
        TaskPriority.Medium => "中",
        TaskPriority.High => "高",
        TaskPriority.Urgent => "紧急",
        _ => "未知"
    };

    private static string GetExecutionResultName(TaskExecutionResult result) => result switch
    {
        TaskExecutionResult.NotExecuted => "未执行",
        TaskExecutionResult.Success => "成功",
        TaskExecutionResult.Failed => "失败",
        TaskExecutionResult.Timeout => "超时",
        TaskExecutionResult.Interrupted => "被中断",
        _ => "未知"
    };

    /// <summary>
    /// 获取项目下的所有任务（树形结构）
    /// </summary>
    public async System.Threading.Tasks.Task<List<TaskDto>> GetTasksByProjectIdAsync(string projectId)
    {
        var tasks = await _taskFactory.FindAsync(t => t.ProjectId == projectId);
        var taskDtos = await ConvertToTaskDtosAsync(tasks.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt));
        return BuildTaskTree(taskDtos);
    }

    /// <summary>
    /// 获取任务树（支持按项目过滤）
    /// </summary>
    public async System.Threading.Tasks.Task<List<TaskDto>> GetTaskTreeAsync(string? projectId = null)
    {
        var tasks = await _taskFactory.FindAsync(t => string.IsNullOrEmpty(projectId) || t.ProjectId == projectId);
        var taskDtos = await ConvertToTaskDtosAsync(tasks.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt));
        return BuildTaskTree(taskDtos);
    }

    /// <summary>
    /// 构建任务树
    /// </summary>
    private List<TaskDto> BuildTaskTree(List<TaskDto> allTasks)
    {
        var taskMap = allTasks.ToDictionary(t => t.Id!);
        var rootTasks = new List<TaskDto>();

        foreach (var task in allTasks)
        {
            if (string.IsNullOrEmpty(task.ParentTaskId))
            {
                // 根任务
                rootTasks.Add(task);
            }
            else if (taskMap.ContainsKey(task.ParentTaskId))
            {
                // 子任务，添加到父任务的 Children 列表
                var parent = taskMap[task.ParentTaskId];
                parent.Children ??= new List<TaskDto>();
                parent.Children.Add(task);
            }
            else
            {
                // 父任务不存在，作为根任务处理
                rootTasks.Add(task);
            }
        }

        // 对每个节点的子任务进行排序
        foreach (var task in allTasks)
        {
            if (task.Children != null && task.Children.Any())
            {
                task.Children = task.Children.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt).ToList();
            }
            else
            {
                task.Children = null;
            }
        }

        return rootTasks.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt).ToList();
    }

    /// <summary>
    /// 添加任务依赖
    /// </summary>
    public async System.Threading.Tasks.Task<string> AddTaskDependencyAsync(
        string predecessorTaskId,
        string successorTaskId,
        int dependencyType,
        int lagDays)
    {
        // 检查任务是否存在
        var predecessor = await _taskFactory.GetByIdAsync(predecessorTaskId);
        var successor = await _taskFactory.GetByIdAsync(successorTaskId);

        if (predecessor == null)
            throw new KeyNotFoundException($"前置任务 {predecessorTaskId} 不存在");
        if (successor == null)
            throw new KeyNotFoundException($"后续任务 {successorTaskId} 不存在");

        // 检查循环依赖
        if (await HasCircularDependencyAsync(predecessorTaskId, successorTaskId))
            throw new InvalidOperationException("检测到循环依赖，无法添加");

        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDataFactory<TaskDependency>>();

        var dependency = new TaskDependency
        {
            PredecessorTaskId = predecessorTaskId,
            SuccessorTaskId = successorTaskId,
            DependencyType = (TaskDependencyType)dependencyType,
            LagDays = lagDays
        };

        await dependencyFactory.CreateAsync(dependency);
        return dependency.Id;
    }

    /// <summary>
    /// 检查是否存在循环依赖
    /// </summary>
    private async System.Threading.Tasks.Task<bool> HasCircularDependencyAsync(string startTaskId, string endTaskId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDataFactory<TaskDependency>>();

        var visited = new HashSet<string> { startTaskId };
        var queue = new Queue<string>();
        queue.Enqueue(startTaskId);

        while (queue.Count > 0)
        {
            var currentTaskId = queue.Dequeue();
            if (currentTaskId == endTaskId)
                return true;

            var dependencies = await dependencyFactory.FindAsync(d => d.PredecessorTaskId == currentTaskId);

            foreach (var dep in dependencies)
            {
                if (!visited.Contains(dep.SuccessorTaskId))
                {
                    visited.Add(dep.SuccessorTaskId);
                    queue.Enqueue(dep.SuccessorTaskId);
                }
            }
        }

        return false;
    }

    /// <summary>
    /// 移除任务依赖
    /// </summary>
    public async System.Threading.Tasks.Task<bool> RemoveTaskDependencyAsync(string dependencyId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDataFactory<TaskDependency>>();

        return await dependencyFactory.SoftDeleteAsync(dependencyId);
    }

    /// <summary>
    /// 获取任务依赖关系
    /// </summary>
    public async System.Threading.Tasks.Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDataFactory<TaskDependency>>();

        var dependencies = await dependencyFactory.FindAsync(d => d.PredecessorTaskId == taskId || d.SuccessorTaskId == taskId);

        var dependencyDtos = new List<TaskDependencyDto>();
        foreach (var dep in dependencies)
        {
            var predecessor = await _taskFactory.GetByIdAsync(dep.PredecessorTaskId);
            var successor = await _taskFactory.GetByIdAsync(dep.SuccessorTaskId);

            dependencyDtos.Add(new TaskDependencyDto
            {
                Id = dep.Id,
                PredecessorTaskId = dep.PredecessorTaskId,
                PredecessorTaskName = predecessor?.TaskName,
                SuccessorTaskId = dep.SuccessorTaskId,
                SuccessorTaskName = successor?.TaskName,
                DependencyType = (int)dep.DependencyType,
                DependencyTypeName = GetDependencyTypeName(dep.DependencyType),
                LagDays = dep.LagDays
            });
        }

        return dependencyDtos;
    }

    /// <summary>
    /// 计算关键路径
    /// </summary>
    public async System.Threading.Tasks.Task<List<string>> CalculateCriticalPathAsync(string projectId)
    {
        // 获取项目下的所有任务
        var tasks = await _taskFactory.FindAsync(t => t.ProjectId == projectId);

        if (tasks.Count == 0)
            return new List<string>();

        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDataFactory<TaskDependency>>();

        var dependencies = await dependencyFactory.FindAsync();

        // 构建任务图
        var taskGraph = tasks.ToDictionary(t => t.Id!, t => new List<string>());
        var inDegree = tasks.ToDictionary(t => t.Id!, t => 0);

        foreach (var dep in dependencies.Where(d =>
            tasks.Any(t => t.Id == d.PredecessorTaskId || t.Id == d.SuccessorTaskId)))
        {
            if (taskGraph.ContainsKey(dep.PredecessorTaskId) && taskGraph.ContainsKey(dep.SuccessorTaskId))
            {
                taskGraph[dep.PredecessorTaskId].Add(dep.SuccessorTaskId);
                inDegree[dep.SuccessorTaskId]++;
            }
        }

        // 拓扑排序计算最早开始时间
        var earliestStart = tasks.ToDictionary(t => t.Id!, t => 0);
        var queue = new Queue<string>();

        foreach (var task in tasks)
        {
            if (inDegree[task.Id!] == 0)
                queue.Enqueue(task.Id!);
        }

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (!taskGraph.ContainsKey(current))
                continue;

            foreach (var next in taskGraph[current])
            {
                if (!taskGraph.ContainsKey(next))
                    continue;

                var currentTask = tasks.FirstOrDefault(t => t.Id == current);
                var nextTask = tasks.FirstOrDefault(t => t.Id == next);

                if (currentTask == null || nextTask == null)
                    continue;

                var duration = currentTask.Duration ??
                    (currentTask.PlannedEndTime.HasValue && currentTask.PlannedStartTime.HasValue
                        ? (int)(currentTask.PlannedEndTime.Value - currentTask.PlannedStartTime.Value).TotalDays
                        : 1);

                earliestStart[next] = Math.Max(earliestStart[next], earliestStart[current] + duration);
                inDegree[next]--;

                if (inDegree[next] == 0)
                    queue.Enqueue(next);
            }
        }

        // 计算最晚开始时间
        var latestStart = tasks.ToDictionary(t => t.Id!, t => earliestStart.Values.Max());
        var reverseGraph = tasks.ToDictionary(t => t.Id!, t => new List<string>());

        foreach (var dep in dependencies.Where(d =>
            tasks.Any(t => t.Id == d.PredecessorTaskId || t.Id == d.SuccessorTaskId)))
        {
            if (reverseGraph.ContainsKey(dep.SuccessorTaskId) && reverseGraph.ContainsKey(dep.PredecessorTaskId))
            {
                reverseGraph[dep.SuccessorTaskId].Add(dep.PredecessorTaskId);
            }
        }

        var endTasks = tasks.Where(t => taskGraph.ContainsKey(t.Id!) && taskGraph[t.Id!].Count == 0).ToList();
        if (endTasks.Count > 0)
        {
            var maxEndTime = endTasks.Max(t =>
            {
                var taskDuration = t.Duration ??
                    (t.PlannedEndTime.HasValue && t.PlannedStartTime.HasValue
                        ? (int)(t.PlannedEndTime.Value - t.PlannedStartTime.Value).TotalDays
                        : 1);
                return earliestStart[t.Id!] + taskDuration;
            });
            foreach (var endTask in endTasks)
            {
                var endTaskDuration = endTask.Duration ??
                    (endTask.PlannedEndTime.HasValue && endTask.PlannedStartTime.HasValue
                        ? (int)(endTask.PlannedEndTime.Value - endTask.PlannedStartTime.Value).TotalDays
                        : 1);
                latestStart[endTask.Id!] = maxEndTime - endTaskDuration;
            }

            var visited = new HashSet<string>();
            queue = new Queue<string>(endTasks.Select(t => t.Id!));
            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                if (visited.Contains(current) || !reverseGraph.ContainsKey(current))
                    continue;
                visited.Add(current);

                foreach (var prev in reverseGraph[current])
                {
                    if (!taskGraph.ContainsKey(prev))
                        continue;

                    var prevTask = tasks.FirstOrDefault(t => t.Id == prev);
                    if (prevTask == null)
                        continue;

                    var duration = prevTask.Duration ??
                        (prevTask.PlannedEndTime.HasValue && prevTask.PlannedStartTime.HasValue
                            ? (int)(prevTask.PlannedEndTime.Value - prevTask.PlannedStartTime.Value).TotalDays
                            : 1);
                    latestStart[prev] = Math.Min(latestStart[prev], latestStart[current] - duration);

                    if (!visited.Contains(prev) && !queue.Contains(prev))
                        queue.Enqueue(prev);
                }
            }
        }

        // 关键路径：总浮动时间为0的任务
        var criticalPath = new List<string>();
        foreach (var task in tasks)
        {
            var totalFloat = latestStart[task.Id!] - earliestStart[task.Id!];
            if (totalFloat == 0)
            {
                criticalPath.Add(task.Id!);
            }
        }

        return criticalPath;
    }

    /// <summary>
    /// 更新任务进度（同时更新项目进度）
    /// </summary>
    public async System.Threading.Tasks.Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        var updatedTask = await _taskFactory.UpdateAsync(taskId, t =>
        {
            t.CompletionPercentage = Math.Max(0, Math.Min(100, progress));
        });

        if (updatedTask == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        // 如果任务属于项目，更新项目进度
        if (!string.IsNullOrEmpty(updatedTask.ProjectId))
        {
            var projectService = _serviceProvider.GetRequiredService<IProjectService>();
            await projectService.CalculateProjectProgressAsync(updatedTask.ProjectId);
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    private static string GetDependencyTypeName(TaskDependencyType type) => type switch
    {
        TaskDependencyType.FinishToStart => "完成到开始",
        TaskDependencyType.StartToStart => "开始到开始",
        TaskDependencyType.FinishToFinish => "完成到完成",
        TaskDependencyType.StartToFinish => "开始到完成",
        _ => "未知"
    };
}

