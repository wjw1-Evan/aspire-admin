using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单访问权限服务实现
/// </summary>
public class MenuAccessService : IMenuAccessService
{
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<MenuAccessService> _logger;
    private readonly ITenantContext _tenantContext;

    public MenuAccessService(
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        ILogger<MenuAccessService> logger,
        ITenantContext tenantContext)
    {
        _userFactory = userFactory;
        _roleFactory = roleFactory;
        _menuFactory = menuFactory;
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
        _tenantContext = tenantContext;
    }

    public async Task<bool> HasMenuAccessAsync(string userId, string menuName)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        return userMenuNames.Contains(menuName.ToLower());
    }

    public async Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames)
    {
        var userMenuNames = await GetUserMenuNamesAsync(userId);
        var lowerMenuNames = menuNames.Select(m => m.ToLower()).ToArray();
        return lowerMenuNames.Any(m => userMenuNames.Contains(m));
    }

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

            var menuIds = new List<string>();

            // 获取用户的企业ID（优先从用户信息获取，其次从当前上下文获取）
            var companyId = user.CurrentCompanyId ?? _tenantContext.GetCurrentCompanyId();
            if (string.IsNullOrEmpty(companyId))
            {
                _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
                return new List<string>();
            }

            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, userId)
                .Equal(uc => uc.CompanyId, companyId)
                .Build();

            var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
            var userCompany = userCompanies.FirstOrDefault();
            
            if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
            {
                // 获取用户的所有角色
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, userCompany.RoleIds)
                    .Build();
                var roles = await _roleFactory.FindAsync(roleFilter);

                // 收集所有角色的菜单ID
                foreach (var role in roles)
                {
                    if (role.MenuIds != null)
                    {
                        menuIds.AddRange(role.MenuIds);
                    }
                }
            }

            // 去重菜单ID
            var uniqueMenuIds = menuIds.Distinct().ToList();
            if (!uniqueMenuIds.Any())
            {
                return new List<string>();
            }

            // 获取菜单详情
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .In(m => m.Id, uniqueMenuIds)
                .Equal(m => m.IsEnabled, true)
                .Build();
            var menus = await _menuFactory.FindAsync(menuFilter);

            // 返回菜单名称列表（小写）
            return menus.Select(m => m.Name.ToLower()).Distinct().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单名称失败: UserId={UserId}", userId);
            return new List<string>();
        }
    }
}

