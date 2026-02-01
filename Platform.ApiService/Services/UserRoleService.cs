using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Constants;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户角色服务实现
/// </summary>
/// <param name="userFactory">用户数据库工厂</param>
/// <param name="roleFactory">角色数据库工厂</param>
/// <param name="userCompanyFactory">用户企业关联数据库工厂</param>
public class UserRoleService(
    IDatabaseOperationFactory<AppUser> userFactory,
    IDatabaseOperationFactory<Role> roleFactory,
    IDatabaseOperationFactory<UserCompany> userCompanyFactory) : IUserRoleService
{
    // Explicitly use AppUser if User is ambiguous, or ensure using directive covers it.
    // In this project, User usually refers to AppUser aliased or imported.
    // UserService aliased it: using User = Platform.ApiService.Models.AppUser;
    // Let's us AppUser directly to be safe.
    private readonly IDatabaseOperationFactory<AppUser> _userFactory = userFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory = roleFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory = userCompanyFactory;

    /// <inheritdoc/>
    public async Task<object> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _userFactory.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // 获取用户在当前企业的角色（从数据库获取，不使用 JWT token）
        var companyId = user.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
        {
            // 没有企业上下文，返回空权限
            return new
            {
                menuIds = Array.Empty<string>()
            };
        }

        var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();

        var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
        var userCompany = userCompanies.FirstOrDefault();

        var menuIds = new List<string>();

        if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
        {
            // 获取用户角色对应的菜单权限
            var roleFilter = _roleFactory.CreateFilterBuilder()
                .In(r => r.Id, userCompany.RoleIds)
                .Equal(r => r.CompanyId, companyId)
                .Equal(r => r.IsActive, true)
                .Build();

            var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);

            // 收集所有角色的菜单ID
            menuIds = roles.SelectMany(r => r.MenuIds).Distinct().ToList();
        }

        return new
        {
            menuIds = menuIds.ToArray()
        };
    }

    /// <inheritdoc/>
    public async Task<List<string>> ValidateRoleOwnershipAsync(List<string> roleIds)
    {
        if (roleIds == null || !roleIds.Any())
        {
            return new List<string>();
        }

        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = currentUser?.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
        {
            // 如果没有企业上下文（如企业注册时创建管理员），直接返回
            return roleIds;
        }

        // 查询属于当前企业的角色
        var roleFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Equal(r => r.CompanyId, companyId)
            .Build();
        var validRoles = await _roleFactory.FindAsync(roleFilter);

        // 验证所有请求的角色都存在且属于当前企业
        if (validRoles.Count != roleIds.Count)
        {
            var invalidRoleIds = roleIds.Except(validRoles.Select(r => r.Id!)).ToList();
            throw new InvalidOperationException(
                $"部分角色不存在或不属于当前企业: {string.Join(", ", invalidRoleIds)}"
            );
        }

        return roleIds;
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, string>> GetRoleNameMapAsync(List<string> roleIds, string companyId)
    {
        if (!roleIds.Any()) return new Dictionary<string, string>();

        var roleFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Equal(r => r.CompanyId, companyId)
            .Build();

        // 优化：使用字段投影，只返回 Id 和 Name
        var roleProjection = _roleFactory.CreateProjectionBuilder()
            .Include(r => r.Id)
            .Include(r => r.Name)
            .Build();

        var roles = await _roleFactory.FindAsync(roleFilter, projection: roleProjection);
        return roles.ToDictionary(r => r.Id!, r => r.Name);
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetUserIdsByRolesAsync(List<string> roleIds, string companyId)
    {
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, SystemConstants.UserStatus.Active)
            .Build();

        // 使用 MongoDB 的 AnyIn 操作符
        var anyInFilter = Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, roleIds);
        var combinedFilter = Builders<UserCompany>.Filter.And(filter, anyInFilter);

        var userCompanies = await _userCompanyFactory.FindAsync(combinedFilter);
        return userCompanies.Select(uc => uc.UserId).Distinct().ToList();
    }
}
