using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 图形验证码服务接口
/// </summary>
public interface IImageCaptchaService
{
    /// <summary>
    /// 生成图形验证码
    /// </summary>
    Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null);

    /// <summary>
    /// 验证图形验证码
    /// </summary>
    Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login");
}