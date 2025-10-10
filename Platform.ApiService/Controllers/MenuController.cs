using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using System.Security.Claims;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MenuController : ControllerBase
{
    private readonly MenuService _menuService;
    private readonly UserService _userService;

    public MenuController(MenuService menuService, UserService userService)
    {
        _menuService = menuService;
        _userService = userService;
    }

    /// <summary>
    /// 获取所有菜单
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Menu>>>> GetAllMenus()
    {
        try
        {
            var menus = await _menuService.GetAllMenusAsync();
            return Ok(ApiResponse<List<Menu>>.SuccessResult(menus));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<Menu>>.ServerErrorResult($"Failed to get menus: {ex.Message}"));
        }
    }

    /// <summary>
    /// 获取菜单树结构
    /// </summary>
    [HttpGet("tree")]
    public async Task<ActionResult<ApiResponse<List<MenuTreeNode>>>> GetMenuTree()
    {
        try
        {
            var menuTree = await _menuService.GetMenuTreeAsync();
            return Ok(ApiResponse<List<MenuTreeNode>>.SuccessResult(menuTree));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<MenuTreeNode>>.ServerErrorResult($"Failed to get menu tree: {ex.Message}"));
        }
    }

    /// <summary>
    /// 获取当前用户可访问菜单
    /// </summary>
    [HttpGet("user")]
    public async Task<ActionResult<ApiResponse<List<MenuTreeNode>>>> GetUserMenus()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<List<MenuTreeNode>>.UnauthorizedResult("User not authenticated"));
            }

            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<List<MenuTreeNode>>.NotFoundResult("User not found"));
            }

            // 如果用户有 roleIds，使用它；否则返回空列表或基于旧的 role 字段
            var roleIds = user.RoleIds != null && user.RoleIds.Any() 
                ? user.RoleIds 
                : new List<string>();

            var userMenus = await _menuService.GetUserMenusAsync(roleIds);
            return Ok(ApiResponse<List<MenuTreeNode>>.SuccessResult(userMenus));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<MenuTreeNode>>.ServerErrorResult($"Failed to get user menus: {ex.Message}"));
        }
    }

    /// <summary>
    /// 根据ID获取菜单
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Menu>>> GetMenuById(string id)
    {
        try
        {
            var menu = await _menuService.GetMenuByIdAsync(id);
            if (menu == null)
            {
                return NotFound(ApiResponse<Menu>.NotFoundResult("Menu not found"));
            }
            return Ok(ApiResponse<Menu>.SuccessResult(menu));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<Menu>.ServerErrorResult($"Failed to get menu: {ex.Message}"));
        }
    }

    /// <summary>
    /// 创建菜单
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Menu>>> CreateMenu([FromBody] CreateMenuRequest request)
    {
        try
        {
            var menu = await _menuService.CreateMenuAsync(request);
            return Ok(ApiResponse<Menu>.SuccessResult(menu));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<Menu>.ServerErrorResult($"Failed to create menu: {ex.Message}"));
        }
    }

    /// <summary>
    /// 更新菜单
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateMenu(string id, [FromBody] UpdateMenuRequest request)
    {
        try
        {
            var success = await _menuService.UpdateMenuAsync(id, request);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.NotFoundResult("Menu not found or not updated"));
            }
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to update menu: {ex.Message}"));
        }
    }

    /// <summary>
    /// 删除菜单
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenu(string id)
    {
        try
        {
            var success = await _menuService.DeleteMenuAsync(id);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.NotFoundResult("Menu not found"));
            }
            return Ok(ApiResponse<bool>.SuccessResult(true));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.ErrorResult("BAD_REQUEST", ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to delete menu: {ex.Message}"));
        }
    }

    /// <summary>
    /// 菜单排序
    /// </summary>
    [HttpPost("reorder")]
    public async Task<ActionResult<ApiResponse<bool>>> ReorderMenus([FromBody] ReorderMenusRequest request)
    {
        try
        {
            var success = await _menuService.ReorderMenusAsync(request.MenuIds, request.ParentId);
            return Ok(ApiResponse<bool>.SuccessResult(success));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.ServerErrorResult($"Failed to reorder menus: {ex.Message}"));
        }
    }
}

