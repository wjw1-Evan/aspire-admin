using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class PermissionCheckService : IPermissionCheckService
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IMongoCollection<UserCompany> _userCompanies;
    private readonly ITenantContext _tenantContext;

    public PermissionCheckService(IMongoDatabase database, ITenantContext tenantContext)
    {
        _users = database.GetCollection<AppUser>("users");
        _roles = database.GetCollection<Role>("roles");
        _permissions = database.GetCollection<Permission>("permissions");
        _userCompanies = database.GetCollection<UserCompany>("user_companies");
        _tenantContext = tenantContext;
    }

    public async Task<bool> HasPermissionAsync(string userId, string permissionCode)
    {
        var permissionCodes = await GetUserPermissionCodesAsync(userId);
        return permissionCodes.Contains(permissionCode.ToLower());
    }

    public async Task<bool> HasAnyPermissionAsync(string userId, params string[] permissionCodes)
    {
        var userPermissions = await GetUserPermissionCodesAsync(userId);
        var lowerPermissionCodes = permissionCodes.Select(c => c.ToLower()).ToArray();
        return lowerPermissionCodes.Any(pc => userPermissions.Contains(pc));
    }

    public async Task<bool> HasAllPermissionsAsync(string userId, params string[] permissionCodes)
    {
        var userPermissions = await GetUserPermissionCodesAsync(userId);
        var lowerPermissionCodes = permissionCodes.Select(c => c.ToLower()).ToArray();
        return lowerPermissionCodes.All(pc => userPermissions.Contains(pc));
    }

    public async Task<UserPermissionsResponse> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _users.Find(u => u.Id == userId && u.IsActive).FirstOrDefaultAsync();
        if (user == null)
        {
            return new UserPermissionsResponse();
        }

        var rolePermissions = new List<Permission>();
        var customPermissions = new List<Permission>();
        var companyId = user.CurrentCompanyId; // v3.1: 使用用户的 CurrentCompanyId 确保安全性

        // v3.1: 从 UserCompany 表获取用户在当前企业的角色
        var userCompanyFilter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.UserId, userId),
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        
        var userCompany = await _userCompanies.Find(userCompanyFilter).FirstOrDefaultAsync();
        
        if (userCompany != null && userCompany.RoleIds.Count > 0)
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, userCompany.RoleIds),
                Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
                Builders<Role>.Filter.Eq(r => r.IsActive, true),
                MongoFilterExtensions.NotDeleted<Role>()
            );
            var roles = await _roles.Find(roleFilter).ToListAsync();

            var rolePermissionIds = roles.SelectMany(r => r.PermissionIds).Distinct().ToList();
            if (rolePermissionIds.Count > 0)
            {
                var permFilter = Builders<Permission>.Filter.And(
                    Builders<Permission>.Filter.In(p => p.Id, rolePermissionIds),
                    Builders<Permission>.Filter.Eq(p => p.CompanyId, companyId),  // v3.0: 企业过滤
                    MongoFilterExtensions.NotDeleted<Permission>()
                );
                rolePermissions = await _permissions.Find(permFilter).ToListAsync();
            }
        }

        // 获取用户自定义权限（v3.0 多租户：添加 CompanyId 过滤）
        if (user.CustomPermissionIds != null && user.CustomPermissionIds.Count > 0)
        {
            var customPermFilter = Builders<Permission>.Filter.And(
                Builders<Permission>.Filter.In(p => p.Id, user.CustomPermissionIds),
                Builders<Permission>.Filter.Eq(p => p.CompanyId, companyId),  // v3.0: 企业过滤
                MongoFilterExtensions.NotDeleted<Permission>()
            );
            customPermissions = await _permissions.Find(customPermFilter).ToListAsync();
        }

        // 合并所有权限代码（去重）
        var allPermissionCodes = rolePermissions.Select(p => p.Code)
            .Concat(customPermissions.Select(p => p.Code))
            .Distinct()
            .ToList();

        return new UserPermissionsResponse
        {
            RolePermissions = rolePermissions,
            CustomPermissions = customPermissions,
            AllPermissionCodes = allPermissionCodes
        };
    }

    public async Task<List<string>> GetUserPermissionCodesAsync(string userId)
    {
        var response = await GetUserPermissionsAsync(userId);
        return response.AllPermissionCodes;
    }
}

