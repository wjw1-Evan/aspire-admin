using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 角色服务实现
/// </summary>
public class RoleService : IRoleService
{
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly ILogger<RoleService> _logger;

    /// <summary>
    /// 初始化角色服务
    /// </summary>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据操作工厂</param>
    /// <param name="menuFactory">菜单数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    public RoleService(
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        ILogger<RoleService> logger)
    {
        _roleFactory = roleFactory;
        _userFactory = userFactory;
        _userCompanyFactory = userCompanyFactory;
        _menuFactory = menuFactory;
     
        _logger = logger;
    }


    /// <summary>
    /// 获取所有角色
    /// ✅ 使用数据工厂的自动企业过滤（Role 实现了 IMultiTenant）
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        var sort = _roleFactory.CreateSortBuilder()
            .Ascending(r => r.CreatedAt)
            .Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 Role 实现了 IMultiTenant）
        var roles = await _roleFactory.FindAsync(sort: sort);

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
        var sort = _roleFactory.CreateSortBuilder()
            .Ascending(r => r.CreatedAt)
            .Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 Role 实现了 IMultiTenant）
        var roles = await _roleFactory.FindAsync(sort: sort);
        
        var rolesWithStats = new List<RoleWithStats>();
        
        foreach (var role in roles)
        {
            // ✅ 数据工厂会自动添加企业过滤（因为 UserCompany 实现了 IMultiTenant）
            // 统计使用此角色的用户数量（只统计当前企业的用户）
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.Status, "active")
                .Build();
            
            // 使用原生 MongoDB 查询处理数组包含
            var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, role.Id!);
            var combinedFilter = Builders<UserCompany>.Filter.And(userCompanyFilter, additionalFilter);
            // ✅ 数据工厂会自动添加企业过滤
            var userCount = await _userCompanyFactory.CountAsync(combinedFilter);
            
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
        var filter = _roleFactory.CreateFilterBuilder()
            .Equal(r => r.Name, name)
            .Build();
        
        var roles = await _roleFactory.FindAsync(filter);
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

        // 获取当前企业ID（从数据库获取，不使用 JWT token）
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _roleFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        var companyId = currentUser.CurrentCompanyId;

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

        var filter = _roleFactory.CreateFilterBuilder()
            .Equal(r => r.Id, id)
            .Build();

        var updateBuilder = _roleFactory.CreateUpdateBuilder();
        
        if (request.Name != null)
            updateBuilder.Set(r => r.Name, request.Name);
        if (request.Description != null)
            updateBuilder.Set(r => r.Description, request.Description);
        if (request.MenuIds != null)
        {
            // 验证菜单ID有效性
            var validMenuIds = await ValidateAndNormalizeMenuIdsAsync(request.MenuIds, id);
            updateBuilder.Set(r => r.MenuIds, validMenuIds);
        }
        if (request.IsActive.HasValue)
            updateBuilder.Set(r => r.IsActive, request.IsActive.Value);
        
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<Role>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedRole = await _roleFactory.FindOneAndUpdateAsync(filter, update, options);
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
        
        // v3.1: 从 UserCompany 表查找使用此角色的记录（工厂自动过滤当前企业）
        var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.Status, "active")
            .Build();
        
        // 使用原生 MongoDB 查询处理数组包含
        var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, id);
        var combinedFilter = Builders<UserCompany>.Filter.And(userCompanyFilter, additionalFilter);
        var userCompaniesWithRole = await _userCompanyFactory.FindAsync(combinedFilter);
        
        // 自动从所有 UserCompany 记录的 RoleIds 中移除此角色（使用原子操作）
        if (userCompaniesWithRole.Any())
        {
            foreach (var userCompany in userCompaniesWithRole)
            {
                var newRoleIds = userCompany.RoleIds.Where(rid => rid != id).ToList();
                
                // 检查是否是最后一个管理员角色，如果用户是管理员且没有其他角色
                if (userCompany.IsAdmin && !newRoleIds.Any())
                {
                // 检查该企业是否还有其他管理员（工厂自动过滤当前企业）
                var otherAdminFilter = _userCompanyFactory.CreateFilterBuilder()
                    .NotEqual(uc => uc.Id, userCompany.Id)
                    .Equal(uc => uc.IsAdmin, true)
                    .Equal(uc => uc.Status, "active")
                    .Build();
                var hasOtherAdmin = await _userCompanyFactory.CountAsync(otherAdminFilter) > 0;
                    
                    if (!hasOtherAdmin)
                    {
                        throw new InvalidOperationException("不能移除最后一个管理员的角色，必须至少保留一个管理员");
                    }
                }
                
                // 使用原子操作：查找并更新
                var filter = _userCompanyFactory.CreateFilterBuilder()
                    .Equal(uc => uc.Id, userCompany.Id)
                    .Build();
                    
                var update = _userCompanyFactory.CreateUpdateBuilder()
                    .Set(uc => uc.RoleIds, newRoleIds)
                    .SetCurrentTimestamp()
                    .Build();

                var options = new FindOneAndUpdateOptions<UserCompany>
                {
                    ReturnDocument = ReturnDocument.After,
                    IsUpsert = false
                };
                    
                await _userCompanyFactory.FindOneAndUpdateAsync(filter, update, options);
            }
            
            _logger.LogDebug("删除角色 {RoleName} 时，自动从 {UserCompanyCount} 个 UserCompany 记录中移除", 
                role.Name!, userCompaniesWithRole.Count);
        }

        // 软删除角色
        var roleFilter = _roleFactory.CreateFilterBuilder().Equal(r => r.Id, id).Build();
        var result = await _roleFactory.FindOneAndSoftDeleteAsync(roleFilter);
        
        if (result != null)
        {
            _logger.LogInformation("已删除角色: {RoleName} ({RoleId}), 原因: {Reason}", role.Name!, id, reason ?? "未提供");
        }
        
        return result != null;
    }

    /// <summary>
    /// 验证并规范化菜单ID列表
    /// 1. 过滤掉无效的菜单ID（不存在、已删除或已禁用）
    /// 2. 如果所有菜单ID都无效，至少保留欢迎页面菜单
    /// </summary>
    private async Task<List<string>> ValidateAndNormalizeMenuIdsAsync(List<string> menuIds, string roleId)
    {
        var validMenuIds = new List<string>();
        
        if (menuIds != null && menuIds.Any())
        {
            // 首先查询所有提交的菜单ID（不进行状态过滤，用于诊断）
            var allMenusFilter = _menuFactory.CreateFilterBuilder()
                .In(m => m.Id, menuIds)
                .Build();
            var allMenus = await _menuFactory.FindAsync(allMenusFilter);
            
            _logger.LogDebug("角色 {RoleId} 菜单权限验证：提交 {SubmittedCount} 个菜单ID，数据库中找到 {FoundCount} 个", 
                roleId, menuIds.Count, allMenus.Count);
            
            // 找出无效的菜单ID并记录
            var invalidMenuIds = menuIds.Except(allMenus.Select(m => m.Id!).Where(id => !string.IsNullOrEmpty(id))).ToList();
            if (invalidMenuIds.Any())
            {
                _logger.LogWarning("角色 {RoleId} 菜单权限验证：发现 {InvalidCount} 个不存在的菜单ID: {InvalidIds}", 
                    roleId, invalidMenuIds.Count, string.Join(", ", invalidMenuIds));
            }
            
            // 查询所有有效的菜单（未删除且已启用）
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .In(m => m.Id, menuIds)
                .Equal(m => m.IsEnabled, true)
                .Equal(m => m.IsDeleted, false)
                .Build();
            
            var validMenus = await _menuFactory.FindAsync(menuFilter);
            validMenuIds = validMenus.Select(m => m.Id!).Where(id => !string.IsNullOrEmpty(id)).ToList();
            
            // 找出已删除或已禁用的菜单ID并记录
            var disabledOrDeletedMenuIds = allMenus
                .Where(m => !validMenuIds.Contains(m.Id!) || m.IsDeleted || !m.IsEnabled)
                .Select(m => new { Id = m.Id, Name = m.Name, IsDeleted = m.IsDeleted, IsEnabled = m.IsEnabled })
                .ToList();
            
            if (disabledOrDeletedMenuIds.Any())
            {
                _logger.LogWarning("角色 {RoleId} 菜单权限验证：发现 {DisabledCount} 个已删除或已禁用的菜单: {DisabledMenus}", 
                    roleId, disabledOrDeletedMenuIds.Count, 
                    string.Join(", ", disabledOrDeletedMenuIds.Select(m => $"{m.Name}(Id:{m.Id}, IsDeleted:{m.IsDeleted}, IsEnabled:{m.IsEnabled})")));
            }
            
            _logger.LogDebug("角色 {RoleId} 菜单权限验证：提交 {SubmittedCount} 个菜单ID，验证后有效 {ValidCount} 个", 
                roleId, menuIds.Count, validMenuIds.Count);
        }
        
        // 如果所有菜单ID都无效，至少保留欢迎页面菜单
        if (!validMenuIds.Any())
        {
            // 查找欢迎页面菜单
            var welcomeMenuFilter = _menuFactory.CreateFilterBuilder()
                .Equal(m => m.Name, "welcome")
                .Equal(m => m.IsEnabled, true)
                .Equal(m => m.IsDeleted, false)
                .Build();
            
            var welcomeMenu = await _menuFactory.FindAsync(welcomeMenuFilter);
            var welcomeMenuId = welcomeMenu.FirstOrDefault()?.Id;
            
            if (!string.IsNullOrEmpty(welcomeMenuId))
            {
                validMenuIds.Add(welcomeMenuId);
                _logger.LogWarning("角色 {RoleId} 菜单权限为空或全部无效，已自动添加欢迎页面菜单以确保基本访问", roleId);
            }
            else
            {
                _logger.LogError("角色 {RoleId} 菜单权限为空，且无法找到欢迎页面菜单，可能导致用户无法访问任何模块", roleId);
                throw new InvalidOperationException("无法分配菜单权限：所有菜单ID无效，且系统未找到欢迎页面菜单。请联系系统管理员检查菜单初始化。");
            }
        }
        
        return validMenuIds;
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// 修复：
    /// 1. 验证菜单ID的有效性（只保留存在于数据库中的菜单ID）
    /// 2. 如果所有菜单ID都无效，至少保留欢迎页面菜单，避免用户无法访问任何模块
    /// </summary>
    public async Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds)
    {
        // 验证并规范化菜单ID
        var validMenuIds = await ValidateAndNormalizeMenuIdsAsync(menuIds ?? new List<string>(), roleId);
        
        var filter = _roleFactory.CreateFilterBuilder()
            .Equal(r => r.Id, roleId)
            .Build();
        
        var update = _roleFactory.CreateUpdateBuilder()
            .Set(r => r.MenuIds, validMenuIds)
            .Build();
        
        var result = await _roleFactory.UpdateManyAsync(filter, update) > 0;
        
        if (result)
        {
        _logger.LogDebug("成功为角色 {RoleId} 分配 {MenuCount} 个菜单权限", roleId, validMenuIds.Count);
        }
        
        return result;
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

