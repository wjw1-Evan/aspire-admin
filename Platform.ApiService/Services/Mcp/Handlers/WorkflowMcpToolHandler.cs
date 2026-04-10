using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 工作流 MCP 工具处理器
/// </summary>
public class WorkflowMcpToolHandler : McpToolHandlerBase
{
    private readonly IWorkflowDefinitionQueryService _definitionQueryService;
    private readonly IWorkflowInstanceQueryService _instanceQueryService;
    private readonly IWorkflowTodoService _todoService;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ILogger<WorkflowMcpToolHandler> _logger;

    public WorkflowMcpToolHandler(
        IWorkflowDefinitionQueryService definitionQueryService,
        IWorkflowInstanceQueryService instanceQueryService,
        IWorkflowTodoService todoService,
        IWorkflowEngine workflowEngine,
        ILogger<WorkflowMcpToolHandler> logger)
    {
        _definitionQueryService = definitionQueryService;
        _instanceQueryService = instanceQueryService;
        _todoService = todoService;
        _workflowEngine = workflowEngine;
        _logger = logger;

        RegisterTool("get_workflow_definitions", "获取工作流定义列表，支持分页和关键词搜索。关键词：工作流列表,流程定义,审批流程",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                var result = await _definitionQueryService.GetWorkflowsAsync(new Platform.ServiceDefaults.Models.PageParams { Page = page, PageSize = pageSize, Search = keyword });
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_workflow_definition_detail", "获取工作流定义详情。关键词：流程详情,查看流程",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "工作流定义ID" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _definitionQueryService.GetWorkflowByIdAsync(id);
            });

        RegisterTool("get_workflow_instances", "获取工作流实例列表，支持按状态筛选。关键词：流程实例,审批实例,我的审批",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["workflowDefinitionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "工作流定义ID" },
                    ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "实例状态: Running, Completed, Cancelled, Terminated" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var defId = args.GetValueOrDefault("workflowDefinitionId")?.ToString();
                var statusStr = args.GetValueOrDefault("status")?.ToString();
                WorkflowStatus? status = null;
                if (!string.IsNullOrEmpty(statusStr) && Enum.TryParse<WorkflowStatus>(statusStr, out var s)) status = s;
                var result = await _instanceQueryService.GetInstancesAsync(new Platform.ServiceDefaults.Models.PageParams { Page = page, PageSize = pageSize }, defId, status);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_workflow_instance_detail", "获取工作流实例详情。关键词：审批详情,流程详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _instanceQueryService.GetInstanceByIdAsync(id);
            });

        RegisterTool("get_workflow_todos", "获取当前用户的待办审批任务列表。关键词：待办任务,待审批,我的待办",
            ObjectSchema(PaginationSchema()),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var result = await _todoService.GetTodoInstancesAsync(uid, new Platform.ServiceDefaults.Models.PageParams { Page = page, PageSize = pageSize });
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_workflow_node_form", "获取工作流节点表单数据（用于审批填写）。关键词：审批表单,节点表单",
            ObjectSchema(new Dictionary<string, object>
            {
                ["instanceId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["nodeId"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["instanceId", "nodeId"]),
            async (args, uid) =>
            {
                var instanceId = args.GetValueOrDefault("instanceId")?.ToString();
                var nodeId = args.GetValueOrDefault("nodeId")?.ToString();
                if (string.IsNullOrEmpty(instanceId) || string.IsNullOrEmpty(nodeId)) return new { error = "instanceId 和 nodeId 必填" };
                return await _todoService.GetNodeFormAsync(instanceId, nodeId);
            });

        RegisterTool("approve_workflow_node", "审批通过工作流节点。关键词：通过审批,批准",
            ObjectSchema(new Dictionary<string, object>
            {
                ["instanceId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["nodeId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["comment"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "审批意见" }
            }, ["instanceId", "nodeId"]),
            async (args, uid) =>
            {
                var instanceId = args.GetValueOrDefault("instanceId")?.ToString();
                var nodeId = args.GetValueOrDefault("nodeId")?.ToString();
                if (string.IsNullOrEmpty(instanceId) || string.IsNullOrEmpty(nodeId)) return new { error = "instanceId 和 nodeId 必填" };
                var comment = args.GetValueOrDefault("comment")?.ToString();
                var result = await _workflowEngine.ProcessApprovalAsync(instanceId, nodeId, ApprovalAction.Approve, uid, comment);
                return result ? new { message = "审批通过成功" } : new { error = "审批通过失败" };
            });

        RegisterTool("reject_workflow_node", "拒绝工作流节点。关键词：拒绝审批,驳回",
            ObjectSchema(new Dictionary<string, object>
            {
                ["instanceId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["nodeId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["comment"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "拒绝原因" }
            }, ["instanceId", "nodeId"]),
            async (args, uid) =>
            {
                var instanceId = args.GetValueOrDefault("instanceId")?.ToString();
                var nodeId = args.GetValueOrDefault("nodeId")?.ToString();
                if (string.IsNullOrEmpty(instanceId) || string.IsNullOrEmpty(nodeId)) return new { error = "instanceId 和 nodeId 必填" };
                var comment = args.GetValueOrDefault("comment")?.ToString();
                var result = await _workflowEngine.ProcessApprovalAsync(instanceId, nodeId, ApprovalAction.Reject, uid, comment);
                return result ? new { message = "拒绝成功" } : new { error = "拒绝失败" };
            });

        RegisterTool("start_workflow", "启动工作流实例。关键词：发起审批,启动流程",
            ObjectSchema(new Dictionary<string, object>
            {
                ["definitionId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "工作流定义ID" },
                ["documentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "关联文档ID" }
            }, ["definitionId"]),
            async (args, uid) =>
            {
                var definitionId = args.GetValueOrDefault("definitionId")?.ToString();
                var documentId = args.GetValueOrDefault("documentId")?.ToString();
                if (string.IsNullOrEmpty(definitionId)) return new { error = "definitionId 必填" };
                return await _workflowEngine.StartWorkflowAsync(definitionId, documentId ?? "", uid);
            });
    }
}