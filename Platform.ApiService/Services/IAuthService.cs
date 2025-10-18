using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务接口
/// </summary>
public interface IAuthService
{
    Task<CurrentUser?> GetCurrentUserAsync();
    Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request);
    Task<bool> LogoutAsync();
    Task<ApiResponse<User>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<bool>> ChangePasswordAsync(ChangePasswordRequest request);
    Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request);
}

