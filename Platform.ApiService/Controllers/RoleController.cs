using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 角色管理控制器 - 处理角色相关的 CRUD 操作和权限管理
/// </summary>
[ApiController]
[Route("api/role")]

public class RoleController : BaseApiController
{
    private readonly IRoleService _roleService;

    /// <summary>
    /// 初始化角色控制器
    /// </summary>
    /// <param name="roleService">角色服务</param>
    public RoleController(IRoleService roleService)
    {
        _roleService = roleService ?? throw new ArgumentNullException(nameof(roleService));
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    [HttpGet]
    [RequireMenu("role-management")]
    public async Task<IActionResult> GetAllRoles()
    {
        var roles = await _roleService.GetAllRolesAsync();
        return Success(roles);
    }

    /// <summary>
    /// 获取所有角色（带统计信息）
    /// </summary>
    [HttpGet("with-stats")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> GetAllRolesWithStats()
    {
        var roles = await _roleService.GetAllRolesWithStatsAsync();
        return Success(roles);
    }

    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> GetRoleById(string id)
    {
        var role = await _roleService.GetRoleByIdAsync(id);
        return Success(role.EnsureFound("角色", id));
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    [HttpPost]
    [RequireMenu("role-management")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        var role = await _roleService.CreateRoleAsync(request);
        return Success(role, ErrorMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        var success = await _roleService.UpdateRoleAsync(id, request);
        success.EnsureSuccess("角色", id);
        return Success(ErrorMessages.UpdateSuccess);
    }

    /// <summary>
    /// 软删除角色（自动清理用户的角色引用）
    /// </summary>
    /// <param name="id">角色ID</param>
    /// <param name="reason">删除原因（可选，最大长度200字符）</param>
    [HttpDelete("{id}")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> DeleteRole(string id, [FromQuery] string? reason = null)
    {
        var success = await _roleService.DeleteRoleAsync(id, reason);
        success.EnsureSuccess("角色", id);
        return Success(ErrorMessages.DeleteSuccess);
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// </summary>
    [HttpPost("{id}/menus")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> AssignMenusToRole(string id, [FromBody] AssignMenusToRoleRequest request)
    {
        var success = await _roleService.AssignMenusToRoleAsync(id, request.MenuIds);
        success.EnsureSuccess("角色", id);
        return Success("菜单权限分配成功");
    }

    /// <summary>
    /// 获取角色的菜单权限
    /// </summary>
    [HttpGet("{id}/menus")]
    [RequireMenu("role-management")]
    public async Task<IActionResult> GetRoleMenus(string id)
    {
        var menuIds = await _roleService.GetRoleMenuIdsAsync(id);
        return Success(menuIds);
    }

}

