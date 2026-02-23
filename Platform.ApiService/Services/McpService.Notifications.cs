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
    #region 通知中心工具处理方法

    private async Task<object> HandleGetUnifiedNotificationsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var filterType = arguments.ContainsKey("filterType") ? (arguments["filterType"]?.ToString() ?? "all") : "all";
        var sortBy = arguments.ContainsKey("sortBy") ? (arguments["sortBy"]?.ToString() ?? "datetime") : "datetime";

        var result = await _unifiedNotificationService.GetUnifiedNotificationsAsync(page, pageSize, filterType, sortBy);
        return new
        {
            items = result.Items,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            unreadCount = result.UnreadCount,
            success = result.Success
        };
    }

    private async Task<object> HandleGetUnreadNotificationStatsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var stats = await _unifiedNotificationService.GetUnreadCountStatisticsAsync();
        return new
        {
            total = stats.Total,
            systemMessages = stats.SystemMessages,
            notifications = stats.Notifications,
            messages = stats.Messages,
            taskNotifications = stats.TaskNotifications,
            todos = stats.Todos
        };
    }

    private async Task<object> HandleMarkNotificationReadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }
        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.MarkAsReadAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleGetTaskNotificationsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var result = await _unifiedNotificationService.GetTaskNotificationsAsync(page, pageSize);
        return new
        {
            items = result.Notifications,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleGetTodosAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);
        var sortBy = arguments.ContainsKey("sortBy") ? (arguments["sortBy"]?.ToString() ?? "dueDate") : "dueDate";

        var result = await _unifiedNotificationService.GetTodosAsync(page, pageSize, sortBy);
        return new
        {
            todos = result.Todos,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleCreateTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("title") || arguments["title"] is null)
        {
            return new { error = "缺少必需的参数: title" };
        }

        var request = new CreateTodoRequest
        {
            Title = arguments["title"]!.ToString()!,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var p) ? p : 1,
            DueDate = arguments.ContainsKey("dueDate") && DateTime.TryParse(arguments["dueDate"]?.ToString(), out var d) ? d : null
        };

        var todo = await _unifiedNotificationService.CreateTodoAsync(request);
        return new { success = true, id = todo.Id, title = todo.Title };
    }

    private async Task<object> HandleUpdateTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var request = new UpdateTodoRequest
        {
            Title = arguments.ContainsKey("title") ? arguments["title"]?.ToString() : null,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var p) ? p : null,
            DueDate = arguments.ContainsKey("dueDate") && DateTime.TryParse(arguments["dueDate"]?.ToString(), out var d) ? d : null,
            IsCompleted = arguments.ContainsKey("isCompleted") && bool.TryParse(arguments["isCompleted"]?.ToString(), out var c) ? c : null
        };

        var todo = await _unifiedNotificationService.UpdateTodoAsync(id, request);
        return new { success = todo != null, id = todo?.Id };
    }

    private async Task<object> HandleCompleteTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.CompleteTodoAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleDeleteTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.DeleteTodoAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleGetSystemMessagesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var result = await _unifiedNotificationService.GetSystemMessagesAsync(page, pageSize);
        return new
        {
            messages = result.Messages,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleMarkMultipleNotificationsReadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("ids") || arguments["ids"] is not List<object> ids)
        {
            return new { error = "缺少必需的参数: ids (Array)" };
        }

        var idList = ids.Select(o => o.ToString()!).ToList();
        var ok = await _unifiedNotificationService.MarkMultipleAsReadAsync(idList);
        return new { success = ok };
    }

    #endregion
    #region 小科配置管理工具处理方法

    private async Task<object> HandleGetXiaokeConfigsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        var isEnabled = arguments.ContainsKey("isEnabled") && bool.TryParse(arguments["isEnabled"]?.ToString(), out var enabled) ? enabled : (bool?)null;
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var queryParams = new XiaokeConfigQueryParams
        {
            Current = page,
            PageSize = pageSize,
            Name = name,
            IsEnabled = isEnabled
        };

        var response = await _xiaokeConfigService.GetConfigsAsync(queryParams);

        var configs = response.Data == null
            ? new List<object>()
            : response.Data.Select(c => new
            {
                id = c.Id,
                name = c.Name,
                model = c.Model,
                systemPrompt = c.SystemPrompt,
                temperature = c.Temperature,
                maxTokens = c.MaxTokens,
                topP = c.TopP,
                frequencyPenalty = c.FrequencyPenalty,
                presencePenalty = c.PresencePenalty,
                isEnabled = c.IsEnabled,
                isDefault = c.IsDefault,
                createdAt = c.CreatedAt,
                updatedAt = c.UpdatedAt
            }).Cast<object>().ToList();

        return new
        {
            configs = configs,
            total = response.Total,
            page = response.Current,
            pageSize = response.PageSize,
            totalPages = response.Total > 0 ? (int)Math.Ceiling(response.Total / (double)response.PageSize) : 0
        };
    }

    private async Task<object> HandleGetXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        if (!arguments.ContainsKey("configId") || arguments["configId"] is not string configId)
        {
            return new { error = "缺少必需的参数: configId" };
        }

        var config = await _xiaokeConfigService.GetConfigByIdAsync(configId);
        if (config == null)
        {
            return new { error = "配置未找到" };
        }

        return new
        {
            id = config.Id,
            name = config.Name,
            model = config.Model,
            systemPrompt = config.SystemPrompt,
            temperature = config.Temperature,
            maxTokens = config.MaxTokens,
            topP = config.TopP,
            frequencyPenalty = config.FrequencyPenalty,
            presencePenalty = config.PresencePenalty,
            isEnabled = config.IsEnabled,
            isDefault = config.IsDefault,
            createdAt = config.CreatedAt,
            updatedAt = config.UpdatedAt
        };
    }

    private async Task<object> HandleGetDefaultXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        var config = await _xiaokeConfigService.GetDefaultConfigAsync();
        if (config == null)
        {
            return new { error = "未找到默认配置" };
        }

        return new
        {
            id = config.Id,
            name = config.Name,
            model = config.Model,
            systemPrompt = config.SystemPrompt,
            temperature = config.Temperature,
            maxTokens = config.MaxTokens,
            topP = config.TopP,
            frequencyPenalty = config.FrequencyPenalty,
            presencePenalty = config.PresencePenalty,
            isEnabled = config.IsEnabled,
            isDefault = config.IsDefault,
            createdAt = config.CreatedAt,
            updatedAt = config.UpdatedAt
        };
    }

    #endregion
    #region 工作流相关工具处理方法

    private async Task<object> HandleGetWorkflowDefinitionsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null;
        var (page, pageSize) = ParsePaginationArgs(arguments);

        var (items, total) = await _workflowDefinitionFactory.FindPagedAsync(
            d => string.IsNullOrEmpty(keyword) || (d.Name != null && d.Name.Contains(keyword)),
            q => q.OrderByDescending(d => d.UpdatedAt),
            page, pageSize);

        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetWorkflowInstancesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var s) ? (WorkflowStatus)s : (WorkflowStatus?)null;

        var (items, total) = await _workflowInstanceFactory.FindPagedAsync(
            i => status == null || i.Status == status,
            q => q.OrderByDescending(i => i.UpdatedAt),
            page, pageSize);

        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetWorkflowInstanceDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.TryGetValue("instanceId", out var idObj) || idObj?.ToString() is not string instanceId)
        {
            return new { error = "缺少必需的参数: instanceId" };
        }

        var instance = await _workflowInstanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return new { error = "流程实例未找到" };

        var history = await _workflowEngine.GetApprovalHistoryAsync(instanceId);
        return new { instance, history };
    }

    private async Task<object> HandleProcessWorkflowApprovalAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.TryGetValue("instanceId", out var instIdObj) || instIdObj?.ToString() is not string instanceId)
            return new { error = "缺少必需的参数: instanceId" };
        if (!arguments.TryGetValue("nodeId", out var nodeObj) || nodeObj?.ToString() is not string nodeId)
            return new { error = "缺少必需的参数: nodeId" };
        if (!arguments.TryGetValue("action", out var actObj) || !int.TryParse(actObj?.ToString(), out var actionInt))
            return new { error = "缺少必需的参数: action (int)" };

        var action = (ApprovalAction)actionInt;
        var comment = arguments.ContainsKey("comment") ? arguments["comment"]?.ToString() : null;
        var delegateToUserId = arguments.ContainsKey("delegateToUserId") ? arguments["delegateToUserId"]?.ToString() : null;

        var result = await _workflowEngine.ProcessApprovalAsync(instanceId, nodeId, action, comment, delegateToUserId);
        return new { success = result };
    }

    #endregion
}
