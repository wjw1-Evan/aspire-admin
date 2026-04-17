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

    public async Task<CurrentUser?> GetCurrentUserAsync()
    {
        return await _sessionService.GetCurrentUserAsync();
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        return await _loginService.LoginAsync(request);
    }

    public async Task<bool> LogoutAsync()
    {
        return await _loginService.LogoutAsync();
    }

    public async Task<AppUser> RegisterAsync(RegisterRequest request)
    {
        return await _registrationService.RegisterAsync(request);
    }

    public async Task<bool> ChangePasswordAsync(ChangePasswordRequest request)
    {
        return await _passwordService.ChangePasswordAsync(request);
    }

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request)
    {
        return await _loginService.RefreshTokenAsync(request);
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
