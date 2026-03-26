using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 菜单服务 - 管理全局系统菜单资源
/// </summary>
public class MenuService : IMenuService
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化菜单服务
    /// </summary>
    public MenuService(DbContext context)
    {
        _context = context;
        
    }

    /// <summary>
    /// 获取所有菜单（菜单是全局资源，无需过滤 CompanyId）
    /// </summary>
    public async Task<List<Menu>> GetAllMenusAsync()
    {
        return await _context.Set<Menu>().OrderBy(m => m.SortOrder).ToListAsync();
    }

    /// <summary>
    /// 获取菜单树结构（用于角色管理，只返回未删除且已启用的菜单）
    /// </summary>
    public async Task<List<MenuTreeNode>> GetMenuTreeAsync()
    {
        var allMenus = await _context.Set<Menu>()
            .Where(m => m.IsEnabled == true)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();
        return BuildMenuTree(allMenus, null);
    }

    /// <summary>
    /// 根据用户角色获取可访问菜单
    /// </summary>
    public async Task<List<MenuTreeNode>> GetUserMenusAsync(List<string> roleIds)
    {
        var userRoles = await _context.Set<Role>()
            .IgnoreQueryFilters()
            .Where(r => roleIds.Contains(r.Id) && r.IsActive == true)
            .ToListAsync();

        // 收集所有角色可访问的菜单ID
        var accessibleMenuIds = userRoles
            .SelectMany(r => r.MenuIds)
            .Distinct()
            .ToList();

        // 获取这些菜单（未删除且已启用）
        var accessibleMenus = await _context.Set<Menu>()
            .Where(m => accessibleMenuIds.Contains(m.Id) && m.IsEnabled == true)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        // 构建菜单树（需要包含父菜单，即使父菜单不在权限列表中）
        var allMenuIds = new HashSet<string>(accessibleMenuIds);
        foreach (var menu in accessibleMenus.Where(m => m.ParentId != null))
        {
            await AddParentMenuIds(menu.ParentId!, allMenuIds);
        }

        var allAccessibleMenus = await _context.Set<Menu>()
            .Where(m => allMenuIds.Contains(m.Id) && m.IsEnabled == true)
            .OrderBy(m => m.SortOrder)
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

        var parentMenu = await _context.Set<Menu>().FirstOrDefaultAsync(m => m.Id == parentId);
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
        return await _context.Set<Menu>().FirstOrDefaultAsync(x => x.Id == id);
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