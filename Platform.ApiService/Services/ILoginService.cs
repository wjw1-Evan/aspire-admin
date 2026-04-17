using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ILoginService
{
    Task<LoginResult> LoginAsync(LoginRequest request);
    Task<bool> LogoutAsync();
    Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request);
}
