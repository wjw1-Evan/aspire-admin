using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业服务接口
/// </summary>
public interface ICompanyService
{
    /// <summary>
    /// 创建企业（已登录用户创建企业）
    /// </summary>
    /// <param name="request">创建企业请求</param>
    /// <param name="userId">创建者用户ID</param>
    /// <returns>创建的企业信息</returns>
    Task<Company> CreateCompanyAsync(CreateCompanyRequest request, string userId);

    /// <summary>
    /// 根据ID获取企业信息
    /// </summary>
    /// <param name="id">企业ID</param>
    /// <returns>企业信息，如果不存在则返回 null</returns>
    Task<Company?> GetCompanyByIdAsync(string id);

    /// <summary>
    /// 根据企业代码获取企业信息
    /// </summary>
    /// <param name="code">企业代码</param>
    /// <returns>企业信息，如果不存在则返回 null</returns>
    Task<Company?> GetCompanyByCodeAsync(string code);

    /// <summary>
    /// 更新企业信息
    /// </summary>
    /// <param name="id">企业ID</param>
    /// <param name="request">更新企业请求</param>
    /// <returns>是否成功更新</returns>
    Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request);

    /// <summary>
    /// 获取企业统计信息
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <returns>企业统计信息</returns>
    Task<CompanyStatistics> GetCompanyStatisticsAsync(string companyId);

    /// <summary>
    /// 获取所有企业列表
    /// </summary>
    /// <returns>企业列表</returns>
    Task<List<Company>> GetAllCompaniesAsync();

    /// <summary>
    /// 搜索企业（按关键词）
    /// </summary>
    /// <param name="keyword">搜索关键词</param>
    /// <returns>匹配的企业列表</returns>
    Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword);
}

/// <summary>
/// 企业服务实现
/// </summary>
public class CompanyService : ICompanyService
{
    private readonly DbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CompanyService> _logger;

