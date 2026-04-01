using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码服务接口
/// </summary>
public interface IPasswordService
{
    /// <summary>
    /// 修改密码
    /// </summary>
    Task<ServiceResult<bool>> ChangePasswordAsync(ChangePasswordRequest request);

    /// <summary>
    /// 发送密码重置验证码
    /// </summary>
    Task<ServiceResult<bool>> SendPasswordResetCodeAsync(SendResetCodeRequest request);

    /// <summary>
    /// 通过验证码重置密码
    /// </summary>
    Task<ServiceResult<bool>> ResetPasswordAsync(ResetPasswordRequest request);
}
