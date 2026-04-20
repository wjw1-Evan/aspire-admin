using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务接口
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// 获取当前登录用户信息
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>当前用户信息，如果未登录则返回 null</returns>
    Task<CurrentUser?> GetCurrentUserAsync(string? userId = null);

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    /// <returns>登录结果，包含 Token 和用户信息</returns>
    Task<LoginResult> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// 用户登出
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    /// <returns>是否成功登出</returns>
    Task<bool> LogoutAsync(string userId, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// 用户注册
    /// </summary>
    /// <param name="request">注册请求</param>
    /// <returns>注册结果，包含用户信息</returns>
    Task<AppUser> RegisterAsync(RegisterRequest request);

    /// <summary>
    /// 修改密码
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="request">修改密码请求</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    /// <returns>是否成功修改</returns>
    Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// 刷新 Token
    /// </summary>
    /// <param name="request">刷新 Token 请求</param>
    /// <param name="ipAddress">IP地址（可选）</param>
    /// <param name="userAgent">用户代理（可选）</param>
    /// <returns>新的 Token 信息</returns>
    Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// 发送密码重置验证码
    /// </summary>
    /// <param name="request">请求数据</param>
    /// <returns>操作结果</returns>
    Task<bool> SendPasswordResetCodeAsync(SendResetCodeRequest request);

    /// <summary>
    /// 通过验证码重置密码
    /// </summary>
    /// <param name="request">重置密码请求</param>
    /// <returns>操作结果</returns>
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
}
