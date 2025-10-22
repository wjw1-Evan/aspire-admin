using MongoDB.Driver;
using Platform.ApiService.Models;

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
    private readonly IMongoCollection<Captcha> _captchas;
    private readonly ILogger<CaptchaService> _logger;
    private const int EXPIRATION_MINUTES = 5;

    public CaptchaService(IMongoDatabase database, ILogger<CaptchaService> logger)
    {
        _captchas = database.GetCollection<Captcha>("captchas");
        _logger = logger;
    }

    /// <summary>
    /// 生成验证码
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
            ExpiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        // 删除该手机号的旧验证码
        await _captchas.DeleteManyAsync(c => c.Phone == phone && !c.IsUsed);

        // 插入新验证码
        await _captchas.InsertOneAsync(captcha);

        return new CaptchaResult
        {
            Code = captcha.Code,
            ExpiresIn = EXPIRATION_MINUTES * 60 // 秒
        };
    }

    /// <summary>
    /// 验证验证码
    /// </summary>
    /// <param name="phone">手机号</param>
    /// <param name="code">用户输入的验证码</param>
    /// <returns>验证是否成功</returns>
    public async Task<bool> ValidateCaptchaAsync(string phone, string code)
    {
        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(code))
        {
            _logger.LogWarning("[验证码] 验证失败 - 手机号或验证码为空");
            return false;
        }

        // 查找有效的验证码
        var filter = Builders<Captcha>.Filter.And(
            Builders<Captcha>.Filter.Eq(c => c.Phone, phone),
            Builders<Captcha>.Filter.Eq(c => c.Code, code),
            Builders<Captcha>.Filter.Eq(c => c.IsUsed, false),
            Builders<Captcha>.Filter.Gt(c => c.ExpiresAt, DateTime.UtcNow)
        );

        var captcha = await _captchas.Find(filter).FirstOrDefaultAsync();

        if (captcha == null)
        {
            _logger.LogWarning("[验证码] 验证失败 - 验证码不存在或已过期，手机号: {Phone}", phone);
            return false;
        }

        // 标记为已使用
        var update = Builders<Captcha>.Update.Set(c => c.IsUsed, true);
        await _captchas.UpdateOneAsync(c => c.Id == captcha.Id, update);

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

