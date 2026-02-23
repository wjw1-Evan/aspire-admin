using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 任务与项目管理 MCP 工具处理器
/// </summary>
public class TaskMcpToolHandler : McpToolHandlerBase
{
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly ITaskService _taskService;
    private readonly IProjectService _projectService;
    private readonly ILogger<TaskMcpToolHandler> _logger;

    /// <summary>
    /// 初始化任务与项目管理 MCP 处理器
    /// </summary>
    /// <param name="userFactory">用户数据工厂</param>
    /// <param name="taskService">任务服务</param>
    /// <param name="projectService">项目服务</param>
    /// <param name="logger">日志处理器</param>
    public TaskMcpToolHandler(
        IDataFactory<AppUser> userFactory,
        ITaskService taskService,
        IProjectService projectService,
        ILogger<TaskMcpToolHandler> logger)
    {
        _userFactory = userFactory;
        _taskService = taskService;
        _projectService = projectService;
        _logger = logger;

        #region 任务工具注册

        RegisterTool("get_tasks", "获取任务列表。支持按状态、优先级、负责人和项目筛选。",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                    ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "任务状态" },
                    ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级" },
                    ["assignedTo"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责人ID" },
                    ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" }
                },
                PaginationSchema()
            )),
            HandleGetTasksAsync);

        RegisterTool("get_task_detail", "获取任务详情。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" }
            }, ["taskId"]),
            HandleGetTaskDetailAsync);

        RegisterTool("create_task", "创建新任务。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务名称" },
                ["taskType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务类型" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "描述" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级(0-3)" },
                ["assignedTo"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责人ID" },
                ["estimatedDuration"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "预估工时(分)" },
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" },
                ["plannedStartTime"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "计划开始时间" },
                ["plannedEndTime"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "计划结束时间" },
                ["tags"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "标签" },
                ["participantIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "参与人ID" },
                ["remarks"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "备注" }
            }, ["taskName", "taskType"]),
            HandleCreateTaskAsync);

        RegisterTool("update_task", "更新任务信息。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" },
                ["taskName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "描述" },
                ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "状态" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级" },
                ["completionPercentage"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "完成百分比" }
            }, ["taskId"]),
            HandleUpdateTaskAsync);

        RegisterTool("assign_task", "分配任务给指定用户。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" },
                ["assignedTo"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责人ID" },
                ["remarks"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "备注" }
            }, ["taskId", "assignedTo"]),
            HandleAssignTaskAsync);

        RegisterTool("complete_task", "完成任务。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" },
                ["executionResult"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "执行结果" },
                ["remarks"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "备注" }
            }, ["taskId"]),
            HandleCompleteTaskAsync);

        RegisterTool("get_task_statistics", "获取任务统计信息。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["userId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID（可选）" }
            }),
            HandleGetTaskStatisticsAsync);

        RegisterTool("get_my_task_count", "获取当前用户的任务数量统计。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["includeCompleted"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否包含已完成任务" }
            }),
            HandleGetMyTaskCountAsync);

        RegisterTool("get_my_tasks", "获取分配给当前用户的任务列表。",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "任务状态" },
                    ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" },
                    ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            HandleGetMyTasksAsync);

        #endregion

        #region 项目工具注册

        RegisterTool("get_projects", "获取项目列表。",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                    ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "项目状态" }
                },
                PaginationSchema()
            )),
            HandleGetProjectsAsync);

        RegisterTool("get_project_detail", "获取项目详情（含成员）。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" }
            }, ["projectId"]),
            HandleGetProjectDetailAsync);

        RegisterTool("create_project", "创建新项目。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目描述" },
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期" }
            }, ["name"]),
            HandleCreateProjectAsync);

        RegisterTool("get_project_statistics", "获取项目统计信息。",
            HandleGetProjectStatisticsAsync);

        #endregion
    }

    private async Task<object?> HandleGetTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new TaskQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : null,
            AssignedTo = arguments.ContainsKey("assignedTo") ? arguments["assignedTo"]?.ToString() : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null
        };

        var response = await _taskService.QueryTasksAsync(request, currentUser.CurrentCompanyId);
        return new
        {
            tasks = response.Tasks.Select(t => new
            {
                t.Id,
                t.TaskName,
                t.Description,
                t.Status,
                t.StatusName,
                t.Priority,
                t.PriorityName,
                t.AssignedTo,
                t.AssignedToName,
                t.CompletionPercentage,
                t.CreatedAt,
                t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    private async Task<object?> HandleGetTaskDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
            return new { error = "缺少必需的参数: taskId" };

        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task == null) return new { error = "任务未找到" };

        return new
        {
            task.Id,
            task.TaskName,
            task.Description,
            task.TaskType,
            task.Status,
            task.StatusName,
            task.Priority,
            task.PriorityName,
            task.CreatedBy,
            task.CreatedByName,
            task.AssignedTo,
            task.AssignedToName,
            task.AssignedAt,
            task.PlannedStartTime,
            task.PlannedEndTime,
            task.ActualStartTime,
            task.ActualEndTime,
            task.EstimatedDuration,
            task.ActualDuration,
            task.CompletionPercentage,
            task.ExecutionResult,
            task.ExecutionResultName,
            task.Remarks,
            task.Tags,
            task.Participants,
            task.Attachments,
            task.CreatedAt,
            task.UpdatedAt
        };
    }

    private async Task<object?> HandleCreateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskName") || arguments["taskName"] is not string taskName)
            return new { error = "缺少必需的参数: taskName" };
        if (!arguments.ContainsKey("taskType") || arguments["taskType"] is not string taskType)
            return new { error = "缺少必需的参数: taskType" };

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var request = new CreateTaskRequest
        {
            TaskName = taskName,
            TaskType = taskType,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : (int)TaskPriority.Medium,
            AssignedTo = arguments.ContainsKey("assignedTo") ? arguments["assignedTo"]?.ToString() : null,
            EstimatedDuration = arguments.ContainsKey("estimatedDuration") && int.TryParse(arguments["estimatedDuration"]?.ToString(), out var duration) ? duration : null,
            Tags = arguments.ContainsKey("tags") && arguments["tags"] is List<object> tags ? tags.Cast<string>().ToList() : new List<string>(),
            PlannedStartTime = arguments.ContainsKey("plannedStartTime") && DateTime.TryParse(arguments["plannedStartTime"]?.ToString(), out var pst) ? pst : null,
            PlannedEndTime = arguments.ContainsKey("plannedEndTime") && DateTime.TryParse(arguments["plannedEndTime"]?.ToString(), out var pet) ? pet : null,
            ParticipantIds = arguments.ContainsKey("participantIds") && arguments["participantIds"] is List<object> participants ? participants.Cast<string>().ToList() : new List<string>(),
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null
        };

        var task = await _taskService.CreateTaskAsync(request, currentUserId, currentUser.CurrentCompanyId);
        return new { task.Id, task.TaskName, task.Status, task.StatusName, task.Priority, task.PriorityName, task.CreatedAt, message = "任务创建成功" };
    }

    private async Task<object?> HandleUpdateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
            return new { error = "缺少必需的参数: taskId" };

        var request = new UpdateTaskRequest
        {
            TaskId = taskId,
            TaskName = arguments.ContainsKey("taskName") ? arguments["taskName"]?.ToString() : null,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : null,
            CompletionPercentage = arguments.ContainsKey("completionPercentage") && int.TryParse(arguments["completionPercentage"]?.ToString(), out var completion) ? completion : null
        };

        var task = await _taskService.UpdateTaskAsync(request, currentUserId);
        return new { task.Id, task.TaskName, task.Status, task.StatusName, task.CompletionPercentage, task.UpdatedAt, message = "任务更新成功" };
    }

    private async Task<object?> HandleAssignTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
            return new { error = "缺少必需的参数: taskId" };
        if (!arguments.ContainsKey("assignedTo") || arguments["assignedTo"] is not string assignedTo)
            return new { error = "缺少必需的参数: assignedTo" };

        var request = new AssignTaskRequest
        {
            TaskId = taskId,
            AssignedTo = assignedTo,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.AssignTaskAsync(request, currentUserId);
        return new { task.Id, task.TaskName, task.AssignedTo, task.AssignedToName, task.AssignedAt, task.Status, task.StatusName, message = "任务分配成功" };
    }

    private async Task<object?> HandleCompleteTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
            return new { error = "缺少必需的参数: taskId" };

        var executionResult = (int)TaskExecutionResult.Success;
        if (arguments.ContainsKey("executionResult") && int.TryParse(arguments["executionResult"]?.ToString(), out var result))
            executionResult = result;

        var request = new CompleteTaskRequest
        {
            TaskId = taskId,
            ExecutionResult = executionResult,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.CompleteTaskAsync(request, currentUserId);
        return new { task.Id, task.TaskName, task.Status, task.StatusName, task.ExecutionResult, task.ExecutionResultName, task.CompletionPercentage, task.ActualEndTime, message = "任务完成成功" };
    }

    private async Task<object?> HandleGetTaskStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var userId = arguments.ContainsKey("userId") && !string.IsNullOrEmpty(arguments["userId"]?.ToString()) ? arguments["userId"]?.ToString() : null;
        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, userId);

        return new
        {
            statistics.TotalTasks,
            statistics.PendingTasks,
            statistics.InProgressTasks,
            statistics.CompletedTasks,
            statistics.FailedTasks,
            statistics.AverageCompletionTime,
            statistics.CompletionRate,
            statistics.TasksByPriority,
            statistics.TasksByStatus
        };
    }

    private async Task<object?> HandleGetMyTaskCountAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var includeCompleted = arguments.ContainsKey("includeCompleted") && bool.TryParse(arguments["includeCompleted"]?.ToString(), out var ic) && ic;
        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, currentUserId);

        var totalCount = statistics.TotalTasks;
        if (!includeCompleted)
        {
            totalCount = statistics.PendingTasks + statistics.InProgressTasks;
            if (statistics.TasksByStatus.ContainsKey("Assigned"))
                totalCount += statistics.TasksByStatus["Assigned"];
        }

        return new
        {
            totalCount,
            pendingCount = statistics.PendingTasks,
            assignedCount = statistics.TasksByStatus.ContainsKey("Assigned") ? statistics.TasksByStatus["Assigned"] : 0,
            inProgressCount = statistics.InProgressTasks,
            completedCount = statistics.CompletedTasks,
            failedCount = statistics.FailedTasks,
            cancelledCount = statistics.TasksByStatus.ContainsKey("Cancelled") ? statistics.TasksByStatus["Cancelled"] : 0,
            pausedCount = statistics.TasksByStatus.ContainsKey("Paused") ? statistics.TasksByStatus["Paused"] : 0,
            message = $"你有 {totalCount} 个待处理任务"
        };
    }

    private async Task<object?> HandleGetMyTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new TaskQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            AssignedTo = currentUserId,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null
        };

        var response = await _taskService.QueryTasksAsync(request, currentUser.CurrentCompanyId);
        return new
        {
            tasks = response.Tasks.Select(t => new
            {
                t.Id,
                t.TaskName,
                t.Description,
                t.Status,
                t.StatusName,
                t.Priority,
                t.PriorityName,
                t.CompletionPercentage,
                t.CreatedBy,
                t.CreatedByName,
                t.CreatedAt,
                t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    private async Task<object?> HandleGetProjectsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new ProjectQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null
        };

        var response = await _projectService.GetProjectsListAsync(request, currentUser.CurrentCompanyId);
        return new
        {
            projects = response.Projects.Select(p => new { p.Id, p.Name, p.Description, p.StartDate, p.EndDate, p.Status, p.StatusName, memberCount = response.Total, p.Progress }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object?> HandleGetProjectDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var projectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null;
        if (string.IsNullOrEmpty(projectId)) return new { error = "未提供项目ID" };

        var project = await _projectService.GetProjectByIdAsync(projectId);
        if (project == null) return new { error = "项目不存在" };

        var members = await _projectService.GetProjectMembersAsync(projectId);
        return new
        {
            project = new { project.Id, project.Name, project.Description, project.StartDate, project.EndDate, project.Status, project.Progress },
            members = members.Select(m => new { m.UserId, username = m.UserName, m.Role }).ToList()
        };
    }

    private async Task<object?> HandleCreateProjectAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        if (string.IsNullOrEmpty(name)) return new { error = "项目名称必填" };

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var request = new CreateProjectRequest
        {
            Name = name,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            StartDate = arguments.ContainsKey("startDate") && DateTime.TryParse(arguments["startDate"]?.ToString(), out var start) ? start : null,
            EndDate = arguments.ContainsKey("endDate") && DateTime.TryParse(arguments["endDate"]?.ToString(), out var end) ? end : null
        };

        var project = await _projectService.CreateProjectAsync(request, currentUserId, currentUser.CurrentCompanyId);
        return new { success = true, projectId = project.Id, projectName = project.Name };
    }

    private async Task<object?> HandleGetProjectStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var stats = await _projectService.GetProjectStatisticsAsync(currentUser.CurrentCompanyId);
        return stats;
    }
}
