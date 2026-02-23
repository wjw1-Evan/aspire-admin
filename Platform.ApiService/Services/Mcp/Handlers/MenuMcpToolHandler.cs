using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 菜单与权限管理 MCP 工具处理器
/// </summary>
public class MenuMcpToolHandler : McpToolHandlerBase
{
    private readonly IMenuService _menuService;
    private readonly IRoleService _roleService;
    private readonly ILogger<MenuMcpToolHandler> _logger;

    /// <summary>
    /// 初始化菜单与权限管理 MCP 处理器
    /// </summary>
    /// <param name="menuService">菜单服务</param>
    /// <param name="roleService">角色服务</param>
    /// <param name="logger">日志处理器</param>
    public MenuMcpToolHandler(IMenuService menuService, IRoleService roleService, ILogger<MenuMcpToolHandler> logger)
    {
        _menuService = menuService;
        _roleService = roleService;
        _logger = logger;

        RegisterTool("get_menu_tree", "获取系统完整的菜单树结构。",
            async (args, uid) => await _menuService.GetMenuTreeAsync());

        RegisterTool("assign_role_menus", "为指定角色分配可访问的菜单项。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["roleId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["menuIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" } }
            }, ["roleId", "menuIds"]),
            async (args, uid) =>
            {
                var roleId = args["roleId"].ToString()!;
                var menuIds = ((IEnumerable<object>)args["menuIds"]).Select(m => m.ToString()!).ToList();
                return await _roleService.AssignMenusToRoleAsync(roleId, menuIds);
            });

        RegisterTool("get_role_menu_ids", "获取指定角色已分配的菜单ID列表。",
            ObjectSchema(new Dictionary<string, object> { ["roleId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["roleId"]),
            async (args, uid) => await _roleService.GetRoleMenuIdsAsync(args["roleId"].ToString()!));
    }
}
