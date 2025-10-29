using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public class RoleService : IRoleService
{
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<RoleService> _logger;

    public RoleService(
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        ILogger<RoleService> logger)
    {
        _roleFactory = roleFactory;
        _userFactory = userFactory;
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        var sort = _roleFactory.CreateSortBuilder()
            .Ascending(r => r.CreatedAt)
            .Build();
        
        var roles = await _roleFactory.FindAsync(sort: sort);

        return new RoleListResponse
        {
            Roles = roles,
            Total = roles.Count
        };
    }
    
    /// <summary>
    /// 获取所有角色（带统计信息）
    /// 修复：使用工厂确保多租户数据隔离
    /// </summary>
    public async Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync()
    {
        // ✅ 使用工厂自动过滤当前企业的角色
        var sort = _roleFactory.CreateSortBuilder()
            .Ascending(r => r.CreatedAt)
            .Build();
        
        var roles = await _roleFactory.FindAsync(sort: sort);
        
        var rolesWithStats = new List<RoleWithStats>();
        
        foreach (var role in roles)
        {
            // v3.1: 从 UserCompany 表统计使用此角色的用户数量（工厂自动过滤当前企业）
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.Status, "active")
                .Build();
            
            // 使用原生 MongoDB 查询处理数组包含
            var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, role.Id!);
            var combinedFilter = Builders<UserCompany>.Filter.And(userCompanyFilter, additionalFilter);
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
            updateBuilder.Set(r => r.MenuIds, request.MenuIds);
        if (request.IsActive.HasValue)
            updateBuilder.Set(r => r.IsActive, request.IsActive.Value);
        
        updateBuilder.SetCurrentTimestamp();
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
        if (userCompaniesWithRole.Count > 0)
        {
            foreach (var userCompany in userCompaniesWithRole)
            {
                var newRoleIds = userCompany.RoleIds.Where(rid => rid != id).ToList();
                
                // 检查是否是最后一个管理员角色，如果用户是管理员且没有其他角色
                if (userCompany.IsAdmin && newRoleIds.Count == 0)
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
            
            _logger.LogInformation("删除角色 {RoleName} 时，自动从 {UserCompanyCount} 个 UserCompany 记录中移除", 
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
    /// 为角色分配菜单权限
    /// 修复：使用BaseRepository确保只能修改当前企业的角色
    /// </summary>
    public async Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds)
    {
        var filter = _roleFactory.CreateFilterBuilder()
            .Equal(r => r.Id, roleId)
            .Build();
        
        var update = _roleFactory.CreateUpdateBuilder()
            .Set(r => r.MenuIds, menuIds)
            .SetCurrentTimestamp()
            .Build();
        
        return await _roleFactory.UpdateManyAsync(filter, update) > 0;
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

