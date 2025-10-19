using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// P0修复：为缺少 UserCompany 记录的企业管理员补充关联记录
/// 
/// 问题：企业注册时创建了用户和角色，但没有创建 UserCompany 关联记录
/// 影响：用户无法获取角色信息，企业统计不准确
/// 修复时间：2025-10-19
/// </summary>
public class FixMissingUserCompanyRecords
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<FixMissingUserCompanyRecords> _logger;

    public FixMissingUserCompanyRecords(IMongoDatabase database, ILogger<FixMissingUserCompanyRecords> logger)
    {
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 执行修复
    /// </summary>
    public async Task<FixResult> FixAsync()
    {
        _logger.LogInformation("========== 开始修复缺失的 UserCompany 记录 ==========");

        var companies = _database.GetCollection<Company>("companies");
        var users = _database.GetCollection<AppUser>("users");
        var roles = _database.GetCollection<Role>("roles");
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");

        var result = new FixResult();

        try
        {
            // 1. 查找所有活跃企业
            var allCompanies = await companies.Find(c => c.IsActive && !c.IsDeleted).ToListAsync();
            _logger.LogInformation("找到 {Count} 个活跃企业", allCompanies.Count);

            foreach (var company in allCompanies)
            {
                result.TotalCompanies++;

                // 2. 查找该企业的管理员角色
                var adminRole = await roles.Find(r => 
                    r.CompanyId == company.Id && 
                    r.Name == "管理员" && 
                    !r.IsDeleted
                ).FirstOrDefaultAsync();

                if (adminRole == null)
                {
                    _logger.LogWarning("企业 {CompanyId} ({CompanyName}) 没有管理员角色", 
                        company.Id, company.Name);
                    result.SkippedCompanies++;
                    continue;
                }

                // 3. 查找该企业的用户（CurrentCompanyId 指向该企业）
                var companyUsers = await users.Find(u => 
                    u.CurrentCompanyId == company.Id && 
                    !u.IsDeleted
                ).ToListAsync();

                _logger.LogInformation("企业 {CompanyId} ({CompanyName}) 有 {Count} 个用户", 
                    company.Id, company.Name, companyUsers.Count);

                foreach (var user in companyUsers)
                {
                    // 4. 检查是否已有 UserCompany 记录
                    var existingUserCompany = await userCompanies.Find(uc =>
                        uc.UserId == user.Id &&
                        uc.CompanyId == company.Id &&
                        !uc.IsDeleted
                    ).FirstOrDefaultAsync();

                    if (existingUserCompany != null)
                    {
                        _logger.LogDebug("用户 {UserId} ({Username}) 已有企业关联记录，跳过", 
                            user.Id, user.Username);
                        result.SkippedUsers++;
                        continue;
                    }

                    // 5. 创建 UserCompany 记录
                    var userCompany = new UserCompany
                    {
                        UserId = user.Id!,
                        CompanyId = company.Id!,
                        RoleIds = new List<string> { adminRole.Id! },
                        IsAdmin = true,  // 暂时都设为管理员（可根据实际情况调整）
                        Status = "active",
                        JoinedAt = user.CreatedAt,  // 使用用户创建时间
                        IsDeleted = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    await userCompanies.InsertOneAsync(userCompany);
                    
                    _logger.LogInformation("✅ 为用户 {UserId} ({Username}) 创建企业关联记录，角色: {RoleId}", 
                        user.Id, user.Username, adminRole.Id);
                    
                    result.FixedUsers++;
                }
            }

            result.Success = true;
            _logger.LogInformation("========== UserCompany 记录修复完成 ==========");
            _logger.LogInformation("统计: 总企业 {Total}, 修复用户 {Fixed}, 跳过用户 {Skipped}, 跳过企业 {SkippedCompanies}",
                result.TotalCompanies, result.FixedUsers, result.SkippedUsers, result.SkippedCompanies);
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessage = ex.Message;
            _logger.LogError(ex, "❌ UserCompany 记录修复失败");
        }

        return result;
    }

    /// <summary>
    /// 验证修复结果
    /// </summary>
    public async Task<ValidationResult> ValidateAsync()
    {
        _logger.LogInformation("========== 开始验证 UserCompany 记录 ==========");

        var users = _database.GetCollection<AppUser>("users");
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");

        var validationResult = new ValidationResult();

        try
        {
            // 1. 查找所有活跃用户
            var allUsers = await users.Find(u => !u.IsDeleted).ToListAsync();
            validationResult.TotalUsers = allUsers.Count;

            // 2. 检查每个用户是否有 UserCompany 记录
            foreach (var user in allUsers)
            {
                if (string.IsNullOrEmpty(user.CurrentCompanyId))
                {
                    validationResult.UsersWithoutCompany++;
                    _logger.LogWarning("⚠️ 用户 {UserId} ({Username}) 没有 CurrentCompanyId", 
                        user.Id, user.Username);
                    continue;
                }

                var userCompany = await userCompanies.Find(uc =>
                    uc.UserId == user.Id &&
                    uc.CompanyId == user.CurrentCompanyId &&
                    !uc.IsDeleted
                ).FirstOrDefaultAsync();

                if (userCompany == null)
                {
                    validationResult.UsersWithoutUserCompany++;
                    _logger.LogError("❌ 用户 {UserId} ({Username}) 缺少 UserCompany 记录", 
                        user.Id, user.Username);
                }
                else
                {
                    validationResult.UsersWithUserCompany++;
                    _logger.LogDebug("✅ 用户 {UserId} ({Username}) 有 UserCompany 记录", 
                        user.Id, user.Username);
                }
            }

            validationResult.IsValid = validationResult.UsersWithoutUserCompany == 0;

            _logger.LogInformation("========== UserCompany 记录验证完成 ==========");
            _logger.LogInformation("统计: 总用户 {Total}, 有记录 {Valid}, 缺少记录 {Invalid}, 无企业 {NoCompany}",
                validationResult.TotalUsers,
                validationResult.UsersWithUserCompany,
                validationResult.UsersWithoutUserCompany,
                validationResult.UsersWithoutCompany);
        }
        catch (Exception ex)
        {
            validationResult.IsValid = false;
            validationResult.ErrorMessage = ex.Message;
            _logger.LogError(ex, "❌ UserCompany 记录验证失败");
        }

        return validationResult;
    }
}

/// <summary>
/// 修复结果
/// </summary>
public class FixResult
{
    public bool Success { get; set; }
    public int TotalCompanies { get; set; }
    public int FixedUsers { get; set; }
    public int SkippedUsers { get; set; }
    public int SkippedCompanies { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 验证结果
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public int TotalUsers { get; set; }
    public int UsersWithUserCompany { get; set; }
    public int UsersWithoutUserCompany { get; set; }
    public int UsersWithoutCompany { get; set; }
    public string? ErrorMessage { get; set; }
}
