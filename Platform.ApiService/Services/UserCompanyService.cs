using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public interface IUserCompanyService
{
    // 用户企业关系
    Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId);
    Task<UserCompany?> GetUserCompanyAsync(string userId, string companyId);
    Task<bool> IsUserAdminInCompanyAsync(string userId, string companyId);
    
    // 企业切换
    Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId);
    
    // 成员管理（管理员）
    Task<List<CompanyMemberItem>> GetCompanyMembersAsync(string companyId);
    Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds);
    Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin);
    Task<bool> RemoveMemberAsync(string companyId, string userId);
}

public class UserCompanyService : IUserCompanyService
{
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IMenuService _menuService;
    private readonly ITenantContext _tenantContext;
    private readonly IJwtService _jwtService;

    public UserCompanyService(
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        IMenuService menuService,
        ITenantContext tenantContext,
        IJwtService jwtService)
    {
        _userCompanyFactory = userCompanyFactory;
        _userFactory = userFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _menuFactory = menuFactory;
        _menuService = menuService;
        _tenantContext = tenantContext;
        _jwtService = jwtService;
    }

    /// <summary>
    /// 获取用户所属的所有企业
    /// </summary>
    public async Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId)
    {
        // ✅ 使用 FindWithoutTenantFilterAsync：需要查询用户在所有企业的关联记录，不受当前企业限制
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.Status, "active")
            .Build();
        
        // ✅ 跨企业查询：用户可能在多个企业中有关联，不能只查询当前企业
        var memberships = await _userCompanyFactory.FindWithoutTenantFilterAsync(filter);
        var result = new List<UserCompanyItem>();
        
        if (!memberships.Any())
            return result;
        
        // 获取用户的当前企业和个人企业
        var user = await _userFactory.GetByIdAsync(userId);
        
        // 批量查询优化：避免N+1查询问题
        var companyIds = memberships.Select(m => m.CompanyId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();
        
        // 批量查询企业信息（跨企业查询，需要查询多个企业的信息）
        var companyFilter = _companyFactory.CreateFilterBuilder()
            .In(c => c.Id, companyIds)
            .Build();
        // ✅ Company 通常不实现 IMultiTenant，但为安全起见，如果需要跨企业查询可使用 FindWithoutTenantFilterAsync
        var companies = await _companyFactory.FindAsync(companyFilter);
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);
        
        // 批量查询角色信息（跨企业查询，需要按企业分组）
        // 注意：由于 Role 实现了 IMultiTenant，会自动过滤当前企业，但这里需要查询多个企业的角色
        // 解决方案：使用 FindWithoutTenantFilterAsync 并手动按企业分组查询
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            // 按企业分组角色ID，避免跨企业查询时的自动过滤问题
            var companyRoleMap = new Dictionary<string, List<string>>();
            foreach (var membership in memberships)
            {
                if (!companyRoleMap.ContainsKey(membership.CompanyId))
                {
                    companyRoleMap[membership.CompanyId] = new List<string>();
                }
                foreach (var roleId in membership.RoleIds)
                {
                    if (!companyRoleMap[membership.CompanyId].Contains(roleId))
                    {
                        companyRoleMap[membership.CompanyId].Add(roleId);
                    }
                }
            }
            
            // 为每个企业查询角色（明确指定企业ID）
            foreach (var (companyId, roleIds) in companyRoleMap)
            {
                if (roleIds.Any())
                {
                    var roleFilter = _roleFactory.CreateFilterBuilder()
                        .In(r => r.Id, roleIds)
                        .Equal(r => r.CompanyId, companyId)  // ✅ 明确过滤企业，确保多租户隔离
                        .Equal(r => r.IsActive, true)
                        .Build();
                    // 使用 FindWithoutTenantFilterAsync 因为我们已手动添加了 CompanyId 过滤
                    var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
                    foreach (var role in roles)
                    {
                        if (role.Id != null && !roleDict.ContainsKey(role.Id))
                        {
                            roleDict[role.Id] = role;
                        }
                    }
                }
            }
        }
        
        // 构建结果
        foreach (var membership in memberships)
        {
            var company = companyDict.GetValueOrDefault(membership.CompanyId);
            if (company == null) continue;
            
            // 获取角色名称
            var roleNames = membership.RoleIds
                .Where(roleId => roleDict.ContainsKey(roleId))
                .Select(roleId => roleDict[roleId].Name)
                .ToList();
            
            result.Add(new UserCompanyItem
            {
                CompanyId = company.Id!,
                CompanyName = company.Name,
                CompanyCode = company.Code,
                IsAdmin = membership.IsAdmin,
                IsCurrent = company.Id == user?.CurrentCompanyId,
                IsPersonal = company.Id == user?.PersonalCompanyId,
                JoinedAt = membership.JoinedAt,
                RoleNames = roleNames
            });
        }
        
        return result.OrderByDescending(x => x.IsCurrent)
                    .ThenByDescending(x => x.IsPersonal)
                    .ThenBy(x => x.CompanyName)
                    .ToList();
    }

    /// <summary>
    /// 获取用户在指定企业的关联信息
    /// </summary>
    public async Task<UserCompany?> GetUserCompanyAsync(string userId, string companyId)
    {
        // ✅ 使用 FindWithoutTenantFilterAsync：已在过滤条件中明确指定 CompanyId，无需自动过滤
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();
        
        var userCompanies = await _userCompanyFactory.FindWithoutTenantFilterAsync(filter);
        return userCompanies.FirstOrDefault();
    }

    /// <summary>
    /// 检查用户是否是企业管理员
    /// </summary>
    public async Task<bool> IsUserAdminInCompanyAsync(string userId, string companyId)
    {
        var membership = await GetUserCompanyAsync(userId, companyId);
        return membership != null && membership.IsAdmin && membership.Status == "active";
    }

    /// <summary>
    /// 切换当前企业
    /// </summary>
    public async Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId)
    {
        var userId = _userCompanyFactory.GetRequiredUserId();
        
        // 1. 验证用户是该企业的成员
        var membership = await GetUserCompanyAsync(userId, targetCompanyId);
        if (membership == null || membership.Status != "active")
        {
            throw new UnauthorizedAccessException("您不是该企业的成员");
        }
        
        // 2. 获取企业信息
        var company = await _companyFactory.GetByIdAsync(targetCompanyId);
        if (company == null)
        {
            throw new KeyNotFoundException("企业不存在");
        }
        
        // 3. 更新用户当前企业（使用原子操作）
        var userFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Id, userId)
            .Build();

        var userUpdate = _userFactory.CreateUpdateBuilder()
            .Set(u => u.CurrentCompanyId, targetCompanyId)
            .SetCurrentTimestamp()
            .Build();

        var userOptions = new FindOneAndUpdateOptions<AppUser>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUser = await _userFactory.FindOneAndUpdateAsync(userFilter, userUpdate, userOptions);
        if (updatedUser == null)
        {
            throw new KeyNotFoundException($"用户 {userId} 不存在");
        }
        
        // 4. 获取用户在该企业的菜单
        var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);
        
        // 5. 生成新的JWT Token（包含新的企业信息）
        var newToken = _jwtService.GenerateToken(updatedUser);
        
        return new SwitchCompanyResult
        {
            CompanyId = targetCompanyId,
            CompanyName = company.Name,
            Menus = menus,
            Token = newToken
        };
    }

    /// <summary>
    /// 获取企业的所有成员
    /// </summary>
    public async Task<List<CompanyMemberItem>> GetCompanyMembersAsync(string companyId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以查看成员列表");
        
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, "active")
            .Build();
        
        var memberships = await _userCompanyFactory.FindAsync(filter);
        var result = new List<CompanyMemberItem>();
        
        if (!memberships.Any())
            return result;
        
        // 批量查询优化：避免N+1查询问题
        var userIds = memberships.Select(m => m.UserId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();
        
        // 批量查询用户信息
        var userFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, userIds)
            .Build();
        var users = await _userFactory.FindAsync(userFilter);
        var userDict = users.ToDictionary(u => u.Id!, u => u);
        
        // 批量查询角色信息
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            var roleFilter = _roleFactory.CreateFilterBuilder()
                .In(r => r.Id, allRoleIds)
                .Build();
            var roles = await _roleFactory.FindAsync(roleFilter);
            roleDict = roles.ToDictionary(r => r.Id!, r => r);
        }
        
        // 构建结果
        foreach (var membership in memberships)
        {
            var user = userDict.GetValueOrDefault(membership.UserId);
            if (user == null) continue;
            
            // 获取角色名称
            var roleNames = membership.RoleIds
                .Where(roleId => roleDict.ContainsKey(roleId))
                .Select(roleId => roleDict[roleId].Name)
                .ToList();
            
            result.Add(new CompanyMemberItem
            {
                UserId = user.Id!,
                Username = user.Username,
                Email = user.Email,
                IsAdmin = membership.IsAdmin,
                RoleIds = membership.RoleIds,
                RoleNames = roleNames,
                JoinedAt = membership.JoinedAt,
                IsActive = user.IsActive
            });
        }
        
        return result;
    }

    /// <summary>
    /// 更新成员角色（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以分配角色");
        
        // 验证所有角色都属于该企业
        if (roleIds.Any())
        {
            var roleFilter = _roleFactory.CreateFilterBuilder()
                .In(r => r.Id, roleIds)
                .Equal(r => r.CompanyId, companyId)
                .Build();
            var validRoles = await _roleFactory.FindAsync(roleFilter);
            
            if (validRoles.Count != roleIds.Count)
            {
                throw new InvalidOperationException("部分角色不存在或不属于该企业");
            }
        }
        
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();
        
        var update = _userCompanyFactory.CreateUpdateBuilder()
            .Set(uc => uc.RoleIds, roleIds)
            .SetCurrentTimestamp()
            .Build();

        var options = new FindOneAndUpdateOptions<UserCompany>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUserCompany = await _userCompanyFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedUserCompany != null;
    }

    /// <summary>
    /// 设置/取消成员管理员权限（使用原子操作）
    /// </summary>
    public async Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以设置管理员");
        
        // 不能修改自己的管理员权限
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能修改自己的管理员权限");
        }
        
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();
        
        var update = _userCompanyFactory.CreateUpdateBuilder()
            .Set(uc => uc.IsAdmin, isAdmin)
            .SetCurrentTimestamp()
            .Build();

        var options = new FindOneAndUpdateOptions<UserCompany>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedUserCompany = await _userCompanyFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedUserCompany != null;
    }

    /// <summary>
    /// 移除企业成员
    /// </summary>
    public async Task<bool> RemoveMemberAsync(string companyId, string userId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = _userCompanyFactory.GetRequiredUserId();
        await this.RequireAdminAsync(currentUserId, companyId, "只有企业管理员可以移除成员");
        
        // 不能移除自己
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能移除自己，请转让管理员权限后再操作");
        }
        
        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, userId)
            .Equal(uc => uc.CompanyId, companyId)
            .Build();
        
        var result = await _userCompanyFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    #region 私有辅助方法

    #endregion
}

/// <summary>
/// 企业成员列表项
/// </summary>
public class CompanyMemberItem
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsAdmin { get; set; }
    public List<string> RoleIds { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
    public DateTime JoinedAt { get; set; }
    public bool IsActive { get; set; }
}

