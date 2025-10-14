using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ICompanyService
{
    Task<Company> RegisterCompanyAsync(RegisterCompanyRequest request);
    Task<Company?> GetCompanyByIdAsync(string id);
    Task<Company?> GetCompanyByCodeAsync(string code);
    Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request);
    Task<CompanyStatistics> GetCompanyStatisticsAsync(string companyId);
    Task<List<Company>> GetAllCompaniesAsync();
    Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword);  // v3.1新增
}

public class CompanyService : BaseService, ICompanyService
{
    private readonly IMongoCollection<Company> _companies;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Menu> _menus;
    private readonly IMongoCollection<Permission> _permissions;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IPermissionService _permissionService;

    public CompanyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        IPasswordHasher passwordHasher,
        IPermissionService permissionService,
        ILogger<CompanyService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _companies = database.GetCollection<Company>("companies");
        _users = database.GetCollection<AppUser>("users");
        _roles = database.GetCollection<Role>("roles");
        _menus = database.GetCollection<Menu>("menus");
        _permissions = database.GetCollection<Permission>("permissions");
        _passwordHasher = passwordHasher;
        _permissionService = permissionService;
    }

    /// <summary>
    /// 企业注册
    /// </summary>
    public async Task<Company> RegisterCompanyAsync(RegisterCompanyRequest request)
    {
        // 验证企业代码格式
        request.CompanyCode.EnsureValidUsername(nameof(request.CompanyCode));

        // 检查企业代码是否已存在
        var existingCompany = await GetCompanyByCodeAsync(request.CompanyCode);
        if (existingCompany != null)
        {
            throw new InvalidOperationException(CompanyErrorMessages.CompanyCodeExists);
        }

        // 1. 创建企业
        var company = new Company
        {
            Name = request.CompanyName,
            Code = request.CompanyCode.ToLower(),
            Description = request.CompanyDescription,
            Industry = request.Industry,
            ContactName = request.ContactName ?? request.AdminUsername,
            ContactEmail = request.AdminEmail,
            ContactPhone = request.ContactPhone,
            IsActive = true,
            MaxUsers = CompanyConstants.DefaultMaxUsers,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _companies.InsertOneAsync(company);
        LogInformation("企业创建成功: {CompanyName} ({CompanyCode})", company.Name, company.Code);

        try
        {
            // 2. 创建默认权限（属于该企业）
            var permissions = await CreateDefaultPermissionsAsync(company.Id!);
            LogInformation("为企业 {CompanyId} 创建了 {Count} 个默认权限", company.Id!, permissions.Count);

            // 3. 创建默认管理员角色（拥有所有权限）
            var adminRole = new Role
            {
                Name = "管理员",
                Description = "系统管理员，拥有所有权限",
                CompanyId = company.Id!,
                PermissionIds = permissions.Select(p => p.Id!).ToList(),
                MenuIds = new List<string>(),  // 稍后创建菜单后更新
                IsActive = true
            };
            await _roles.InsertOneAsync(adminRole);
            LogInformation("为企业 {CompanyId} 创建管理员角色: {RoleId}", company.Id!, adminRole.Id!);

            // 4. 创建默认菜单（属于该企业）
            var menus = await CreateDefaultMenusAsync(company.Id!);
            LogInformation("为企业 {CompanyId} 创建了 {Count} 个默认菜单", company.Id!, menus.Count);

            // 5. 更新管理员角色的菜单权限
            var update = Builders<Role>.Update.Set(r => r.MenuIds, menus.Select(m => m.Id!).ToList());
            await _roles.UpdateOneAsync(r => r.Id == adminRole.Id, update);

            // 6. 创建管理员用户
            var adminUser = new AppUser
            {
                Username = request.AdminUsername,
                Email = request.AdminEmail,
                PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
                CurrentCompanyId = company.Id!,  // v3.1: 使用 CurrentCompanyId
                // v3.1: 角色信息现在存储在 UserCompany.RoleIds 中，而不是 AppUser.RoleIds
                IsActive = true
            };
            await _users.InsertOneAsync(adminUser);
            LogInformation("为企业 {CompanyId} 创建管理员用户: {Username}", company.Id!, adminUser.Username!);

            return company;
        }
        catch (Exception ex)
        {
            // 如果后续步骤失败，删除已创建的企业
            await _companies.DeleteOneAsync(c => c.Id == company.Id);
            LogError(ex, "企业注册失败，回滚已创建的企业: {CompanyId}", company.Id!);
            throw new InvalidOperationException($"企业注册失败: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// 根据ID获取企业
    /// </summary>
    public async Task<Company?> GetCompanyByIdAsync(string id)
    {
        var filter = Builders<Company>.Filter.And(
            Builders<Company>.Filter.Eq(c => c.Id, id),
            Builders<Company>.Filter.Eq(c => c.IsDeleted, false)
        );
        return await _companies.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 根据代码获取企业
    /// </summary>
    public async Task<Company?> GetCompanyByCodeAsync(string code)
    {
        var filter = Builders<Company>.Filter.And(
            Builders<Company>.Filter.Eq(c => c.Code, code.ToLower()),
            Builders<Company>.Filter.Eq(c => c.IsDeleted, false)
        );
        return await _companies.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// 更新企业信息
    /// </summary>
    public async Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request)
    {
        var updateBuilder = Builders<Company>.Update;
        var updates = new List<UpdateDefinition<Company>>
        {
            updateBuilder.Set(c => c.UpdatedAt, DateTime.UtcNow)
        };

        if (request.Name != null)
            updates.Add(updateBuilder.Set(c => c.Name, request.Name));
        if (request.Description != null)
            updates.Add(updateBuilder.Set(c => c.Description, request.Description));
        if (request.Industry != null)
            updates.Add(updateBuilder.Set(c => c.Industry, request.Industry));
        if (request.ContactName != null)
            updates.Add(updateBuilder.Set(c => c.ContactName, request.ContactName));
        if (request.ContactEmail != null)
            updates.Add(updateBuilder.Set(c => c.ContactEmail, request.ContactEmail));
        if (request.ContactPhone != null)
            updates.Add(updateBuilder.Set(c => c.ContactPhone, request.ContactPhone));
        if (request.Logo != null)
            updates.Add(updateBuilder.Set(c => c.Logo, request.Logo));

        var update = updateBuilder.Combine(updates);
        var filter = Builders<Company>.Filter.And(
            Builders<Company>.Filter.Eq(c => c.Id, id),
            Builders<Company>.Filter.Eq(c => c.IsDeleted, false)
        );

        var result = await _companies.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    /// <summary>
    /// 获取企业统计信息
    /// </summary>
    public async Task<CompanyStatistics> GetCompanyStatisticsAsync(string companyId)
    {
        var company = await GetCompanyByIdAsync(companyId);
        if (company == null)
        {
            throw new KeyNotFoundException(CompanyErrorMessages.CompanyNotFound);
        }

        // TODO: v3.1重构 - 应该基于 UserCompany 关系统计用户数量
#pragma warning disable CS0618 // 抑制过时API警告 - 暂时保留以确保兼容性
        var companyFilter = Builders<AppUser>.Filter.Eq(u => u.CompanyId, companyId);
#pragma warning restore CS0618
        var notDeletedFilter = Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false);
        var activeFilter = Builders<AppUser>.Filter.Eq(u => u.IsActive, true);

        var totalUsers = await _users.CountDocumentsAsync(companyFilter & notDeletedFilter);
        var activeUsers = await _users.CountDocumentsAsync(companyFilter & notDeletedFilter & activeFilter);

        var roleCompanyFilter = Builders<Role>.Filter.Eq(r => r.CompanyId, companyId);
        var roleNotDeletedFilter = Builders<Role>.Filter.Eq(r => r.IsDeleted, false);
        var totalRoles = await _roles.CountDocumentsAsync(roleCompanyFilter & roleNotDeletedFilter);

        var menuCompanyFilter = Builders<Menu>.Filter.Eq(m => m.CompanyId, companyId);
        var menuNotDeletedFilter = Builders<Menu>.Filter.Eq(m => m.IsDeleted, false);
        var totalMenus = await _menus.CountDocumentsAsync(menuCompanyFilter & menuNotDeletedFilter);

        var permCompanyFilter = Builders<Permission>.Filter.Eq(p => p.CompanyId, companyId);
        var permNotDeletedFilter = Builders<Permission>.Filter.Eq(p => p.IsDeleted, false);
        var totalPermissions = await _permissions.CountDocumentsAsync(permCompanyFilter & permNotDeletedFilter);

        return new CompanyStatistics
        {
            TotalUsers = (int)totalUsers,
            ActiveUsers = (int)activeUsers,
            TotalRoles = (int)totalRoles,
            TotalMenus = (int)totalMenus,
            TotalPermissions = (int)totalPermissions,
            MaxUsers = company.MaxUsers,
            RemainingUsers = company.MaxUsers - (int)totalUsers,
            IsExpired = company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow,
            ExpiresAt = company.ExpiresAt
        };
    }

    /// <summary>
    /// 获取所有企业（仅系统级调用）
    /// </summary>
    public async Task<List<Company>> GetAllCompaniesAsync()
    {
        var filter = Builders<Company>.Filter.Eq(c => c.IsDeleted, false);
        return await _companies.Find(filter).ToListAsync();
    }

    #region 私有辅助方法

    /// <summary>
    /// 创建默认权限
    /// </summary>
    private async Task<List<Permission>> CreateDefaultPermissionsAsync(string companyId)
    {
        var defaultPermissions = _permissionService.GetDefaultPermissions();
        var permissions = new List<Permission>();

        foreach (var perm in defaultPermissions)
        {
            var permission = new Permission
            {
                ResourceName = perm.ResourceName,
                ResourceTitle = perm.ResourceTitle,
                Action = perm.Action,
                ActionTitle = perm.ActionTitle,
                Code = $"{perm.ResourceName}:{perm.Action}",
                Description = perm.Description,
                CompanyId = companyId
            };
            permissions.Add(permission);
        }

        await _permissions.InsertManyAsync(permissions);
        return permissions;
    }

    /// <summary>
    /// 创建默认菜单
    /// </summary>
    private async Task<List<Menu>> CreateDefaultMenusAsync(string companyId)
    {
        var menus = new List<Menu>
        {
            // 仪表板
            new Menu
            {
                Name = "dashboard",
                Title = "仪表板",
                Path = "/dashboard",
                Component = "./dashboard",
                Icon = "DashboardOutlined",
                SortOrder = 1,
                IsEnabled = true,
                CompanyId = companyId
            },
            // 用户管理
            new Menu
            {
                Name = "user-management",
                Title = "用户管理",
                Path = "/user-management",
                Component = "./user-management",
                Icon = "UserOutlined",
                SortOrder = 2,
                IsEnabled = true,
                CompanyId = companyId
            },
            // 角色管理
            new Menu
            {
                Name = "role-management",
                Title = "角色管理",
                Path = "/role-management",
                Component = "./role-management",
                Icon = "TeamOutlined",
                SortOrder = 3,
                IsEnabled = true,
                CompanyId = companyId
            },
            // 菜单管理
            new Menu
            {
                Name = "menu-management",
                Title = "菜单管理",
                Path = "/menu-management",
                Component = "./menu-management",
                Icon = "MenuOutlined",
                SortOrder = 4,
                IsEnabled = true,
                CompanyId = companyId
            },
            // 系统设置
            new Menu
            {
                Name = "system",
                Title = "系统设置",
                Path = "/system",
                Icon = "SettingOutlined",
                SortOrder = 10,
                IsEnabled = true,
                CompanyId = companyId
            }
        };

        await _menus.InsertManyAsync(menus);
        return menus;
    }

    #endregion

    /// <summary>
    /// v3.1: 搜索企业
    /// </summary>
    public async Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword)
    {
        var userId = GetCurrentUserId();
        
        // 搜索企业（按名称或代码）
        var filterBuilder = Builders<Company>.Filter;
        var filter = filterBuilder.And(
            filterBuilder.Or(
                filterBuilder.Regex(c => c.Name, new MongoDB.Bson.BsonRegularExpression(keyword, "i")),
                filterBuilder.Regex(c => c.Code, new MongoDB.Bson.BsonRegularExpression(keyword, "i"))
            ),
            filterBuilder.Eq(c => c.IsActive, true),
            filterBuilder.Eq(c => c.IsDeleted, false)
        );
        
        var companies = await _companies.Find(filter)
            .Limit(20)
            .ToListAsync();
        
        var results = new List<CompanySearchResult>();
        var userCompaniesCollection = Database.GetCollection<UserCompany>("user_companies");
        var joinRequestsCollection = Database.GetCollection<CompanyJoinRequest>("company_join_requests");
        
        foreach (var company in companies)
        {
            // 检查用户是否已是成员
            UserCompany? membership = null;
            if (!string.IsNullOrEmpty(userId))
            {
                membership = await userCompaniesCollection.Find(uc => 
                    uc.UserId == userId && 
                    uc.CompanyId == company.Id &&
                    uc.IsDeleted == false
                ).FirstOrDefaultAsync();
            }
            
            // 检查是否有待审核的申请
            CompanyJoinRequest? pendingRequest = null;
            if (!string.IsNullOrEmpty(userId))
            {
                pendingRequest = await joinRequestsCollection.Find(jr =>
                    jr.UserId == userId &&
                    jr.CompanyId == company.Id &&
                    jr.Status == "pending" &&
                    jr.IsDeleted == false
                ).FirstOrDefaultAsync();
            }
            
            // 统计成员数
            var memberCount = await userCompaniesCollection.CountDocumentsAsync(uc =>
                uc.CompanyId == company.Id &&
                uc.Status == "active" &&
                uc.IsDeleted == false
            );
            
            results.Add(new CompanySearchResult
            {
                Company = company,
                IsMember = membership != null && membership.Status == "active",
                HasPendingRequest = pendingRequest != null,
                MemberStatus = membership?.Status,
                MemberCount = (int)memberCount
            });
        }
        
        return results;
    }
}