    /// <summary>
    /// 初始化企业服务
    /// </summary>
    /// <param name="context">数据库上下文</param>
    /// <param name="passwordHasher">密码哈希服务</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志记录器</param>
    public CompanyService(
        DbContext context,
        IPasswordHasher passwordHasher,
        ITenantContext tenantContext,
        ILogger<CompanyService> logger)
    {
        _context = context;
        
        _passwordHasher = passwordHasher;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// v3.1: 已登录用户创建企业（当前用户自动成为管理员并拥有全部权限）
    /// </summary>
    public async Task<Company> CreateCompanyAsync(CreateCompanyRequest request, string userId)
    {
        // 获取当前用户信息
        var currentUser = await _context.Set<AppUser>()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (currentUser == null)
        {
            throw new KeyNotFoundException("当前用户不存在");
        }

        // 自动生成企业代码（基于用户名和时间戳，保证唯一性）
        string companyCode;

        // 如果请求中提供了代码，使用用户提供的（向后兼容）
        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            var existingCompany = await GetCompanyByCodeAsync(request.Code);
            if (existingCompany != null)
            {
                throw new InvalidOperationException(ErrorCode.CompanyCodeExists);
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
            };

            await _context.Set<Company>().AddAsync(company);
            await _context.SaveChangesAsync();

            // 2. 获取所有全局菜单ID（菜单是全局资源，所有企业共享）
            var allMenus = await _context.Set<Menu>()
                .Where(m => m.IsEnabled == true)
                .ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();

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
                // ✅ DbContext.SaveChangesAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _context.Set<Role>().AddAsync(adminRole);
            await _context.SaveChangesAsync();

            // 4. 创建用户-企业关联（用户是管理员）
            userCompany = new UserCompany
            {
                UserId = currentUser.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                Status = "active",
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow  // 业务字段，需要手动设置
                // ✅ DbContext.SaveChangesAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _context.Set<UserCompany>().AddAsync(userCompany);
            await _context.SaveChangesAsync();

            return company;
        }
        catch (Exception ex)
        {
            // 错误回滚：清理已创建的数据
            if (userCompany != null)
            {
                try
                {
                    var uc = await _context.Set<UserCompany>()
                        .FirstOrDefaultAsync(u => u.Id == userCompany.Id);
                    if (uc != null)
                    {
                        _context.Set<UserCompany>().Remove(uc);
                        await _context.SaveChangesAsync();
                    }
                }
                catch { /* 忽略清理失败，不影响主流程 */ }
            }

            if (adminRole != null)
            {
                try
                {
                    var r = await _context.Set<Role>()
                        .FirstOrDefaultAsync(ro => ro.Id == adminRole.Id);
                    if (r != null)
                    {
                        _context.Set<Role>().Remove(r);
                        await _context.SaveChangesAsync();
                    }
                }
                catch { /* 忽略清理失败，不影响主流程 */ }
            }

            if (company != null)
            {
                try
                {
                    var c = await _context.Set<Company>()
                        .FirstOrDefaultAsync(co => co.Id == company.Id);
                    if (c != null)
                    {
                        _context.Set<Company>().Remove(c);
                        await _context.SaveChangesAsync();
                    }
                }
                catch { /* 忽略清理失败，不影响主流程 */ }
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
        // 使用 IgnoreQueryFilters 绕过多租户过滤器，确保跨租户或登录时能找到企业
        return await _context.Set<Company>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    /// <summary>
    /// 根据代码获取企业
    /// </summary>
    public async Task<Company?> GetCompanyByCodeAsync(string code)
    {
        return await _context.Set<Company>()
            .FirstOrDefaultAsync(c => c.Code == code.ToLower());
    }

    /// <summary>
    /// 更新企业信息（使用原子操作）
    /// </summary>
    public async Task<bool> UpdateCompanyAsync(string id, UpdateCompanyRequest request)
    {
        var company = await _context.Set<Company>()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null) return false;

        if (request.Name != null) company.Name = request.Name;
        if (request.Description != null) company.Description = request.Description;
        if (request.Industry != null) company.Industry = request.Industry;
        if (request.ContactName != null) company.ContactName = request.ContactName;
        if (request.ContactEmail != null) company.ContactEmail = request.ContactEmail;
        if (request.ContactPhone != null) company.ContactPhone = request.ContactPhone;
        if (request.Logo != null) company.Logo = request.Logo;
        if (request.DisplayName != null) company.DisplayName = request.DisplayName;

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 获取企业统计信息
    /// </summary>
    public async Task<CompanyStatistics> GetCompanyStatisticsAsync(string companyId)
    {
        var company = await GetCompanyByIdAsync(companyId);
        if (company == null)
        {
            throw new KeyNotFoundException(ErrorCode.CompanyNotFound);
        }

        var totalUsers = await _context.Set<UserCompany>()
            .CountAsync(uc => uc.CompanyId == companyId && uc.Status == "active");

        var activeUserIds = await _context.Set<UserCompany>()
            .Where(uc => uc.CompanyId == companyId && uc.Status == "active")
            .Select(uc => uc.UserId)
            .ToListAsync();

        var activeUsers = await _context.Set<AppUser>()
            .CountAsync(u => activeUserIds.Contains(u.Id) && u.IsActive);

        var totalRoles = await _context.Set<Role>()
            .CountAsync(r => r.CompanyId == companyId);

        var totalMenus = await _context.Set<Menu>()
            .CountAsync(m => m.IsEnabled == true);

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
        return await _context.Set<Company>()
            .ToListAsync();
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
        var keywordLower = keyword.ToLower();
        var companies = await _context.Set<Company>()
            .Where(c => (c.Name.ToLower().Contains(keywordLower) || c.Code.ToLower().Contains(keywordLower)) && c.IsActive == true)
            .OrderByDescending(c => c.CreatedAt)
            .Take(20)
            .ToListAsync();

        var results = new List<CompanySearchResult>();

        // 批量查询创建人信息 (核心修复：使用 IgnoreQueryFilters 确保跨租户可见性)
        var creatorIds = companies
            .Select(c => c.CreatedBy)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToList();

        var creators = new Dictionary<string, AppUser>();
        if (creatorIds.Any())
        {
            var creatorList = await _context.Set<AppUser>()
                .IgnoreQueryFilters()
                .Where(u => creatorIds.Contains(u.Id))
                .ToListAsync();
            creators = creatorList.Where(u => u.Id != null).ToDictionary(u => u.Id!, u => u);
        }

        foreach (var company in companies)
        {
            var membership = await _context.Set<UserCompany>()
                .FirstOrDefaultAsync(uc => uc.UserId == userId && uc.CompanyId == company.Id);

            var pendingRequest = await _context.Set<CompanyJoinRequest>()
                .IgnoreQueryFilters()
                .Where(jr => jr.UserId == userId && jr.CompanyId == company.Id && jr.Status == "pending")
                .FirstOrDefaultAsync();

            var memberCount = await _context.Set<UserCompany>()
                .CountAsync(uc => uc.CompanyId == company.Id && uc.Status == "active");

            // 获取创建人名称 (仅通过ID查询)
            string? creatorName = null;
            if (!string.IsNullOrEmpty(company.CreatedBy) && creators.TryGetValue(company.CreatedBy, out var creator))
            {
                creatorName = !string.IsNullOrWhiteSpace(creator.Name) ? creator.Name :
                             (!string.IsNullOrWhiteSpace(creator.Username) ? creator.Username : null);
            }

            if (string.IsNullOrWhiteSpace(creatorName))
            {
                creatorName = "Unknown";
            }

            // 修复 IsCreator 判断：确保 ID 比较不受大小写或空格影响
            var isCreator = false;
            if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(company.CreatedBy))
            {
                isCreator = string.Equals(company.CreatedBy.Trim(), userId.Trim(), StringComparison.OrdinalIgnoreCase);
            }

            results.Add(new CompanySearchResult
            {
                Company = company,
                IsMember = membership != null && membership.Status == "active",
                HasPendingRequest = pendingRequest != null,
                RequestId = pendingRequest?.Id,
                IsCreator = isCreator,
                CreatorName = creatorName,
                MemberStatus = membership?.Status,
                MemberCount = (int)memberCount
            });
        }

        return results;
    }
}

