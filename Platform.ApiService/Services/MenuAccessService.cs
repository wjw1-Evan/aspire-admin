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

            // 获取用户的企业ID（从数据库获取，不使用 JWT token 中的企业ID）
            // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，统一从数据库获取
            var companyId = user.CurrentCompanyId;
            if (string.IsNullOrEmpty(companyId))
            {
                _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
                return new List<string>();
            }

            _logger.LogDebug("获取用户 {UserId} 在企业 {CompanyId} 的菜单权限", userId, companyId);

            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, userId)
                .Equal(uc => uc.CompanyId, companyId)
                .Equal(uc => uc.Status, "active")
                .Build();

            var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
            var userCompany = userCompanies.FirstOrDefault();
            
            if (userCompany == null)
            {
                _logger.LogWarning("用户 {UserId} 在企业 {CompanyId} 中没有找到有效的成员关系", userId, companyId);
                return new List<string>();
            }
            
            if (userCompany.RoleIds != null && userCompany.RoleIds.Any())
            {
                // 获取用户的所有角色（明确指定企业ID，确保多租户隔离）
                // ⚠️ 关键修复：使用 FindWithoutTenantFilterAsync 因为我们已手动添加了 CompanyId 过滤
                // 避免 DatabaseOperationFactory 使用 JWT token 中的旧企业ID自动过滤
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, userCompany.RoleIds)
                    .Equal(r => r.CompanyId, companyId)  // ✅ 明确过滤当前企业的角色（使用数据库中的 CurrentCompanyId）
                    .Equal(r => r.IsActive, true)
                    .Build();
                var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
                
                _logger.LogDebug("用户 {UserId} 在企业 {CompanyId} 拥有 {RoleCount} 个角色，角色IDs: {RoleIds}", 
                    userId, companyId, roles.Count, string.Join(", ", userCompany.RoleIds));

                // 收集所有角色的菜单ID
                foreach (var role in roles)
                {
                    if (role.MenuIds != null)
                    {
                        menuIds.AddRange(role.MenuIds);
                        _logger.LogDebug("角色 {RoleId} ({RoleName}) 拥有 {MenuCount} 个菜单", 
                            role.Id, role.Name, role.MenuIds.Count);
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
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .In(m => m.Id, uniqueMenuIds)
                .Equal(m => m.IsEnabled, true)
                .Build();
            var menus = await _menuFactory.FindAsync(menuFilter);

            // 返回菜单名称列表（小写）
            var menuNames = menus.Select(m => m.Name.ToLower()).Distinct().ToList();
            _logger.LogInformation("用户 {UserId} 在企业 {CompanyId} 拥有 {MenuCount} 个菜单权限: {MenuNames}", 
                userId, companyId, menuNames.Count, string.Join(", ", menuNames));
            return menuNames;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单名称失败: UserId={UserId}", userId);
            return new List<string>();
        }
    }
}

