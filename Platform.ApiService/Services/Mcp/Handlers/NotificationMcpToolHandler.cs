using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 通知中心、待办、小科配置和工作流 MCP 工具处理器
/// </summary>
public class NotificationMcpToolHandler : McpToolHandlerBase
{
    private readonly IUnifiedNotificationService _unifiedNotificationService;
    private readonly IXiaokeConfigService? _xiaokeConfigService;
    private readonly IDataFactory<WorkflowDefinition> _workflowDefinitionFactory;
    private readonly IDataFactory<WorkflowInstance> _workflowInstanceFactory;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ILogger<NotificationMcpToolHandler> _logger;

    /// <summary>
    /// 初始化通知中心、工作流与小科配置 MCP 处理器
    /// </summary>
    /// <param name="unifiedNotificationService">统一通知服务</param>
    /// <param name="workflowDefinitionFactory">工作流定义工厂</param>
    /// <param name="workflowInstanceFactory">工作流实例工厂</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="logger">日志处理器</param>
    /// <param name="xiaokeConfigService">小科配置服务</param>
    public NotificationMcpToolHandler(
        IUnifiedNotificationService unifiedNotificationService,
        IDataFactory<WorkflowDefinition> workflowDefinitionFactory,
        IDataFactory<WorkflowInstance> workflowInstanceFactory,
        IWorkflowEngine workflowEngine,
        ILogger<NotificationMcpToolHandler> logger,
        IXiaokeConfigService? xiaokeConfigService = null)
    {
        _unifiedNotificationService = unifiedNotificationService;
        _xiaokeConfigService = xiaokeConfigService;
        _workflowDefinitionFactory = workflowDefinitionFactory;
        _workflowInstanceFactory = workflowInstanceFactory;
        _workflowEngine = workflowEngine;
        _logger = logger;

        #region 通知中心
        RegisterTool("get_unified_notifications", "获取统一通知列表（合并系统消息、通知、消息等）。关键词：通知,消息,提醒",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "类型过滤 (all, system, notification, message, task, todo)", ["default"] = "all" },
                    ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "排序 (datetime, priority)", ["default"] = "datetime" }
                },
                PaginationSchema(10)
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 10, maxPageSize: 100);
                var filterType = args.ContainsKey("filterType") ? (args["filterType"]?.ToString() ?? "all") : "all";
                var sortBy = args.ContainsKey("sortBy") ? (args["sortBy"]?.ToString() ?? "datetime") : "datetime";
                var result = await _unifiedNotificationService.GetUnifiedNotificationsAsync(page, pageSize, filterType, sortBy);
                return new { result.Items, result.Total, result.Page, result.PageSize, result.UnreadCount, result.Success };
            });

        RegisterTool("get_unread_notification_stats", "获取未读通知统计信息。关键词：未读统计,未读消息",
            async (args, uid) =>
            {
                var stats = await _unifiedNotificationService.GetUnreadCountStatisticsAsync();
                return new { stats.Total, stats.SystemMessages, stats.Notifications, stats.Messages, stats.TaskNotifications, stats.Todos };
            });

        RegisterTool("mark_notification_read", "按通知ID标记为已读。关键词：已读通知",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "通知ID" } }, ["id"]),
            async (args, uid) =>
            {
                if (!args.ContainsKey("id") || args["id"] is null) return new { error = "缺少必需的参数: id" };
                var ok = await _unifiedNotificationService.MarkAsReadAsync(args["id"]!.ToString()!);
                return new { success = ok };
            });

        RegisterTool("get_task_notifications", "获取与当前用户相关的任务通知列表。关键词：任务消息,任务通知",
            ObjectSchema(PaginationSchema(10)),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 10, maxPageSize: 100);
                var result = await _unifiedNotificationService.GetTaskNotificationsAsync(page, pageSize);
                return new { items = result.Notifications, result.Total, result.Page, result.PageSize, result.Success };
            });

        RegisterTool("get_todos", "获取待办事项列表。关键词：待办,备忘,要做的事情",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "dueDate" } },
                PaginationSchema(10)
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 10, maxPageSize: 100);
                var sortBy = args.ContainsKey("sortBy") ? (args["sortBy"]?.ToString() ?? "dueDate") : "dueDate";
                var result = await _unifiedNotificationService.GetTodosAsync(page, pageSize, sortBy);
                return new { result.Todos, result.Total, result.Page, result.PageSize, result.Success };
            });

        RegisterTool("create_todo", "创建一个新的待办事项。关键词：新增待办,创建待办",
            ObjectSchema(new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办标题" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办描述（可选）" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）", ["default"] = 1 },
                ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "截止日期（ISO格式，可选）" }
            }, ["title"]),
            async (args, uid) =>
            {
                if (!args.ContainsKey("title") || args["title"] is null) return new { error = "缺少必需的参数: title" };
                var request = new CreateTodoRequest
                {
                    Title = args["title"]!.ToString()!,
                    Description = args.ContainsKey("description") ? args["description"]?.ToString() : null,
                    Priority = args.ContainsKey("priority") && int.TryParse(args["priority"]?.ToString(), out var p) ? p : 1,
                    DueDate = args.ContainsKey("dueDate") && DateTime.TryParse(args["dueDate"]?.ToString(), out var d) ? d : null
                };
                var todo = await _unifiedNotificationService.CreateTodoAsync(request);
                return new { success = true, id = todo.Id, title = todo.Title };
            });

        RegisterTool("update_todo", "更新待办事项信息。关键词：修改待办,编辑待办",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新标题（可选）" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新描述（可选）" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "新优先级（可选）" },
                ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新截止日期（可选）" },
                ["isCompleted"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否已完成（可选）" }
            }, ["id"]),
            async (args, uid) =>
            {
                if (!args.ContainsKey("id") || args["id"] is null) return new { error = "缺少必需的参数: id" };
                var id = args["id"]!.ToString()!;
                var request = new UpdateTodoRequest
                {
                    Title = args.ContainsKey("title") ? args["title"]?.ToString() : null,
                    Description = args.ContainsKey("description") ? args["description"]?.ToString() : null,
                    Priority = args.ContainsKey("priority") && int.TryParse(args["priority"]?.ToString(), out var p) ? p : null,
                    DueDate = args.ContainsKey("dueDate") && DateTime.TryParse(args["dueDate"]?.ToString(), out var d) ? d : null,
                    IsCompleted = args.ContainsKey("isCompleted") && bool.TryParse(args["isCompleted"]?.ToString(), out var c) ? c : null
                };
                var todo = await _unifiedNotificationService.UpdateTodoAsync(id, request);
                return new { success = todo != null, id = todo?.Id };
            });

        RegisterTool("complete_todo", "将待办事项标记为已完成。关键词：完成待办",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" } }, ["id"]),
            async (args, uid) => { if (!args.ContainsKey("id") || args["id"] is null) return new { error = "缺少必需的参数: id" }; var ok = await _unifiedNotificationService.CompleteTodoAsync(args["id"]!.ToString()!); return new { success = ok }; });

        RegisterTool("delete_todo", "删除指定的待办事项。关键词：删除待办",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" } }, ["id"]),
            async (args, uid) => { if (!args.ContainsKey("id") || args["id"] is null) return new { error = "缺少必需的参数: id" }; var ok = await _unifiedNotificationService.DeleteTodoAsync(args["id"]!.ToString()!); return new { success = ok }; });

        RegisterTool("get_system_messages", "获取系统的所有消息通知列表。关键词：系统消息,系统通知",
            ObjectSchema(PaginationSchema(10)),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 10, maxPageSize: 100);
                var result = await _unifiedNotificationService.GetSystemMessagesAsync(page, pageSize);
                return new { result.Messages, result.Total, result.Page, result.PageSize, result.Success };
            });

        RegisterTool("mark_multiple_notifications_read", "批量将通知标记为已读。关键词：批量已读",
            ObjectSchema(new Dictionary<string, object> { ["ids"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "通知ID列表" } }, ["ids"]),
            async (args, uid) =>
            {
                if (!args.ContainsKey("ids") || args["ids"] is not List<object> ids) return new { error = "缺少必需的参数: ids (Array)" };
                var idList = ids.Select(o => o.ToString()!).ToList();
                var ok = await _unifiedNotificationService.MarkMultipleAsReadAsync(idList);
                return new { success = ok };
            });
        #endregion

        #region 小科配置
        RegisterTool("get_xiaoke_configs", "获取小科配置列表。关键词：小科设置,模型配置",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置名称（搜索关键词，可选）" },
                    ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否启用（筛选条件，可选）" }
                },
                PaginationSchema(10)
            )),
            HandleGetXiaokeConfigsAsync);

        RegisterTool("get_xiaoke_config", "获取小科配置详情。关键词：配置详情",
            ObjectSchema(new Dictionary<string, object> { ["configId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "配置ID（必填）" } }, ["configId"]),
            HandleGetXiaokeConfigAsync);

        RegisterTool("get_default_xiaoke_config", "获取当前企业的默认小科配置。关键词：默认配置",
            HandleGetDefaultXiaokeConfigAsync);
        #endregion

        #region 工作流
        RegisterTool("get_workflow_definitions", "获取工作流定义列表。关键词：审批流程,工作流",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var keyword = args.ContainsKey("keyword") ? args["keyword"]?.ToString() : null;
                var (page, pageSize) = ParsePaginationArgs(args);
                var (items, total) = await _workflowDefinitionFactory.FindPagedAsync(d => string.IsNullOrEmpty(keyword) || (d.Name != null && d.Name.Contains(keyword)), q => q.OrderByDescending(d => d.UpdatedAt), page, pageSize);
                return new { items, total, page, pageSize };
            });

        RegisterTool("get_workflow_instances", "获取工作流实例列表。关键词：审批记录,流程状态",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "状态 (0=运行中, 1=已完成, 2=已取消, 3=已拒绝)" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var status = args.ContainsKey("status") && int.TryParse(args["status"]?.ToString(), out var s) ? (WorkflowStatus)s : (WorkflowStatus?)null;
                var (items, total) = await _workflowInstanceFactory.FindPagedAsync(i => status == null || i.Status == status, q => q.OrderByDescending(i => i.UpdatedAt), page, pageSize);
                return new { items, total, page, pageSize };
            });

        RegisterTool("get_workflow_instance_detail", "获取工作流实例详情。关键词：审批详情",
            ObjectSchema(new Dictionary<string, object> { ["instanceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "实例ID" } }, ["instanceId"]),
            async (args, uid) =>
            {
                if (!args.TryGetValue("instanceId", out var idObj) || idObj?.ToString() is not string instanceId) return new { error = "缺少必需的参数: instanceId" };
                var instance = await _workflowInstanceFactory.GetByIdAsync(instanceId);
                if (instance == null) return (object)new { error = "流程实例未找到" };
                var history = await _workflowEngine.GetApprovalHistoryAsync(instanceId);
                return new { instance, history };
            });

        RegisterTool("process_workflow_approval", "执行流程审批操作。关键词：办理审批,同意审批,拒绝审批",
            ObjectSchema(new Dictionary<string, object>
            {
                ["instanceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "实例ID" },
                ["nodeId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "当前节点ID" },
                ["action"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "动作 (0=同意, 1=拒绝, 2=退回, 3=转办)" },
                ["comment"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "审批意见" },
                ["delegateToUserId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "转办用户ID (动作时转办时必填)" }
            }, ["instanceId", "nodeId", "action"]),
            async (args, uid) =>
            {
                if (!args.TryGetValue("instanceId", out var instIdObj) || instIdObj?.ToString() is not string instanceId) return new { error = "缺少必需的参数: instanceId" };
                if (!args.TryGetValue("nodeId", out var nodeObj) || nodeObj?.ToString() is not string nodeId) return new { error = "缺少必需的参数: nodeId" };
                if (!args.TryGetValue("action", out var actObj) || !int.TryParse(actObj?.ToString(), out var actionInt)) return new { error = "缺少必需的参数: action (int)" };
                var action = (ApprovalAction)actionInt;
                var comment = args.ContainsKey("comment") ? args["comment"]?.ToString() : null;
                var delegateToUserId = args.ContainsKey("delegateToUserId") ? args["delegateToUserId"]?.ToString() : null;
                var result = await _workflowEngine.ProcessApprovalAsync(instanceId, nodeId, action, comment, delegateToUserId);
                return new { success = result };
            });
        #endregion
    }

    private async Task<object?> HandleGetXiaokeConfigsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null) return new { error = "小科配置服务未启用" };
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        var isEnabled = arguments.ContainsKey("isEnabled") && bool.TryParse(arguments["isEnabled"]?.ToString(), out var enabled) ? enabled : (bool?)null;
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);
        var queryParams = new XiaokeConfigQueryParams { Current = page, PageSize = pageSize, Name = name, IsEnabled = isEnabled };
        var response = await _xiaokeConfigService.GetConfigsAsync(queryParams);
        var configs = response.Data == null ? new List<object>() : response.Data.Select(c => new { c.Id, c.Name, c.Model, c.SystemPrompt, c.Temperature, c.MaxTokens, c.TopP, c.FrequencyPenalty, c.PresencePenalty, c.IsEnabled, c.IsDefault, c.CreatedAt, c.UpdatedAt }).Cast<object>().ToList();
        return new { configs, total = response.Total, page = response.Current, pageSize = response.PageSize, totalPages = response.Total > 0 ? (int)Math.Ceiling(response.Total / (double)response.PageSize) : 0 };
    }

    private async Task<object?> HandleGetXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null) return new { error = "小科配置服务未启用" };
        if (!arguments.ContainsKey("configId") || arguments["configId"] is not string configId) return new { error = "缺少必需的参数: configId" };
        var config = await _xiaokeConfigService.GetConfigByIdAsync(configId);
        if (config == null) return new { error = "配置未找到" };
        return new { config.Id, config.Name, config.Model, config.SystemPrompt, config.Temperature, config.MaxTokens, config.TopP, config.FrequencyPenalty, config.PresencePenalty, config.IsEnabled, config.IsDefault, config.CreatedAt, config.UpdatedAt };
    }

    private async Task<object?> HandleGetDefaultXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null) return new { error = "小科配置服务未启用" };
        var config = await _xiaokeConfigService.GetDefaultConfigAsync();
        if (config == null) return new { error = "未找到默认配置" };
        return new { config.Id, config.Name, config.Model, config.SystemPrompt, config.Temperature, config.MaxTokens, config.TopP, config.FrequencyPenalty, config.PresencePenalty, config.IsEnabled, config.IsDefault, config.CreatedAt, config.UpdatedAt };
    }
}
