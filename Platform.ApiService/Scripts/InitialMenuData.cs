using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

public class InitialMenuData
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<AppUser> _users;

    public InitialMenuData(IMongoDatabase database)
    {
        _menus = database.GetCollection<Menu>("menus");
        _roles = database.GetCollection<Role>("roles");
        _users = database.GetCollection<AppUser>("app_users");
    }

    public async Task InitializeAsync()
    {
        // 检查是否已经初始化过
        var existingMenus = await _menus.CountDocumentsAsync(_ => true);
        if (existingMenus > 0)
        {
            Console.WriteLine("Menus already initialized, skipping menu initialization.");
            return;
        }

        Console.WriteLine("Initializing default menus and roles...");

        // 创建默认菜单
        var menus = await CreateDefaultMenusAsync();
        
        // 创建默认角色
        await CreateDefaultRolesAsync(menus);
        
        // 更新管理员用户的角色
        await UpdateAdminUserRolesAsync();

        Console.WriteLine("Default menus and roles initialized successfully.");
    }

    private async Task<Dictionary<string, string>> CreateDefaultMenusAsync()
    {
        var menuIds = new Dictionary<string, string>();

        // 1. 欢迎页
        var welcomeMenu = new Menu
        {
            Name = "welcome",
            Path = "/welcome",
            Component = "./Welcome",
            Icon = "smile",
            SortOrder = 0,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _menus.InsertOneAsync(welcomeMenu);
        menuIds["welcome"] = welcomeMenu.Id!;

        // 2. 系统管理（父菜单）
        var systemMenu = new Menu
        {
            Name = "system",
            Path = "/system",
            Component = null,
            Icon = "setting",
            SortOrder = 1,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _menus.InsertOneAsync(systemMenu);
        menuIds["system"] = systemMenu.Id!;

        // 3. 用户管理
        var userManagementMenu = new Menu
        {
            Name = "user-management",
            Path = "/system/user-management",
            Component = "./user-management",
            Icon = "user",
            SortOrder = 0,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = systemMenu.Id,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _menus.InsertOneAsync(userManagementMenu);
        menuIds["user-management"] = userManagementMenu.Id!;

        // 4. 角色管理
        var roleManagementMenu = new Menu
        {
            Name = "role-management",
            Path = "/system/role-management",
            Component = "./role-management",
            Icon = "team",
            SortOrder = 1,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = systemMenu.Id,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _menus.InsertOneAsync(roleManagementMenu);
        menuIds["role-management"] = roleManagementMenu.Id!;

        // 5. 菜单管理
        var menuManagementMenu = new Menu
        {
            Name = "menu-management",
            Path = "/system/menu-management",
            Component = "./menu-management",
            Icon = "menu",
            SortOrder = 2,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = systemMenu.Id,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _menus.InsertOneAsync(menuManagementMenu);
        menuIds["menu-management"] = menuManagementMenu.Id!;

        Console.WriteLine($"Created {menuIds.Count} default menus.");
        return menuIds;
    }

    private async Task CreateDefaultRolesAsync(Dictionary<string, string> menuIds)
    {
        // 1. 超级管理员角色 - 所有权限
        var superAdminRole = new Role
        {
            Name = "super-admin",
            Description = "超级管理员，拥有所有权限",
            MenuIds = menuIds.Values.ToList(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _roles.InsertOneAsync(superAdminRole);

        // 2. 管理员角色 - 除菜单管理外的所有权限
        var adminMenuIds = menuIds
            .Where(kv => kv.Key != "menu-management")
            .Select(kv => kv.Value)
            .ToList();
        var adminRole = new Role
        {
            Name = "admin",
            Description = "普通管理员，除菜单管理外的所有权限",
            MenuIds = adminMenuIds,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _roles.InsertOneAsync(adminRole);

        // 3. 普通用户角色 - 仅欢迎页
        var userRole = new Role
        {
            Name = "user",
            Description = "普通用户，仅有基本访问权限",
            MenuIds = new List<string> { menuIds["welcome"] },
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _roles.InsertOneAsync(userRole);

        Console.WriteLine("Created 3 default roles: super-admin, admin, user");
    }

    private async Task UpdateAdminUserRolesAsync()
    {
        // 获取超级管理员角色
        var superAdminRole = await _roles.Find(r => r.Name == "super-admin").FirstOrDefaultAsync();
        if (superAdminRole == null)
        {
            Console.WriteLine("Super admin role not found, skipping admin user update.");
            return;
        }

        // 更新 admin 用户，赋予超级管理员角色
        var adminUser = await _users.Find(u => u.Username == "admin").FirstOrDefaultAsync();
        if (adminUser != null)
        {
            var updateDefinition = Builders<AppUser>.Update
                .Set(u => u.RoleIds, new List<string> { superAdminRole.Id! })
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            await _users.UpdateOneAsync(u => u.Id == adminUser.Id, updateDefinition);
            Console.WriteLine("Updated admin user with super-admin role.");
        }
        else
        {
            Console.WriteLine("Admin user not found, skipping admin user update.");
        }
    }
}

