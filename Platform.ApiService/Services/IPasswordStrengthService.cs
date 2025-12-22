using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码强度检测服务接口
/// </summary>
public interface IPasswordStrengthService
{
    /// <summary>
    /// 检测密码强度
    /// </summary>
    /// <param name="password">密码</param>
    /// <returns>强度检测结果</returns>
    PasswordStrengthResult CheckStrength(string password);
}
