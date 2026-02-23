using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
namespace Platform.ApiService.Services;
/// <summary>
/// MCP 服务实现
/// </summary>

public partial class McpService
{
    #region 任务管理工具处理方法

    private async Task<object> HandleGetTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

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
                id = t.Id,
                taskName = t.TaskName,
                description = t.Description,
                status = t.Status,
                statusName = t.StatusName,
                priority = t.Priority,
                priorityName = t.PriorityName,
                assignedTo = t.AssignedTo,
                assignedToName = t.AssignedToName,
                completionPercentage = t.CompletionPercentage,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    private async Task<object> HandleGetTaskDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task == null)
        {
            return new { error = "任务未找到" };
        }

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            description = task.Description,
            taskType = task.TaskType,
            status = task.Status,
            statusName = task.StatusName,
            priority = task.Priority,
            priorityName = task.PriorityName,
            createdBy = task.CreatedBy,
            createdByName = task.CreatedByName,
            assignedTo = task.AssignedTo,
            assignedToName = task.AssignedToName,
            assignedAt = task.AssignedAt,
            plannedStartTime = task.PlannedStartTime,
            plannedEndTime = task.PlannedEndTime,
            actualStartTime = task.ActualStartTime,
            actualEndTime = task.ActualEndTime,
            estimatedDuration = task.EstimatedDuration,
            actualDuration = task.ActualDuration,
            completionPercentage = task.CompletionPercentage,
            executionResult = task.ExecutionResult,
            executionResultName = task.ExecutionResultName,
            remarks = task.Remarks,
            tags = task.Tags,
            participants = task.Participants,
            attachments = task.Attachments,
            createdAt = task.CreatedAt,
            updatedAt = task.UpdatedAt
        };
    }

    private async Task<object> HandleCreateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskName") || arguments["taskName"] is not string taskName)
        {
            return new { error = "缺少必需的参数: taskName" };
        }

        if (!arguments.ContainsKey("taskType") || arguments["taskType"] is not string taskType)
        {
            return new { error = "缺少必需的参数: taskType" };
        }

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var request = new CreateTaskRequest
        {
            TaskName = taskName,
            TaskType = taskType,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : (int)TaskPriority.Medium,
            AssignedTo = arguments.ContainsKey("assignedTo") ? arguments["assignedTo"]?.ToString() : null,
            EstimatedDuration = arguments.ContainsKey("estimatedDuration") && int.TryParse(arguments["estimatedDuration"]?.ToString(), out var duration) ? duration : null,
            Tags = arguments.ContainsKey("tags") && arguments["tags"] is List<object> tags ? tags.Cast<string>().ToList() : new List<string>(),
            PlannedStartTime = arguments.ContainsKey("plannedStartTime") && DateTime.TryParse(arguments["plannedStartTime"]?.ToString(), out var pst) ? pst : (DateTime?)null,
            PlannedEndTime = arguments.ContainsKey("plannedEndTime") && DateTime.TryParse(arguments["plannedEndTime"]?.ToString(), out var pet) ? pet : (DateTime?)null,
            ParticipantIds = arguments.ContainsKey("participantIds") && arguments["participantIds"] is List<object> participants ? participants.Cast<string>().ToList() : new List<string>(),
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null
        };

        var task = await _taskService.CreateTaskAsync(request, currentUserId, currentUser.CurrentCompanyId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            priority = task.Priority,
            priorityName = task.PriorityName,
            createdAt = task.CreatedAt,
            message = "任务创建成功"
        };
    }

    private async Task<object> HandleUpdateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

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

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            completionPercentage = task.CompletionPercentage,
            updatedAt = task.UpdatedAt,
            message = "任务更新成功"
        };
    }

    private async Task<object> HandleAssignTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        if (!arguments.ContainsKey("assignedTo") || arguments["assignedTo"] is not string assignedTo)
        {
            return new { error = "缺少必需的参数: assignedTo" };
        }

        var request = new AssignTaskRequest
        {
            TaskId = taskId,
            AssignedTo = assignedTo,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.AssignTaskAsync(request, currentUserId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            assignedTo = task.AssignedTo,
            assignedToName = task.AssignedToName,
            assignedAt = task.AssignedAt,
            status = task.Status,
            statusName = task.StatusName,
            message = "任务分配成功"
        };
    }

    private async Task<object> HandleCompleteTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        var executionResult = (int)TaskExecutionResult.Success;
        if (arguments.ContainsKey("executionResult") && int.TryParse(arguments["executionResult"]?.ToString(), out var result))
        {
            executionResult = result;
        }

        var request = new CompleteTaskRequest
        {
            TaskId = taskId,
            ExecutionResult = executionResult,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.CompleteTaskAsync(request, currentUserId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            executionResult = task.ExecutionResult,
            executionResultName = task.ExecutionResultName,
            completionPercentage = task.CompletionPercentage,
            actualEndTime = task.ActualEndTime,
            message = "任务完成成功"
        };
    }

    private async Task<object> HandleGetTaskStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var userId = arguments.ContainsKey("userId") && !string.IsNullOrEmpty(arguments["userId"]?.ToString())
            ? arguments["userId"]?.ToString()
            : null;

        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, userId);

        return new
        {
            totalTasks = statistics.TotalTasks,
            pendingTasks = statistics.PendingTasks,
            inProgressTasks = statistics.InProgressTasks,
            completedTasks = statistics.CompletedTasks,
            failedTasks = statistics.FailedTasks,
            averageCompletionTime = statistics.AverageCompletionTime,
            completionRate = statistics.CompletionRate,
            tasksByPriority = statistics.TasksByPriority,
            tasksByStatus = statistics.TasksByStatus
        };
    }

    private async Task<object> HandleGetMyTaskCountAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var includeCompleted = arguments.ContainsKey("includeCompleted") &&
                              bool.TryParse(arguments["includeCompleted"]?.ToString(), out var ic) && ic;

        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, currentUserId);

        var totalCount = statistics.TotalTasks;
        if (!includeCompleted)
        {
            // 不包含已完成的任务，计算待分配、已分配、执行中的任务数
            totalCount = statistics.PendingTasks + statistics.InProgressTasks;
            if (statistics.TasksByStatus.ContainsKey("Assigned"))
            {
                totalCount += statistics.TasksByStatus["Assigned"];
            }
        }

        return new
        {
            totalCount = totalCount,
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

    private async Task<object> HandleGetMyTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

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
                id = t.Id,
                taskName = t.TaskName,
                description = t.Description,
                status = t.Status,
                statusName = t.StatusName,
                priority = t.Priority,
                priorityName = t.PriorityName,
                completionPercentage = t.CompletionPercentage,
                createdBy = t.CreatedBy,
                createdByName = t.CreatedByName,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    #endregion
    #region 项目管理相关

    private async Task<object> HandleGetProjectsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

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
            projects = response.Projects.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                description = p.Description,
                startDate = p.StartDate,
                endDate = p.EndDate,
                status = p.Status,
                statusName = p.StatusName,
                memberCount = response.Total, // 这里简化处理
                progress = p.Progress
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleGetProjectDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var projectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null;
        if (string.IsNullOrEmpty(projectId)) return new { error = "未提供项目ID" };

        var project = await _projectService.GetProjectByIdAsync(projectId);
        if (project == null) return new { error = "项目不存在" };

        var members = await _projectService.GetProjectMembersAsync(projectId);

        return new
        {
            project = new
            {
                id = project.Id,
                name = project.Name,
                description = project.Description,
                startDate = project.StartDate,
                endDate = project.EndDate,
                status = project.Status,
                progress = project.Progress
            },
            members = members.Select(m => new { userId = m.UserId, username = m.UserName, role = m.Role }).ToList()
        };
    }

    private async Task<object> HandleCreateProjectAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        if (string.IsNullOrEmpty(name)) return new { error = "项目名称必填" };

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

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

    private async Task<object> HandleGetProjectStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var stats = await _projectService.GetProjectStatisticsAsync(currentUser.CurrentCompanyId);
        return stats;
    }

    #endregion
}
