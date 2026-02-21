using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 角色服务实现
/// </summary>
public class RoleService : IRoleService
{
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<Menu> _menuFactory;
    private readonly ILogger<RoleService> _logger;
    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化角色服务
    /// </summary>
    public RoleService(
        IDataFactory<Role> roleFactory,
        IDataFactory<AppUser> userFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<Menu> menuFactory,
        ILogger<RoleService> logger,
        ITenantContext tenantContext)
    {
        _roleFactory = roleFactory;
        _userFactory = userFactory;
        _userCompanyFactory = userCompanyFactory;
        _menuFactory = menuFactory;
        _logger = logger;
        _tenantContext = tenantContext;
    }


    /// <summary>
    /// 获取所有角色
    /// ✅ 使用数据工厂的自动企业过滤（Role 实现了 IMultiTenant）
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 Role 实现了 IMultiTenant）
        var roles = await _roleFactory.FindAsync(
            filter: null,
            orderBy: q => q.OrderBy(r => r.CreatedAt));

        return new RoleListResponse
        {
            Roles = roles,
            Total = roles.Count
        };
    }

    /// <summary>
    /// 获取所有角色（带统计信息）
    /// ✅ 使用数据工厂的自动企业过滤（Role 和 UserCompany 都实现了 IMultiTenant）
    /// </summary>
    public async Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync()
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 Role 实现了 IMultiTenant）
        var roles = await _roleFactory.FindAsync(
            filter: null,
            orderBy: q => q.OrderBy(r => r.CreatedAt));

        var rolesWithStats = new List<RoleWithStats>();

        foreach (var role in roles)
        {
            // 统计使用此角色的用户数量（只统计该角色所属企业的活跃用户）
            // 注意：MongoDB EF Core 支持使用 Contains 来查询数组
            var userCount = await _userCompanyFactory.CountAsync(uc =>
                uc.Status == "active" &&
                uc.CompanyId == role.CompanyId &&
                uc.RoleIds.Contains(role.Id!));

            rolesWithStats.Add(new RoleWithStats
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description,
                MenuIds = role.MenuIds ?? new List<string>(),
                IsActive = role.IsActive,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt,
                UserCount = (int)userCount,
                MenuCount = role.MenuIds?.Count ?? 0
            });
        }

        return new RoleListWithStatsResponse
        {
            Roles = rolesWithStats,
            Total = rolesWithStats.Count
        };
    }

    /// <summary>
    /// 根据ID获取角色
    /// </summary>
    public async Task<Role?> GetRoleByIdAsync(string id)
    {
        return await _roleFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据名称获取角色
    /// </summary>
    public async Task<Role?> GetRoleByNameAsync(string name)
    {
        var roles = await _roleFactory.FindAsync(r => r.Name == name);
        return roles.FirstOrDefault();
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    public async Task<Role> CreateRoleAsync(CreateRoleRequest request)
    {
        // 检查角色名称是否已存在（工厂自动过滤当前企业）
        var existingRole = await GetRoleByNameAsync(request.Name);
        if (existingRole != null)
        {
            throw new InvalidOperationException(string.Format(ErrorMessages.ResourceAlreadyExists, "角色名称"));
        }

        // 获取当前企业ID（通过 ITenantContext）
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }

        var role = new Role
        {
            Name = request.Name,
            Description = request.Description,
            MenuIds = request.MenuIds,
            IsActive = request.IsActive,
            CompanyId = companyId  // 设置企业ID，确保多租户隔离
        };

        return await _roleFactory.CreateAsync(role);
    }

    /// <summary>
    /// 更新角色（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request)
    {
        // 检查角色名称是否已存在（如果提供了新名称）
        if (request.Name != null)
        {
            var existingRole = await GetRoleByNameAsync(request.Name);
            if (existingRole != null && existingRole.Id != id)
            {
                throw new InvalidOperationException(string.Format(ErrorMessages.ResourceAlreadyExists, "角色名称"));
            }
        }

        var updatedRole = await _roleFactory.UpdateAsync(id, async r =>
        {
            if (request.Name != null)
                r.Name = request.Name;
            if (request.Description != null)
                r.Description = request.Description;
            if (request.MenuIds != null)
            {
                // 验证菜单ID有效性
                var validMenuIds = await ValidateAndNormalizeMenuIdsAsync(request.MenuIds, id);
                r.MenuIds = validMenuIds;
            }
            if (request.IsActive.HasValue)
                r.IsActive = request.IsActive.Value;
        });

        return updatedRole != null;
    }

    /// <summary>
    /// 软删除角色（自动清理用户的角色引用）
    /// </summary>
    public async Task<bool> DeleteRoleAsync(string id, string? reason = null)
    {
        // 检查角色是否存在
        var role = await GetRoleByIdAsync(id);
        if (role == null)
        {
            return false;
        }

        // 防止删除系统管理员角色
        if (role.Name?.ToLower() == "admin" || role.Name?.ToLower() == "系统管理员")
        {
            throw new InvalidOperationException("不能删除系统管理员角色");
        }

        // 1. 获取所有使用此角色的用户关联记录
        var userCompaniesWithRole = await _userCompanyFactory.FindAsync(uc =>
            uc.Status == "active" &&
            uc.CompanyId == role.CompanyId &&
            uc.RoleIds.Contains(id));

        // 2. 自动从所有记录中移除此角色
        if (userCompaniesWithRole.Any())
        {
            foreach (var userCompany in userCompaniesWithRole)
            {
                var newRoleIds = userCompany.RoleIds.Where(rid => rid != id).ToList();

                // 检查是否是最后一个管理员角色
                if (userCompany.IsAdmin && !newRoleIds.Any())
                {
                    var hasOtherAdmin = await _userCompanyFactory.ExistsAsync(uc =>
                        uc.Id != userCompany.Id &&
                        uc.IsAdmin &&
                        uc.Status == "active" &&
                        uc.CompanyId == role.CompanyId);

                    if (!hasOtherAdmin)
                    {
                        throw new InvalidOperationException("不能移除最后一个管理员的角色，必须至少保留一个管理员");
                    }
                }

                // 更新记录
                await _userCompanyFactory.UpdateAsync(userCompany.Id!, uc =>
                {
                    uc.RoleIds = newRoleIds;
                });
            }

            _logger.LogDebug("删除角色 {RoleName} 时，自动从 {UserCompanyCount} 个 UserCompany 记录中移除",
                role.Name!, userCompaniesWithRole.Count);
        }

        // 3. 软删除角色
        var deleted = await _roleFactory.UpdateAsync(id, r => r.IsDeleted = true);

        if (deleted != null)
        {
            _logger.LogInformation("已删除角色: {RoleName} ({RoleId}), 原因: {Reason}", role.Name!, id, reason ?? "未提供");
        }

        return deleted != null;
    }

    /// <summary>
    /// 验证并规范化菜单ID列表
    /// </summary>
    private async Task<List<string>> ValidateAndNormalizeMenuIdsAsync(List<string> menuIds, string roleId)
    {
        var validMenuIds = new List<string>();

        if (menuIds != null && menuIds.Any())
        {
            // 获取所有有效的菜单
            var validMenus = await _menuFactory.FindAsync(m =>
                menuIds.Contains(m.Id!) &&
                m.IsEnabled &&
                !m.IsDeleted);

            validMenuIds = validMenus.Select(m => m.Id!).Where(id => !string.IsNullOrEmpty(id)).ToList();
        }

        // 如果所有菜单ID都无效，至少保留欢迎页面菜单
        if (!validMenuIds.Any())
        {
            var welcomeMenu = await _menuFactory.FindAsync(m =>
                m.Name == "welcome" &&
                m.IsEnabled &&
                !m.IsDeleted);

            var welcomeMenuId = welcomeMenu.FirstOrDefault()?.Id;

            if (!string.IsNullOrEmpty(welcomeMenuId))
            {
                validMenuIds.Add(welcomeMenuId);
                _logger.LogWarning("角色 {RoleId} 菜单权限为空或全部无效，已自动添加欢迎页面菜单以确保基本访问", roleId);
            }
            else
            {
                _logger.LogError("角色 {RoleId} 菜单权限为空，且无法找到欢迎页面菜单", roleId);
                throw new InvalidOperationException("无法分配菜单权限：系统未找到欢迎页面菜单。");
            }
        }

        return validMenuIds;
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// </summary>
    public async Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds)
    {
        var validMenuIds = await ValidateAndNormalizeMenuIdsAsync(menuIds ?? new List<string>(), roleId);

        var updatedCount = await _roleFactory.UpdateManyAsync(
            r => r.Id == roleId,
            r => r.MenuIds = validMenuIds);

        if (updatedCount > 0)
        {
            _logger.LogDebug("成功为角色 {RoleId} 分配 {MenuCount} 个菜单权限", roleId, validMenuIds.Count);
        }

        return updatedCount > 0;
    }

    /// <summary>
    /// 获取角色的菜单权限
    /// </summary>
    public async Task<List<string>> GetRoleMenuIdsAsync(string roleId)
    {
        var role = await GetRoleByIdAsync(roleId);
        return role?.MenuIds ?? new List<string>();
    }
}

