using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

public interface ICompanyService
{
    Task<Company> RegisterCompanyAsync(RegisterCompanyRequest request);
    Task<Company> CreateCompanyAsync(CreateCompanyRequest request, string userId);  // v3.1: 已登录用户创建企业
    Task<Company?> GetCompanyByIdAsync(string id);
    Task<Company?> GetCompanyByCodeAsync(string code);
    Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request);
    Task<CompanyStatistics> GetCompanyStatisticsAsync(string companyId);
    Task<List<Company>> GetAllCompaniesAsync();
    Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword);  // v3.1新增
}

public class CompanyService : ICompanyService
{
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<CompanyJoinRequest> _joinRequestFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CompanyService> _logger;

    public CompanyService(
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<CompanyJoinRequest> joinRequestFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        IPasswordHasher passwordHasher,
        ITenantContext tenantContext,
        ILogger<CompanyService> logger)
    {
        _companyFactory = companyFactory;
        _userFactory = userFactory;
        _roleFactory = roleFactory;
        _userCompanyFactory = userCompanyFactory;
        _joinRequestFactory = joinRequestFactory;
        _menuFactory = menuFactory;
        _passwordHasher = passwordHasher;
        _tenantContext = tenantContext;
        _logger = logger;
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
            MaxUsers = CompanyConstants.DefaultMaxUsers
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        await _companyFactory.CreateAsync(company);
        _logger.LogInformation("企业创建成功: {CompanyName} ({CompanyCode})", company.Name, company.Code);

        try
        {
            // 2. 获取所有全局菜单
            var allMenus = await _menuFactory.FindAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            // 3. 创建默认管理员角色（拥有所有菜单访问权限）
            var adminRole = new Role
            {
                Name = "管理员",
                Description = "系统管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,
                IsActive = true
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };
            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("为企业 {CompanyId} 创建管理员角色: {RoleId}", company.Id!, adminRole.Id!);

            // 4. 创建管理员用户
            var adminUser = new AppUser
            {
                Username = request.AdminUsername,
                Email = request.AdminEmail,
                PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
                CurrentCompanyId = company.Id!,  // v3.1: 使用 CurrentCompanyId
                // v3.1: 角色信息现在存储在 UserCompany.RoleIds 中，而不是 AppUser.RoleIds
                IsActive = true
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };
            await _userFactory.CreateAsync(adminUser);
            _logger.LogInformation("为企业 {CompanyId} 创建管理员用户: {Username}", company.Id!, adminUser.Username!);

            // 5. ✅ P0修复：创建 UserCompany 关联记录
            var userCompany = new UserCompany
            {
                UserId = adminUser.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                IsAdmin = true,  // 标记为企业管理员
                Status = "active",
                JoinedAt = DateTime.UtcNow  // 业务字段，需要手动设置
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };
            await _userCompanyFactory.CreateAsync(userCompany);
            _logger.LogInformation("为用户 {UserId} 创建企业关联记录，角色: {RoleIds}", 
                adminUser.Id!, string.Join(", ", userCompany.RoleIds));

            return company;
        }
        catch (Exception ex)
        {
            // 如果后续步骤失败，删除已创建的企业
            var filter = _companyFactory.CreateFilterBuilder().Equal(c => c.Id, company.Id!).Build();
            await _companyFactory.FindOneAndSoftDeleteAsync(filter);
            _logger.LogError(ex, "企业注册失败: {CompanyId}", company.Id!);
            throw new InvalidOperationException($"企业注册失败: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// v3.1: 已登录用户创建企业（当前用户自动成为管理员并拥有全部权限）
    /// </summary>
    public async Task<Company> CreateCompanyAsync(CreateCompanyRequest request, string userId)
    {
        // 获取当前用户信息
        var currentUser = await _userFactory.GetByIdAsync(userId);
        if (currentUser == null)
        {
            throw new KeyNotFoundException("当前用户不存在");
        }

        // 自动生成企业代码（基于用户名和时间戳，保证唯一性）
        string companyCode;
        
        // 如果请求中提供了代码，使用用户提供的（向后兼容）
        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            request.Code.EnsureValidUsername(nameof(request.Code));
            var existingCompany = await GetCompanyByCodeAsync(request.Code);
            if (existingCompany != null)
            {
                throw new InvalidOperationException(CompanyErrorMessages.CompanyCodeExists);
            }
            companyCode = request.Code.ToLower();
        }
        else
        {
            // 自动生成企业代码（参考个人企业生成规则：personal-{user.Id}）
            // 格式：company-{用户ID的最后12位}（ObjectId 24位十六进制，取后12位确保唯一性）
            int attempts = 0;
            const int maxAttempts = 10;
            
            do
            {
                // 使用用户ID生成唯一代码（参考 personal-{user.Id} 的规则）
                // 取用户ID的后12位（ObjectId是24位，取后12位足够唯一）
                var userIdSuffix = currentUser.Id!.Length > 12 
                    ? currentUser.Id.Substring(currentUser.Id.Length - 12) 
                    : currentUser.Id;
                
                companyCode = $"company-{userIdSuffix}";
                
                // 如果同一个用户在极短时间内创建多个企业，添加随机后缀
                if (attempts > 0)
                {
                    var randomSuffix = Random.Shared.Next(1000, 9999);
                    companyCode = $"company-{userIdSuffix}-{randomSuffix}";
                }
                
                // 检查是否已存在
                var existingCompany = await GetCompanyByCodeAsync(companyCode);
                if (existingCompany == null)
                {
                    break; // 代码可用
                }
                
                attempts++;
                if (attempts >= maxAttempts)
                {
                    throw new InvalidOperationException("无法生成唯一的企业代码，请稍后重试");
                }
            } while (true);
        }

        Company? company = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            // 1. 创建企业（使用自动生成的企业代码）
            company = new Company
            {
                Name = request.Name,
                Code = companyCode,  // 使用自动生成的代码
                Description = request.Description,
                Industry = request.Industry,
                ContactName = request.ContactName,
                ContactEmail = request.ContactEmail,
                ContactPhone = request.ContactPhone,
                IsActive = true,
                MaxUsers = request.MaxUsers > 0 ? request.MaxUsers : CompanyConstants.DefaultMaxUsers
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _companyFactory.CreateAsync(company);
            _logger.LogInformation("创建企业: {CompanyName} ({CompanyCode})", company.Name, company.Code);

            // 2. 获取所有全局菜单ID（菜单是全局资源，所有企业共享）
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .Equal(m => m.IsEnabled, true)
                .Build();
            var allMenus = await _menuFactory.FindAsync(menuFilter);
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            // 验证菜单数据完整性
            if (!allMenuIds.Any())
            {
                _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            // 3. 创建管理员角色（分配所有菜单）
            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,  // 分配所有全局菜单
                IsActive = true
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            // 4. 创建用户-企业关联（用户是管理员）
            userCompany = new UserCompany
            {
                UserId = currentUser.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                Status = "active",
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow  // 业务字段，需要手动设置
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _userCompanyFactory.CreateAsync(userCompany);
            _logger.LogInformation("创建用户-企业关联: {UserId} -> {CompanyId}，角色: {RoleId}", 
                currentUser.Id, company.Id, adminRole.Id);

            return company;
        }
        catch (Exception ex)
        {
            // 错误回滚：清理已创建的数据
            if (userCompany != null)
            {
                try
                {
                    var ucFilter = _userCompanyFactory.CreateFilterBuilder()
                        .Equal(uc => uc.Id, userCompany.Id!)
                        .Build();
                    await _userCompanyFactory.FindOneAndSoftDeleteAsync(ucFilter);
                }
                catch { }
            }

            if (adminRole != null)
            {
                try
                {
                    var roleFilter = _roleFactory.CreateFilterBuilder()
                        .Equal(r => r.Id, adminRole.Id!)
                        .Build();
                    await _roleFactory.FindOneAndSoftDeleteAsync(roleFilter);
                }
                catch { }
            }

            if (company != null)
            {
                try
                {
                    var companyFilter = _companyFactory.CreateFilterBuilder()
                        .Equal(c => c.Id, company.Id!)
                        .Build();
                    await _companyFactory.FindOneAndSoftDeleteAsync(companyFilter);
                }
                catch { }
            }

            _logger.LogError(ex, "创建企业失败: {CompanyName}", company?.Name);
            throw;
        }
    }

    /// <summary>
    /// 根据ID获取企业
    /// </summary>
    public async Task<Company?> GetCompanyByIdAsync(string id)
    {
        return await _companyFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 根据代码获取企业
    /// </summary>
    public async Task<Company?> GetCompanyByCodeAsync(string code)
    {
        var filter = _companyFactory.CreateFilterBuilder()
            .Equal(c => c.Code, code.ToLower())
            .Build();
        var companies = await _companyFactory.FindAsync(filter);
        return companies.FirstOrDefault();
    }

    /// <summary>
    /// 更新企业信息（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request)
    {
        var filter = _companyFactory.CreateFilterBuilder()
            .Equal(c => c.Id, id)
            .Build();

        var updateBuilder = _companyFactory.CreateUpdateBuilder();
        
        if (request.Name != null)
            updateBuilder.Set(c => c.Name, request.Name);
        if (request.Description != null)
            updateBuilder.Set(c => c.Description, request.Description);
        if (request.Industry != null)
            updateBuilder.Set(c => c.Industry, request.Industry);
        if (request.ContactName != null)
            updateBuilder.Set(c => c.ContactName, request.ContactName);
        if (request.ContactEmail != null)
            updateBuilder.Set(c => c.ContactEmail, request.ContactEmail);
        if (request.ContactPhone != null)
            updateBuilder.Set(c => c.ContactPhone, request.ContactPhone);
        if (request.Logo != null)
            updateBuilder.Set(c => c.Logo, request.Logo);
        
        updateBuilder.SetCurrentTimestamp();
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<Company>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedCompany = await _companyFactory.FindOneAndUpdateAsync(filter, update, options);
        return updatedCompany != null;
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
        var ucFilter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, "active")
            .Build();
        var totalUsers = await _userCompanyFactory.CountAsync(ucFilter);
        
        // 统计活跃用户（需要关联 AppUser 表）
        var activeUserIds = await _userCompanyFactory.FindAsync(ucFilter);
        var userIds = activeUserIds.Select(uc => uc.UserId).ToList();
        
        var activeUserFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, userIds)
            .Equal(u => u.IsActive, true)
            .Build();
        var activeUsers = await _userFactory.CountAsync(activeUserFilter);

        // 角色统计
        var roleFilter = _roleFactory.CreateFilterBuilder()
            .Equal(r => r.CompanyId, companyId)
            .Build();
        var totalRoles = await _roleFactory.CountAsync(roleFilter);

        // 菜单统计：统计系统中所有启用的菜单
        var menuFilter = _menuFactory.CreateFilterBuilder()
            .Equal(m => m.IsEnabled, true)
            .Build();
        var totalMenus = await _menuFactory.CountAsync(menuFilter);

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
        return await _companyFactory.FindAsync();
    }

    #region 私有辅助方法

    #endregion

    /// <summary>
    /// v3.1: 搜索企业
    /// </summary>
    public async Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword)
    {
        var userId = _tenantContext.GetCurrentUserId();
        
        // 搜索企业（按名称或代码）
        var nameFilter = _companyFactory.CreateFilterBuilder()
            .Regex(c => c.Name, keyword, "i")
            .Equal(c => c.IsActive, true)
            .Build();
        
        var codeFilter = _companyFactory.CreateFilterBuilder()
            .Regex(c => c.Code, keyword, "i")
            .Equal(c => c.IsActive, true)
            .Build();
        
        var filter = Builders<Company>.Filter.Or(nameFilter, codeFilter);
        
        var companies = await _companyFactory.FindAsync(filter, limit: 20);
        
        var results = new List<CompanySearchResult>();
        
        foreach (var company in companies)
        {
            // 检查用户是否已是成员
            // ✅ 使用 FindWithoutTenantFilterAsync：需要跨企业查询用户的企业关联关系
            UserCompany? membership = null;
            if (!string.IsNullOrEmpty(userId))
            {
                var membershipFilter = _userCompanyFactory.CreateFilterBuilder()
                    .Equal(uc => uc.UserId, userId)
                    .Equal(uc => uc.CompanyId, company.Id)
                    .Build();
                // ✅ 跨企业查询：用户可能在其他企业有成员关系，不能只查询当前企业
                var memberships = await _userCompanyFactory.FindWithoutTenantFilterAsync(membershipFilter);
                membership = memberships.FirstOrDefault();
            }
            
            // 检查是否有待审核的申请
            // ✅ 使用 FindWithoutTenantFilterAsync：需要跨企业查询申请记录
            CompanyJoinRequest? pendingRequest = null;
            if (!string.IsNullOrEmpty(userId))
            {
                var requestFilter = _joinRequestFactory.CreateFilterBuilder()
                    .Equal(jr => jr.UserId, userId)
                    .Equal(jr => jr.CompanyId, company.Id)
                    .Equal(jr => jr.Status, "pending")
                    .Build();
                // ✅ 跨企业查询：申请记录可能属于其他企业，不能只查询当前企业
                var requests = await _joinRequestFactory.FindWithoutTenantFilterAsync(requestFilter);
                pendingRequest = requests.FirstOrDefault();
            }
            
            // 统计成员数
            // ✅ 使用 FindWithoutTenantFilterAsync：统计指定企业的成员数，不受当前企业限制
            var memberCountFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.CompanyId, company.Id)
                .Equal(uc => uc.Status, "active")
                .Build();
            var memberCountList = await _userCompanyFactory.FindWithoutTenantFilterAsync(memberCountFilter);
            var memberCount = memberCountList.Count;
            
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


