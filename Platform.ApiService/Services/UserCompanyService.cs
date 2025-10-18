using MongoDB.Driver;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

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

public class UserCompanyService : BaseService, IUserCompanyService
{
    private readonly IMongoCollection<UserCompany> _userCompanies;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Company> _companies;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMenuService _menuService;
    private readonly IJwtService _jwtService;

    public UserCompanyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<UserCompanyService> logger,
        IMenuService menuService,
        IJwtService jwtService)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _userCompanies = database.GetCollection<UserCompany>("user_companies");
        _users = database.GetCollection<AppUser>("users");
        _companies = database.GetCollection<Company>("companies");
        _roles = database.GetCollection<Role>("roles");
        _menus = database.GetCollection<Menu>("menus");
        _menuService = menuService;
        _jwtService = jwtService;
    }

    /// <summary>
    /// 获取用户所属的所有企业
    /// </summary>
    public async Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId)
    {
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var memberships = await _userCompanies.Find(filter).ToListAsync();
        var result = new List<UserCompanyItem>();
        
        if (!memberships.Any())
            return result;
        
        // 获取用户的当前企业和个人企业
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        
        // 批量查询优化：避免N+1查询问题
        var companyIds = memberships.Select(m => m.CompanyId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();
        
        // 批量查询企业信息
        var companyFilter = Builders<Company>.Filter.And(
            Builders<Company>.Filter.In(c => c.Id, companyIds),
            Builders<Company>.Filter.Eq(c => c.IsDeleted, false)
        );
        var companies = await _companies.Find(companyFilter).ToListAsync();
        var companyDict = companies.ToDictionary(c => c.Id!, c => c);
        
        // 批量查询角色信息
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            var roleFilter = Builders<Role>.Filter.In(r => r.Id, allRoleIds);
            var roles = await _roles.Find(roleFilter).ToListAsync();
            roleDict = roles.ToDictionary(r => r.Id!, r => r);
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
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        return await _userCompanies.Find(filter).FirstOrDefaultAsync();
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
        var userId = GetRequiredUserId();
        
        // 1. 验证用户是该企业的成员
        var membership = await GetUserCompanyAsync(userId, targetCompanyId);
        if (membership == null || membership.Status != "active")
        {
            throw new UnauthorizedAccessException("您不是该企业的成员");
        }
        
        // 2. 获取企业信息
        var company = await _companies.Find(c => c.Id == targetCompanyId && c.IsDeleted == false)
            .FirstOrDefaultAsync();
        if (company == null)
        {
            throw new KeyNotFoundException("企业不存在");
        }
        
        // 3. 更新用户当前企业
        var update = Builders<AppUser>.Update
            .Set(u => u.CurrentCompanyId, targetCompanyId)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);
        
        await _users.UpdateOneAsync(u => u.Id == userId, update);
        
        // 4. 获取用户在该企业的菜单
        var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);
        
        // 5. 生成新的JWT Token（包含新的企业信息）
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        string? newToken = null;
        if (user != null)
        {
            // 生成新的 JWT token，包含更新后的企业信息
            newToken = await _jwtService.GenerateTokenAsync(user);
        }
        
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
        var currentUserId = GetRequiredUserId();
        if (!await IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看成员列表");
        }
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var memberships = await _userCompanies.Find(filter).ToListAsync();
        var result = new List<CompanyMemberItem>();
        
        if (!memberships.Any())
            return result;
        
        // 批量查询优化：避免N+1查询问题
        var userIds = memberships.Select(m => m.UserId).Distinct().ToList();
        var allRoleIds = memberships.SelectMany(m => m.RoleIds).Distinct().ToList();
        
        // 批量查询用户信息
        var userFilter = Builders<AppUser>.Filter.In(u => u.Id, userIds);
        var users = await _users.Find(userFilter).ToListAsync();
        var userDict = users.ToDictionary(u => u.Id!, u => u);
        
        // 批量查询角色信息
        var roleDict = new Dictionary<string, Role>();
        if (allRoleIds.Any())
        {
            var roleFilter = Builders<Role>.Filter.In(r => r.Id, allRoleIds);
            var roles = await _roles.Find(roleFilter).ToListAsync();
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
    /// 更新成员角色
    /// </summary>
    public async Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = GetRequiredUserId();
        if (!await IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以分配角色");
        }
        
        // 验证所有角色都属于该企业
        if (roleIds.Count > 0)
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, roleIds),
                Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
                Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
            );
            var validRoles = await _roles.Find(roleFilter).ToListAsync();
            
            if (validRoles.Count != roleIds.Count)
            {
                throw new InvalidOperationException("部分角色不存在或不属于该企业");
            }
        }
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var update = Builders<UserCompany>.Update
            .Set(uc => uc.RoleIds, roleIds)
            .Set(uc => uc.UpdatedAt, DateTime.UtcNow);
        
        var result = await _userCompanies.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 设置/取消成员管理员权限
    /// </summary>
    public async Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = GetRequiredUserId();
        if (!await IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以设置管理员");
        }
        
        // 不能修改自己的管理员权限
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能修改自己的管理员权限");
        }
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var update = Builders<UserCompany>.Update
            .Set(uc => uc.IsAdmin, isAdmin)
            .Set(uc => uc.UpdatedAt, DateTime.UtcNow);
        
        var result = await _userCompanies.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 移除企业成员
    /// </summary>
    public async Task<bool> RemoveMemberAsync(string companyId, string userId)
    {
        // 验证当前用户是否是该企业的管理员
        var currentUserId = GetRequiredUserId();
        if (!await IsUserAdminInCompanyAsync(currentUserId, companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以移除成员");
        }
        
        // 不能移除自己
        if (currentUserId == userId)
        {
            throw new InvalidOperationException("不能移除自己，请转让管理员权限后再操作");
        }
        
        var filter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var update = Builders<UserCompany>.Update
            .Set(uc => uc.IsDeleted, true);
        
        var result = await _userCompanies.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
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

