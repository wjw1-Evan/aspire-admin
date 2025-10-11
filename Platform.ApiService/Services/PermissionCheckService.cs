using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class PermissionCheckService : IPermissionCheckService
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Permission> _permissions;

    public PermissionCheckService(IMongoDatabase database)
    {
        _users = database.GetCollection<AppUser>("users");
        _roles = database.GetCollection<Role>("roles");
        _permissions = database.GetCollection<Permission>("permissions");
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

        // 获取角色权限
        if (user.RoleIds != null && user.RoleIds.Count > 0)
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, user.RoleIds),
                Builders<Role>.Filter.Eq(r => r.IsActive, true),
                SoftDeleteExtensions.NotDeleted<Role>()
            );
            var roles = await _roles.Find(roleFilter).ToListAsync();

            var rolePermissionIds = roles.SelectMany(r => r.PermissionIds).Distinct().ToList();
            if (rolePermissionIds.Count > 0)
            {
                var permFilter = Builders<Permission>.Filter.And(
                    Builders<Permission>.Filter.In(p => p.Id, rolePermissionIds),
                    SoftDeleteExtensions.NotDeleted<Permission>()
                );
                rolePermissions = await _permissions.Find(permFilter).ToListAsync();
            }
        }

        // 获取用户自定义权限
        if (user.CustomPermissionIds != null && user.CustomPermissionIds.Count > 0)
        {
            var customPermFilter = Builders<Permission>.Filter.And(
                Builders<Permission>.Filter.In(p => p.Id, user.CustomPermissionIds),
                SoftDeleteExtensions.NotDeleted<Permission>()
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

