using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using SkiaSharp;
using System.Security.Cryptography;
using System.Text;

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
public class ImageCaptchaService : BaseService, IImageCaptchaService
{
    private readonly IMongoCollection<CaptchaImage> _captchas;
    private const int EXPIRATION_MINUTES = 5;
    private const int IMAGE_WIDTH = 120;
    private const int IMAGE_HEIGHT = 40;
    private const int FONT_SIZE = 18;

    // 验证码字符集（排除容易混淆的字符）
    private static readonly string[] CHARACTERS = { "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "2", "3", "4", "5", "6", "7", "8", "9" };

    public ImageCaptchaService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<ImageCaptchaService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _captchas = Database.GetCollection<CaptchaImage>("captcha_images");
    }

    /// <summary>
    /// 生成图形验证码
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

        // 删除该IP的旧验证码（防刷）
        if (!string.IsNullOrEmpty(clientIp))
        {
            await _captchas.DeleteManyAsync(c => c.ClientIp == clientIp && c.Type == type && !c.IsUsed);
        }

        // 插入新验证码
        await _captchas.InsertOneAsync(captcha);

        Logger.LogInformation("[图形验证码] 生成成功: {CaptchaId}, 类型: {Type}, IP: {ClientIp}", 
            captchaId, type, clientIp);

        return new CaptchaImageResult
        {
            CaptchaId = captchaId,
            ImageData = imageData,
            ExpiresIn = EXPIRATION_MINUTES * 60
        };
    }

    /// <summary>
    /// 验证图形验证码
    /// </summary>
    public async Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login")
    {
        if (string.IsNullOrWhiteSpace(captchaId) || string.IsNullOrWhiteSpace(answer))
        {
            Logger.LogWarning("[图形验证码] 验证失败 - 验证码ID或答案为空");
            return false;
        }

        // 查找有效的验证码
        var filter = Builders<CaptchaImage>.Filter.And(
            Builders<CaptchaImage>.Filter.Eq(c => c.CaptchaId, captchaId),
            Builders<CaptchaImage>.Filter.Eq(c => c.Type, type),
            Builders<CaptchaImage>.Filter.Eq(c => c.IsUsed, false),
            Builders<CaptchaImage>.Filter.Gt(c => c.ExpiresAt, DateTime.UtcNow)
        );

        var captcha = await _captchas.Find(filter).FirstOrDefaultAsync();

        if (captcha == null)
        {
            Logger.LogWarning("[图形验证码] 验证失败 - 验证码不存在或已过期，ID: {CaptchaId}", captchaId);
            return false;
        }

        // 验证答案
        var decryptedAnswer = DecryptAnswer(captcha.Answer);
        var isValid = string.Equals(decryptedAnswer, answer.Trim(), StringComparison.OrdinalIgnoreCase);

        if (isValid)
        {
            // 标记为已使用
            var update = Builders<CaptchaImage>.Update.Set(c => c.IsUsed, true);
            await _captchas.UpdateOneAsync(c => c.Id == captcha.Id, update);
            
            Logger.LogInformation("[图形验证码] 验证成功: {CaptchaId}", captchaId);
        }
        else
        {
            Logger.LogWarning("[图形验证码] 验证失败 - 答案错误，ID: {CaptchaId}, 期望: {Expected}, 实际: {Actual}", 
                captchaId, decryptedAnswer, answer);
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
