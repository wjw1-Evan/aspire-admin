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

    /// <summary>
    /// 初始化菜单访问权限服务
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="menuFactory">菜单数据操作工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    /// <param name="tenantContext">租户上下文</param>
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

    /// <summary>
    /// 检查用户是否具有访问权限。
    /// 支持两种输入形式：
    /// - 权限标识（包含冒号，如 "workflow:list"、"document:approval"），将按菜单的 Permissions 字段进行判断；
    /// - 菜单名称（不包含冒号，如 "user-management"、"workflow-monitor"），将按用户拥有的菜单名称进行判断。
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="menuName">权限标识或菜单名称</param>
    /// <returns>是否有访问权限</returns>
    public async Task<bool> HasMenuAccessAsync(string userId, string menuName)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(menuName))
        {
            return false;
        }

        // 如果包含冒号，视为权限标识（如 workflow:list）
        if (menuName.Contains(":"))
        {
            var permission = menuName.Trim();
            var userMenus = await GetUserMenusAsync(userId);
            foreach (var m in userMenus)
            {
                var perms = m.Permissions ?? new List<string>();
                if (perms.Contains(permission))
                {
                    return true;
                }
            }
            return false;
        }

        // 否则，按菜单名称判断（兼容旧用法，如 "user-management"）
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
    /// <returns>菜单名称列表</returns>
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
            _logger.LogDebug("用户 {UserId} 在企业 {CompanyId} 拥有 {MenuCount} 个菜单权限: {MenuNames}", 
                userId, companyId, menuNames.Count, string.Join(", ", menuNames));
            return menuNames;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单名称失败: UserId={UserId}", userId);
            return new List<string>();
        }
    }

    /// <summary>
    /// 获取用户拥有的菜单实体列表（用于基于 Permissions 的权限判断）。
    /// </summary>
    private async Task<List<Menu>> GetUserMenusAsync(string userId)
    {
        try
        {
            // 获取用户信息
            var user = await _userFactory.GetByIdAsync(userId);
            if (user == null || !user.IsActive)
            {
                return new List<Menu>();
            }

            var companyId = user.CurrentCompanyId;
            if (string.IsNullOrEmpty(companyId))
            {
                _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
                return new List<Menu>();
            }

            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, userId)
                .Equal(uc => uc.CompanyId, companyId)
                .Equal(uc => uc.Status, "active")
                .Build();

            var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
            var userCompany = userCompanies.FirstOrDefault();
            if (userCompany == null)
            {
                return new List<Menu>();
            }

            var menuIds = new List<string>();
            if (userCompany.RoleIds != null && userCompany.RoleIds.Any())
            {
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, userCompany.RoleIds)
                    .Equal(r => r.CompanyId, companyId)
                    .Equal(r => r.IsActive, true)
                    .Build();
                var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
                foreach (var role in roles)
                {
                    if (role.MenuIds != null)
                    {
                        menuIds.AddRange(role.MenuIds);
                    }
                }
            }

            var uniqueMenuIds = menuIds.Distinct().ToList();
            if (!uniqueMenuIds.Any())
            {
                return new List<Menu>();
            }

            var menuFilter = _menuFactory.CreateFilterBuilder()
                .In(m => m.Id, uniqueMenuIds)
                .Equal(m => m.IsEnabled, true)
                .Build();
            var menus = await _menuFactory.FindAsync(menuFilter);
            return menus;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取用户菜单失败: UserId={UserId}", userId);
            return new List<Menu>();
        }
    }
}

