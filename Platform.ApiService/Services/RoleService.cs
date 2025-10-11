using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class RoleService : IRoleService
{
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<RoleService> _logger;

    public RoleService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<RoleService> logger)
    {
        _roles = database.GetCollection<Role>("roles");
        _users = database.GetCollection<AppUser>("users");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
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
        var filter = SoftDeleteExtensions.NotDeleted<Role>();
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
    /// 根据ID获取角色
    /// </summary>
    public async Task<Role?> GetRoleByIdAsync(string id)
    {
        var filter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Id, id),
            SoftDeleteExtensions.NotDeleted<Role>()
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
            SoftDeleteExtensions.NotDeleted<Role>()
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
            throw new InvalidOperationException($"Role with name '{request.Name}' already exists.");
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
                throw new InvalidOperationException($"Role with name '{request.Name}' already exists.");
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
    /// 软删除角色（检查是否有用户使用）
    /// </summary>
    public async Task<bool> DeleteRoleAsync(string id, string? reason = null)
    {
        // 检查是否有未删除的用户使用此角色
        var usersFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.AnyIn(u => u.RoleIds, new[] { id }),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var usersWithRole = await _users.Find(usersFilter).AnyAsync();
        if (usersWithRole)
        {
            throw new InvalidOperationException("Cannot delete role that is assigned to users. Please reassign users first.");
        }

        var currentUserId = GetCurrentUserId();
        var filter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.Id, id),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        return await _roles.SoftDeleteOneAsync(filter, currentUserId, reason);
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
}

