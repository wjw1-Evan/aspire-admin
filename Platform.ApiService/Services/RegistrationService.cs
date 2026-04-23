using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Platform.ServiceDefaults.Models;
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
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RegistrationService> _logger;

    public RegistrationService(
        DbContext context,
        IUserService userService,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPasswordHasher passwordHasher,
        IImageCaptchaService imageCaptchaService,
        IPasswordEncryptionService encryptionService,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<RegistrationService> logger)
    {
        _context = context;
        _userService = userService;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _passwordHasher = passwordHasher;
        _imageCaptchaService = imageCaptchaService;
        _encryptionService = encryptionService;
        _emailService = emailService;
        _configuration = configuration;
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

        if (request.Password != request.ConfirmPassword)
        {
            throw new ArgumentException("两次输入的密码不一致");
        }

        if (!string.IsNullOrEmpty(request.Email) && !string.IsNullOrEmpty(request.ConfirmPassword))
        {
            if (request.Password == request.Email)
            {
                throw new ArgumentException("密码不能与邮箱相同");
            }
        }

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

            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                await SendVerificationEmailAsync(user);
            }

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

    private async Task SendVerificationEmailAsync(User user)
    {
        try
        {
            var verificationToken = Guid.NewGuid().ToString("N");
            var expiresAt = DateTime.UtcNow.AddHours(24);
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "http://localhost:15001";
            var verifyUrl = $"{baseUrl}/user/verify-email?token={verificationToken}&userId={user.Id}";

            user.EmailVerificationToken = verificationToken;
            user.EmailVerificationExpiresAt = expiresAt;
            await _context.SaveChangesAsync();

            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>验证邮箱</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0;'>验证您的邮箱地址</h1>
    </div>
    <div style='background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;'>
        <p>您好，{user.Username}：</p>
        <p>感谢您注册成为我们的会员！请点击以下按钮验证您的邮箱地址：</p>
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{verifyUrl}' style='display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;'>验证邮箱</a>
        </div>
        <p style='font-size: 12px; color: #666;'>该链接将在 24 小时后过期。如未注册，请忽略此邮件。</p>
    </div>
</body>
</html>";

            await _emailService.SendEmailAsync(user.Email!, "验证您的邮箱地址", htmlBody);
            _logger.LogInformation("已发送验证邮件至 {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "发送验证邮件失败: {Email}", user.Email);
        }
    }

    public async Task UpdateUserVerificationTokenAsync(User user)
    {
        await _context.SaveChangesAsync();
    }
}
