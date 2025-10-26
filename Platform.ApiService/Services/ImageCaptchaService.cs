using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using SkiaSharp;
using System.Security.Cryptography;
using System.Text;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 图形验证码服务接口
/// </summary>
public interface IImageCaptchaService
{
    /// <summary>
    /// 生成图形验证码
    /// </summary>
    /// <param name="type">验证码类型（login, register）</param>
    /// <param name="clientIp">客户端IP</param>
    /// <returns>验证码结果</returns>
    Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null);

    /// <summary>
    /// 验证图形验证码
    /// </summary>
    /// <param name="captchaId">验证码ID</param>
    /// <param name="answer">用户输入的答案</param>
    /// <param name="type">验证码类型</param>
    /// <returns>验证是否成功</returns>
    Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login");
}

/// <summary>
/// 图形验证码服务实现
/// </summary>
public class ImageCaptchaService : IImageCaptchaService
{
    private readonly IDatabaseOperationFactory<CaptchaImage> _captchaFactory;
    private readonly ILogger<ImageCaptchaService> _logger;
    private const int EXPIRATION_MINUTES = 5;
    private const int IMAGE_WIDTH = 120;
    private const int IMAGE_HEIGHT = 40;
    private const int FONT_SIZE = 18;

    // 验证码字符集（排除容易混淆的字符）
    private static readonly string[] CHARACTERS = { "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "2", "3", "4", "5", "6", "7", "8", "9" };

    public ImageCaptchaService(
        IDatabaseOperationFactory<CaptchaImage> captchaFactory,
        ILogger<ImageCaptchaService> logger)
    {
        _captchaFactory = captchaFactory;
        _logger = logger;
    }

    /// <summary>
    /// 生成图形验证码（使用原子操作）
    /// </summary>
    public async Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null)
    {
        // 生成验证码答案
        var answer = GenerateRandomAnswer();
        var captchaId = Guid.NewGuid().ToString("N")[..16]; // 16位随机ID

        // 生成验证码图片
        var imageData = GenerateCaptchaImage(answer);

        // 加密存储答案
        var encryptedAnswer = EncryptAnswer(answer);

        // 创建验证码记录
        var captcha = new CaptchaImage
        {
            CaptchaId = captchaId,
            Answer = encryptedAnswer,
            ExpiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES),
            Type = type,
            ClientIp = clientIp,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        // 使用原子操作：查找并替换（如果不存在则插入）
        var filter = _captchaFactory.CreateFilterBuilder()
            .Equal(c => c.IsUsed, false)
            .Equal(c => c.Type, type);

        // 如果有IP限制，添加到过滤条件
        if (!string.IsNullOrEmpty(clientIp))
        {
            filter = filter.Equal(c => c.ClientIp, clientIp);
        }

        var finalFilter = filter.Build();

        var options = new FindOneAndReplaceOptions<CaptchaImage>
        {
            IsUpsert = true,  // 如果不存在则插入
            ReturnDocument = ReturnDocument.After
        };

        // 执行原子替换操作（不带租户过滤，因为验证码是全局资源）
        var result = await _captchaFactory.FindOneAndReplaceWithoutTenantFilterAsync(finalFilter, captcha, options);

        _logger.LogInformation("[图形验证码] 生成成功: {CaptchaId}, 类型: {Type}, IP: {ClientIp}", 
            captcha.CaptchaId, type ?? "unknown", clientIp ?? "unknown");

        return new CaptchaImageResult
        {
            CaptchaId = captcha.CaptchaId,  // 使用自定义的16位ID，而不是数据库ID
            ImageData = imageData,
            ExpiresIn = EXPIRATION_MINUTES * 60
        };
    }

    /// <summary>
    /// 验证图形验证码（使用原子操作）
    /// </summary>
    public async Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login")
    {
        if (string.IsNullOrWhiteSpace(captchaId) || string.IsNullOrWhiteSpace(answer))
        {
            _logger.LogInformation("[图形验证码] 验证失败 - 验证码ID或答案为空");
            return false;
        }

        // 使用原子操作：查找并更新（标记为已使用）
        var filter = _captchaFactory.CreateFilterBuilder()
            .Equal(c => c.CaptchaId, captchaId)
            .Equal(c => c.Type, type)
            .Equal(c => c.IsUsed, false)
            .GreaterThan(c => c.ExpiresAt, DateTime.UtcNow)
            .Build();

        var update = _captchaFactory.CreateUpdateBuilder()
            .Set(c => c.IsUsed, true)
            .SetCurrentTimestamp()
            .Build();

        var options = new FindOneAndUpdateOptions<CaptchaImage>
        {
            ReturnDocument = ReturnDocument.Before  // 返回更新前的文档
        };

        // 执行原子更新操作（不带租户过滤，因为验证码是全局资源）
        var result = await _captchaFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, options);

