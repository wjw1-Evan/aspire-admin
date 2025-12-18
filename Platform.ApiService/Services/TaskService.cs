using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using TaskModel = Platform.ApiService.Models.WorkTask;
using TaskStatusEnum = Platform.ApiService.Models.TaskStatus;

namespace Platform.ApiService.Services;

/// <summary>
/// 任务管理服务实现
/// </summary>
public class TaskService : ITaskService
{
    private readonly IDatabaseOperationFactory<TaskModel> _taskFactory;
    private readonly IDatabaseOperationFactory<TaskExecutionLog> _executionLogFactory;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// 初始化 TaskService 实例
    /// </summary>
    /// <param name="taskFactory">任务数据工厂</param>
    /// <param name="executionLogFactory">任务执行日志数据工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="notificationService">统一通知服务，用于在任务创建、分配、状态变更时发送通知</param>
    /// <param name="serviceProvider">服务提供者，用于获取其他服务实例</param>
    public TaskService(
        IDatabaseOperationFactory<TaskModel> taskFactory,
        IDatabaseOperationFactory<TaskExecutionLog> executionLogFactory,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        IServiceProvider serviceProvider)
    {
        _taskFactory = taskFactory;
        _executionLogFactory = executionLogFactory;
        _userService = userService;
        _notificationService = notificationService;
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// 创建新任务
    /// </summary>
    /// <param name="request">创建任务请求</param>
    /// <param name="userId">创建者用户ID</param>
    /// <param name="companyId">公司ID</param>
    /// <returns>创建的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, string userId, string companyId)
    {
        var task = new TaskModel
        {
            TaskName = request.TaskName,
            Description = request.Description,
            TaskType = request.TaskType,
            Priority = (TaskPriority)request.Priority,
            CreatedBy = userId,
            AssignedTo = request.AssignedTo,
            PlannedStartTime = request.PlannedStartTime,
            PlannedEndTime = request.PlannedEndTime,
            EstimatedDuration = request.EstimatedDuration,
            CompanyId = companyId,
            ParticipantIds = request.ParticipantIds ?? new(),
            Tags = request.Tags ?? new(),
            Remarks = request.Remarks,
            Status = string.IsNullOrEmpty(request.AssignedTo) ? TaskStatusEnum.Pending : TaskStatusEnum.Assigned,
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
            Console.WriteLine($"创建任务后的通知发送失败: {ex.Message}");
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
    /// <param name="companyId">公司ID</param>
    /// <returns>任务列表响应</returns>
    public async System.Threading.Tasks.Task<TaskListResponse> QueryTasksAsync(TaskQueryRequest request, string companyId)
    {
        var filters = new List<FilterDefinition<TaskModel>>
        {
        };

        // 搜索关键词
        if (!string.IsNullOrEmpty(request.Search))
        {
            var pattern = $".*{System.Text.RegularExpressions.Regex.Escape(request.Search)}.*";
            var regex = new BsonRegularExpression(pattern, "i");
            var searchFilter = Builders<TaskModel>.Filter.Or(
                Builders<TaskModel>.Filter.Regex("taskName", regex),
                Builders<TaskModel>.Filter.Regex("description", regex)
            );
            filters.Add(searchFilter);
        }

        // 状态过滤
        if (request.Status.HasValue)
        {
            filters.Add(Builders<TaskModel>.Filter.Eq(t => t.Status, (TaskStatusEnum)request.Status.Value));
        }

        // 优先级过滤
        if (request.Priority.HasValue)
        {
            filters.Add(Builders<TaskModel>.Filter.Eq(t => t.Priority, (TaskPriority)request.Priority.Value));
        }

        // 分配给用户过滤
        if (!string.IsNullOrEmpty(request.AssignedTo))
        {
            filters.Add(Builders<TaskModel>.Filter.Eq(t => t.AssignedTo, request.AssignedTo));
        }

        // 创建者过滤
        if (!string.IsNullOrEmpty(request.CreatedBy))
        {
            filters.Add(Builders<TaskModel>.Filter.Eq(t => t.CreatedBy, request.CreatedBy));
        }

        // 任务类型过滤
        if (!string.IsNullOrEmpty(request.TaskType))
        {
            filters.Add(Builders<TaskModel>.Filter.Eq(t => t.TaskType, request.TaskType));
        }

        // 日期范围过滤
        if (request.StartDate.HasValue || request.EndDate.HasValue)
        {
            var dateFilters = new List<FilterDefinition<TaskModel>>();
            if (request.StartDate.HasValue)
            {
                dateFilters.Add(Builders<TaskModel>.Filter.Gte(t => t.CreatedAt, request.StartDate.Value));
            }
            if (request.EndDate.HasValue)
            {
                dateFilters.Add(Builders<TaskModel>.Filter.Lte(t => t.CreatedAt, request.EndDate.Value));
            }
            if (dateFilters.Count > 0)
            {
                filters.Add(Builders<TaskModel>.Filter.And(dateFilters));
            }
        }

        // 标签过滤
        if (request.Tags != null && request.Tags.Count > 0)
        {
            filters.Add(Builders<TaskModel>.Filter.AnyIn("tags", request.Tags));
        }

        var combinedFilter = filters.Count > 0
            ? Builders<TaskModel>.Filter.And(filters)
            : Builders<TaskModel>.Filter.Empty;

        // 排序
        SortDefinition<TaskModel> sortDefinition = request.SortOrder.ToLower() == "asc"
            ? Builders<TaskModel>.Sort.Ascending(request.SortBy)
            : Builders<TaskModel>.Sort.Descending(request.SortBy);

        // 分页查询（数据工厂会自动应用多租户与软删除过滤）
        var (tasks, total) = await _taskFactory.FindPagedAsync(
            combinedFilter,
            sortDefinition,
            request.Page,
            request.PageSize);

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks)
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
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
    /// <param name="userId">操作用户ID</param>
    /// <returns>更新后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> UpdateTaskAsync(UpdateTaskRequest request, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.UpdatedBy, userId);

        if (!string.IsNullOrEmpty(request.TaskName))
            updateDefinition = updateDefinition.Set(t => t.TaskName, request.TaskName);

        if (request.Description != null)
            updateDefinition = updateDefinition.Set(t => t.Description, request.Description);

        if (!string.IsNullOrEmpty(request.TaskType))
            updateDefinition = updateDefinition.Set(t => t.TaskType, request.TaskType);

        if (request.Priority.HasValue)
            updateDefinition = updateDefinition.Set(t => t.Priority, (TaskPriority)request.Priority.Value);

        if (request.Status.HasValue)
            updateDefinition = updateDefinition.Set(t => t.Status, (TaskStatusEnum)request.Status.Value);

        // 处理指派用户：null 表示不更新；空字符串表示清空指派
        if (request.AssignedTo != null)
        {
            if (string.IsNullOrWhiteSpace(request.AssignedTo))
            {
                updateDefinition = updateDefinition
                    .Set(t => t.AssignedTo, null)
                    .Set(t => t.AssignedAt, null);
                // 若任务处于已分配状态且未开始执行，清空指派后恢复为待分配
                if (task.Status == TaskStatusEnum.Assigned)
                    updateDefinition = updateDefinition.Set(t => t.Status, TaskStatusEnum.Pending);
            }
            else
            {
                updateDefinition = updateDefinition
                    .Set(t => t.AssignedTo, request.AssignedTo)
                    .Set(t => t.AssignedAt, DateTime.UtcNow);
                if (task.Status == TaskStatusEnum.Pending)
                    updateDefinition = updateDefinition.Set(t => t.Status, TaskStatusEnum.Assigned);
            }
        }

        if (request.PlannedStartTime.HasValue)
            updateDefinition = updateDefinition.Set(t => t.PlannedStartTime, request.PlannedStartTime);

        if (request.PlannedEndTime.HasValue)
            updateDefinition = updateDefinition.Set(t => t.PlannedEndTime, request.PlannedEndTime);

        if (request.CompletionPercentage.HasValue)
            updateDefinition = updateDefinition.Set(t => t.CompletionPercentage, request.CompletionPercentage);

        if (request.ParticipantIds != null)
            updateDefinition = updateDefinition.Set(t => t.ParticipantIds, request.ParticipantIds);

        if (request.Tags != null)
            updateDefinition = updateDefinition.Set(t => t.Tags, request.Tags);

        if (request.Remarks != null)
            updateDefinition = updateDefinition.Set(t => t.Remarks, request.Remarks);

        if (request.ProjectId != null)
            updateDefinition = updateDefinition.Set(t => t.ProjectId, request.ProjectId);

        if (request.ParentTaskId != null)
            updateDefinition = updateDefinition.Set(t => t.ParentTaskId, request.ParentTaskId);

        if (request.SortOrder.HasValue)
            updateDefinition = updateDefinition.Set(t => t.SortOrder, request.SortOrder.Value);

        if (request.Duration.HasValue)
            updateDefinition = updateDefinition.Set(t => t.Duration, request.Duration.Value);

        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
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
            Console.WriteLine($"任务分配通知发送失败: {ex.Message}");
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 分配任务给用户
    /// </summary>
    /// <param name="request">分配任务请求</param>
    /// <param name="userId">操作用户ID</param>
    /// <returns>分配后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> AssignTaskAsync(AssignTaskRequest request, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.AssignedTo, request.AssignedTo)
            .Set(t => t.AssignedAt, DateTime.UtcNow)
            .Set(t => t.Status, TaskStatusEnum.Assigned)
            .Set(t => t.UpdatedBy, userId);

        if (!string.IsNullOrEmpty(request.Remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, request.Remarks);

        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
            Console.WriteLine($"任务分配通知发送失败: {ex.Message}");
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 执行任务
    /// </summary>
    /// <param name="request">执行任务请求</param>
    /// <param name="userId">操作用户ID</param>
    /// <returns>执行后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> ExecuteTaskAsync(ExecuteTaskRequest request, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, (TaskStatusEnum)request.Status)
            .Set(t => t.UpdatedBy, userId);

        if (request.Status == (int)TaskStatusEnum.InProgress && task.ActualStartTime == null)
            updateDefinition = updateDefinition.Set(t => t.ActualStartTime, DateTime.UtcNow);

        if (request.CompletionPercentage.HasValue)
            updateDefinition = updateDefinition.Set(t => t.CompletionPercentage, request.CompletionPercentage.Value);

        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 记录执行日志
        await LogTaskExecutionAsync(
            request.TaskId,
            userId,
            TaskExecutionResult.Success,
            request.Message,
            request.CompletionPercentage ?? 0,
            task.CompanyId);

        // 发送状态变更通知（执行中等）
        try
        {
            var actionType = ((TaskStatusEnum)updatedTask.Status) switch
            {
                TaskStatusEnum.InProgress => "task_started",
                TaskStatusEnum.Completed => "task_completed",
                TaskStatusEnum.Cancelled => "task_cancelled",
                TaskStatusEnum.Failed => "task_failed",
                TaskStatusEnum.Paused => "task_paused",
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
            Console.WriteLine($"任务状态变更通知发送失败: {ex.Message}");
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 完成任务
    /// </summary>
    /// <param name="request">完成任务请求</param>
    /// <param name="userId">操作用户ID</param>
    /// <returns>完成后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CompleteTaskAsync(CompleteTaskRequest request, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(request.TaskId);
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var now = DateTime.UtcNow;
        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, TaskStatusEnum.Completed)
            .Set(t => t.ExecutionResult, (TaskExecutionResult)request.ExecutionResult)
            .Set(t => t.ActualEndTime, now)
            .Set(t => t.CompletionPercentage, 100)
            .Set(t => t.UpdatedBy, userId);

        if (task.ActualStartTime.HasValue)
        {
            var duration = (int)(now - task.ActualStartTime.Value).TotalMinutes;
            updateDefinition = updateDefinition.Set(t => t.ActualDuration, duration);
        }

        if (!string.IsNullOrEmpty(request.Remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, request.Remarks);

        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

        if (updatedTask == null)
        {
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");
        }

        // 记录执行日志
        await LogTaskExecutionAsync(
            request.TaskId,
            userId,
            (TaskExecutionResult)request.ExecutionResult,
            request.Remarks,
            100,
            task.CompanyId);

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
            Console.WriteLine($"任务完成通知发送失败: {ex.Message}");
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 取消任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">操作用户ID</param>
    /// <param name="remarks">取消备注</param>
    /// <returns>取消后的任务信息</returns>
    public async System.Threading.Tasks.Task<TaskDto> CancelTaskAsync(string taskId, string userId, string? remarks = null)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, TaskStatusEnum.Cancelled)
            .Set(t => t.UpdatedBy, userId);

        if (!string.IsNullOrEmpty(remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, remarks);

        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, taskId);
        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
            Console.WriteLine($"任务取消通知发送失败: {ex.Message}");
        }

        return await ConvertToTaskDtoAsync(updatedTask);
    }

    /// <summary>
    /// 删除任务
    /// </summary>
    /// <param name="taskId">任务ID</param>
    /// <param name="userId">操作用户ID</param>
    /// <returns>删除是否成功</returns>
    public async System.Threading.Tasks.Task<bool> DeleteTaskAsync(string taskId, string userId)
    {
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, taskId);
        var result = await _taskFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="companyId">公司ID</param>
    /// <param name="userId">用户ID（可选，为空时统计全公司）</param>
    /// <returns>任务统计信息</returns>
    public async System.Threading.Tasks.Task<TaskStatistics> GetTaskStatisticsAsync(string companyId, string? userId = null)
    {
        var filters = new List<FilterDefinition<TaskModel>>();

        if (!string.IsNullOrEmpty(userId))
        {
            filters.Add(Builders<TaskModel>.Filter.Or(
                Builders<TaskModel>.Filter.Eq(t => t.AssignedTo, userId),
                Builders<TaskModel>.Filter.Eq(t => t.CreatedBy, userId)
            ));
        }

        var combinedFilter = filters.Count > 0
            ? Builders<TaskModel>.Filter.And(filters)
            : Builders<TaskModel>.Filter.Empty;
        var tasks = await _taskFactory.FindAsync(combinedFilter);

        var statistics = new TaskStatistics
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(t => t.Status == TaskStatusEnum.Pending),
            InProgressTasks = tasks.Count(t => t.Status == TaskStatusEnum.InProgress),
            CompletedTasks = tasks.Count(t => t.Status == TaskStatusEnum.Completed),
            FailedTasks = tasks.Count(t => t.Status == TaskStatusEnum.Failed),
        };

        // 计算平均完成时间
        var completedTasks = tasks.Where(t => t.Status == TaskStatusEnum.Completed && t.ActualDuration.HasValue).ToList();
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
            { "Assigned", tasks.Count(t => t.Status == TaskStatusEnum.Assigned) },
            { "InProgress", statistics.InProgressTasks },
            { "Completed", statistics.CompletedTasks },
            { "Cancelled", tasks.Count(t => t.Status == TaskStatusEnum.Cancelled) },
            { "Failed", statistics.FailedTasks },
            { "Paused", tasks.Count(t => t.Status == TaskStatusEnum.Paused) }
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
        var filter = Builders<TaskExecutionLog>.Filter.Eq(l => l.TaskId, taskId);
        var sort = Builders<TaskExecutionLog>.Sort.Descending(l => l.CreatedAt);
        var (logs, total) = await _executionLogFactory.FindPagedAsync(filter, sort, page, pageSize);

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
    /// <param name="userId">执行用户ID</param>
    /// <param name="status">执行结果状态</param>
    /// <param name="message">执行消息</param>
    /// <param name="progressPercentage">进度百分比</param>
    /// <param name="companyId">公司ID</param>
    /// <returns>执行日志信息</returns>
    public async System.Threading.Tasks.Task<TaskExecutionLogDto> LogTaskExecutionAsync(
        string taskId,
        string userId,
        TaskExecutionResult status,
        string? message = null,
        int progressPercentage = 0,
        string? companyId = null)
    {
        if (string.IsNullOrEmpty(companyId))
        {
            companyId = await _executionLogFactory.GetRequiredCompanyIdAsync();
        }

        var log = new TaskExecutionLog
        {
            TaskId = taskId,
            ExecutedBy = userId,
            StartTime = DateTime.UtcNow,
            Status = status,
            Message = message,
            ProgressPercentage = progressPercentage,
            CompanyId = companyId,
            CreatedAt = DateTime.UtcNow
        };

        await _executionLogFactory.CreateAsync(log);
        return await ConvertToTaskExecutionLogDtoAsync(log);
    }

    /// <summary>
    /// 获取用户待办任务列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">公司ID</param>
    /// <returns>待办任务列表</returns>
    public async System.Threading.Tasks.Task<List<TaskDto>> GetUserTodoTasksAsync(string userId, string companyId)
    {
        var filter = Builders<TaskModel>.Filter.And(
            Builders<TaskModel>.Filter.Eq(t => t.AssignedTo, userId),
            Builders<TaskModel>.Filter.In(t => t.Status, new[] { TaskStatusEnum.Assigned, TaskStatusEnum.InProgress })
        );

        var sort = Builders<TaskModel>.Sort
            .Descending(t => t.Priority)
            .Descending(t => t.CreatedAt);

        var tasks = await _taskFactory.FindAsync(filter, sort);

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks)
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

        return taskDtos;
    }

    /// <summary>
    /// 获取用户创建的任务列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="companyId">公司ID</param>
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>创建的任务列表和总数</returns>
    public async System.Threading.Tasks.Task<(List<TaskDto> tasks, int total)> GetUserCreatedTasksAsync(string userId, string companyId, int page = 1, int pageSize = 10)
    {
        var filter = Builders<TaskModel>.Filter.Eq(t => t.CreatedBy, userId);

        var sort = Builders<TaskModel>.Sort.Descending(t => t.CreatedAt);

        var (tasks, total) = await _taskFactory.FindPagedAsync(filter, sort, page, pageSize);

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks)
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

        return (taskDtos, (int)total);
    }

    /// <summary>
    /// 批量更新任务状态
    /// </summary>
    /// <param name="taskIds">任务ID列表</param>
    /// <param name="status">新状态</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新的任务数量</returns>
    public async System.Threading.Tasks.Task<int> BatchUpdateTaskStatusAsync(List<string> taskIds, Models.TaskStatus status, string userId)
    {
        var filter = Builders<TaskModel>.Filter.In(t => t.Id, taskIds);
        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, status)
            .Set(t => t.UpdatedBy, userId);

        var modifiedCount = await _taskFactory.UpdateManyAsync(filter, updateDefinition);
        return (int)modifiedCount;
    }

