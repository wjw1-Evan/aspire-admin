using MongoDB.Driver;
using Platform.ApiService.Models;

#pragma warning disable CS0618 // 抑制过时API警告 - 索引脚本需要访问过时属性

namespace Platform.ApiService.Scripts;

/// <summary>
/// 创建数据库索引脚本，提升查询性能
/// </summary>
public static class CreateDatabaseIndexes
{
    public static async Task ExecuteAsync(IMongoDatabase database)
    {
        Console.WriteLine("开始创建数据库索引...");
        
        await CreateUsersIndexesAsync(database);
        await CreateRolesIndexesAsync(database);
        await CreateMenusIndexesAsync(database);
        await CreatePermissionsIndexesAsync(database);
        await CreateActivityLogsIndexesAsync(database);
        
        Console.WriteLine("数据库索引创建完成！");
    }
    
    private static async Task CreateUsersIndexesAsync(IMongoDatabase database)
    {
        Console.WriteLine("创建 users 集合索引...");
        var users = database.GetCollection<AppUser>("users");
        
        // 唯一索引：username
        var usernameIndex = Builders<AppUser>.IndexKeys.Ascending(u => u.Username);
        await users.Indexes.CreateOneAsync(new CreateIndexModel<AppUser>(
            usernameIndex,
            new CreateIndexOptions { Unique = true, Name = "idx_username_unique" }
        ));
        Console.WriteLine("  - 创建唯一索引: username");
        
        // 唯一索引：email（允许空值）
        var emailIndex = Builders<AppUser>.IndexKeys.Ascending(u => u.Email);
        await users.Indexes.CreateOneAsync(new CreateIndexModel<AppUser>(
            emailIndex,
            new CreateIndexOptions 
            { 
                Unique = true, 
                Sparse = true, // 允许空值
                Name = "idx_email_unique" 
            }
        ));
        Console.WriteLine("  - 创建唯一索引: email (sparse)");
        
        // 多键索引：roleIds（用于角色过滤查询）
        var roleIdsIndex = Builders<AppUser>.IndexKeys.Ascending(u => u.RoleIds);
        await users.Indexes.CreateOneAsync(new CreateIndexModel<AppUser>(
            roleIdsIndex,
            new CreateIndexOptions { Name = "idx_roleIds" }
        ));
        Console.WriteLine("  - 创建多键索引: roleIds");
        
        // 复合索引：isActive, isDeleted（用于过滤活跃用户）
        var activeDeletedIndex = Builders<AppUser>.IndexKeys
            .Ascending(u => u.IsActive)
            .Ascending(u => u.IsDeleted);
        await users.Indexes.CreateOneAsync(new CreateIndexModel<AppUser>(
            activeDeletedIndex,
            new CreateIndexOptions { Name = "idx_isActive_isDeleted" }
        ));
        Console.WriteLine("  - 创建复合索引: isActive, isDeleted");
        
        // 索引：createdAt（用于排序和日期范围查询）
        var createdAtIndex = Builders<AppUser>.IndexKeys.Descending(u => u.CreatedAt);
        await users.Indexes.CreateOneAsync(new CreateIndexModel<AppUser>(
            createdAtIndex,
            new CreateIndexOptions { Name = "idx_createdAt" }
        ));
        Console.WriteLine("  - 创建索引: createdAt");
    }
    
