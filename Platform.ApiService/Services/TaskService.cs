using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using TaskModel = Platform.ApiService.Models.WorkTask;
using TaskStatusEnum = Platform.ApiService.Models.TaskStatus;

namespace Platform.ApiService.Services;

/// <summary>
/// 任务管理服务实现
/// </summary>
public class TaskService : ITaskService
{
    private readonly IMongoCollection<TaskModel> _taskCollection;
    private readonly IMongoCollection<TaskExecutionLog> _executionLogCollection;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;

    /// <summary>
    /// 初始化 TaskService 实例
    /// </summary>
    /// <param name="mongoClient">MongoDB 客户端</param>
    /// <param name="userService">用户服务</param>
    /// <param name="notificationService">统一通知服务，用于在任务创建、分配、状态变更时发送通知</param>
    public TaskService(
        IMongoClient mongoClient,
        IUserService userService,
        IUnifiedNotificationService notificationService)
    {
        var database = mongoClient.GetDatabase("aspire_platform");
        _taskCollection = database.GetCollection<TaskModel>("tasks");
        _executionLogCollection = database.GetCollection<TaskExecutionLog>("task_execution_logs");
        _userService = userService;
        _notificationService = notificationService;

        // 创建索引
        CreateIndexes();
    }

    private void CreateIndexes()
    {
        try
        {
            // 创建复合索引
            var indexKeysDefinition = Builders<TaskModel>.IndexKeys
                .Ascending(t => t.CompanyId)
                .Ascending(t => t.Status)
                .Descending(t => t.CreatedAt);
            
            _taskCollection.Indexes.CreateOne(
                new CreateIndexModel<TaskModel>(indexKeysDefinition));

            // 创建分配用户索引
            _taskCollection.Indexes.CreateOne(
                new CreateIndexModel<TaskModel>(
                    Builders<TaskModel>.IndexKeys.Ascending(t => t.AssignedTo)));

            // 创建创建者索引
            _taskCollection.Indexes.CreateOne(
                new CreateIndexModel<TaskModel>(
                    Builders<TaskModel>.IndexKeys.Ascending(t => t.CreatedBy)));

            // 执行日志索引
            _executionLogCollection.Indexes.CreateOne(
                new CreateIndexModel<TaskExecutionLog>(
                    Builders<TaskExecutionLog>.IndexKeys.Ascending(l => l.TaskId)));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"创建索引失败: {ex.Message}");
        }
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
            CreatedAt = DateTime.UtcNow,
            AssignedTo = request.AssignedTo,
            PlannedStartTime = request.PlannedStartTime,
            PlannedEndTime = request.PlannedEndTime,
            EstimatedDuration = request.EstimatedDuration,
            CompanyId = companyId,
            ParticipantIds = request.ParticipantIds ?? new(),
            Tags = request.Tags ?? new(),
            Remarks = request.Remarks,
            Status = string.IsNullOrEmpty(request.AssignedTo) ? TaskStatusEnum.Pending : TaskStatusEnum.Assigned,
            UpdatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrEmpty(request.AssignedTo))
        {
            task.AssignedAt = DateTime.UtcNow;
        }

        await _taskCollection.InsertOneAsync(task);

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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, taskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
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
            Builders<TaskModel>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TaskModel>.Filter.Eq(t => t.IsDeleted, false)
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

        var combinedFilter = Builders<TaskModel>.Filter.And(filters);

        // 获取总数
        var total = (int)await _taskCollection.CountDocumentsAsync(combinedFilter);

        // 排序
        SortDefinition<TaskModel> sortDefinition = request.SortOrder.ToLower() == "asc"
            ? Builders<TaskModel>.Sort.Ascending(request.SortBy)
            : Builders<TaskModel>.Sort.Descending(request.SortBy);

        // 分页查询
        var tasks = await _taskCollection
            .Find(combinedFilter)
            .Sort(sortDefinition)
            .Skip((request.Page - 1) * request.PageSize)
            .Limit(request.PageSize)
            .ToListAsync();

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks)
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

        return new TaskListResponse
        {
            Tasks = taskDtos,
            Total = total,
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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
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

        var updatedTask = await _taskCollection.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.AssignedTo, request.AssignedTo)
            .Set(t => t.AssignedAt, DateTime.UtcNow)
            .Set(t => t.Status, TaskStatusEnum.Assigned)
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedBy, userId);

        if (!string.IsNullOrEmpty(request.Remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, request.Remarks);

        var updatedTask = await _taskCollection.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, (TaskStatusEnum)request.Status)
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedBy, userId);

        if (request.Status == (int)TaskStatusEnum.InProgress && task.ActualStartTime == null)
            updateDefinition = updateDefinition.Set(t => t.ActualStartTime, DateTime.UtcNow);

        if (request.CompletionPercentage.HasValue)
            updateDefinition = updateDefinition.Set(t => t.CompletionPercentage, request.CompletionPercentage.Value);

        var updatedTask = await _taskCollection.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, request.TaskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {request.TaskId} 不存在");

        var now = DateTime.UtcNow;
        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, TaskStatusEnum.Completed)
            .Set(t => t.ExecutionResult, (TaskExecutionResult)request.ExecutionResult)
            .Set(t => t.ActualEndTime, now)
            .Set(t => t.CompletionPercentage, 100)
            .Set(t => t.UpdatedAt, now)
            .Set(t => t.UpdatedBy, userId);

        if (task.ActualStartTime.HasValue)
        {
            var duration = (int)(now - task.ActualStartTime.Value).TotalMinutes;
            updateDefinition = updateDefinition.Set(t => t.ActualDuration, duration);
        }

        if (!string.IsNullOrEmpty(request.Remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, request.Remarks);

        var updatedTask = await _taskCollection.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
        var filter = Builders<TaskModel>.Filter.Eq(t => t.Id, taskId);
        var task = await _taskCollection.Find(filter).FirstOrDefaultAsync();
        
        if (task == null)
            throw new KeyNotFoundException($"任务 {taskId} 不存在");

        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.Status, TaskStatusEnum.Cancelled)
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedBy, userId);

        if (!string.IsNullOrEmpty(remarks))
            updateDefinition = updateDefinition.Set(t => t.Remarks, remarks);

        var updatedTask = await _taskCollection.FindOneAndUpdateAsync(
            filter,
            updateDefinition,
            new FindOneAndUpdateOptions<TaskModel> { ReturnDocument = ReturnDocument.After });

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
        var updateDefinition = Builders<TaskModel>.Update
            .Set(t => t.IsDeleted, true)
            .Set(t => t.DeletedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedBy, userId);

        var result = await _taskCollection.UpdateOneAsync(filter, updateDefinition);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    /// <param name="companyId">公司ID</param>
    /// <param name="userId">用户ID（可选，为空时统计全公司）</param>
    /// <returns>任务统计信息</returns>
    public async System.Threading.Tasks.Task<TaskStatistics> GetTaskStatisticsAsync(string companyId, string? userId = null)
    {
        var filters = new List<FilterDefinition<TaskModel>>
        {
            Builders<TaskModel>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TaskModel>.Filter.Eq(t => t.IsDeleted, false)
        };

        if (!string.IsNullOrEmpty(userId))
        {
            filters.Add(Builders<TaskModel>.Filter.Or(
                Builders<TaskModel>.Filter.Eq(t => t.AssignedTo, userId),
                Builders<TaskModel>.Filter.Eq(t => t.CreatedBy, userId)
            ));
        }

        var combinedFilter = Builders<TaskModel>.Filter.And(filters);
        var tasks = await _taskCollection.Find(combinedFilter).ToListAsync();

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
        var total = (int)await _executionLogCollection.CountDocumentsAsync(filter);

        var logs = await _executionLogCollection
            .Find(filter)
            .Sort(Builders<TaskExecutionLog>.Sort.Descending(l => l.CreatedAt))
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        var logDtos = new List<TaskExecutionLogDto>();
        foreach (var log in logs)
        {
            logDtos.Add(await ConvertToTaskExecutionLogDtoAsync(log));
        }

        return (logDtos, total);
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

        await _executionLogCollection.InsertOneAsync(log);
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
            Builders<TaskModel>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TaskModel>.Filter.Eq(t => t.AssignedTo, userId),
            Builders<TaskModel>.Filter.In(t => t.Status, new[] { TaskStatusEnum.Assigned, TaskStatusEnum.InProgress }),
            Builders<TaskModel>.Filter.Eq(t => t.IsDeleted, false)
        );

        var tasks = await _taskCollection
            .Find(filter)
            .Sort(Builders<TaskModel>.Sort.Descending(t => t.Priority).Descending(t => t.CreatedAt))
            .ToListAsync();

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
        var filter = Builders<TaskModel>.Filter.And(
            Builders<TaskModel>.Filter.Eq(t => t.CompanyId, companyId),
            Builders<TaskModel>.Filter.Eq(t => t.CreatedBy, userId),
            Builders<TaskModel>.Filter.Eq(t => t.IsDeleted, false)
        );

        var total = (int)await _taskCollection.CountDocumentsAsync(filter);

        var tasks = await _taskCollection
            .Find(filter)
            .Sort(Builders<TaskModel>.Sort.Descending(t => t.CreatedAt))
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        var taskDtos = new List<TaskDto>();
        foreach (var task in tasks)
        {
            taskDtos.Add(await ConvertToTaskDtoAsync(task));
        }

        return (taskDtos, total);
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
            .Set(t => t.UpdatedAt, DateTime.UtcNow)
            .Set(t => t.UpdatedBy, userId);

        var result = await _taskCollection.UpdateManyAsync(filter, updateDefinition);
        return (int)result.ModifiedCount;
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
            UpdatedBy = task.UpdatedBy
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
}

