using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
    /// 密码服务接口
    /// </summary>
    public interface IPasswordService
    {
        /// <summary>
        /// 修改密码
        /// </summary>
        Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request, string? ipAddress = null, string? userAgent = null);

        /// <summary>
        /// 发送密码重置验证码
        /// </summary>
        Task<bool> SendPasswordResetCodeAsync(SendResetCodeRequest request);

        /// <summary>
        /// 通过验证码重置密码
        /// </summary>
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    }
