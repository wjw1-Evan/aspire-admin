using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
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

    /// <inheritdoc/>
    public async Task<User> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
        {
            throw new ArgumentException("请输入图形验证码");
        }

        var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "register");
        if (!captchaValid)
        {
            throw new ArgumentException("验证码无效");
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


            return user;
        }
        catch (ArgumentException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            throw new ArgumentException(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            _logger.LogError(ex, "用户注册失败，已执行回滚操作");
            throw new ArgumentException($"注册失败: {ex.Message}");
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
                }
            }

            if (user != null)
            {
                var userToDelete = await _context.Set<User>().FirstOrDefaultAsync(x => x.Id == user.Id!);
                if (userToDelete != null) { _context.Set<User>().Remove(userToDelete); await _context.SaveChangesAsync(); }
            }

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

            var allMenus = await _context.Set<Menu>().IgnoreQueryFilters().Where(m => m.IsEnabled == true).ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();

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
