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
    private readonly DbContext _context;
    private readonly ILogger<RoleService> _logger;

    /// <summary>
    /// 初始化角色服务
    /// </summary>
    public RoleService(
        DbContext context,
        ILogger<RoleService> logger)
    {
        _context = context;
        
        _logger = logger;
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        var roles = await _context.Set<Role>()
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

        return new RoleListResponse
        {
            Roles = roles,
            Total = roles.Count
        };
    }

    /// <summary>
    /// 获取所有角色（带统计信息）
    /// </summary>
    public async Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync()
    {
        var roles = await _context.Set<Role>()
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

        var rolesWithStats = new List<RoleWithStats>();

        foreach (var role in roles)
        {
            var userCount = await _context.Set<UserCompany>().LongCountAsync(uc =>
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
        return await _context.Set<Role>().FirstOrDefaultAsync(x => x.Id == id);
    }

    /// <summary>
    /// 根据名称获取角色
    /// </summary>
    public async Task<Role?> GetRoleByNameAsync(string name)
    {
        return await _context.Set<Role>().FirstOrDefaultAsync(r => r.Name == name);
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    public async Task<Role> CreateRoleAsync(CreateRoleRequest request)
    {
        var existingRole = await GetRoleByNameAsync(request.Name);
        if (existingRole != null)
        {
            throw new InvalidOperationException(string.Format(ErrorMessages.ResourceAlreadyExists, "角色名称"));
        }

        var role = new Role
        {
            Name = request.Name,
            Description = request.Description,
            MenuIds = request.MenuIds,
            IsActive = request.IsActive
        };

        await _context.Set<Role>().AddAsync(role);
        await _context.SaveChangesAsync();
        return role;
    }

    /// <summary>
    /// 更新角色（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request)
    {
        if (request.Name != null)
        {
            var existingRole = await GetRoleByNameAsync(request.Name);
            if (existingRole != null && existingRole.Id != id)
            {
                throw new InvalidOperationException(string.Format(ErrorMessages.ResourceAlreadyExists, "角色名称"));
            }
        }

        var role = await _context.Set<Role>().FirstOrDefaultAsync(x => x.Id == id);
        if (role == null) return false;

        if (request.Name != null)
            role.Name = request.Name;
        if (request.Description != null)
            role.Description = request.Description;
        if (request.MenuIds != null)
        {
            var validMenuIds = await ValidateAndNormalizeMenuIdsAsync(request.MenuIds, id);
            role.MenuIds = validMenuIds;
        }
        if (request.IsActive.HasValue)
            role.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 软删除角色（自动清理用户的角色引用）
    /// </summary>
    public async Task<bool> DeleteRoleAsync(string id, string? reason = null)
    {
        var role = await GetRoleByIdAsync(id);
        if (role == null)
        {
            return false;
        }

        if (role.Name?.ToLower() == "admin" || role.Name?.ToLower() == "系统管理员")
        {
            throw new InvalidOperationException("不能删除系统管理员角色");
        }

        var userCompaniesWithRole = await _context.Set<UserCompany>().Where(uc =>
            uc.Status == "active" &&
            uc.CompanyId == role.CompanyId &&
            uc.RoleIds.Contains(id)).ToListAsync();

        if (userCompaniesWithRole.Any())
        {
            foreach (var userCompany in userCompaniesWithRole)
            {
                var newRoleIds = userCompany.RoleIds.Where(rid => rid != id).ToList();

                if (userCompany.IsAdmin && !newRoleIds.Any())
                {
                    var hasOtherAdmin = await _context.Set<UserCompany>().AnyAsync(uc =>
                        uc.Id != userCompany.Id &&
                        uc.IsAdmin &&
                        uc.Status == "active" &&
                        uc.CompanyId == role.CompanyId);

                    if (!hasOtherAdmin)
                    {
                        throw new InvalidOperationException("不能移除最后一个管理员的角色，必须至少保留一个管理员");
                    }
                }

                userCompany.RoleIds = newRoleIds;
            }

            _logger.LogDebug("删除角色 {RoleName} 时，自动从 {UserCompanyCount} 个 UserCompany 记录中移除",
                role.Name!, userCompaniesWithRole.Count);
        }

        _context.Set<Role>().Remove(role);
        await _context.SaveChangesAsync();

        _logger.LogInformation("已删除角色: {RoleName} ({RoleId}), 原因: {Reason}", role.Name!, id, reason ?? "未提供");
        return true;
    }

    /// <summary>
    /// 验证并规范化菜单ID列表
    /// </summary>
    private async Task<List<string>> ValidateAndNormalizeMenuIdsAsync(List<string> menuIds, string roleId)
    {
        var validMenuIds = new List<string>();

        if (menuIds != null && menuIds.Any())
        {
            var validMenus = await _context.Set<Menu>()
                .Where(m => menuIds.Contains(m.Id!) && m.IsEnabled)
                .ToListAsync();

            validMenuIds = validMenus.Select(m => m.Id!).Where(id => !string.IsNullOrEmpty(id)).ToList();
        }

        if (!validMenuIds.Any())
        {
            var welcomeMenu = await _context.Set<Menu>()
                .FirstOrDefaultAsync(m => m.Name == "welcome" && m.IsEnabled);

            if (welcomeMenu != null && !string.IsNullOrEmpty(welcomeMenu.Id))
            {
                validMenuIds.Add(welcomeMenu.Id);
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

        var role = await _context.Set<Role>().FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null) return false;

        role.MenuIds = validMenuIds;
        await _context.SaveChangesAsync();

        _logger.LogDebug("成功为角色 {RoleId} 分配 {MenuCount} 个菜单权限", roleId, validMenuIds.Count);
        return true;
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