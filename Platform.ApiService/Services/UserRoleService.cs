using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户角色服务实现
/// </summary>
public class UserRoleService : IUserRoleService
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化用户角色服务
    /// </summary>
    public UserRoleService(DbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<object> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == userId);
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

        var userCompany = await _context.Set<UserCompany>()
            .FirstOrDefaultAsync(uc => uc.UserId == userId && uc.CompanyId == companyId);

        var menuIds = new List<string>();

        if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
        {
            // 获取用户角色对应的菜单权限
            var roles = await _context.Set<Role>()
                .IgnoreQueryFilters()
                .Where(x => x.IsDeleted != true)
                .Where(r => userCompany.RoleIds.Contains(r.Id!) && r.CompanyId == companyId && r.IsActive)
                .ToListAsync();

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

        var roles = await _context.Set<Role>()
            .Where(r => roleIds.Contains(r.Id!))
            .ToListAsync();

        if (roles.Count != roleIds.Count)
        {
            var invalidRoleIds = roleIds.Except(roles.Select(r => r.Id!)).ToList();
            throw new InvalidOperationException(
                $"部分角色不存在或不属于当前企业: {string.Join(", ", invalidRoleIds)}"
            );
        }

        return roleIds;
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, string>> GetRoleNameMapAsync(List<string> roleIds)
    {
        if (roleIds == null || !roleIds.Any()) return new Dictionary<string, string>();

        var roles = await _context.Set<Role>()
            .Where(r => roleIds.Contains(r.Id!))
            .ToListAsync();

        return roles.ToDictionary(r => r.Id!, r => r.Name);
    }

    /// <inheritdoc/>
    public async Task<List<string>> GetUserIdsByRolesAsync(List<string> roleIds)
    {
        if (roleIds == null || !roleIds.Any()) return new List<string>();

        var userCompanies = await _context.Set<UserCompany>()
            .Where(uc => uc.Status == "active" && uc.RoleIds.Any(rid => roleIds.Contains(rid)))
            .ToListAsync();

        return userCompanies.Select(uc => uc.UserId).Distinct().ToList();
    }

    /// <inheritdoc/>
    public async Task<int> CountAsync()
    {
        return (int)await _context.Set<Role>().LongCountAsync();
    }
}