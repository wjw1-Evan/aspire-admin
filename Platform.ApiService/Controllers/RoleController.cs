using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoleController : BaseApiController
{
    private readonly IRoleService _roleService;

    public RoleController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<RoleListResponse>>> GetAllRoles()
    {
        var roles = await _roleService.GetAllRolesAsync();
        return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
    }

    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Role>>> GetRoleById(string id)
    {
        var role = await _roleService.GetRoleByIdAsync(id);
        if (role == null)
            throw new KeyNotFoundException("Role not found");
        
        return Ok(ApiResponse<Role>.SuccessResult(role));
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Role>>> CreateRole([FromBody] CreateRoleRequest request)
    {
        var role = await _roleService.CreateRoleAsync(request);
        return Ok(ApiResponse<Role>.SuccessResult(role));
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        var success = await _roleService.UpdateRoleAsync(id, request);
        if (!success)
            throw new KeyNotFoundException("Role not found or not updated");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }

    /// <summary>
    /// 软删除角色
    /// </summary>
    /// <param name="id">角色ID</param>
    /// <param name="reason">删除原因（可选）</param>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(string id, [FromQuery] string? reason = null)
    {
        var success = await _roleService.DeleteRoleAsync(id, reason);
        if (!success)
            throw new KeyNotFoundException("Role not found");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// </summary>
    [HttpPost("{id}/menus")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignMenusToRole(string id, [FromBody] AssignMenusToRoleRequest request)
    {
        var success = await _roleService.AssignMenusToRoleAsync(id, request.MenuIds);
        if (!success)
            throw new KeyNotFoundException("Role not found or menus not assigned");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }

    /// <summary>
    /// 获取角色的菜单权限
    /// </summary>
    [HttpGet("{id}/menus")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetRoleMenus(string id)
    {
        var menuIds = await _roleService.GetRoleMenuIdsAsync(id);
        return Ok(ApiResponse<List<string>>.SuccessResult(menuIds));
    }

    /// <summary>
    /// 获取角色的操作权限
    /// </summary>
    [HttpGet("{id}/permissions")]
    public async Task<ActionResult<ApiResponse<List<Permission>>>> GetRolePermissions(string id)
    {
        var permissions = await _roleService.GetRolePermissionsAsync(id);
        return Ok(ApiResponse<List<Permission>>.SuccessResult(permissions));
    }

    /// <summary>
    /// 为角色分配操作权限
    /// </summary>
    [HttpPost("{id}/permissions")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignPermissionsToRole(string id, [FromBody] AssignPermissionsRequest request)
    {
        var success = await _roleService.AssignPermissionsToRoleAsync(id, request.PermissionIds);
        if (!success)
            throw new KeyNotFoundException("Role not found or permissions not assigned");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }
}

