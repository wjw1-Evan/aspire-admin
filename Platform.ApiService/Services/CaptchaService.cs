using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using MongoDB.Driver;

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
    private readonly IDatabaseOperationFactory<Captcha> _captchaFactory;
    private readonly ILogger<CaptchaService> _logger;
    private const int EXPIRATION_MINUTES = 5;

    public CaptchaService(
        IDatabaseOperationFactory<Captcha> captchaFactory,
        ILogger<CaptchaService> logger)
    {
        _captchaFactory = captchaFactory;
        _logger = logger;
    }

    /// <summary>
    /// 生成验证码（使用原子操作）
    /// </summary>
    /// <param name="phone">手机号（作为标识）</param>
    /// <returns>验证码结果</returns>
    public async Task<CaptchaResult> GenerateCaptchaAsync(string phone)
    {
        // 生成随机6位数字验证码
        var random = new Random();
        var captcha = new Captcha
        {
            Phone = phone,
            Code = random.Next(100000, 999999).ToString(),
            ExpiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES)
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        // 使用原子操作：查找并替换（如果不存在则插入）
        var filter = _captchaFactory.CreateFilterBuilder()
            .Equal(c => c.Phone, phone)
            .Equal(c => c.IsUsed, false)
            .Build();

        var options = new FindOneAndReplaceOptions<Captcha>
        {
            IsUpsert = true,  // 如果不存在则插入
            ReturnDocument = ReturnDocument.After
        };

        // 执行原子替换操作（不带租户过滤，因为验证码是全局资源）
        var result = await _captchaFactory.FindOneAndReplaceWithoutTenantFilterAsync(filter, captcha, options);

        _logger.LogInformation("[验证码] 生成成功: {Phone} -> {Code}", phone, captcha.Code);

        return new CaptchaResult
        {
            Code = captcha.Code,
            ExpiresIn = EXPIRATION_MINUTES * 60 // 秒
        };
    }

    /// <summary>
    /// 验证验证码（使用原子操作）
    /// </summary>
    /// <param name="phone">手机号</param>
    /// <param name="code">用户输入的验证码</param>
    /// <returns>验证是否成功</returns>
    public async Task<bool> ValidateCaptchaAsync(string phone, string code)
    {
        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(code))
        {
            _logger.LogInformation("[验证码] 验证失败 - 手机号或验证码为空");
            return false;
        }

        // 使用原子操作：查找并更新（标记为已使用）
        var filter = _captchaFactory.CreateFilterBuilder()
            .Equal(c => c.Phone, phone)
            .Equal(c => c.Code, code)
            .Equal(c => c.IsUsed, false)
            .GreaterThan(c => c.ExpiresAt, DateTime.UtcNow)
            .Build();

        var update = _captchaFactory.CreateUpdateBuilder()
            .Set(c => c.IsUsed, true)
            .SetCurrentTimestamp()
            .Build();

        var options = new FindOneAndUpdateOptions<Captcha>
        {
            ReturnDocument = ReturnDocument.Before  // 返回更新前的文档
        };

        // 执行原子更新操作（不带租户过滤，因为验证码是全局资源）
        var result = await _captchaFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, options);

        if (result == null)
        {
            _logger.LogInformation("[验证码] 验证失败 - 验证码不存在或已过期，手机号: {Phone}", phone);
            return false;
        }

        _logger.LogInformation("[验证码] 验证成功: {Phone} -> {Code}", phone, code);
        return true;
    }
}

/// <summary>
/// 验证码生成结果
/// </summary>
public class CaptchaResult
{
    /// <summary>
    /// 验证码
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 过期时间（秒）
    /// </summary>
    public int ExpiresIn { get; set; }
}

