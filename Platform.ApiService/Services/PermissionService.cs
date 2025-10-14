using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class PermissionService : IPermissionService
{
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<AppUser> _users;
    private readonly ILogger<PermissionService> _logger;

    public PermissionService(IMongoDatabase database, ILogger<PermissionService> logger)
    {
        _permissions = database.GetCollection<Permission>("permissions");
        _roles = database.GetCollection<Role>("roles");
        _users = database.GetCollection<AppUser>("users");
        _logger = logger;
    }

    public async Task<List<Permission>> GetAllPermissionsAsync()
    {
        var filter = MongoFilterExtensions.NotDeleted<Permission>();
        return await _permissions.Find(filter)
            .SortBy(p => p.ResourceName)
            .ThenBy(p => p.Action)
            .ToListAsync();
    }

    public async Task<Permission?> GetPermissionByIdAsync(string id)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.Id, id),
            MongoFilterExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<Permission?> GetPermissionByCodeAsync(string code)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.Code, code),
            MongoFilterExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<Permission> CreatePermissionAsync(CreatePermissionRequest request, string createdBy)
    {
        // 生成权限代码
        var code = $"{request.ResourceName}:{request.Action}";

        // 检查权限代码是否已存在
        var existing = await GetPermissionByCodeAsync(code);
        if (existing != null)
        {
            throw new InvalidOperationException($"权限代码 {code} 已存在");
        }

        var permission = new Permission
        {
            ResourceName = request.ResourceName.ToLower(),
            ResourceTitle = request.ResourceTitle,
            Action = request.Action.ToLower(),
            ActionTitle = request.ActionTitle,
            Code = code.ToLower(),
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _permissions.InsertOneAsync(permission);
        
        return permission;
    }

    public async Task<bool> UpdatePermissionAsync(string id, UpdatePermissionRequest request, string updatedBy)
    {
        var permission = await GetPermissionByIdAsync(id);
        if (permission == null)
        {
            return false;
        }

        var updateBuilder = Builders<Permission>.Update;
        var updates = new List<UpdateDefinition<Permission>>
        {
            updateBuilder.Set(p => p.UpdatedAt, DateTime.UtcNow)
        };

        if (!string.IsNullOrEmpty(request.ResourceName))
        {
            updates.Add(updateBuilder.Set(p => p.ResourceName, request.ResourceName.ToLower()));
        }

        if (!string.IsNullOrEmpty(request.ResourceTitle))
        {
            updates.Add(updateBuilder.Set(p => p.ResourceTitle, request.ResourceTitle));
        }

        if (!string.IsNullOrEmpty(request.Action))
        {
            updates.Add(updateBuilder.Set(p => p.Action, request.Action.ToLower()));
        }

        if (!string.IsNullOrEmpty(request.ActionTitle))
        {
            updates.Add(updateBuilder.Set(p => p.ActionTitle, request.ActionTitle));
        }

        if (request.Description != null)
        {
            updates.Add(updateBuilder.Set(p => p.Description, request.Description));
        }

        // 如果资源名称或操作类型变更，需要更新代码
        var newResourceName = request.ResourceName?.ToLower() ?? permission.ResourceName;
        var newAction = request.Action?.ToLower() ?? permission.Action;
        var newCode = $"{newResourceName}:{newAction}";
        if (newCode != permission.Code)
        {
            updates.Add(updateBuilder.Set(p => p.Code, newCode));
        }

        var update = updateBuilder.Combine(updates);
        var result = await _permissions.UpdateOneAsync(p => p.Id == id, update);

        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeletePermissionAsync(string id, string deletedBy, string? reason = null)
    {
        // 检查权限是否存在
        var permission = await GetPermissionByIdAsync(id);
        if (permission == null)
        {
            return false;
        }
        
        // 查找引用此权限的角色
        var rolesFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.AnyIn(r => r.PermissionIds, new[] { id }),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var rolesWithPermission = await _roles.Find(rolesFilter).ToListAsync();
        
        // 自动从所有角色的 PermissionIds 中移除此权限
        if (rolesWithPermission.Count > 0)
        {
            foreach (var role in rolesWithPermission)
            {
                var newPermissionIds = role.PermissionIds.Where(pid => pid != id).ToList();
                
                var update = Builders<Role>.Update
                    .Set(r => r.PermissionIds, newPermissionIds)
                    .Set(r => r.UpdatedAt, DateTime.UtcNow);
                    
                await _roles.UpdateOneAsync(r => r.Id == role.Id, update);
            }
            
            _logger.LogInformation($"已从 {rolesWithPermission.Count} 个角色的权限列表中移除权限 {permission.Code} ({id})");
        }
        
        // 查找自定义权限包含此权限的用户
        var usersFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.AnyIn(u => u.CustomPermissionIds, new[] { id }),
            SoftDeleteExtensions.NotDeleted<AppUser>()
        );
        var usersWithPermission = await _users.Find(usersFilter).ToListAsync();
        
        // 自动从所有用户的 CustomPermissionIds 中移除此权限
        if (usersWithPermission.Count > 0)
        {
            foreach (var user in usersWithPermission)
            {
                var newCustomPermissionIds = user.CustomPermissionIds.Where(pid => pid != id).ToList();
                
                var update = Builders<AppUser>.Update
                    .Set(u => u.CustomPermissionIds, newCustomPermissionIds)
                    .Set(u => u.UpdatedAt, DateTime.UtcNow);
                    
                await _users.UpdateOneAsync(u => u.Id == user.Id, update);
            }
            
            _logger.LogInformation($"已从 {usersWithPermission.Count} 个用户的自定义权限列表中移除权限 {permission.Code} ({id})");
        }
        
        // 软删除权限
        var result = await _permissions.SoftDeleteByIdAsync(id, deletedBy, reason);
        
        if (result)
        {
            _logger.LogInformation($"已删除权限: {permission.Code} ({id}), 原因: {reason ?? "未提供"}");
        }
        
        return result;
    }

    public async Task<List<Permission>> GetPermissionsByResourceAsync(string resource)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.ResourceName, resource.ToLower()),
            MongoFilterExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter)
            .SortBy(p => p.Action)
            .ToListAsync();
    }

    public async Task<List<Permission>> GetPermissionsByCodesAsync(List<string> codes)
    {
        if (codes == null || codes.Count == 0)
        {
            return new List<Permission>();
        }

        var lowerCodes = codes.Select(c => c.ToLower()).ToList();
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.In(p => p.Code, lowerCodes),
            MongoFilterExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).ToListAsync();
    }

    public async Task<List<PermissionGroup>> GetPermissionsGroupedByResourceAsync()
    {
        var allPermissions = await GetAllPermissionsAsync();
        
        var groups = allPermissions
            .GroupBy(p => new { p.ResourceName, p.ResourceTitle })
            .Select(g => new PermissionGroup
            {
                ResourceName = g.Key.ResourceName,
                ResourceTitle = g.Key.ResourceTitle,
                Permissions = g.OrderBy(p => p.Action).ToList()
            })
            .OrderBy(g => g.ResourceName)
            .ToList();

        return groups;
    }

    /// <summary>
    /// 获取默认权限定义（用于企业注册时创建）
    /// </summary>
    public List<(string ResourceName, string ResourceTitle, string Action, string ActionTitle, string? Description)> GetDefaultPermissions()
    {
        // 定义系统资源
        var resources = new[]
        {
            ("user", "用户"),
            ("role", "角色"),
            ("menu", "菜单"),
            ("notice", "公告"),
            ("tag", "标签"),
            ("permission", "权限"),
            ("activity-log", "活动日志"),
            ("company", "企业")  // 新增企业管理权限
        };

        // 定义操作类型
        var actions = new[]
        {
            ("create", "创建"),
            ("read", "查看"),
            ("update", "修改"),
            ("delete", "删除")
        };

        var permissions = new List<(string, string, string, string, string?)>();

        // 为每个资源生成 4 个权限（CRUD）
        foreach (var (resourceName, resourceTitle) in resources)
        {
            foreach (var (action, actionTitle) in actions)
            {
                permissions.Add((
                    resourceName,
                    resourceTitle,
                    action,
                    actionTitle,
                    $"{resourceTitle}{actionTitle}权限"
                ));
            }
        }

        return permissions;
    }

    public async Task InitializeDefaultPermissionsAsync()
    {
        // 定义系统资源
        var resources = new[]
        {
            ("user", "用户"),
            ("role", "角色"),
            ("menu", "菜单"),
            ("notice", "公告"),
            ("tag", "标签"),
            ("permission", "权限"),
            ("activity-log", "活动日志")
        };

        // 定义操作类型
        var actions = new[]
        {
            ("create", "创建"),
            ("read", "查看"),
            ("update", "修改"),
            ("delete", "删除")
        };

        var permissionsToCreate = new List<Permission>();

        // 为每个资源生成 4 个权限（CRUD）
        foreach (var (resourceName, resourceTitle) in resources)
        {
            foreach (var (action, actionTitle) in actions)
            {
                var code = $"{resourceName}:{action}";
                
                // 检查权限是否已存在
                var existing = await GetPermissionByCodeAsync(code);
                if (existing == null)
                {
                    permissionsToCreate.Add(new Permission
                    {
                        ResourceName = resourceName,
                        ResourceTitle = resourceTitle,
                        Action = action,
                        ActionTitle = actionTitle,
                        Code = code,
                        Description = $"{resourceTitle}{actionTitle}权限",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    });
                }
            }
        }

        if (permissionsToCreate.Count > 0)
        {
            await _permissions.InsertManyAsync(permissionsToCreate);
        }
    }

    /// <summary>
    /// 获取用户所有权限
    /// </summary>
    public async Task<List<Permission>> GetUserAllPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            return new List<Permission>();
        }

        // 获取用户的所有权限（角色权限 + 自定义权限）
        var allPermissionIds = new List<string>();
        
        // 1. 获取角色权限
        if (user.RoleIds != null && user.RoleIds.Any())
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, user.RoleIds),
                MongoFilterExtensions.NotDeleted<Role>()
            );
            var roles = await _roles.Find(roleFilter).ToListAsync();
            
            foreach (var role in roles)
            {
                if (role.PermissionIds != null)
                {
                    allPermissionIds.AddRange(role.PermissionIds);
                }
            }
        }
        
        // 2. 获取自定义权限
        if (user.CustomPermissionIds != null && user.CustomPermissionIds.Any())
        {
            allPermissionIds.AddRange(user.CustomPermissionIds);
        }
        
        // 3. 去重并获取权限详情
        var uniquePermissionIds = allPermissionIds.Distinct().ToList();
        if (!uniquePermissionIds.Any())
        {
            return new List<Permission>();
        }
        
        var permissionFilter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.In(p => p.Id, uniquePermissionIds),
            MongoFilterExtensions.NotDeleted<Permission>()
        );
        
        return await _permissions.Find(permissionFilter).ToListAsync();
    }

    /// <summary>
    /// 获取用户权限信息（包含角色名和权限代码）
    /// </summary>
    public async Task<UserPermissionsResponse> GetUserPermissionsAsync(string userId)
    {
        // 获取用户信息
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null)
        {
            return new UserPermissionsResponse();
        }

        var roleNames = new List<string>();
        var allPermissionCodes = new List<string>();
        var rolePermissions = new List<Permission>();
        var customPermissions = new List<Permission>();

        // 1. 获取角色权限
        if (user.RoleIds != null && user.RoleIds.Any())
        {
            var roleFilter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.In(r => r.Id, user.RoleIds),
                MongoFilterExtensions.NotDeleted<Role>()
            );
            var roles = await _roles.Find(roleFilter).ToListAsync();
            
            foreach (var role in roles)
            {
                roleNames.Add(role.Name);
                
                if (role.PermissionIds != null && role.PermissionIds.Any())
                {
                    var permissionFilter = Builders<Permission>.Filter.And(
                        Builders<Permission>.Filter.In(p => p.Id, role.PermissionIds),
                        MongoFilterExtensions.NotDeleted<Permission>()
                    );
                    var permissions = await _permissions.Find(permissionFilter).ToListAsync();
                    rolePermissions.AddRange(permissions);
                    allPermissionCodes.AddRange(permissions.Select(p => p.Code));
                }
            }
        }
        
        // 2. 获取自定义权限
        if (user.CustomPermissionIds != null && user.CustomPermissionIds.Any())
        {
            var customPermissionFilter = Builders<Permission>.Filter.And(
                Builders<Permission>.Filter.In(p => p.Id, user.CustomPermissionIds),
                MongoFilterExtensions.NotDeleted<Permission>()
            );
            customPermissions = await _permissions.Find(customPermissionFilter).ToListAsync();
            allPermissionCodes.AddRange(customPermissions.Select(p => p.Code));
        }
        
        // 3. 去重
        allPermissionCodes = allPermissionCodes.Distinct().ToList();

        return new UserPermissionsResponse
        {
            RolePermissions = rolePermissions,
            CustomPermissions = customPermissions,
            AllPermissionCodes = allPermissionCodes,
            RoleNames = roleNames
        };
    }
}

