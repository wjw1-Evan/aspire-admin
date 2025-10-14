using MongoDB.Driver;
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

    public UserCompanyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<UserCompanyService> logger,
        IMenuService menuService)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _userCompanies = database.GetCollection<UserCompany>("user_companies");
        _users = database.GetCollection<AppUser>("users");
        _companies = database.GetCollection<Company>("companies");
        _roles = database.GetCollection<Role>("roles");
        _menus = database.GetCollection<Menu>("menus");
        _menuService = menuService;
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
        
        // 获取用户的当前企业和个人企业
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        
        foreach (var membership in memberships)
        {
            var company = await _companies.Find(c => 
                c.Id == membership.CompanyId &&
                c.IsDeleted == false
            ).FirstOrDefaultAsync();
            
            if (company == null) continue;
            
            // 获取角色名称
            var roleNames = new List<string>();
            if (membership.RoleIds.Count > 0)
            {
                var roleFilter = Builders<Role>.Filter.In(r => r.Id, membership.RoleIds);
                var roles = await _roles.Find(roleFilter).ToListAsync();
                roleNames = roles.Select(r => r.Name).ToList();
            }
            
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
        
        // 5. 获取用户在该企业的权限代码
        var permissionCodes = await GetUserPermissionCodesInCompanyAsync(userId, targetCompanyId);
        
        // 6. 生成新的JWT Token（包含新的企业信息）
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        string? newToken = null;
        if (user != null)
        {
            // 这里应该注入 IJwtService 来生成新token
            // 暂时返回null，实际实现需要在构造函数中注入服务
        }
        
        return new SwitchCompanyResult
        {
            CompanyId = targetCompanyId,
            CompanyName = company.Name,
            Menus = menus,
            PermissionCodes = permissionCodes,
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
        
        foreach (var membership in memberships)
        {
            var user = await _users.Find(u => u.Id == membership.UserId).FirstOrDefaultAsync();
            if (user == null) continue;
            
            // 获取角色名称
            var roleNames = new List<string>();
            if (membership.RoleIds.Count > 0)
            {
                var roleFilter = Builders<Role>.Filter.In(r => r.Id, membership.RoleIds);
                var roles = await _roles.Find(roleFilter).ToListAsync();
                roleNames = roles.Select(r => r.Name).ToList();
            }
            
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
            .Set(uc => uc.IsDeleted, true)
            .Set(uc => uc.DeletedBy, currentUserId)
            .Set(uc => uc.DeletedAt, DateTime.UtcNow)
            .Set(uc => uc.UpdatedAt, DateTime.UtcNow);
        
        var result = await _userCompanies.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    #region 私有辅助方法

    /// <summary>
    /// 获取用户在企业中的权限代码列表
    /// </summary>
    private async Task<List<string>> GetUserPermissionCodesInCompanyAsync(string userId, string companyId)
    {
        var membership = await GetUserCompanyAsync(userId, companyId);
        if (membership == null || membership.RoleIds.Count == 0)
        {
            return new List<string>();
        }
        
        // 获取角色的权限
        var roleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.In(r => r.Id, membership.RoleIds),
            Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<Role>.Filter.Eq(r => r.IsActive, true),
            Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
        );
        var roles = await _roles.Find(roleFilter).ToListAsync();
        
        var permissionIds = roles.SelectMany(r => r.PermissionIds).Distinct().ToList();
        if (permissionIds.Count == 0)
        {
            return new List<string>();
        }
        
        var permissions = Database.GetCollection<Permission>("permissions");
        var permFilter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.In(p => p.Id, permissionIds),
            Builders<Permission>.Filter.Eq(p => p.CompanyId, companyId),
            Builders<Permission>.Filter.Eq(p => p.IsDeleted, false)
        );
        var perms = await permissions.Find(permFilter).ToListAsync();
        
        return perms.Select(p => p.Code).ToList();
    }

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

