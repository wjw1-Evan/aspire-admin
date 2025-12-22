using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 菜单控制器（只读）
/// 菜单是全局系统资源，不允许用户修改
/// </summary>
[ApiController]
[Route("api/menu")]
[Authorize]
public class MenuController : BaseApiController
{
    private readonly IMenuService _menuService;
    private readonly ILogger<MenuController> _logger;

    /// <summary>
    /// 初始化菜单控制器
    /// </summary>
    /// <param name="menuService">菜单服务</param>
    /// <param name="logger">日志记录器</param>
    public MenuController(IMenuService menuService, ILogger<MenuController> logger)
    {
        _menuService = menuService ?? throw new ArgumentNullException(nameof(menuService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 获取用户可见的菜单树（根据权限过滤）
    /// </summary>
    /// <remarks>
    /// 获取当前用户在当前企业中有权限访问的菜单树结构。
    /// 菜单根据用户的角色权限进行过滤，只返回用户有权限访问的菜单项。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/menu/user
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": [
    ///     {
    ///       "id": "menu1",
    ///       "name": "dashboard",
    ///       "title": "仪表板",
    ///       "path": "/dashboard",
    ///       "icon": "dashboard",
    ///       "children": []
    ///     },
    ///     {
    ///       "id": "menu2",
    ///       "name": "user-management",
    ///       "title": "用户管理",
    ///       "path": "/user-management",
    ///       "icon": "user",
    ///       "children": []
    ///     }
    ///   ]
    /// }
    /// ```
    /// </remarks>
    /// <returns>用户可见的菜单树</returns>
    /// <response code="200">成功返回菜单树</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("user")]
    public async Task<IActionResult> GetUserMenus()
    {
        var userId = GetRequiredUserId();
        
        // 从数据库获取当前用户的企业ID
        var userService = HttpContext.RequestServices.GetRequiredService<Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser>>();
        var user = await userService.GetByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
            return Success(new List<MenuTreeNode>());
        }
        var currentCompanyId = user.CurrentCompanyId;
        
        // 获取用户在当前企业的角色
        var userCompanyService = HttpContext.RequestServices.GetRequiredService<IUserCompanyService>();
        var membership = await userCompanyService.GetUserCompanyAsync(userId, currentCompanyId);
        
        if (membership == null)
        {
            _logger.LogWarning("用户 {UserId} 不属于企业 {CompanyId}", userId, currentCompanyId);
            return Success(new List<MenuTreeNode>());
        }
        
        var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);
        return Success(menus);
    }

    /// <summary>
    /// 获取所有菜单（系统管理员查看）
    /// </summary>
    [HttpGet]
    [RequireMenu("menu-management")]
    public async Task<IActionResult> GetAllMenus()
    {
        var menus = await _menuService.GetAllMenusAsync();
        return Success(menus);
    }

    /// <summary>
    /// 获取菜单树（系统管理员查看）
    /// </summary>
    [HttpGet("tree")]
    [RequireMenu("menu-management")]
    public async Task<IActionResult> GetMenuTree()
    {
        var tree = await _menuService.GetMenuTreeAsync();
        return Success(tree);
    }
}

