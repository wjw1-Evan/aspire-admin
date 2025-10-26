using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class MenuService : IMenuService
{
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;

    public MenuService(
        IDatabaseOperationFactory<Menu> menuFactory,
        IDatabaseOperationFactory<Role> roleFactory)
    {
        // 菜单是全局资源，不使用 BaseRepository（避免 CompanyId 过滤）
        _menuFactory = menuFactory;
        _roleFactory = roleFactory;
    }

    /// <summary>
    /// 获取所有菜单（菜单是全局资源，无需过滤 CompanyId）
    /// </summary>
    public async Task<List<Menu>> GetAllMenusAsync()
    {
        var sortBuilder = _menuFactory.CreateSortBuilder()
            .Ascending(m => m.SortOrder);
        return await _menuFactory.FindAsync(sort: sortBuilder.Build());
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
        // 获取用户的所有未删除角色
        var rolesFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Build();
        var userRoles = await _roleFactory.FindAsync(rolesFilter);

        // 收集所有角色可访问的菜单ID
        var accessibleMenuIds = userRoles
            .SelectMany(r => r.MenuIds)
            .Distinct()
            .ToList();

        // 获取这些菜单（未删除且已启用）
        var menusFilter = _menuFactory.CreateFilterBuilder()
            .In(m => m.Id, accessibleMenuIds)
            .Equal(m => m.IsEnabled, true)
            .Build();
        var accessibleMenus = await _menuFactory.FindAsync(menusFilter, sort: _menuFactory.CreateSortBuilder().Ascending(m => m.SortOrder).Build());

        // 构建菜单树（需要包含父菜单，即使父菜单不在权限列表中）
        var allMenuIds = new HashSet<string>(accessibleMenuIds);
        foreach (var menu in accessibleMenus.Where(m => m.ParentId != null))
        {
            await AddParentMenuIds(menu.ParentId!, allMenuIds);
        }

        var allMenusFilter = _menuFactory.CreateFilterBuilder()
            .In(m => m.Id, allMenuIds.ToList())
            .Equal(m => m.IsEnabled, true)
            .Build();
        var allAccessibleMenus = await _menuFactory.FindAsync(allMenusFilter, sort: _menuFactory.CreateSortBuilder().Ascending(m => m.SortOrder).Build());

        return BuildMenuTree(allAccessibleMenus, null);
    }

    /// <summary>
    /// 递归添加父菜单ID
    /// </summary>
    private async Task AddParentMenuIds(string parentId, HashSet<string> menuIds)
    {
        if (menuIds.Contains(parentId))
            return;

        var filter = _menuFactory.CreateFilterBuilder()
            .Equal(m => m.Id, parentId)
            .Build();
        var parentMenus = await _menuFactory.FindAsync(filter);
        var parentMenu = parentMenus.FirstOrDefault();
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
        return await _menuFactory.GetByIdAsync(id);
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
                Title = m.Title,
                Path = m.Path,
                Component = m.Component,
                Icon = m.Icon,
                SortOrder = m.SortOrder,
                IsEnabled = m.IsEnabled,
                IsExternal = m.IsExternal,
                OpenInNewTab = m.OpenInNewTab,
                HideInMenu = m.HideInMenu,
                ParentId = m.ParentId,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                Children = BuildMenuTree(menus, m.Id)
            })
            .ToList();
    }
}

