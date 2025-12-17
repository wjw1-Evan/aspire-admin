using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单服务 - 管理全局系统菜单资源
/// </summary>
public class MenuService : IMenuService
{
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;

    /// <summary>
    /// 初始化菜单服务
    /// </summary>
    /// <param name="menuFactory">菜单数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
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
    /// 获取菜单树结构（用于角色管理，只返回未删除且已启用的菜单）
    /// </summary>
    public async Task<List<MenuTreeNode>> GetMenuTreeAsync()
    {
        var filter = _menuFactory.CreateFilterBuilder()
            .Equal(m => m.IsEnabled, true)
            .ExcludeDeleted()
            .Build();
        var sortBuilder = _menuFactory.CreateSortBuilder()
            .Ascending(m => m.SortOrder);
        var allMenus = await _menuFactory.FindAsync(filter, sort: sortBuilder.Build());
        return BuildMenuTree(allMenus, null);
    }

    /// <summary>
    /// 根据用户角色获取可访问菜单
    /// </summary>
    public async Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds)
    {
        // 获取用户的所有未删除且活跃的角色
        // ⚠️ 注意：这里传入的 roleIds 已经是特定企业的角色ID（从 UserCompany.RoleIds 获取）
        // 但由于 Role 实现了 IMultiTenant，自动过滤会使用 JWT token 中的企业ID
        // 为了保持一致性和避免切换企业后的问题，我们使用 FindWithoutTenantFilterAsync
        // 前提是：调用方必须确保 roleIds 都属于同一企业
        var rolesFilter = _roleFactory.CreateFilterBuilder()
            .In(r => r.Id, roleIds)
            .Equal(r => r.IsDeleted, false)
            .Equal(r => r.IsActive, true)
            .Build();
        var userRoles = await _roleFactory.FindWithoutTenantFilterAsync(rolesFilter);

        // 收集所有角色可访问的菜单ID
        var accessibleMenuIds = userRoles
            .SelectMany(r => r.MenuIds)
            .Distinct()
            .ToList();

        // 获取这些菜单（未删除且已启用）
        var menusFilter = _menuFactory.CreateFilterBuilder()
            .In(m => m.Id, accessibleMenuIds)
            .Equal(m => m.IsEnabled, true)
            .Equal(m => m.IsDeleted, false)
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
            .Equal(m => m.IsDeleted, false)
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
                Permissions = m.Permissions,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                Children = BuildMenuTree(menus, m.Id)
            })
            .ToList();
    }
}

