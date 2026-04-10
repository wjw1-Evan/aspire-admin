using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单访问权限服务实现
/// 简化版：只支持菜单名称级别的权限控制
/// </summary>
public class MenuAccessService : IMenuAccessService
{
    private readonly DbContext _context;

    private readonly ILogger<MenuAccessService> _logger;

    /// <summary>
    /// 初始化菜单访问权限服务
    /// </summary>
    public MenuAccessService(DbContext context,
        ILogger<MenuAccessService> logger
    ) {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 检查用户是否具有指定菜单的访问权限
    /// </summary>
    public async Task<bool> HasMenuAccessAsync(string menuName, string userId)
    {
        
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(menuName))
        {
            return false;
        }

        var userMenuNames = await GetUserMenuNamesAsync(userId);
        return userMenuNames.Contains(menuName);
    }

    /// <summary>
    /// 检查用户是否有任意一个菜单的访问权限
    /// </summary>
    public async Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        return menuNames.Any(m => userMenuNames.Contains(m));
    }

    /// <summary>
    /// 获取用户的菜单名称列表
    /// </summary>
    public async Task<List<string>> GetUserMenuNamesAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new List<string>();
        }

        try
        {
            // 获取用户信息
            var user = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == userId);
            if (user == null || !user.IsActive)
            {
                return new List<string>();
            }

            // 获取用户的企业ID
            var companyId = user.CurrentCompanyId;
            if (string.IsNullOrEmpty(companyId))
            {
                _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
                return new List<string>();
            }

            _logger.LogDebug("获取用户 {UserId} 在企业 {CompanyId} 的菜单权限", userId, companyId);

            // 获取用户在企业中的关联关系
            var userCompanies = await _context.Set<UserCompany>().Where(uc => 
                uc.UserId == userId && 
                uc.CompanyId == companyId && 
                uc.Status == "active").ToListAsync();
            var userCompany = userCompanies.FirstOrDefault();

            if (userCompany == null)
            {
                _logger.LogWarning("用户 {UserId} 在企业 {CompanyId} 中没有找到有效的成员关系", userId, companyId);
                return new List<string>();
            }

            var menuIds = new List<string>();

            if (userCompany.RoleIds != null && userCompany.RoleIds.Any())
            {
                // 获取用户的所有角色
                var roles = await _context.Set<Role>().IgnoreQueryFilters().Where(x => x.IsDeleted != true).Where(r => 
                    userCompany.RoleIds.Contains(r.Id) && 
                    r.CompanyId == companyId && 
                    r.IsActive == true).ToListAsync();

                _logger.LogDebug("用户 {UserId} 在企业 {CompanyId} 拥有 {RoleCount} 个角色",
                    userId, companyId, roles.Count);

                // 收集所有角色的菜单ID
                foreach (var role in roles)
                {
                    if (role.MenuIds != null)
                    {
                        menuIds.AddRange(role.MenuIds);
                    }
                }
            }
            else
            {
                _logger.LogWarning("用户 {UserId} 在企业 {CompanyId} 中没有分配任何角色", userId, companyId);
            }

            // 去重菜单ID
            var uniqueMenuIds = menuIds.Distinct().ToList();
            if (!uniqueMenuIds.Any())
            {
                return new List<string>();
            }

            // 获取菜单详情
            var menus = await _context.Set<Menu>().Where(m => 
                uniqueMenuIds.Contains(m.Id) && 
                m.IsEnabled == true).ToListAsync();

            // 返回菜单名称列表
            var menuNames = menus.Select(m => m.Name).Distinct().ToList();
            _logger.LogDebug("用户 {UserId} 拥有 {MenuCount} 个菜单权限: {MenuNames}",
                userId, menuNames.Count, string.Join(", ", menuNames));
            return menuNames;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单名称失败: UserId={UserId}", userId);
            return new List<string>();
        }
    }
}