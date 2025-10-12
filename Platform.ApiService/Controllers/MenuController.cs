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
    public async Task<IActionResult> GetAllMenus()
    {
        var menus = await _menuService.GetAllMenusAsync();
        return Success(menus);
    }

    /// <summary>
    /// 获取菜单树结构（仅管理员）
    /// </summary>
    [HttpGet("tree")]
    [RequirePermission("menu", "read")]
    public async Task<IActionResult> GetMenuTree()
    {
        var menuTree = await _menuService.GetMenuTreeAsync();
        return Success(menuTree);
    }

    /// <summary>
    /// 获取当前用户可访问菜单
    /// </summary>
    [HttpGet("user")]
    public async Task<IActionResult> GetUserMenus()
    {
        var userId = GetRequiredUserId();
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
            throw new KeyNotFoundException("用户不存在");

        // 如果用户有 roleIds，使用它；否则返回空列表
        var roleIds = user.RoleIds != null && user.RoleIds.Any()
            ? user.RoleIds
            : new List<string>();

        var userMenus = await _menuService.GetUserMenusAsync(roleIds);
        return Success(userMenus);
    }

    /// <summary>
    /// 根据ID获取菜单（仅管理员）
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("menu", "read")]
    public async Task<IActionResult> GetMenuById(string id)
    {
        var menu = await _menuService.GetMenuByIdAsync(id);
        if (menu == null)
            throw new KeyNotFoundException("菜单不存在");
        
        return Success(menu);
    }

    /// <summary>
    /// 创建菜单（仅管理员）
    /// </summary>
    [HttpPost]
    [RequirePermission("menu", "create")]
    public async Task<IActionResult> CreateMenu([FromBody] CreateMenuRequest request)
    {
        var menu = await _menuService.CreateMenuAsync(request);
        return Success(menu, "创建成功");
    }

    /// <summary>
    /// 更新菜单（仅管理员）
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("menu", "update")]
    public async Task<IActionResult> UpdateMenu(string id, [FromBody] UpdateMenuRequest request)
    {
        var success = await _menuService.UpdateMenuAsync(id, request);
        if (!success)
            throw new KeyNotFoundException("菜单不存在或更新失败");
        
        return Success("更新成功");
    }

    /// <summary>
    /// 软删除菜单（自动清理角色的菜单引用）
    /// </summary>
    /// <param name="id">菜单ID</param>
    /// <param name="reason">删除原因（可选）</param>
    [HttpDelete("{id}")]
    [RequirePermission("menu", "delete")]
    public async Task<IActionResult> DeleteMenu(string id, [FromQuery] string? reason = null)
    {
        var success = await _menuService.DeleteMenuAsync(id, reason);
        if (!success)
            throw new KeyNotFoundException("菜单不存在");
        
        return Success("删除成功");
    }

    /// <summary>
    /// 菜单排序（仅管理员）
    /// </summary>
    [HttpPost("reorder")]
    [RequirePermission("menu", "update")]
    public async Task<IActionResult> ReorderMenus([FromBody] ReorderMenusRequest request)
    {
        var success = await _menuService.ReorderMenusAsync(request.MenuIds, request.ParentId);
        return Success(success ? "排序成功" : "排序失败");
    }
}

