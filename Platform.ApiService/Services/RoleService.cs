using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public class RoleService : BaseService, IRoleService
{
    private readonly BaseRepository<Role> _roleRepository;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<UserCompany> _userCompanies;
    
    // 快捷访问器
    private IMongoCollection<Role> _roles => _roleRepository.Collection;

    public RoleService(
        IMongoDatabase database, 
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<RoleService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _roleRepository = new BaseRepository<Role>(database, "roles", httpContextAccessor, tenantContext);
        _users = GetCollection<AppUser>("users");
        _userCompanies = GetCollection<UserCompany>("user_companies");
    }

    /// <summary>
    /// 获取所有角色
    /// </summary>
    public async Task<RoleListResponse> GetAllRolesAsync()
    {
        var sort = Builders<Role>.Sort.Ascending(r => r.CreatedAt);
        var roles = await _roleRepository.GetAllAsync(sort);

        return new RoleListResponse
        {
            Roles = roles,
            Total = roles.Count
        };
    }
    
    /// <summary>
    /// 获取所有角色（带统计信息）
    /// 修复：使用BaseRepository确保多租户数据隔离
    /// </summary>
    public async Task<RoleListWithStatsResponse> GetAllRolesWithStatsAsync()
    {
        // ✅ 使用 BaseRepository 自动过滤当前企业的角色
        var sort = Builders<Role>.Sort.Ascending(r => r.CreatedAt);
        var roles = await _roleRepository.GetAllAsync(sort);
        
        // 获取当前企业ID用于统计过滤
        var currentCompanyId = GetCurrentCompanyId();
        var rolesWithStats = new List<RoleWithStats>();
        
        foreach (var role in roles)
        {
            // v3.1: 从 UserCompany 表统计使用此角色的用户数量（限制在当前企业内）
            var userCompanyFilter = Builders<UserCompany>.Filter.And(
                Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, new[] { role.Id! }),
                Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, currentCompanyId), // ✅ 添加企业过滤
                Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
            );
            var userCount = await _userCompanies.CountDocumentsAsync(userCompanyFilter);
            
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
        return await _roleRepository.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据名称获取角色
    /// </summary>
    public async Task<Role?> GetRoleByNameAsync(string name)
    {
        var filter = Builders<Role>.Filter.Eq(r => r.Name, name);
        return await _roleRepository.FindOneAsync(filter);
    }

    /// <summary>
    /// 创建角色
    /// </summary>
    public async Task<Role> CreateRoleAsync(CreateRoleRequest request)
    {
        // 检查角色名称是否已存在
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

        return await _roleRepository.CreateAsync(role);
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    public async Task<bool> UpdateRoleAsync(string id, UpdateRoleRequest request)
    {
        var updateBuilder = Builders<Role>.Update;
        var updates = new List<UpdateDefinition<Role>>();

        if (request.Name != null)
        {
            // 检查新名称是否已被其他角色使用
            var existingRole = await GetRoleByNameAsync(request.Name);
            if (existingRole != null && existingRole.Id != id)
            {
                throw new InvalidOperationException(string.Format(ErrorMessages.ResourceAlreadyExists, "角色名称"));
            }
            updates.Add(updateBuilder.Set(r => r.Name, request.Name));
        }

        if (request.Description != null)
            updates.Add(updateBuilder.Set(r => r.Description, request.Description));
        if (request.MenuIds != null)
            updates.Add(updateBuilder.Set(r => r.MenuIds, request.MenuIds));
        if (request.IsActive.HasValue)
            updates.Add(updateBuilder.Set(r => r.IsActive, request.IsActive.Value));

        if (updates.Count == 0)
            return false;

        return await _roleRepository.UpdateAsync(id, updateBuilder.Combine(updates));
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
        
        // v3.1: 从 UserCompany 表查找使用此角色的记录
        var userCompanyFilter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.AnyIn(uc => uc.RoleIds, new[] { id }),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        var userCompaniesWithRole = await _userCompanies.Find(userCompanyFilter).ToListAsync();
        
        // 自动从所有 UserCompany 记录的 RoleIds 中移除此角色
        if (userCompaniesWithRole.Count > 0)
        {
            foreach (var userCompany in userCompaniesWithRole)
            {
                var newRoleIds = userCompany.RoleIds.Where(rid => rid != id).ToList();
                
                // 检查是否是最后一个管理员角色，如果用户是管理员且没有其他角色
                if (userCompany.IsAdmin && newRoleIds.Count == 0)
                {
                    // 检查该企业是否还有其他管理员
                    var otherAdminFilter = Builders<UserCompany>.Filter.And(
                        Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, userCompany.CompanyId),
                        Builders<UserCompany>.Filter.Ne(uc => uc.Id, userCompany.Id),
                        Builders<UserCompany>.Filter.Eq(uc => uc.IsAdmin, true),
                        Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
                        Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
                    );
                    var hasOtherAdmin = await _userCompanies.Find(otherAdminFilter).AnyAsync();
                    
                    if (!hasOtherAdmin)
                    {
                        throw new InvalidOperationException("不能移除最后一个管理员的角色，必须至少保留一个管理员");
                    }
                }
                
                var update = Builders<UserCompany>.Update
                    .Set(uc => uc.RoleIds, newRoleIds)
                    .Set(uc => uc.UpdatedAt, DateTime.UtcNow);
                    
                await _userCompanies.UpdateOneAsync(uc => uc.Id == userCompany.Id, update);
            }
            
            LogInformation("删除角色 {RoleName} 时，自动从 {UserCompanyCount} 个 UserCompany 记录中移除", 
                role.Name!, userCompaniesWithRole.Count);
        }

        // 软删除角色
        var deleted = await _roleRepository.SoftDeleteAsync(id, reason);
        
        if (deleted)
        {
            LogInformation("已删除角色: {RoleName} ({RoleId}), 原因: {Reason}", role.Name!, id, reason ?? "未提供");
        }
        
        return deleted;
    }

    /// <summary>
    /// 为角色分配菜单权限
    /// 修复：使用BaseRepository确保只能修改当前企业的角色
    /// </summary>
    public async Task<bool> AssignMenusToRoleAsync(string roleId, List<string> menuIds)
    {
        // ✅ 使用 BaseRepository 确保只能修改当前企业的角色
        var update = Builders<Role>.Update
            .Set(r => r.MenuIds, menuIds)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);
        
        return await _roleRepository.UpdateAsync(roleId, update);
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

