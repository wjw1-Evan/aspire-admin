using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class RoleMcpToolHandler : McpToolHandlerBase
{
    private readonly IRoleService _roleService;

    public RoleMcpToolHandler(IRoleService roleService)
    {
        _roleService = roleService;

        RegisterTool("get_roles", "获取所有角色列表。关键词：角色,角色列表,角色管理",
            async (args, uid) =>
            {
                var roles = await _roleService.GetAllRolesAsync();
                return new { items = roles };
            });

        RegisterTool("get_role_detail", "获取角色详细信息。关键词：角色详情,查看角色",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色ID" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _roleService.GetRoleByIdAsync(id);
            });

        RegisterTool("create_role", "创建新角色。关键词：创建角色,新建角色,添加角色",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色描述" },
                ["permissions"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "权限列表" }
            }, ["name"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                if (string.IsNullOrEmpty(name)) return new { error = "角色名称必填" };
                var role = await _roleService.CreateRoleAsync(new CreateRoleRequest
                {
                    Name = name,
                    Description = args.GetValueOrDefault("description")?.ToString()
                });
                return new { role.Id, role.Name, message = "角色创建成功" };
            });

        RegisterTool("update_role", "更新角色信息。关键词：修改角色,编辑角色,更新角色",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色描述" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var success = await _roleService.UpdateRoleAsync(id, new UpdateRoleRequest
                {
                    Name = args.GetValueOrDefault("name")?.ToString(),
                    Description = args.GetValueOrDefault("description")?.ToString()
                });
                return new { success, message = success ? "角色更新成功" : "更新失败" };
            });

        RegisterTool("delete_role", "删除角色（软删除）。关键词：删除角色,移除角色",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色ID" },
                ["reason"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "删除原因" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var success = await _roleService.DeleteRoleAsync(id, args.GetValueOrDefault("reason")?.ToString());
                return new { success, message = success ? "角色删除成功" : "删除失败" };
            });

        RegisterTool("get_role_menu_ids", "获取角色已分配的菜单权限ID列表。关键词：角色菜单,角色权限",
            ObjectSchema(new Dictionary<string, object>
            {
                ["roleId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色ID" }
            }, ["roleId"]),
            async (args, uid) =>
            {
                var roleId = args.GetValueOrDefault("roleId")?.ToString();
                if (string.IsNullOrEmpty(roleId)) return new { error = "roleId 必填" };
                var menuIds = await _roleService.GetRoleMenuIdsAsync(roleId);
                return new { roleId, menuIds };
            });

        RegisterTool("assign_menus_to_role", "为角色分配菜单权限。关键词：分配权限,角色授权,菜单分配",
            ObjectSchema(new Dictionary<string, object>
            {
                ["roleId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "角色ID" },
                ["menuIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "菜单ID列表" }
            }, ["roleId"]),
            async (args, uid) =>
            {
                var roleId = args.GetValueOrDefault("roleId")?.ToString();
                if (string.IsNullOrEmpty(roleId)) return new { error = "roleId 必填" };
                var menuIds = args.GetValueOrDefault("menuIds") is List<object> list ? list.Cast<string>().ToList() : new List<string>();
                var success = await _roleService.AssignMenusToRoleAsync(roleId, menuIds);
                return new { success, message = success ? "菜单权限分配成功" : "分配失败" };
            });

        RegisterTool("get_role_statistics", "获取角色统计数据。关键词：角色统计,角色概览",
            async (args, uid) => await _roleService.GetRoleStatisticsAsync());
    }
}
