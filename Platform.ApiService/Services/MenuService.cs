using MongoDB.Driver;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class MenuService : BaseService, IMenuService
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Role> _roles;

    public MenuService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<MenuService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        // 菜单是全局资源，不使用 BaseRepository（避免 CompanyId 过滤）
        _menus = database.GetCollection<Menu>("menus");
        _roles = GetCollection<Role>("roles");
    }

    /// <summary>
    /// 获取所有菜单（菜单是全局资源，无需过滤 CompanyId）
    /// </summary>
    public async Task<List<Menu>> GetAllMenusAsync()
    {
        var filter = Builders<Menu>.Filter.Eq(m => m.IsDeleted, false);
        return await _menus.Find(filter)
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
        // 获取用户的所有未删除角色
        var rolesFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.In(r => r.Id, roleIds),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var userRoles = await _roles.Find(rolesFilter)
            .ToListAsync();

        // 收集所有角色可访问的菜单ID
        var accessibleMenuIds = userRoles
            .SelectMany(r => r.MenuIds)
            .Distinct()
            .ToList();

        // 获取这些菜单（未删除且已启用）
        var menusFilter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.In(m => m.Id, accessibleMenuIds),
            Builders<Menu>.Filter.Eq(m => m.IsEnabled, true),
            MongoFilterExtensions.NotDeleted<Menu>()
        );
        var accessibleMenus = await _menus
            .Find(menusFilter)
            .SortBy(m => m.SortOrder)
            .ToListAsync();

        // 构建菜单树（需要包含父菜单，即使父菜单不在权限列表中）
        var allMenuIds = new HashSet<string>(accessibleMenuIds);
        foreach (var menu in accessibleMenus.Where(m => m.ParentId != null))
        {
            await AddParentMenuIds(menu.ParentId!, allMenuIds);
        }

        var allMenusFilter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.In(m => m.Id, allMenuIds.ToList()),
            Builders<Menu>.Filter.Eq(m => m.IsEnabled, true),
            MongoFilterExtensions.NotDeleted<Menu>()
        );
        var allAccessibleMenus = await _menus
            .Find(allMenusFilter)
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

        var filter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.Id, parentId),
            MongoFilterExtensions.NotDeleted<Menu>()
        );
        var parentMenu = await _menus.Find(filter).FirstOrDefaultAsync();
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
        var filter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.Id, id),
            Builders<Menu>.Filter.Eq(m => m.IsDeleted, false)
        );
        return await _menus.Find(filter).FirstOrDefaultAsync();
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

