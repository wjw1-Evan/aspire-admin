using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class RoleService : IRoleService
{
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RoleService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<RoleService> logger)
    {
        _roles = database.GetCollection<Role>("roles");
        _users = database.GetCollection<AppUser>("users");
        _permissions = database.GetCollection<Permission>("permissions");
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    private string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        var filter = MongoFilterExtensions.NotDeleted<Role>();
        var roles = await _roles.Find(filter)
            .SortBy(r => r.CreatedAt)
            .ToListAsync();

        return new RoleListResponse
        {
            Roles = roles,
            Total = roles.Count
        };
    }
    
    /// <summary>
    /// 获取所有角色（带统计信息）
    /// </summary>
    public async Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync()
    {
        var filter = MongoFilterExtensions.NotDeleted<Role>();
        var roles = await _roles.Find(filter)
            .SortBy(r => r.CreatedAt)
            .ToListAsync();

        var rolesWithStats = new List<RoleWithStats>();
        
        foreach (var role in roles)
        {
            // 统计使用此角色的用户数量
            var userFilter = Builders<AppUser>.Filter.And(
                Builders<AppUser>.Filter.AnyIn(u => u.RoleIds, new[] { role.Id! }),
                SoftDeleteExtensions.NotDeleted<AppUser>()
            );
            var userCount = await _users.CountDocumentsAsync(userFilter);
            
            rolesWithStats.Add(new RoleWithStats
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                MenuIds = role.MenuIds ?? new List<string>(),
                PermissionIds = role.PermissionIds ?? new List<string>(),
                IsActive = role.IsActive,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt,
                UserCount = (int)userCount,
                MenuCount = role.MenuIds?.Count ?? 0,
                PermissionCount = role.PermissionIds?.Count ?? 0
            });
        }

        return new RoleListWithStatsResponse
        {
            Roles = rolesWithStats,
            Total = rolesWithStats.Count
        };
    }

    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    public async Task<Role?> GetRoleByIdAsync(string id)
    {
        var filter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Id, id),
            MongoFilterExtensions.NotDeleted<Role>()
        );
        return await _roles.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 根据名称获取角色
    /// </summary>
    public async Task<Role?> GetRoleByNameAsync(string name)
    {
        var filter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Name, name),
            MongoFilterExtensions.NotDeleted<Role>()
        );
        return await _roles.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    public async Task<Role> CreateRoleAsync(CreateRoleRequest request)
    {
        // 检查角色名称是否已存在
        var existingRole = await GetRoleByNameAsync(request.Name);
        if (existingRole != null)
        {
            throw new InvalidOperationException($"角色名称 '{request.Name}' 已存在");
        }

        var role = new Role
        {
            Name = request.Name,
            Description = request.Description,
            MenuIds = request.MenuIds,
            IsActive = request.IsActive,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _roles.InsertOneAsync(role);
        return role;
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    public async Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request)
    {
        var updateBuilder = Builders<Role>.Update;
        var updates = new List<UpdateDefinition<Role>>
        {
            updateBuilder.Set(r => r.UpdatedAt, DateTime.UtcNow)
        };

        if (request.Name != null)
        {
            // 检查新名称是否已被其他角色使用
            var existingRole = await GetRoleByNameAsync(request.Name);
            if (existingRole != null && existingRole.Id != id)
            {
                throw new InvalidOperationException($"角色名称 '{request.Name}' 已存在");
            }
            updates.Add(updateBuilder.Set(r => r.Name, request.Name));
        }

        if (request.Description != null)
            updates.Add(updateBuilder.Set(r => r.Description, request.Description));
        if (request.MenuIds != null)
            updates.Add(updateBuilder.Set(r => r.MenuIds, request.MenuIds));
        if (request.IsActive.HasValue)
            updates.Add(updateBuilder.Set(r => r.IsActive, request.IsActive.Value));

        var result = await _roles.UpdateOneAsync(
            r => r.Id == id,
            updateBuilder.Combine(updates)
        );

        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 软删除角色（自动清理用户的角色引用）
    /// </summary>
    public async Task<bool> DeleteRoleAsync(string id, string? reason = null)
    {
        // 检查角色是否存在
        var role = await GetRoleByIdAsync(id);
        if (role == null)
        {
            return false;
        }
        
        // 防止删除系统管理员角色
        if (role.Name?.ToLower() == "admin" || role.Name?.ToLower() == "系统管理员")
        {
            throw new InvalidOperationException("不能删除系统管理员角色");
        }
        
        // 查找使用此角色的用户数量（仅用于日志）
        var usersFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.AnyIn(u => u.RoleIds, new[] { id }),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var usersWithRole = await _users.Find(usersFilter).ToListAsync();
        
        // 自动从所有用户的 RoleIds 中移除此角色
        if (usersWithRole.Count > 0)
        {
            foreach (var user in usersWithRole)
            {
                var newRoleIds = user.RoleIds.Where(rid => rid != id).ToList();
                
                // 检查是否是最后一个管理员角色
                if (role.Name?.ToLower() == "admin" && newRoleIds.Count == 0)
                {
                    throw new InvalidOperationException("不能移除最后一个管理员的角色，必须至少保留一个管理员");
                }
                
                var update = Builders<AppUser>.Update
                    .Set(u => u.RoleIds, newRoleIds)
                    .Set(u => u.UpdatedAt, DateTime.UtcNow);
                    
                await _users.UpdateOneAsync(u => u.Id == user.Id, update);
            }
            
            Console.WriteLine($"已从 {usersWithRole.Count} 个用户的角色列表中移除角色 {role.Name} ({id})");
        }

        // 软删除角色
        var currentUserId = GetCurrentUserId();
        var filter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Id, id),
            MongoFilterExtensions.NotDeleted<Role>()
        );
        
        var deleted = await _roles.SoftDeleteOneAsync(filter, currentUserId, reason);
        
        if (deleted)
        {
            Console.WriteLine($"已删除角色: {role.Name} ({id}), 原因: {reason ?? "未提供"}");
        }
        
        return deleted;
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// </summary>
    public async Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds)
    {
        var result = await _roles.UpdateOneAsync(
            r => r.Id == roleId,
            Builders<Role>.Update
                .Set(r => r.MenuIds, menuIds)
                .Set(r => r.UpdatedAt, DateTime.UtcNow)
        );

        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取角色的菜单权限
    /// </summary>
    public async Task<List<string>> GetRoleMenuIdsAsync(string roleId)
    {
        var role = await GetRoleByIdAsync(roleId);
        return role?.MenuIds ?? new List<string>();
    }

    /// <summary>
    /// 为角色分配操作权限
    /// </summary>
    public async Task<bool> AssignPermissionsToRoleAsync(string roleId, List<string> permissionIds)
    {
        var result = await _roles.UpdateOneAsync(
            r => r.Id == roleId,
            Builders<Role>.Update
                .Set(r => r.PermissionIds, permissionIds)
                .Set(r => r.UpdatedAt, DateTime.UtcNow)
        );

        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取角色的操作权限
    /// </summary>
    public async Task<List<Permission>> GetRolePermissionsAsync(string roleId)
    {
        var role = await GetRoleByIdAsync(roleId);
        if (role == null || role.PermissionIds == null || role.PermissionIds.Count == 0)
        {
            return new List<Permission>();
        }

        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.In(p => p.Id, role.PermissionIds),
            SoftDeleteExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).ToListAsync();
    }
}

