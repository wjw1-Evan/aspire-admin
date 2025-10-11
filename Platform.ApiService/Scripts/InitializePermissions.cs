using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Scripts;

public class InitializePermissions
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<InitializePermissions> _logger;

    public InitializePermissions(IMongoDatabase database, ILogger<InitializePermissions> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        _logger.LogInformation("=== 开始初始化权限系统 ===");

        try
        {
            // 1. 初始化默认权限
            await InitializeDefaultPermissionsAsync();

            // 2. 为超级管理员分配所有权限
            await AssignAllPermissionsToSuperAdminAsync();

            _logger.LogInformation("=== 权限系统初始化完成 ===");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "权限系统初始化失败");
            throw;
        }
    }

    private async Task InitializeDefaultPermissionsAsync()
    {
        _logger.LogInformation("初始化默认权限...");

        var permissions = _database.GetCollection<Permission>("permissions");

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
                var existing = await permissions.Find(p => p.Code == code && !p.IsDeleted)
                    .FirstOrDefaultAsync();
                
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
            await permissions.InsertManyAsync(permissionsToCreate);
            _logger.LogInformation("创建了 {Count} 个默认权限", permissionsToCreate.Count);
        }
        else
        {
            _logger.LogInformation("默认权限已存在");
        }
    }

    private async Task AssignAllPermissionsToSuperAdminAsync()
    {
        _logger.LogInformation("为超级管理员分配所有权限...");

        var roles = _database.GetCollection<Role>("roles");
        var permissions = _database.GetCollection<Permission>("permissions");

        // 查找超级管理员角色
        var superAdminRole = await roles.Find(r => r.Name == "super-admin" && !r.IsDeleted)
            .FirstOrDefaultAsync();

        if (superAdminRole == null)
        {
            _logger.LogWarning("未找到超级管理员角色");
            return;
        }

        // 获取所有权限ID
        var allPermissions = await permissions.Find(p => !p.IsDeleted).ToListAsync();
        var allPermissionIds = allPermissions.Select(p => p.Id!).ToList();

        // 更新超级管理员角色的权限
        var update = Builders<Role>.Update
            .Set(r => r.PermissionIds, allPermissionIds)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        await roles.UpdateOneAsync(r => r.Id == superAdminRole.Id, update);
        
        _logger.LogInformation("已为超级管理员分配 {Count} 个权限", allPermissionIds.Count);
    }
}

