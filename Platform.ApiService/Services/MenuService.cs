using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class MenuService : IMenuService
{
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Role> _roles;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<MenuService> _logger;

    public MenuService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ILogger<MenuService> logger)
    {
        _menus = database.GetCollection<Menu>("menus");
        _roles = database.GetCollection<Role>("roles");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <summary>
    /// 获取当前操作用户ID
    /// </summary>
    private string? GetCurrentUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    }

    /// <summary>
    /// 获取所有菜单
    /// </summary>
    public async Task<List<Menu>> GetAllMenusAsync()
    {
        var filter = SoftDeleteExtensions.NotDeleted<Menu>();
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
            SoftDeleteExtensions.NotDeleted<Menu>()
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
            SoftDeleteExtensions.NotDeleted<Menu>()
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
            SoftDeleteExtensions.NotDeleted<Menu>()
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
            SoftDeleteExtensions.NotDeleted<Menu>()
        );
        return await _menus.Find(filter).FirstOrDefaultAsync();
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
            IsDeleted = false,
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
    /// 软删除菜单（自动清理角色的菜单引用）
    /// </summary>
    public async Task<bool> DeleteMenuAsync(string id, string? reason = null)
    {
        // 检查菜单是否存在
        var menu = await GetMenuByIdAsync(id);
        if (menu == null)
        {
            return false;
        }
        
        // 检查是否有未删除的子菜单
        var childrenFilter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.ParentId, id),
            SoftDeleteExtensions.NotDeleted<Menu>()
        );
        var hasChildren = await _menus.Find(childrenFilter).AnyAsync();
        if (hasChildren)
        {
            throw new InvalidOperationException("不能删除有子菜单的菜单，请先删除子菜单");
        }

        // 查找引用此菜单的角色
        var rolesFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.AnyIn(r => r.MenuIds, new[] { id }),
            SoftDeleteExtensions.NotDeleted<Role>()
        );
        var rolesWithMenu = await _roles.Find(rolesFilter).ToListAsync();
        
        // 自动从所有角色的 MenuIds 中移除此菜单
        if (rolesWithMenu.Count > 0)
        {
            foreach (var role in rolesWithMenu)
            {
                var newMenuIds = role.MenuIds.Where(mid => mid != id).ToList();
                
                var update = Builders<Role>.Update
                    .Set(r => r.MenuIds, newMenuIds)
                    .Set(r => r.UpdatedAt, DateTime.UtcNow);
                    
                await _roles.UpdateOneAsync(r => r.Id == role.Id, update);
            }
            
            _logger.LogInformation($"已从 {rolesWithMenu.Count} 个角色的菜单列表中移除菜单 {menu.Name} ({id})");
        }

        // 软删除菜单
        var currentUserId = GetCurrentUserId();
        var filter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.Id, id),
            SoftDeleteExtensions.NotDeleted<Menu>()
        );
        
        var deleted = await _menus.SoftDeleteOneAsync(filter, currentUserId, reason);
        
        if (deleted)
        {
            _logger.LogInformation($"已删除菜单: {menu.Name} ({id}), 原因: {reason ?? "未提供"}");
        }
        
        return deleted;
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

