using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户角色服务实现
/// </summary>
public class UserRoleService : IUserRoleService
{
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;

    /// <summary>
    /// 初始化用户角色服务
    /// </summary>
    /// <param name="userFactory">用户数据库工厂</param>
    /// <param name="roleFactory">角色数据库工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据库工厂</param>
    public UserRoleService(
        IDataFactory<AppUser> userFactory,
        IDataFactory<Role> roleFactory,
        IDataFactory<UserCompany> userCompanyFactory)
    {
        _userFactory = userFactory;
        _roleFactory = roleFactory;
        _userCompanyFactory = userCompanyFactory;
    }

    /// <inheritdoc/>
    public async Task<object> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _userFactory.GetByIdAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }

        // 获取用户在当前企业的角色
        var companyId = user.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
        {
            return new { menuIds = Array.Empty<string>() };
        }

        var userCompanies = await _userCompanyFactory.FindAsync(uc =>
            uc.UserId == userId && uc.CompanyId == companyId);
        var userCompany = userCompanies.FirstOrDefault();

        var menuIds = new List<string>();

        if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
        {
            // 获取用户角色对应的菜单权限
            var roles = await _roleFactory.FindWithoutTenantFilterAsync(r =>
                userCompany.RoleIds.Contains(r.Id!) &&
                r.CompanyId == companyId &&
                r.IsActive);

            // 收集所有角色的菜单ID
            menuIds = roles.SelectMany(r => r.MenuIds).Distinct().ToList();
        }

        return new { menuIds = menuIds.ToArray() };
    }

    /// <inheritdoc/>
    public async Task<List<string>> ValidateRoleOwnershipAsync(List<string> roleIds)
    {
        if (roleIds == null || !roleIds.Any())
        {
            return new List<string>();
        }

        var currentUserId = _userFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        var companyId = currentUser?.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
        {
            return roleIds;
        }

        // 查询属于当前企业的角色
        var validRoles = await _roleFactory.FindAsync(r =>
            roleIds.Contains(r.Id!) && r.CompanyId == companyId);

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

        var roles = await _roleFactory.FindAsync(r =>
            roleIds.Contains(r.Id!) && r.CompanyId == companyId);

        return roles.ToDictionary(r => r.Id!, r => r.Name);
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetUserIdsByRolesAsync(List<string> roleIds, string companyId)
    {
        // 查找属于该企业且拥有任一指定角色的活跃用户
        var userCompanies = await _userCompanyFactory.FindAsync(uc =>
            uc.CompanyId == companyId &&
            uc.Status == "active" &&
            uc.RoleIds.Any(rid => roleIds.Contains(rid)));

        return userCompanies.Select(uc => uc.UserId).Distinct().ToList();
    }

    /// <inheritdoc/>
    public async Task<int> CountAsync()
    {
        return (int)await _roleFactory.CountAsync();
    }
}
