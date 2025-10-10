using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class MenuService
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Role> _roles;

    public MenuService(IMongoDatabase database)
    {
        _menus = database.GetCollection<Menu>("menus");
        _roles = database.GetCollection<Role>("roles");
    }

    /// <summary>
    /// 获取所有菜单
    /// </summary>
    public async Task<List<Menu>> GetAllMenusAsync()
    {
        return await _menus.Find(_ => true)
            .SortBy(m => m.SortOrder)
            .ToListAsync();
    }

    /// <summary>
    /// 获取菜单树结构
    /// </summary>
    public async Task<List<MenuTreeNode>> GetMenuTreeAsync()
    {
        var allMenus = await GetAllMenusAsync();
        return BuildMenuTree(allMenus, null);
    }

    /// <summary>
    /// 根据用户角色获取可访问菜单
    /// </summary>
    public async Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds)
    {
        // 获取用户的所有角色
        var userRoles = await _roles.Find(r => roleIds.Contains(r.Id!))
            .ToListAsync();

        // 收集所有角色可访问的菜单ID
        var accessibleMenuIds = userRoles
            .SelectMany(r => r.MenuIds)
            .Distinct()
            .ToList();

        // 获取这些菜单
        var accessibleMenus = await _menus
            .Find(m => accessibleMenuIds.Contains(m.Id!) && m.IsEnabled)
            .SortBy(m => m.SortOrder)
            .ToListAsync();

        // 构建菜单树（需要包含父菜单，即使父菜单不在权限列表中）
        var allMenuIds = new HashSet<string>(accessibleMenuIds);
        foreach (var menu in accessibleMenus.Where(m => m.ParentId != null))
        {
            await AddParentMenuIds(menu.ParentId!, allMenuIds);
        }

        var allAccessibleMenus = await _menus
            .Find(m => allMenuIds.Contains(m.Id!) && m.IsEnabled)
            .SortBy(m => m.SortOrder)
            .ToListAsync();

        return BuildMenuTree(allAccessibleMenus, null);
    }

    /// <summary>
    /// 递归添加父菜单ID
    /// </summary>
    private async Task AddParentMenuIds(string parentId, HashSet<string> menuIds)
    {
        if (menuIds.Contains(parentId))
            return;

        var parentMenu = await _menus.Find(m => m.Id == parentId).FirstOrDefaultAsync();
        if (parentMenu != null)
        {
            menuIds.Add(parentId);
            if (parentMenu.ParentId != null)
            {
                await AddParentMenuIds(parentMenu.ParentId, menuIds);
            }
        }
    }

    /// <summary>
    /// 根据ID获取菜单
    /// </summary>
    public async Task<Menu?> GetMenuByIdAsync(string id)
    {
        return await _menus.Find(m => m.Id == id).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 创建菜单
    /// </summary>
    public async Task<Menu> CreateMenuAsync(CreateMenuRequest request)
    {
        var menu = new Menu
        {
            Name = request.Name,
            Path = request.Path,
            Component = request.Component,
            Icon = request.Icon,
            SortOrder = request.SortOrder,
            IsEnabled = request.IsEnabled,
            IsExternal = request.IsExternal,
            OpenInNewTab = request.OpenInNewTab,
            HideInMenu = request.HideInMenu,
            ParentId = request.ParentId,
            Permissions = request.Permissions,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _menus.InsertOneAsync(menu);
        return menu;
    }

    /// <summary>
    /// 更新菜单
    /// </summary>
    public async Task<bool> UpdateMenuAsync(string id, UpdateMenuRequest request)
    {
        var updateBuilder = Builders<Menu>.Update;
        var updates = new List<UpdateDefinition<Menu>>
        {
            updateBuilder.Set(m => m.UpdatedAt, DateTime.UtcNow)
        };

        if (request.Name != null)
            updates.Add(updateBuilder.Set(m => m.Name, request.Name));
        if (request.Path != null)
            updates.Add(updateBuilder.Set(m => m.Path, request.Path));
        if (request.Component != null)
            updates.Add(updateBuilder.Set(m => m.Component, request.Component));
        if (request.Icon != null)
            updates.Add(updateBuilder.Set(m => m.Icon, request.Icon));
        if (request.SortOrder.HasValue)
            updates.Add(updateBuilder.Set(m => m.SortOrder, request.SortOrder.Value));
        if (request.IsEnabled.HasValue)
            updates.Add(updateBuilder.Set(m => m.IsEnabled, request.IsEnabled.Value));
        if (request.IsExternal.HasValue)
            updates.Add(updateBuilder.Set(m => m.IsExternal, request.IsExternal.Value));
        if (request.OpenInNewTab.HasValue)
            updates.Add(updateBuilder.Set(m => m.OpenInNewTab, request.OpenInNewTab.Value));
        if (request.HideInMenu.HasValue)
            updates.Add(updateBuilder.Set(m => m.HideInMenu, request.HideInMenu.Value));
        if (request.ParentId != null)
            updates.Add(updateBuilder.Set(m => m.ParentId, request.ParentId));
        if (request.Permissions != null)
            updates.Add(updateBuilder.Set(m => m.Permissions, request.Permissions));

        var result = await _menus.UpdateOneAsync(
            m => m.Id == id,
            updateBuilder.Combine(updates)
        );

        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 删除菜单（级联检查子菜单）
    /// </summary>
    public async Task<bool> DeleteMenuAsync(string id)
    {
        // 检查是否有子菜单
        var hasChildren = await _menus.Find(m => m.ParentId == id).AnyAsync();
        if (hasChildren)
        {
            throw new InvalidOperationException("Cannot delete menu with children. Please delete child menus first.");
        }

        var result = await _menus.DeleteOneAsync(m => m.Id == id);
        return result.DeletedCount > 0;
    }

    /// <summary>
    /// 菜单排序
    /// </summary>
    public async Task<bool> ReorderMenusAsync(List<string> menuIds, string? parentId)
    {
        for (int i = 0; i < menuIds.Count; i++)
        {
            await _menus.UpdateOneAsync(
                m => m.Id == menuIds[i],
                Builders<Menu>.Update
                    .Set(m => m.SortOrder, i)
                    .Set(m => m.UpdatedAt, DateTime.UtcNow)
            );
        }
        return true;
    }

    /// <summary>
    /// 构建菜单树
    /// </summary>
    private List<MenuTreeNode> BuildMenuTree(List<Menu> menus, string? parentId)
    {
        return menus
            .Where(m => m.ParentId == parentId)
            .OrderBy(m => m.SortOrder)
            .Select(m => new MenuTreeNode
            {
                Id = m.Id,
                Name = m.Name,
                Path = m.Path,
                Component = m.Component,
                Icon = m.Icon,
                SortOrder = m.SortOrder,
                IsEnabled = m.IsEnabled,
                IsExternal = m.IsExternal,
                OpenInNewTab = m.OpenInNewTab,
                HideInMenu = m.HideInMenu,
                ParentId = m.ParentId,
                Permissions = m.Permissions,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                Children = BuildMenuTree(menus, m.Id)
            })
            .ToList();
    }
}

