using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Exceptions;
using Menu = Platform.ServiceDefaults.Models.Menu;
using User = Platform.ApiService.Models.AppUser;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户注册服务实现
/// </summary>
public class RegistrationService : IRegistrationService
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IImageCaptchaService _imageCaptchaService;
    private readonly IPasswordEncryptionService _encryptionService;
    private readonly ILogger<RegistrationService> _logger;

    public RegistrationService(
        DbContext context,
        IUserService userService,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPasswordHasher passwordHasher,
        IImageCaptchaService imageCaptchaService,
        IPasswordEncryptionService encryptionService,
        ILogger<RegistrationService> logger)
    {
        _context = context;
        _userService = userService;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _passwordHasher = passwordHasher;
        _imageCaptchaService = imageCaptchaService;
        _encryptionService = encryptionService;
        _logger = logger;
    }

    private string GetClientIdentifier(string? username = null)
    {
        return !string.IsNullOrEmpty(username) ? username.ToLowerInvariant() : "unknown";
    }

    private async Task<int> GetFailureCountAsync(string clientId, string type)
    {
        var record = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type &&
                r.ExpiresAt > DateTime.UtcNow);
        return record?.FailureCount ?? 0;
    }

    private async Task RecordFailureAsync(string clientId, string type)
    {
        var existingRecord = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type);

        if (existingRecord != null)
        {
            existingRecord.FailureCount++;
            existingRecord.LastFailureAt = DateTime.UtcNow;
            existingRecord.ExpiresAt = DateTime.UtcNow.AddMinutes(AuthConstants.LoginFailureExpiresMinutes);
        }
        else
        {
            var newRecord = new LoginFailureRecord
            {
                ClientId = clientId,
                Type = type,
                FailureCount = 1,
                LastFailureAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(AuthConstants.LoginFailureExpiresMinutes)
            };
            await _context.Set<LoginFailureRecord>().AddAsync(newRecord);
        }

        await _context.SaveChangesAsync();
    }

    private async Task ClearFailureAsync(string clientId, string type)
    {
        var record = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type &&
                !r.IsDeleted);
        if (record != null)
        {
            _context.Set<LoginFailureRecord>().Remove(record);
            await _context.SaveChangesAsync();
        }
    }

    /// <inheritdoc/>
    public async Task<User> RegisterAsync(RegisterRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "register");
        var requiresCaptcha = failureCount > 0;

        if (requiresCaptcha)
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                throw new BusinessException("需要验证码");
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "register");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "register");
                throw new BusinessException("验证码无效");
            }
        }

        _validationService.ValidateUsername(request.Username);
        _validationService.ValidatePassword(request.Password);
        _validationService.ValidateEmail(request.Email);

        try
        {
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
        }
        catch (InvalidOperationException)
        {
            await RecordFailureAsync(clientId, "register");
            throw;
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            try
            {
                await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
            }
            catch (InvalidOperationException)
            {
                await RecordFailureAsync(clientId, "register");
                throw;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            try
            {
                await _uniquenessChecker.EnsurePhoneUniqueAsync(request.PhoneNumber.Trim());
            }
            catch (InvalidOperationException)
            {
                await RecordFailureAsync(clientId, "register");
                throw;
            }
        }

        User? user = null;
        Company? personalCompany = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            var rawPassword = _encryptionService.TryDecryptPassword(request.Password);

            user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = _passwordHasher.HashPassword(rawPassword),
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
                IsActive = true
            };

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                user.PhoneNumber = request.PhoneNumber.Trim();
            }

            await _context.Set<User>().AddAsync(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("用户注册成功: {Username} ({UserId})", user.Username, user.Id);

            var companyResult = await CreatePersonalCompanyWithDetailsAsync(user);
            personalCompany = companyResult.Company;
            adminRole = companyResult.Role;
            userCompany = companyResult.UserCompany;

            var userToUpdate = await _context.Set<User>().IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == user.Id!);
            if (userToUpdate != null)
            {
                userToUpdate.CurrentCompanyId = personalCompany.Id;
                userToUpdate.PersonalCompanyId = personalCompany.Id;
                await _context.SaveChangesAsync();
            }

            user.CurrentCompanyId = personalCompany.Id;
            user.PersonalCompanyId = personalCompany.Id;

            _logger.LogInformation("用户 {Username} 注册完成，个人企业: {CompanyName}", user.Username, personalCompany.Name);

            await ClearFailureAsync(clientId, "register");

            return user;
        }
        catch (ArgumentException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            throw new BusinessException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            throw new BusinessException(ex.Message);
        }
        catch (Exception ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            _logger.LogError(ex, "用户注册失败，已执行回滚操作");
            throw new BusinessException($"注册失败: {ex.Message}");
        }
    }

    /// <inheritdoc/>
    public async Task RollbackUserRegistrationAsync(User? user, Company? company, Role? role, UserCompany? userCompany)
    {
        try
        {
            if (userCompany != null)
            {
                var uc = await _context.Set<UserCompany>().FirstOrDefaultAsync(x => x.Id == userCompany.Id!);
                if (uc != null) { _context.Set<UserCompany>().Remove(uc); await _context.SaveChangesAsync(); }
                if (role != null)
                {
                    var r = await _context.Set<Role>().FirstOrDefaultAsync(x => x.Id == role.Id!);
                    if (r != null) { _context.Set<Role>().Remove(r); await _context.SaveChangesAsync(); }
                }
                if (company != null)
                {
                    var c = await _context.Set<Company>().FirstOrDefaultAsync(x => x.Id == company.Id!);
                    if (c != null) { _context.Set<Company>().Remove(c); await _context.SaveChangesAsync(); }
                    _logger.LogInformation("回滚：删除企业 {CompanyId}", company.Id);
                }
            }

            if (user != null)
            {
                var userToDelete = await _context.Set<User>().FirstOrDefaultAsync(x => x.Id == user.Id!);
                if (userToDelete != null) { _context.Set<User>().Remove(userToDelete); await _context.SaveChangesAsync(); }
                _logger.LogInformation("回滚：删除用户 {UserId}", user.Id);
            }

            _logger.LogInformation("用户注册回滚完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "回滚操作失败，可能需要手动清理数据");
        }
    }

    private class CompanyCreationResult
    {
        public Company Company { get; set; } = null!;
        public Role Role { get; set; } = null!;
        public UserCompany UserCompany { get; set; } = null!;
    }

    private async Task<CompanyCreationResult> CreatePersonalCompanyWithDetailsAsync(User user)
    {
        Company? company = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            company = new Company
            {
                Name = $"{user.Username}{CompanyConstants.PersonalCompanyNameSuffix}",
                Code = $"{CompanyConstants.PersonalCompanyCodePrefix}{user.Id}",
                Description = "个人企业",
                IsActive = true
            };

            await _context.Set<Company>().AddAsync(company);
            await _context.SaveChangesAsync();
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode}), CreatedBy: {CreatedBy}", company.Name, company.Code, company.CreatedBy);

            var allMenus = await _context.Set<Menu>().Where(m => m.IsEnabled == true).ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            if (!allMenuIds.Any())
            {
                _logger.LogError("系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,
                IsActive = true
            };

            await _context.Set<Role>().AddAsync(adminRole);
            await _context.SaveChangesAsync();
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            userCompany = new UserCompany
            {
                UserId = user.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                Status = "active",
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow
            };

            await _context.Set<UserCompany>().AddAsync(userCompany);
            await _context.SaveChangesAsync();
            _logger.LogInformation("创建用户-企业关联: {UserId} -> {CompanyId}", user.Id, company.Id);

            return new CompanyCreationResult
            {
                Company = company,
                Role = adminRole,
                UserCompany = userCompany
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建个人企业失败: {CompanyName}", company?.Name);
            throw;
        }
    }
}
