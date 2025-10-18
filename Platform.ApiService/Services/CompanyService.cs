using MongoDB.Driver;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
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
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<Company> _companies;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IMongoCollection<Role> _roles;
    private readonly IMongoCollection<Menu> _menus;
    private readonly IPasswordHasher _passwordHasher;

    public CompanyService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        IPasswordHasher passwordHasher,
        ILogger<CompanyService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _database = database;
        _companies = database.GetCollection<Company>("companies");
        _users = database.GetCollection<AppUser>("users");
        _roles = database.GetCollection<Role>("roles");
        _menus = database.GetCollection<Menu>("menus");
        _passwordHasher = passwordHasher;
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
            // 2. 获取所有全局菜单
            var allMenus = await _menus.Find(m => m.IsEnabled && !m.IsDeleted).ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            // 3. 创建默认管理员角色（拥有所有菜单访问权限）
            var adminRole = new Role
            {
                Name = "管理员",
                Description = "系统管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,
                IsActive = true
            };
            await _roles.InsertOneAsync(adminRole);
            LogInformation("为企业 {CompanyId} 创建管理员角色: {RoleId}", company.Id!, adminRole.Id!);

            // 4. 创建管理员用户
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
            LogError("企业注册失败", ex, company.Id!);
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

        // v3.1: 使用 UserCompany 表统计用户数量
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        
        var ucFilter = Builders<UserCompany>.Filter.And(
            Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
            Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
            Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
        );
        var totalUsers = await userCompanies.CountDocumentsAsync(ucFilter);
        
        // 统计活跃用户（需要关联 AppUser 表）
        var activeUserIds = await userCompanies
            .Find(ucFilter)
            .Project(uc => uc.UserId)
            .ToListAsync();
        
        var activeUserFilter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.In(u => u.Id, activeUserIds),
            Builders<AppUser>.Filter.Eq(u => u.IsActive, true),
            Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false)
        );
        var activeUsers = await _users.CountDocumentsAsync(activeUserFilter);

        // 角色统计
        var roleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
        );
        var totalRoles = await _roles.CountDocumentsAsync(roleFilter);

        // 菜单统计：统计系统中所有启用的菜单
        var menuFilter = Builders<Menu>.Filter.And(
            Builders<Menu>.Filter.Eq(m => m.IsEnabled, true),
            Builders<Menu>.Filter.Eq(m => m.IsDeleted, false)
        );
        var totalMenus = await _menus.CountDocumentsAsync(menuFilter);

        return new CompanyStatistics
        {
            TotalUsers = (int)totalUsers,
            ActiveUsers = (int)activeUsers,
            TotalRoles = (int)totalRoles,
            TotalMenus = (int)totalMenus,
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