        if (result == null)
        {
            _logger.LogInformation("[图形验证码] 验证失败 - 验证码不存在或已过期，ID: {CaptchaId}", captchaId);
            return false;
        }

        // 验证答案
        var decryptedAnswer = DecryptAnswer(result.Answer);
        var isValid = string.Equals(decryptedAnswer, answer.Trim(), StringComparison.OrdinalIgnoreCase);

        if (isValid)
        {
            _logger.LogInformation("[图形验证码] 验证成功: {CaptchaId}", captchaId);
        }
        else
        {
            _logger.LogInformation("[图形验证码] 验证失败 - 答案错误，ID: {CaptchaId}", captchaId);
        }

        return isValid;
    }

    /// <summary>
    /// 生成随机验证码答案
    /// </summary>
    private string GenerateRandomAnswer()
    {
        var random = new Random();
        var length = random.Next(4, 6); // 4-5位验证码
        var answer = new StringBuilder();

        for (int i = 0; i < length; i++)
        {
            answer.Append(CHARACTERS[random.Next(CHARACTERS.Length)]);
        }

        return answer.ToString();
    }

    /// <summary>
    /// 生成验证码图片
    /// </summary>
    private string GenerateCaptchaImage(string answer)
    {
        // 创建 SkiaSharp 画布
        var info = new SKImageInfo(IMAGE_WIDTH, IMAGE_HEIGHT);
        using var surface = SKSurface.Create(info);
        using var canvas = surface.Canvas;

        // 设置背景色
        canvas.Clear(SKColors.White);

        // 添加干扰线
        var random = new Random();
        using var linePaint = new SKPaint
        {
            Color = SKColor.FromHsv(random.Next(0, 360), random.Next(50, 100), random.Next(50, 100)),
            StrokeWidth = 1,
            IsAntialias = true
        };

        for (int i = 0; i < 5; i++)
        {
            canvas.DrawLine(
                random.Next(0, IMAGE_WIDTH), random.Next(0, IMAGE_HEIGHT),
                random.Next(0, IMAGE_WIDTH), random.Next(0, IMAGE_HEIGHT),
                linePaint);
        }

        // 添加干扰点
        using var dotPaint = new SKPaint
        {
            Color = SKColor.FromHsv(random.Next(0, 360), random.Next(50, 100), random.Next(50, 100)),
            IsAntialias = true
        };

        for (int i = 0; i < 50; i++)
        {
            canvas.DrawCircle(random.Next(0, IMAGE_WIDTH), random.Next(0, IMAGE_HEIGHT), 1, dotPaint);
        }

        // 绘制验证码文字
        using var textFont = new SKFont
        {
            Size = FONT_SIZE,
            Typeface = SKTypeface.Default
        };
        
        using var textPaint = new SKPaint
        {
            Color = SKColors.Black,
            IsAntialias = true
        };

        for (int i = 0; i < answer.Length; i++)
        {
            var x = 10 + i * 20 + random.Next(-3, 3);
            var y = 25 + random.Next(-3, 3);
            canvas.DrawText(answer[i].ToString(), x, y, SKTextAlign.Left, textFont, textPaint);
        }

        // 转换为Base64
        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return Convert.ToBase64String(data.ToArray());
    }

    /// <summary>
    /// 加密验证码答案
    /// </summary>
    private string EncryptAnswer(string answer)
    {
        // 简单的XOR加密（生产环境建议使用更强的加密）
        var key = "CaptchaKey2024";
        var result = new StringBuilder();
        
        for (int i = 0; i < answer.Length; i++)
        {
            result.Append((char)(answer[i] ^ key[i % key.Length]));
        }
        
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(result.ToString()));
    }

    /// <summary>
    /// 解密验证码答案
    /// </summary>
    private string DecryptAnswer(string encryptedAnswer)
    {
        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedAnswer);
            var encrypted = Encoding.UTF8.GetString(encryptedBytes);
            var key = "CaptchaKey2024";
            var result = new StringBuilder();
            
            for (int i = 0; i < encrypted.Length; i++)
            {
                result.Append((char)(encrypted[i] ^ key[i % key.Length]));
            }
            
            return result.ToString();
        }
        catch
        {
            return string.Empty;
        }
    }
}
