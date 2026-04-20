using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;

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

    public AuthService(
        ILoginService loginService,
        IRegistrationService registrationService,
        IPasswordService passwordService,
        ISessionService sessionService)
    {
        _loginService = loginService;
        _registrationService = registrationService;
        _passwordService = passwordService;
        _sessionService = sessionService;
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
}
