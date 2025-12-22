using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码生成器服务接口
/// </summary>
public interface IPasswordGeneratorService
{
    /// <summary>
    /// 生成密码
    /// </summary>
    /// <param name="request">生成请求</param>
    /// <returns>生成的密码</returns>
    string GeneratePassword(GeneratePasswordRequest request);
}
