using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
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
    private readonly IUserCompanyService _userCompanyService;

    public MenuController(IMenuService menuService, IUserService userService, IUserCompanyService userCompanyService)
    {
        _menuService = menuService;
        _userService = userService;
        _userCompanyService = userCompanyService;
    }

    /// <summary>
    /// 获取所有菜单（仅管理员）
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Read)]
    public async Task<IActionResult> GetAllMenus()
    {
        var menus = await _menuService.GetAllMenusAsync();
        return Success(menus);
    }

    /// <summary>
    /// 获取菜单树结构（仅管理员）
    /// </summary>
    [HttpGet("tree")]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Read)]
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
        var user = (await _userService.GetUserByIdAsync(userId)).EnsureFound("用户", userId);
        
        if (string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            return Success(new List<MenuTreeNode>());
        }

        // v3.1: 从 UserCompany 表获取用户在当前企业的角色
        var userCompany = await _userCompanyService.GetUserCompanyAsync(userId, user.CurrentCompanyId);
        var roleIds = userCompany?.RoleIds ?? new List<string>();

        var userMenus = await _menuService.GetUserMenusAsync(roleIds);
        return Success(userMenus);
    }

    /// <summary>
    /// 根据ID获取菜单（仅管理员）
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Read)]
    public async Task<IActionResult> GetMenuById(string id)
    {
        var menu = await _menuService.GetMenuByIdAsync(id);
        return Success(menu.EnsureFound("菜单", id));
    }

    /// <summary>
    /// 创建菜单（仅管理员）
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Create)]
    public async Task<IActionResult> CreateMenu([FromBody] CreateMenuRequest request)
    {
        var menu = await _menuService.CreateMenuAsync(request);
        return Success(menu, ErrorMessages.CreateSuccess);
    }

    /// <summary>
    /// 更新菜单（仅管理员）
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Update)]
    public async Task<IActionResult> UpdateMenu(string id, [FromBody] UpdateMenuRequest request)
    {
        var success = await _menuService.UpdateMenuAsync(id, request);
        success.EnsureSuccess("菜单", id);
        return Success(ErrorMessages.UpdateSuccess);
    }

    /// <summary>
    /// 软删除菜单（自动清理角色的菜单引用）
    /// </summary>
    /// <param name="id">菜单ID</param>
    /// <param name="reason">删除原因（可选，最大长度200字符）</param>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Delete)]
    public async Task<IActionResult> DeleteMenu(string id, [FromQuery] string? reason = null)
    {
        var success = await _menuService.DeleteMenuAsync(id, reason);
        success.EnsureSuccess("菜单", id);
        return Success(ErrorMessages.DeleteSuccess);
    }

    /// <summary>
    /// 菜单排序（仅管理员）
    /// </summary>
    [HttpPost("reorder")]
    [RequirePermission(PermissionResources.Menu, PermissionActions.Update)]
    public async Task<IActionResult> ReorderMenus([FromBody] ReorderMenusRequest request)
    {
        var success = await _menuService.ReorderMenusAsync(request.MenuIds, request.ParentId);
        return Success(success ? "排序成功" : "排序失败");
    }
}

