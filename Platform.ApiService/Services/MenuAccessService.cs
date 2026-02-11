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
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<Menu> _menuFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<MenuAccessService> _logger;

    /// <summary>
    /// 初始化菜单访问权限服务
    /// </summary>
    public MenuAccessService(
        IDataFactory<AppUser> userFactory,
        IDataFactory<Role> roleFactory,
        IDataFactory<Menu> menuFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        ILogger<MenuAccessService> logger)
    {
        _userFactory = userFactory;
        _roleFactory = roleFactory;
        _menuFactory = menuFactory;
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 检查用户是否具有指定菜单的访问权限
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="menuName">菜单名称（如 "user-management"、"cloud-storage-files"）</param>
    /// <returns>是否有访问权限</returns>
    public async Task<bool> HasMenuAccessAsync(string userId, string menuName)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(menuName))
        {
            return false;
        }

        var userMenuNames = await GetUserMenuNamesAsync(userId);
        return userMenuNames.Contains(menuName.ToLower());
    }

    /// <summary>
    /// 检查用户是否有任意一个菜单的访问权限
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="menuNames">菜单名称列表</param>
    /// <returns>是否有访问权限</returns>
    public async Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        var lowerMenuNames = menuNames.Select(m => m.ToLower()).ToArray();
        return lowerMenuNames.Any(m => userMenuNames.Contains(m));
    }

    /// <summary>
    /// 获取用户的菜单名称列表
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>菜单名称列表（小写）</returns>
    public async Task<List<string>> GetUserMenuNamesAsync(string userId)
    {
        try
        {
            // 获取用户信息
            var user = await _userFactory.GetByIdAsync(userId);
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
            var userCompanies = await _userCompanyFactory.FindAsync(uc => 
                uc.UserId == userId && 
                uc.CompanyId == companyId && 
                uc.Status == "active");
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
                var roles = await _roleFactory.FindWithoutTenantFilterAsync(r => 
                    userCompany.RoleIds.Contains(r.Id) && 
                    r.CompanyId == companyId && 
                    r.IsActive == true);

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
            var menus = await _menuFactory.FindAsync(m => 
                uniqueMenuIds.Contains(m.Id) && 
                m.IsEnabled == true);

            // 返回菜单名称列表（小写）
            var menuNames = menus.Select(m => m.Name.ToLower()).Distinct().ToList();
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
