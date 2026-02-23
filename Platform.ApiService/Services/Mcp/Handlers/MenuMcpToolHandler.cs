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

        RegisterTool("get_menu_tree", "获取系统完整的菜单树结构。关键词：菜单树,功能权限,目录",
            async (args, uid) => await _menuService.GetMenuTreeAsync());

        RegisterTool("assign_role_menus", "为指定角色分配可访问的菜单项。关键词：分配权限,设置菜单",
            ObjectSchema(new Dictionary<string, object>
            {
                ["roleId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["menuIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" } }
            }, ["roleId", "menuIds"]),
            async (args, uid) =>
            {
                var roleId = args.GetValueOrDefault("roleId")?.ToString();
                if (string.IsNullOrEmpty(roleId)) return new { error = "roleId is required" };
                var menuIdsObj = args.GetValueOrDefault("menuIds");
                if (menuIdsObj is null) return new { error = "menuIds is required" };
                var menuIds = ((IEnumerable<object>)menuIdsObj).Select(m => m.ToString()!).ToList();
                return await _roleService.AssignMenusToRoleAsync(roleId, menuIds);
            });

        RegisterTool("get_role_menu_ids", "获取指定角色已分配的菜单ID列表。关键词：拥有的菜单,角色权限",
            ObjectSchema(new Dictionary<string, object> { ["roleId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["roleId"]),
            async (args, uid) => { var roleId = args.GetValueOrDefault("roleId")?.ToString(); return string.IsNullOrEmpty(roleId) ? new { error = "roleId is required" } : await _roleService.GetRoleMenuIdsAsync(roleId); });
    }
}
