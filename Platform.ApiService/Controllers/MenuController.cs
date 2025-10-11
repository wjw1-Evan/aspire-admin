using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using System.Security.Claims;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MenuController : BaseApiController
{
    private readonly IMenuService _menuService;
    private readonly IUserService _userService;

    public MenuController(IMenuService menuService, IUserService userService)
    {
        _menuService = menuService;
        _userService = userService;
    }

    /// <summary>
    /// 获取所有菜单（仅管理员）
    /// </summary>
    [HttpGet]
    [RequirePermission("menu", "read")]
    public async Task<ActionResult<ApiResponse<List<Menu>>>> GetAllMenus()
    {
        var menus = await _menuService.GetAllMenusAsync();
        return Ok(ApiResponse<List<Menu>>.SuccessResult(menus));
    }

    /// <summary>
    /// 获取菜单树结构（仅管理员）
    /// </summary>
    [HttpGet("tree")]
    [RequirePermission("menu", "read")]
    public async Task<ActionResult<ApiResponse<List<MenuTreeNode>>>> GetMenuTree()
    {
        var menuTree = await _menuService.GetMenuTreeAsync();
        return Ok(ApiResponse<List<MenuTreeNode>>.SuccessResult(menuTree));
    }

    /// <summary>
    /// 获取当前用户可访问菜单
    /// </summary>
    [HttpGet("user")]
    public async Task<ActionResult<ApiResponse<List<MenuTreeNode>>>> GetUserMenus()
    {
        var userId = GetRequiredUserId();
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("User not found");

        // 如果用户有 roleIds，使用它；否则返回空列表
        var roleIds = user.RoleIds != null && user.RoleIds.Any()
            ? user.RoleIds
            : new List<string>();

        var userMenus = await _menuService.GetUserMenusAsync(roleIds);
        return Ok(ApiResponse<List<MenuTreeNode>>.SuccessResult(userMenus));
    }

    /// <summary>
    /// 根据ID获取菜单（仅管理员）
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("menu", "read")]
    public async Task<ActionResult<ApiResponse<Menu>>> GetMenuById(string id)
    {
        var menu = await _menuService.GetMenuByIdAsync(id);
        if (menu == null)
            throw new KeyNotFoundException("Menu not found");
        
        return Ok(ApiResponse<Menu>.SuccessResult(menu));
    }

    /// <summary>
    /// 创建菜单（仅管理员）
    /// </summary>
    [HttpPost]
    [RequirePermission("menu", "create")]
    public async Task<ActionResult<ApiResponse<Menu>>> CreateMenu([FromBody] CreateMenuRequest request)
    {
        var menu = await _menuService.CreateMenuAsync(request);
        return Ok(ApiResponse<Menu>.SuccessResult(menu));
    }

    /// <summary>
    /// 更新菜单（仅管理员）
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("menu", "update")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateMenu(string id, [FromBody] UpdateMenuRequest request)
    {
        var success = await _menuService.UpdateMenuAsync(id, request);
        if (!success)
            throw new KeyNotFoundException("Menu not found or not updated");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }

    /// <summary>
    /// 软删除菜单（仅管理员）
    /// </summary>
    /// <param name="id">菜单ID</param>
    /// <param name="reason">删除原因（可选）</param>
    [HttpDelete("{id}")]
    [RequirePermission("menu", "delete")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenu(string id, [FromQuery] string? reason = null)
    {
        var success = await _menuService.DeleteMenuAsync(id, reason);
        if (!success)
            throw new KeyNotFoundException("Menu not found");
        
        return Ok(ApiResponse<bool>.SuccessResult(true));
    }

    /// <summary>
    /// 菜单排序（仅管理员）
    /// </summary>
    [HttpPost("reorder")]
    [RequirePermission("menu", "update")]
    public async Task<ActionResult<ApiResponse<bool>>> ReorderMenus([FromBody] ReorderMenusRequest request)
    {
        var success = await _menuService.ReorderMenusAsync(request.MenuIds, request.ParentId);
        return Ok(ApiResponse<bool>.SuccessResult(success));
    }
}

