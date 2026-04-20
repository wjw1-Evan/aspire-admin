using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ILoginService
{
    Task<LoginResult> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null);
    Task<bool> LogoutAsync(string userId, string? ipAddress = null, string? userAgent = null);
    Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, string? userAgent = null);
}