    private async System.Threading.Tasks.Task<TaskDto> ConvertToTaskDtoAsync(TaskModel task)
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
            CreatedBy = task.CreatedBy,
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
                    dto.CreatedByName = createdByUser.Username;
                }
            }

            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                var assignedToUser = await _userService.GetUserByIdAsync(task.AssignedTo);
                if (assignedToUser != null)
                {
                    dto.AssignedToName = assignedToUser.Username;
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
            Console.WriteLine($"获取用户信息失败: {ex.Message}");
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
                    dto.ExecutedByName = user.Username;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"获取用户信息失败: {ex.Message}");
        }

        return dto;
    }

    private static string GetStatusName(TaskStatusEnum status) => status switch
    {
        TaskStatusEnum.Pending => "待分配",
        TaskStatusEnum.Assigned => "已分配",
        TaskStatusEnum.InProgress => "执行中",
        TaskStatusEnum.Completed => "已完成",
        TaskStatusEnum.Cancelled => "已取消",
        TaskStatusEnum.Failed => "失败",
        TaskStatusEnum.Paused => "暂停",
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
        var tasks = await _taskFactory.FindAsync(
            _taskFactory.CreateFilterBuilder()
                .Equal(t => t.ProjectId, projectId)
                .Build());

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt))
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

        return BuildTaskTree(taskDtos);
    }

    /// <summary>
    /// 获取任务树（支持按项目过滤）
    /// </summary>
    public async System.Threading.Tasks.Task<List<TaskDto>> GetTaskTreeAsync(string? projectId = null)
    {
        var filterBuilder = _taskFactory.CreateFilterBuilder();
        if (!string.IsNullOrEmpty(projectId))
        {
            filterBuilder.Equal(t => t.ProjectId, projectId);
        }

        var tasks = await _taskFactory.FindAsync(filterBuilder.Build());
        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks.OrderBy(t => t.SortOrder).ThenBy(t => t.CreatedAt))
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

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
                taskMap[task.ParentTaskId].Children.Add(task);
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
            task.Children = task.Children.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt).ToList();
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
        int lagDays, 
        string userId, 
        string companyId)
    {
        // 检查任务是否存在
        var predecessor = await _taskFactory.GetByIdAsync(predecessorTaskId);
        var successor = await _taskFactory.GetByIdAsync(successorTaskId);

        if (predecessor == null)
            throw new KeyNotFoundException($"前置任务 {predecessorTaskId} 不存在");
        if (successor == null)
            throw new KeyNotFoundException($"后续任务 {successorTaskId} 不存在");

        // 检查循环依赖
        if (await HasCircularDependencyAsync(predecessorTaskId, successorTaskId, companyId))
            throw new InvalidOperationException("检测到循环依赖，无法添加");

        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDatabaseOperationFactory<TaskDependency>>();

        var dependency = new TaskDependency
        {
            PredecessorTaskId = predecessorTaskId,
            SuccessorTaskId = successorTaskId,
            DependencyType = (TaskDependencyType)dependencyType,
            LagDays = lagDays,
            CompanyId = companyId
        };

        await dependencyFactory.CreateAsync(dependency);
        return dependency.Id;
    }

    /// <summary>
    /// 检查是否存在循环依赖
    /// </summary>
    private async System.Threading.Tasks.Task<bool> HasCircularDependencyAsync(string startTaskId, string endTaskId, string companyId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDatabaseOperationFactory<TaskDependency>>();

        var visited = new HashSet<string> { startTaskId };
        var queue = new Queue<string>();
        queue.Enqueue(startTaskId);

        while (queue.Count > 0)
        {
            var currentTaskId = queue.Dequeue();
            if (currentTaskId == endTaskId)
                return true;

            var dependencies = await dependencyFactory.FindAsync(
                dependencyFactory.CreateFilterBuilder()
                    .Equal(d => d.PredecessorTaskId, currentTaskId)
                    .Build());

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
    public async System.Threading.Tasks.Task<bool> RemoveTaskDependencyAsync(string dependencyId, string userId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDatabaseOperationFactory<TaskDependency>>();

        var dependency = await dependencyFactory.FindOneAndSoftDeleteAsync(
            dependencyFactory.CreateFilterBuilder().Equal(d => d.Id, dependencyId).Build());

        return dependency != null;
    }

    /// <summary>
    /// 获取任务依赖关系
    /// </summary>
    public async System.Threading.Tasks.Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId)
    {
        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDatabaseOperationFactory<TaskDependency>>();

        var orFilter = Builders<TaskDependency>.Filter.Or(
            Builders<TaskDependency>.Filter.Eq(d => d.PredecessorTaskId, taskId),
            Builders<TaskDependency>.Filter.Eq(d => d.SuccessorTaskId, taskId)
        );
        
        var filter = dependencyFactory.CreateFilterBuilder()
            .Custom(orFilter)
            .Build();
            
        var dependencies = await dependencyFactory.FindAsync(filter);

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
        var tasks = await _taskFactory.FindAsync(
            _taskFactory.CreateFilterBuilder()
                .Equal(t => t.ProjectId, projectId)
                .Build());

        if (tasks.Count == 0)
            return new List<string>();

        var dependencyFactory = _serviceProvider
            .GetRequiredService<IDatabaseOperationFactory<TaskDependency>>();

        var dependencies = await dependencyFactory.FindAsync(
            dependencyFactory.CreateFilterBuilder().Build());

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
    public async System.Threading.Tasks.Task<TaskDto> UpdateTaskProgressAsync(string taskId, int progress, string userId)
    {
        var task = await _taskFactory.GetByIdAsync(taskId);
        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        var updateBuilder = _taskFactory.CreateUpdateBuilder()
            .Set(t => t.CompletionPercentage, Math.Max(0, Math.Min(100, progress)));

        var filter = _taskFactory.CreateFilterBuilder()
            .Equal(t => t.Id, taskId)
            .Build();

        var updatedTask = await _taskFactory.FindOneAndUpdateAsync(
            filter,
            updateBuilder.Build(),
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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

