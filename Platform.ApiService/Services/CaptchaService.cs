using Microsoft.Extensions.Caching.Memory;

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
    private readonly IMemoryCache _cache;
    private readonly ILogger<CaptchaService> _logger;
    private const int EXPIRATION_MINUTES = 5;
    private const string CACHE_KEY_PREFIX = "captcha_";

    public CaptchaService(IMemoryCache cache, ILogger<CaptchaService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// 生成验证码
    /// </summary>
    /// <param name="phone">手机号（作为标识）</param>
    /// <returns>验证码结果</returns>
    public async Task<CaptchaResult> GenerateCaptchaAsync(string phone)
    {
        await Task.CompletedTask;

        // 生成随机6位数字验证码
        var random = new Random();
        var captcha = random.Next(100000, 999999).ToString();

        // 存储到缓存，5分钟过期
        var cacheKey = $"{CACHE_KEY_PREFIX}{phone}";
        var cacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(EXPIRATION_MINUTES)
        };

        _cache.Set(cacheKey, captcha, cacheOptions);

        return new CaptchaResult
        {
            Code = captcha,
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
        await Task.CompletedTask;

        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(code))
        {
            _logger.LogWarning("[验证码] 验证失败 - 手机号或验证码为空");
            return false;
        }

        var cacheKey = $"{CACHE_KEY_PREFIX}{phone}";

        // 从缓存获取验证码
        if (_cache.TryGetValue(cacheKey, out string? storedCode))
        {
            // 验证成功后立即删除，防止重复使用
            _cache.Remove(cacheKey);

            var isValid = storedCode == code;

            if (!isValid)
            {
                _logger.LogWarning(
                    "[验证码] 验证失败 - 手机号: {Phone}, 期望: {Expected}, 实际: {Actual}", 
                    phone, 
                    storedCode, 
                    code);
            }

            return isValid;
        }

        _logger.LogWarning("[验证码] 验证失败 - 验证码不存在或已过期，手机号: {Phone}", phone);
        return false;
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

