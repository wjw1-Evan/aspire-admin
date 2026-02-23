using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 组织架构管理 MCP 工具处理器
/// </summary>
public class OrganizationMcpToolHandler : McpToolHandlerBase
{
    private readonly IOrganizationService _orgService;
    private readonly ILogger<OrganizationMcpToolHandler> _logger;

    /// <summary>
    /// 初始化组织架构 MCP 处理器
    /// </summary>
    /// <param name="orgService">组织架构服务</param>
    /// <param name="logger">日志处理器</param>
    public OrganizationMcpToolHandler(IOrganizationService orgService, ILogger<OrganizationMcpToolHandler> logger)
    {
        _orgService = orgService;
        _logger = logger;

        RegisterTool("get_organization_tree", "获取整个组织架构树。",
            async (args, uid) => await _orgService.GetTreeAsync());

        RegisterTool("get_organization_node", "获取指定组织节点的详情。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _orgService.GetByIdAsync(args["id"].ToString()!));

        RegisterTool("create_organization_node", "创建新的组织节点。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["code"] = new Dictionary<string, object> { ["type"] = "string" },
                ["parentId"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["name", "code"]),
            async (args, uid) => await _orgService.CreateAsync(new CreateOrganizationUnitRequest
            {
                Name = args["name"].ToString()!,
                Code = args["code"].ToString()!,
                ParentId = args.GetValueOrDefault("parentId")?.ToString()
            }));

        RegisterTool("update_organization_node", "更新现有组织节点。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["code"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) => await _orgService.UpdateAsync(args["id"].ToString()!, new UpdateOrganizationUnitRequest
            {
                Name = args.GetValueOrDefault("name")?.ToString() ?? "",
                Code = args.GetValueOrDefault("code")?.ToString() ?? ""
            }));

        RegisterTool("delete_organization_node", "删除指定的组织节点。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _orgService.DeleteAsync(args["id"].ToString()!));
    }
}
