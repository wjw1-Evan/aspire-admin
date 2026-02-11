using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

/// <summary>
/// 本地验证码服务 - 生成和验证随机数字验证码
/// </summary>
public interface ICaptchaService
{
    Task<CaptchaResult> GenerateCaptchaAsync(string phone);
    Task<bool> ValidateCaptchaAsync(string phone, string code);
}

public class CaptchaService : ICaptchaService
{
    private readonly IDataFactory<Captcha> _captchaFactory;
    private readonly ILogger<CaptchaService> _logger;
    private const int EXPIRATION_MINUTES = 5;

    public CaptchaService(
        IDataFactory<Captcha> captchaFactory,
        ILogger<CaptchaService> logger)
    {
        _captchaFactory = captchaFactory;
        _logger = logger;
    }

    public async Task<CaptchaResult> GenerateCaptchaAsync(string phone)
    {
        var random = new Random();
        var captcha = new Captcha
        {
            Phone = phone,
            Code = random.Next(100000, 999999).ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES)
        };

        var existingCaptchas = await _captchaFactory.FindWithoutTenantFilterAsync(c => c.Phone == phone && c.IsUsed == false);
        var existingCaptcha = existingCaptchas.FirstOrDefault();

        if (existingCaptcha != null)
        {
            existingCaptcha.Code = captcha.Code;
            existingCaptcha.ExpiresAt = captcha.ExpiresAt;
            await _captchaFactory.UpdateAsync(existingCaptcha.Id!, c =>
            {
                c.Code = captcha.Code;
                c.ExpiresAt = captcha.ExpiresAt;
            });
        }
        else
        {
            await _captchaFactory.CreateAsync(captcha);
        }

        _logger.LogInformation("[验证码] 生成成功: {Phone} -> {Code}", phone, captcha.Code);

        return new CaptchaResult
        {
            Code = captcha.Code,
            ExpiresIn = EXPIRATION_MINUTES * 60
        };
    }

    public async Task<bool> ValidateCaptchaAsync(string phone, string code)
    {
        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(code))
        {
            _logger.LogInformation("[验证码] 验证失败 - 手机号或验证码为空");
            return false;
        }

        Expression<Func<Captcha, bool>> filter = c => 
            c.Phone == phone && 
            c.Code == code && 
            c.IsUsed == false && 
            c.ExpiresAt > DateTime.UtcNow;
        
        var captchas = await _captchaFactory.FindWithoutTenantFilterAsync(filter);
        var captcha = captchas.FirstOrDefault();

        if (captcha == null)
        {
            _logger.LogInformation("[验证码] 验证失败 - 验证码不存在或已过期，手机号: {Phone}", phone);
            return false;
        }

        await _captchaFactory.UpdateAsync(captcha.Id!, c => c.IsUsed = true);
        _logger.LogInformation("[验证码] 验证成功: {Phone} -> {Code}", phone, code);
        return true;
    }
}

public class CaptchaResult
{
    public string Code { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
}
