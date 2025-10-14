using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

#pragma warning disable CS0618 // 抑制过时API警告 - 菜单数据脚本需要访问过时属性

namespace Platform.ApiService.Scripts;

public class InitialMenuData
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Role> _roles;

    // 常量定义
    private const string MENU_NAME_SYSTEM = "system";
    private const string MENU_NAME_WELCOME = "welcome";
    private const string ROLE_NAME_SUPER_ADMIN = "super-admin";

    public InitialMenuData(IMongoDatabase database)
    {
        _menus = database.GetCollection<Menu>("menus");
        _roles = database.GetCollection<Role>("roles");
    }

    public async Task InitializeAsync()
    {
        // 1. 检查并补全菜单
        var menuIds = await EnsureMenusIntegrityAsync();
        
        // 2. 检查并补全角色
        await EnsureRolesIntegrityAsync(menuIds);
    }

    /// <summary>
    /// 检查并确保所有默认菜单存在，补全缺失的菜单
    /// </summary>
    private async Task<Dictionary<string, string>> EnsureMenusIntegrityAsync()
    {
        var menuIds = new Dictionary<string, string>();
        var defaultMenus = GetDefaultMenus();

        // 第一步：创建或获取父菜单（system）
        await ProcessSystemMenuAsync(menuIds, defaultMenus);

        // 第二步：创建或获取其他菜单
        await ProcessOtherMenusAsync(menuIds, defaultMenus);
        
        return menuIds;
    }

    private async Task ProcessSystemMenuAsync(
        Dictionary<string, string> menuIds, 
        List<Menu> defaultMenus)
    {
        var systemMenu = defaultMenus.FirstOrDefault(m => m.Name == MENU_NAME_SYSTEM);
        if (systemMenu == null) return;

        // 首先检查未删除的菜单
        var filter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.Name, MENU_NAME_SYSTEM),
            SoftDeleteExtensions.NotDeleted<Menu>()
        );
        var existing = await _menus.Find(filter).FirstOrDefaultAsync();
        
        if (existing != null)
        {
            menuIds[MENU_NAME_SYSTEM] = existing.Id!;
        }
        else
        {
            // 检查是否存在已软删除的菜单
            var deletedFilter = Builders<Menu>.Filter.And(
                Builders<Menu>.Filter.Eq(m => m.Name, MENU_NAME_SYSTEM),
                Builders<Menu>.Filter.Eq(m => m.IsDeleted, true)
            );
            var deletedMenu = await _menus.Find(deletedFilter).FirstOrDefaultAsync();
            
            if (deletedMenu != null)
            {
                // 恢复已软删除的菜单
                var update = Builders<Menu>.Update
                    .Set(m => m.IsDeleted, false)
                    .Set(m => m.DeletedAt, null)
                    .Set(m => m.DeletedBy, null)
                    .Set(m => m.DeletedReason, null)
                    .Set(m => m.IsEnabled, true)
                    .Set(m => m.UpdatedAt, DateTime.UtcNow);

                await _menus.UpdateOneAsync(m => m.Id == deletedMenu.Id, update);
                menuIds[MENU_NAME_SYSTEM] = deletedMenu.Id!;
            }
            else
            {
                await _menus.InsertOneAsync(systemMenu);
                menuIds[MENU_NAME_SYSTEM] = systemMenu.Id!;
            }
        }
    }

    private async Task ProcessOtherMenusAsync(
        Dictionary<string, string> menuIds, 
        List<Menu> defaultMenus)
    {
        foreach (var defaultMenu in defaultMenus.Where(m => m.Name != MENU_NAME_SYSTEM))
        {
            // 首先检查未删除的菜单
            var filter = Builders<Menu>.Filter.And(
                Builders<Menu>.Filter.Eq(m => m.Name, defaultMenu.Name),
                SoftDeleteExtensions.NotDeleted<Menu>()
            );
            var existing = await _menus.Find(filter).FirstOrDefaultAsync();
            
            if (existing != null)
            {
                menuIds[defaultMenu.Name] = existing.Id!;
            }
            else
            {
                // 检查是否存在已软删除的菜单
                var deletedFilter = Builders<Menu>.Filter.And(
                    Builders<Menu>.Filter.Eq(m => m.Name, defaultMenu.Name),
                    Builders<Menu>.Filter.Eq(m => m.IsDeleted, true)
                );
                var deletedMenu = await _menus.Find(deletedFilter).FirstOrDefaultAsync();
                
                if (deletedMenu != null)
                {
                    // 恢复已软删除的菜单
                    var update = Builders<Menu>.Update
                        .Set(m => m.IsDeleted, false)
                        .Set(m => m.DeletedAt, null)
                        .Set(m => m.DeletedBy, null)
                        .Set(m => m.DeletedReason, null)
                        .Set(m => m.IsEnabled, true)
                        .Set(m => m.UpdatedAt, DateTime.UtcNow);

                    await _menus.UpdateOneAsync(m => m.Id == deletedMenu.Id, update);
                    menuIds[defaultMenu.Name] = deletedMenu.Id!;
                }
                else
                {
                    // 如果有父菜单，设置父菜单 ID
                    if (defaultMenu.Name != MENU_NAME_WELCOME && defaultMenu.Name != MENU_NAME_SYSTEM)
                    {
                        defaultMenu.ParentId = menuIds.ContainsKey(MENU_NAME_SYSTEM) ? menuIds[MENU_NAME_SYSTEM] : null;
                    }
                    
                    await _menus.InsertOneAsync(defaultMenu);
                    menuIds[defaultMenu.Name] = defaultMenu.Id!;
                }
            }
        }
    }

    /// <summary>
    /// 获取默认菜单定义列表
    /// </summary>
    private List<Menu> GetDefaultMenus()
    {
        var menus = new List<Menu>();

        // 1. 欢迎页
        menus.Add(new Menu
        {
            Name = MENU_NAME_WELCOME,
            Title = "欢迎",
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
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 2. 系统管理（父菜单）
        menus.Add(new Menu
        {
            Name = MENU_NAME_SYSTEM,
            Title = "系统管理",
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
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 3. 用户管理
        menus.Add(new Menu
        {
            Name = "user-management",
            Title = "用户管理",
            Path = "/system/user-management",
            Component = "./user-management",
            Icon = "user",
            SortOrder = 0,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null, // 将在 EnsureMenusIntegrityAsync 中设置
            Permissions = new List<string>(),
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 4. 角色管理
        menus.Add(new Menu
        {
            Name = "role-management",
            Title = "角色管理",
            Path = "/system/role-management",
            Component = "./role-management",
            Icon = "team",
            SortOrder = 1,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 5. 菜单管理
        menus.Add(new Menu
        {
            Name = "menu-management",
            Title = "菜单管理",
            Path = "/system/menu-management",
            Component = "./menu-management",
            Icon = "menu",
            SortOrder = 2,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 6. 用户日志
        menus.Add(new Menu
        {
            Name = "user-log",
            Title = "用户日志",
            Path = "/system/user-log",
            Component = "./user-log",
            Icon = "file-text",
            SortOrder = 3,
            IsEnabled = true,
            IsExternal = false,
            OpenInNewTab = false,
            HideInMenu = false,
            ParentId = null,
            Permissions = new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        return menus;
    }

    /// <summary>
    /// 检查并确保所有默认角色存在，补全缺失的角色
    /// </summary>
    private async Task EnsureRolesIntegrityAsync(Dictionary<string, string> menuIds)
    {
        var defaultRoles = GetDefaultRoles(menuIds);

        foreach (var defaultRole in defaultRoles)
        {
            // 首先检查未删除的角色
            var filter = Builders<Role>.Filter.And(
                Builders<Role>.Filter.Eq(r => r.Name, defaultRole.Name),
                SoftDeleteExtensions.NotDeleted<Role>()
            );
            var existing = await _roles.Find(filter).FirstOrDefaultAsync();
            
            if (existing != null)
            {
                // 检查菜单权限是否需要更新
                var expectedMenuIds = defaultRole.MenuIds.OrderBy(x => x).ToList();
                var actualMenuIds = (existing.MenuIds ?? new List<string>()).OrderBy(x => x).ToList();
                
                if (!expectedMenuIds.SequenceEqual(actualMenuIds))
                {
                    var updateDefinition = Builders<Role>.Update
                        .Set(r => r.MenuIds, defaultRole.MenuIds)
                        .Set(r => r.UpdatedAt, DateTime.UtcNow);
                    
                    await _roles.UpdateOneAsync(r => r.Id == existing.Id, updateDefinition);
                }
            }
            else
            {
                // 检查是否存在已软删除的角色
                var deletedFilter = Builders<Role>.Filter.And(
                    Builders<Role>.Filter.Eq(r => r.Name, defaultRole.Name),
                    Builders<Role>.Filter.Eq(r => r.IsDeleted, true)
                );
                var deletedRole = await _roles.Find(deletedFilter).FirstOrDefaultAsync();
                
                if (deletedRole != null)
                {
                    // 恢复已软删除的角色
                    var update = Builders<Role>.Update
                        .Set(r => r.IsDeleted, false)
                        .Set(r => r.DeletedAt, null)
                        .Set(r => r.DeletedBy, null)
                        .Set(r => r.DeletedReason, null)
                        .Set(r => r.IsActive, true)
                        .Set(r => r.MenuIds, defaultRole.MenuIds)  // 更新菜单权限
                        .Set(r => r.UpdatedAt, DateTime.UtcNow);

                    await _roles.UpdateOneAsync(r => r.Id == deletedRole.Id, update);
                }
                else
                {
                    await _roles.InsertOneAsync(defaultRole);
                }
            }
        }
    }

    /// <summary>
    /// 获取默认角色定义列表
    /// </summary>
    private List<Role> GetDefaultRoles(Dictionary<string, string> menuIds)
    {
        var roles = new List<Role>();

        // 1. 超级管理员角色 - 所有权限
        roles.Add(new Role
        {
            Name = ROLE_NAME_SUPER_ADMIN,
            Description = "超级管理员，拥有所有权限",
            MenuIds = menuIds.Values.ToList(),
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 2. 管理员角色 - 除菜单管理外的所有权限
        var adminMenuIds = menuIds
            .Where(kv => kv.Key != "menu-management")
            .Select(kv => kv.Value)
            .ToList();
        roles.Add(new Role
        {
            Name = "admin",
            Description = "普通管理员，除菜单管理外的所有权限",
            MenuIds = adminMenuIds,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // 3. 普通用户角色 - 仅欢迎页
        if (menuIds.ContainsKey(MENU_NAME_WELCOME))
        {
            roles.Add(new Role
            {
                Name = "user",
                Description = "普通用户，仅有基本访问权限",
                MenuIds = new List<string> { menuIds[MENU_NAME_WELCOME] },
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return roles;
    }
}

