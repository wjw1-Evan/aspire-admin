using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 调试控制器 - 用于排查权限问题
/// 仅在开发环境使用
/// </summary>
[ApiController]
[Route("api/debug")]
public class DebugController : BaseApiController
{
    private readonly IMenuAccessService _menuAccessService;
    private readonly IMongoDatabase _database;

    public DebugController(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        IMenuAccessService menuAccessService)
        : base(database, httpContextAccessor, null, null)
    {
        _database = database;
        _menuAccessService = menuAccessService;
    }

    /// <summary>
    /// 检查用户权限状态
    /// </summary>
    [HttpGet("user-permissions/{userId}")]
    [Authorize]
    public async Task<IActionResult> CheckUserPermissions(string userId)
    {
        try
        {
            var users = _database.GetCollection<AppUser>("users");
            var roles = _database.GetCollection<Role>("roles");
            var menus = _database.GetCollection<Menu>("menus");
            var userCompanies = _database.GetCollection<UserCompany>("user_companies");

            // 1. 检查用户信息
            var user = await users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null)
            {
                return Success(new { error = "用户不存在" });
            }

            // 2. 检查用户-企业关联
            var userCompany = await userCompanies.Find(uc => uc.UserId == userId).FirstOrDefaultAsync();
            if (userCompany == null)
            {
                return Success(new { error = "用户-企业关联不存在" });
            }

            // 3. 检查角色信息
            var roleIds = userCompany.RoleIds ?? new List<string>();
            var roleList = new List<object>();
            foreach (var roleId in roleIds)
            {
                var role = await roles.Find(r => r.Id == roleId).FirstOrDefaultAsync();
                if (role != null)
                {
                    roleList.Add(new
                    {
                        id = role.Id,
                        name = role.Name,
                        menuIds = role.MenuIds,
                        menuCount = role.MenuIds?.Count ?? 0
                    });
                }
            }

            // 4. 检查菜单信息
            var allMenuIds = roleList.SelectMany(r => ((dynamic)r).menuIds ?? new List<string>()).Distinct().ToList();
            var menuList = new List<object>();
            foreach (var menuId in allMenuIds)
            {
                var menu = await menus.Find(m => m.Id == menuId).FirstOrDefaultAsync();
                if (menu != null)
                {
                    menuList.Add(new
                    {
                        id = menu.Id,
                        name = menu.Name,
                        title = menu.Title,
                        isEnabled = menu.IsEnabled,
                        isDeleted = menu.IsDeleted
                    });
                }
            }

            // 5. 检查菜单访问权限
            var userMenuNames = await _menuAccessService.GetUserMenuNamesAsync(userId);
            var hasUserManagementAccess = await _menuAccessService.HasMenuAccessAsync(userId, "user-management");

            return Success(new
            {
                user = new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    isActive = user.IsActive,
                    currentCompanyId = user.CurrentCompanyId
                },
                userCompany = new
                {
                    userId = userCompany.UserId,
                    companyId = userCompany.CompanyId,
                    roleIds = userCompany.RoleIds,
                    isAdmin = userCompany.IsAdmin,
                    status = userCompany.Status
                },
                roles = roleList,
                menus = menuList,
                userMenuNames = userMenuNames,
                hasUserManagementAccess = hasUserManagementAccess,
                totalMenus = menuList.Count,
                totalRoles = roleList.Count
            });
        }
        catch (Exception ex)
        {
            return Success(new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    /// <summary>
    /// 检查全局菜单状态
    /// </summary>
    [HttpGet("global-menus")]
    [Authorize]
    public async Task<IActionResult> CheckGlobalMenus()
    {
        try
        {
            var menus = _database.GetCollection<Menu>("menus");
            var allMenus = await menus.Find(_ => true).ToListAsync();
            var enabledMenus = allMenus.Where(m => m.IsEnabled && !m.IsDeleted).ToList();

            return Success(new
            {
                totalMenus = allMenus.Count,
                enabledMenus = enabledMenus.Count,
                menus = enabledMenus.Select(m => new
                {
                    id = m.Id,
                    name = m.Name,
                    title = m.Title,
                    path = m.Path,
                    isEnabled = m.IsEnabled,
                    isDeleted = m.IsDeleted,
                    permissions = m.Permissions
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            return Success(new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }
}
