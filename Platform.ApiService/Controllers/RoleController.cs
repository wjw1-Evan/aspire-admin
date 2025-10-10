using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoleController : ControllerBase
{
    private readonly RoleService _roleService;

    public RoleController(RoleService roleService)
    {
        _roleService = roleService;
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<RoleListResponse>>> GetAllRoles()
    {
        try
        {
            var roles = await _roleService.GetAllRolesAsync();
            return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<RoleListResponse>.ServerErrorResult($"Failed to get roles: {ex.Message}"));
        }
    }

    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Role>>> GetRoleById(string id)
    {
        try
        {
            var role = await _roleService.GetRoleByIdAsync(id);
            if (role == null)
            {
                return NotFound(ApiResponse<Role>.NotFoundResult("Role not found"));
            }
            return Ok(ApiResponse<Role>.SuccessResult(role));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<Role>.ServerErrorResult($"Failed to get role: {ex.Message}"));
        }
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Role>>> CreateRole([FromBody] CreateRoleRequest request)
    {
        try
        {
            var role = await _roleService.CreateRoleAsync(request);
            return Ok(ApiResponse<Role>.SuccessResult(role));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<Role>.ErrorResult("BAD_REQUEST", ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<Role>.ServerErrorResult($"Failed to create role: {ex.Message}"));
        }
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        try
        {
            var success = await _roleService.UpdateRoleAsync(id, request);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.NotFoundResult("Role not found or not updated"));
            }
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.ErrorResult("BAD_REQUEST", ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to update role: {ex.Message}"));
        }
    }

    /// <summary>
    /// 删除角色
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRole(string id)
    {
        try
        {
            var success = await _roleService.DeleteRoleAsync(id);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.NotFoundResult("Role not found"));
            }
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.ErrorResult("BAD_REQUEST", ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to delete role: {ex.Message}"));
        }
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// </summary>
    [HttpPost("{id}/menus")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignMenusToRole(string id, [FromBody] AssignMenusToRoleRequest request)
    {
        try
        {
            var success = await _roleService.AssignMenusToRoleAsync(id, request.MenuIds);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.NotFoundResult("Role not found or menus not assigned"));
            }
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to assign menus to role: {ex.Message}"));
        }
    }

    /// <summary>
    /// 获取角色的菜单权限
    /// </summary>
    [HttpGet("{id}/menus")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetRoleMenus(string id)
    {
        try
        {
            var menuIds = await _roleService.GetRoleMenuIdsAsync(id);
            return Ok(ApiResponse<List<string>>.SuccessResult(menuIds));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<string>>.ServerErrorResult($"Failed to get role menus: {ex.Message}"));
        }
    }
}

