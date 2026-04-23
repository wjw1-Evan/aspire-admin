using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Platform.ServiceDefaults.Models;
using Menu = Platform.ServiceDefaults.Models.Menu;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务门面实现 - 委托给子服务
/// </summary>
public class AuthService : IAuthService
{
    private readonly ILoginService _loginService;
    private readonly IRegistrationService _registrationService;
    private readonly IPasswordService _passwordService;
    private readonly ISessionService _sessionService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ILoginService loginService,
        IRegistrationService registrationService,
        IPasswordService passwordService,
        ISessionService sessionService,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _loginService = loginService;
        _registrationService = registrationService;
        _passwordService = passwordService;
        _sessionService = sessionService;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<CurrentUser?> GetCurrentUserAsync(string? userId = null)
    {
        return await _sessionService.GetCurrentUserAsync(userId);
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null)
    {
        return await _loginService.LoginAsync(request, ipAddress, userAgent);
    }

    public async Task<bool> LogoutAsync(string userId, string? ipAddress = null, string? userAgent = null)
    {
        return await _loginService.LogoutAsync(userId, ipAddress, userAgent);
    }

    public async Task<AppUser> RegisterAsync(RegisterRequest request)
    {
        return await _registrationService.RegisterAsync(request);
    }

    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request, string? ipAddress = null, string? userAgent = null)
    {
        return await _passwordService.ChangePasswordAsync(userId, request, ipAddress, userAgent);
    }

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, string? userAgent = null)
    {
        return await _loginService.RefreshTokenAsync(request, ipAddress, userAgent);
    }

    public async Task<bool> SendPasswordResetCodeAsync(SendResetCodeRequest request)
    {
        return await _passwordService.SendPasswordResetCodeAsync(request);
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        return await _passwordService.ResetPasswordAsync(request);
    }

    public async Task<bool> SendVerificationEmailAsync(User user)
    {
        try
        {
            var verificationToken = Guid.NewGuid().ToString("N");
            var expiresAt = DateTime.UtcNow.AddHours(24);
            var baseUrl = _configuration["AppSettings:BaseUrl"] ?? "http://localhost:15001";
            var verifyUrl = $"{baseUrl}/user/verify-email?token={verificationToken}&userId={user.Id}";

            user.EmailVerificationToken = verificationToken;
            user.EmailVerificationExpiresAt = expiresAt;
            await _registrationService.UpdateUserVerificationTokenAsync(user);

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
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "发送验证邮件失败: {Email}", user.Email);
            return false;
        }
    }
}