    private static async Task CreateRolesIndexesAsync(IMongoDatabase database)
    {
        Console.WriteLine("创建 roles 集合索引...");
        var roles = database.GetCollection<Role>("roles");
        
        // 唯一索引：name
        var nameIndex = Builders<Role>.IndexKeys.Ascending(r => r.Name);
        await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
            nameIndex,
            new CreateIndexOptions { Unique = true, Name = "idx_name_unique" }
        ));
        Console.WriteLine("  - 创建唯一索引: name");
        
        // 索引：isDeleted
        var isDeletedIndex = Builders<Role>.IndexKeys.Ascending(r => r.IsDeleted);
        await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
            isDeletedIndex,
            new CreateIndexOptions { Name = "idx_isDeleted" }
        ));
        Console.WriteLine("  - 创建索引: isDeleted");
        
        // 复合索引：isActive, isDeleted
        var activeDeletedIndex = Builders<Role>.IndexKeys
            .Ascending(r => r.IsActive)
            .Ascending(r => r.IsDeleted);
        await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
            activeDeletedIndex,
            new CreateIndexOptions { Name = "idx_isActive_isDeleted" }
        ));
        Console.WriteLine("  - 创建复合索引: isActive, isDeleted");
    }
    
    private static async Task CreateMenusIndexesAsync(IMongoDatabase database)
    {
        Console.WriteLine("创建 menus 集合索引...");
        var menus = database.GetCollection<Menu>("menus");
        
        // 索引：parentId（用于查找子菜单）
        var parentIdIndex = Builders<Menu>.IndexKeys.Ascending(m => m.ParentId);
        await menus.Indexes.CreateOneAsync(new CreateIndexModel<Menu>(
            parentIdIndex,
            new CreateIndexOptions { Name = "idx_parentId" }
        ));
        Console.WriteLine("  - 创建索引: parentId");
        
        // 复合索引：parentId, sortOrder（用于菜单树构建）
        var parentSortIndex = Builders<Menu>.IndexKeys
            .Ascending(m => m.ParentId)
            .Ascending(m => m.SortOrder);
        await menus.Indexes.CreateOneAsync(new CreateIndexModel<Menu>(
            parentSortIndex,
            new CreateIndexOptions { Name = "idx_parentId_sortOrder" }
        ));
        Console.WriteLine("  - 创建复合索引: parentId, sortOrder");
        
        // 索引：isDeleted
        var isDeletedIndex = Builders<Menu>.IndexKeys.Ascending(m => m.IsDeleted);
        await menus.Indexes.CreateOneAsync(new CreateIndexModel<Menu>(
            isDeletedIndex,
            new CreateIndexOptions { Name = "idx_isDeleted" }
        ));
        Console.WriteLine("  - 创建索引: isDeleted");
        
        // 复合索引：isEnabled, isDeleted（用于查询启用的菜单）
        var enabledDeletedIndex = Builders<Menu>.IndexKeys
            .Ascending(m => m.IsEnabled)
            .Ascending(m => m.IsDeleted);
        await menus.Indexes.CreateOneAsync(new CreateIndexModel<Menu>(
            enabledDeletedIndex,
            new CreateIndexOptions { Name = "idx_isEnabled_isDeleted" }
        ));
        Console.WriteLine("  - 创建复合索引: isEnabled, isDeleted");
    }
    
    private static async Task CreatePermissionsIndexesAsync(IMongoDatabase database)
    {
        Console.WriteLine("创建 permissions 集合索引...");
        var permissions = database.GetCollection<Permission>("permissions");
        
        // 唯一索引：code
        var codeIndex = Builders<Permission>.IndexKeys.Ascending(p => p.Code);
        await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
            codeIndex,
            new CreateIndexOptions { Unique = true, Name = "idx_code_unique" }
        ));
        Console.WriteLine("  - 创建唯一索引: code");
        
        // 复合索引：resourceName, action（用于查询特定资源的权限）
        var resourceActionIndex = Builders<Permission>.IndexKeys
            .Ascending(p => p.ResourceName)
            .Ascending(p => p.Action);
        await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
            resourceActionIndex,
            new CreateIndexOptions { Name = "idx_resourceName_action" }
        ));
        Console.WriteLine("  - 创建复合索引: resourceName, action");
        
        // 索引：isDeleted
        var isDeletedIndex = Builders<Permission>.IndexKeys.Ascending(p => p.IsDeleted);
        await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
            isDeletedIndex,
            new CreateIndexOptions { Name = "idx_isDeleted" }
        ));
        Console.WriteLine("  - 创建索引: isDeleted");
    }
    
    private static async Task CreateActivityLogsIndexesAsync(IMongoDatabase database)
    {
        Console.WriteLine("创建 user_activity_logs 集合索引...");
        var activityLogs = database.GetCollection<UserActivityLog>("user_activity_logs");
        
        // 复合索引：userId, createdAt（用于查询用户的活动日志）
        var userCreatedIndex = Builders<UserActivityLog>.IndexKeys
            .Ascending(log => log.UserId)
            .Descending(log => log.CreatedAt);
        await activityLogs.Indexes.CreateOneAsync(new CreateIndexModel<UserActivityLog>(
            userCreatedIndex,
            new CreateIndexOptions { Name = "idx_userId_createdAt" }
        ));
        Console.WriteLine("  - 创建复合索引: userId, createdAt");
        
        // 索引：action（用于按操作类型过滤）
        var actionIndex = Builders<UserActivityLog>.IndexKeys.Ascending(log => log.Action);
        await activityLogs.Indexes.CreateOneAsync(new CreateIndexModel<UserActivityLog>(
            actionIndex,
            new CreateIndexOptions { Name = "idx_action" }
        ));
        Console.WriteLine("  - 创建索引: action");
        
        // 索引：createdAt（用于日期范围查询）
        var createdAtIndex = Builders<UserActivityLog>.IndexKeys.Descending(log => log.CreatedAt);
        await activityLogs.Indexes.CreateOneAsync(new CreateIndexModel<UserActivityLog>(
            createdAtIndex,
            new CreateIndexOptions { Name = "idx_createdAt" }
        ));
        Console.WriteLine("  - 创建索引: createdAt");
    }
}

