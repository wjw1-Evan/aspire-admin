using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务接口
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// 获取当前登录用户信息
    /// </summary>
    /// <returns>当前用户信息，如果未登录则返回 null</returns>
    Task<CurrentUser?> GetCurrentUserAsync();
    
    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    /// <returns>登录结果，包含 Token 和用户信息</returns>
    Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request);
    
    /// <summary>
    /// 用户登出
    /// </summary>
    /// <returns>是否成功登出</returns>
    Task<bool> LogoutAsync();
    
    /// <summary>
    /// 用户注册
    /// </summary>
    /// <param name="request">注册请求</param>
    /// <returns>注册结果，包含用户信息</returns>
    Task<ApiResponse<User>> RegisterAsync(RegisterRequest request);
    
    /// <summary>
    /// 修改密码
    /// </summary>
    /// <param name="request">修改密码请求</param>
    /// <returns>是否成功修改</returns>
    Task<ApiResponse<bool>> ChangePasswordAsync(ChangePasswordRequest request);
    
    /// <summary>
    /// 刷新 Token
    /// </summary>
    /// <param name="request">刷新 Token 请求</param>
    /// <returns>新的 Token 信息</returns>
    Task<ApiResponse<RefreshTokenResult>> RefreshTokenAsync(RefreshTokenRequest request);
}

