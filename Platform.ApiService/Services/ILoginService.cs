using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ILoginService
{
    Task<LoginData> LoginAsync(LoginRequest request);
    Task<bool> LogoutAsync();
    Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request);
}
