using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class PermissionService : IPermissionService
{
    private readonly IMongoCollection<Permission> _permissions;
    private readonly ILogger<PermissionService> _logger;

    public PermissionService(IMongoDatabase database, ILogger<PermissionService> logger)
    {
        _permissions = database.GetCollection<Permission>("permissions");
        _logger = logger;
    }

    public async Task<List<Permission>> GetAllPermissionsAsync()
    {
        var filter = SoftDeleteExtensions.NotDeleted<Permission>();
        return await _permissions.Find(filter)
            .SortBy(p => p.ResourceName)
            .ThenBy(p => p.Action)
            .ToListAsync();
    }

    public async Task<Permission?> GetPermissionByIdAsync(string id)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.Id, id),
            SoftDeleteExtensions.NotDeleted<Permission>()
        );
        return await _permissions.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<Permission?> GetPermissionByCodeAsync(string code)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.Code, code),
            SoftDeleteExtensions.NotDeleted<Permission>()
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
        _logger.LogInformation("Created permission {Code} by {UserId}", code, createdBy);
        
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

        _logger.LogInformation("Updated permission {Id} by {UserId}", id, updatedBy);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeletePermissionAsync(string id, string deletedBy, string? reason = null)
    {
        var result = await _permissions.SoftDeleteByIdAsync(id, deletedBy, reason);
        
        if (result)
        {
            _logger.LogInformation("Deleted permission {Id} by {UserId}", id, deletedBy);
        }
        
        return result;
    }

    public async Task<List<Permission>> GetPermissionsByResourceAsync(string resource)
    {
        var filter = Builders<Permission>.Filter.And(
            Builders<Permission>.Filter.Eq(p => p.ResourceName, resource.ToLower()),
            SoftDeleteExtensions.NotDeleted<Permission>()
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
            SoftDeleteExtensions.NotDeleted<Permission>()
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

    public async Task InitializeDefaultPermissionsAsync()
    {
        _logger.LogInformation("Initializing default permissions...");

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
            _logger.LogInformation("Created {Count} default permissions", permissionsToCreate.Count);
        }
        else
        {
            _logger.LogInformation("Default permissions already exist");
        }
    }
}

