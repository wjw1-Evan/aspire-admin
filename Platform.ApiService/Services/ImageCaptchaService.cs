using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Security.Cryptography;
using System.Text;
using MongoDB.Driver;
using Color = SixLabors.ImageSharp.Color;

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
    /// <returns>验证码结果，包含验证码ID和图片数据</returns>
    Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null);

    /// <summary>
    /// 验证图形验证码
    /// </summary>
    /// <param name="captchaId">验证码ID</param>
    /// <param name="answer">用户输入的答案</param>
    /// <param name="type">验证码类型</param>
    /// <returns>如果验证成功返回 true，否则返回 false</returns>
    Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login");
}

/// <summary>
/// 图形验证码服务实现
/// </summary>
public class ImageCaptchaService : IImageCaptchaService
{
    private readonly IDatabaseOperationFactory<CaptchaImage> _captchaFactory;
    
    // 常量配置
    private const int EXPIRATION_MINUTES = 5;
    private const int IMAGE_WIDTH = 120;
    private const int IMAGE_HEIGHT = 40;
    private const int CHAR_WIDTH = 18;
    private const int CHAR_HEIGHT = 24;
    private const int NOISE_LINES = 5;
    private const int NOISE_DOTS = 50;
    private const string ENCRYPTION_KEY = "CaptchaKey2024";

    // 验证码字符集（排除容易混淆的字符）
    private static readonly string[] CHARACTERS = { "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "2", "3", "4", "5", "6", "7", "8", "9" };

    /// <summary>
    /// 初始化图形验证码服务
    /// </summary>
    /// <param name="captchaFactory">图形验证码数据操作工厂</param>
    public ImageCaptchaService(IDatabaseOperationFactory<CaptchaImage> captchaFactory)
    {
        _captchaFactory = captchaFactory;
    }


    /// <summary>
    /// 生成图形验证码
    /// </summary>
    public async Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null)
    {
        var answer = GenerateRandomAnswer();
        var captchaId = Guid.NewGuid().ToString("N")[..16];
        var imageData = GenerateCaptchaImage(answer);
        var encryptedAnswer = EncryptAnswer(answer);
        var expiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES);

        var filterBuilder = _captchaFactory.CreateFilterBuilder()
            .Equal(c => c.IsUsed, false)
            .Equal(c => c.Type, type);

        if (!string.IsNullOrEmpty(clientIp))
        {
            filterBuilder = filterBuilder.Equal(c => c.ClientIp, clientIp);
        }

        var filter = filterBuilder.Build();
        var update = _captchaFactory.CreateUpdateBuilder()
            .Set(c => c.CaptchaId, captchaId)
            .Set(c => c.Answer, encryptedAnswer)
            .Set(c => c.ExpiresAt, expiresAt)
            .Set(c => c.Type, type)
            .Set(c => c.ClientIp, clientIp!)
            .Set(c => c.IsUsed, false)
            .SetCurrentTimestamp()
            .Build();

        await _captchaFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, new FindOneAndUpdateOptions<CaptchaImage>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        });

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
            return false;
        }

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

        var result = await _captchaFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, new FindOneAndUpdateOptions<CaptchaImage>
        {
            ReturnDocument = ReturnDocument.Before
        });

        if (result == null)
        {
            return false;
        }

        var decryptedAnswer = DecryptAnswer(result.Answer);
        return string.Equals(decryptedAnswer, answer.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// 生成随机验证码答案
    /// </summary>
    private static string GenerateRandomAnswer()
    {
        var random = Random.Shared;
        var length = random.Next(4, 6); // 4-5位验证码
        var answer = new StringBuilder(length);

        for (int i = 0; i < length; i++)
        {
            answer.Append(CHARACTERS[random.Next(CHARACTERS.Length)]);
        }

        return answer.ToString();
    }

    /// <summary>
    /// 生成验证码图片（使用几何线条绘制，不依赖字体）
    /// </summary>
    private static string GenerateCaptchaImage(string answer)
    {
        var random = Random.Shared;
        using var image = new Image<Rgba32>(Configuration.Default, IMAGE_WIDTH, IMAGE_HEIGHT, Color.White);

        AddNoiseLines(image, random);
        AddNoiseDots(image, random);
        DrawCaptchaText(image, answer, random);

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return Convert.ToBase64String(ms.ToArray());
    }

    /// <summary>
    /// 添加干扰线
    /// </summary>
    private static void AddNoiseLines(Image<Rgba32> image, Random random)
    {
        for (int i = 0; i < NOISE_LINES; i++)
        {
            var x1 = random.Next(0, IMAGE_WIDTH);
            var y1 = random.Next(0, IMAGE_HEIGHT);
            var x2 = random.Next(0, IMAGE_WIDTH);
            var y2 = random.Next(0, IMAGE_HEIGHT);
            
            var lineColor = Color.FromRgb(
                (byte)random.Next(100, 255),
                (byte)random.Next(100, 255),
                (byte)random.Next(100, 255)
            );
            
            DrawLine(image, x1, y1, x2, y2, lineColor);
        }
    }

    /// <summary>
    /// 添加干扰点
    /// </summary>
    private static void AddNoiseDots(Image<Rgba32> image, Random random)
    {
        for (int i = 0; i < NOISE_DOTS; i++)
        {
            var x = random.Next(0, IMAGE_WIDTH);
            var y = random.Next(0, IMAGE_HEIGHT);
            
            var dotColor = Color.FromRgb(
                (byte)random.Next(100, 255),
                (byte)random.Next(100, 255),
                (byte)random.Next(100, 255)
            );
            
            image[x, y] = dotColor;
        }
    }

    /// <summary>
    /// 绘制验证码文字（使用几何线条绘制，不依赖字体）
    /// </summary>
    private static void DrawCaptchaText(Image<Rgba32> image, string answer, Random random)
    {
        for (int i = 0; i < answer.Length; i++)
        {
            var baseX = 10 + i * (CHAR_WIDTH + 5) + random.Next(-2, 2);
            var baseY = (IMAGE_HEIGHT - CHAR_HEIGHT) / 2 + random.Next(-2, 2);
            var textColor = Color.FromRgb(
                (byte)random.Next(0, 100),
                (byte)random.Next(0, 100),
                (byte)random.Next(0, 100)
            );
            
            DrawCharacter(image, answer[i], baseX, baseY, textColor, random);
        }
    }

    /// <summary>
    /// 绘制单个字符（使用几何线条，不依赖字体）
    /// </summary>
    private static void DrawCharacter(Image<Rgba32> image, char ch, int x, int y, Color color, Random random)
    {
        x += random.Next(-1, 1);
        y += random.Next(-1, 1);

        switch (ch)
        {
            case 'A':
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH / 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 3, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                break;
            case 'B':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                break;
            case 'C':
                DrawLine(image, x + CHAR_WIDTH - 2, y + 3, x + CHAR_WIDTH / 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + 2, y + 3, color);
                DrawLine(image, x + 2, y + 3, x + 2, y + CHAR_HEIGHT - 3, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 3, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 3, color);
                break;
            case 'D':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 4, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 4, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 4, y + 2, x + CHAR_WIDTH - 2, y + 4, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 4, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, x + CHAR_WIDTH - 4, y + CHAR_HEIGHT - 2, color);
                break;
            case 'E':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'F':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                break;
            case 'G':
                DrawLine(image, x + CHAR_WIDTH - 2, y + 3, x + CHAR_WIDTH / 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + 2, y + 3, color);
                DrawLine(image, x + 2, y + 3, x + 2, y + CHAR_HEIGHT - 3, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 3, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 3, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 3, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                break;
            case 'H':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                break;
            case 'J':
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, x + 2, y + CHAR_HEIGHT - 4, color);
                break;
            case 'K':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                break;
            case 'L':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'M':
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + 2, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'N':
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + 2, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + 2, color);
                break;
            case 'P':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                break;
            case 'Q':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 4, x + 3, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + 3, y + CHAR_HEIGHT - 4, x + 3, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'R':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'S':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 3, y + 2, x + 2, y + 4, color);
                DrawLine(image, x + 2, y + 4, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, x + 3, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 3, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                break;
            case 'T':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'U':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 4, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 4, x + CHAR_WIDTH - 2, y + 2, color);
                break;
            case 'V':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + 2, color);
                break;
            case 'W':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + 2, color);
                break;
            case 'X':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'Y':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                break;
            case 'Z':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case '2':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, x + 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case '3':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, x + 3, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, x + 2, y + CHAR_HEIGHT / 2, color);
                break;
            case '4':
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                break;
            case '5':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, x + 3, y + CHAR_HEIGHT - 2, color);
                break;
            case '6':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, x + 2, y + CHAR_HEIGHT / 2, color);
                break;
            case '7':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                break;
            case '8':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 3, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                break;
            case '9':
                DrawLine(image, x + 3, y + 2, x + CHAR_WIDTH - 3, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT / 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT / 2, color);
                DrawLine(image, x + 3, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 3, y + CHAR_HEIGHT - 2, color);
                break;
        }
    }

    /// <summary>
    /// 绘制直线（Bresenham算法）
    /// </summary>
    private static void DrawLine(Image<Rgba32> image, int x0, int y0, int x1, int y1, Color color)
    {
        var dx = Math.Abs(x1 - x0);
        var dy = Math.Abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1;
        var sy = y0 < y1 ? 1 : -1;
        var err = dx - dy;

        while (true)
        {
            if (x0 >= 0 && x0 < image.Width && y0 >= 0 && y0 < image.Height)
            {
                image[x0, y0] = color;
            }

            if (x0 == x1 && y0 == y1) break;
            var e2 = 2 * err;
            if (e2 > -dy)
            {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx)
            {
                err += dx;
                y0 += sy;
            }
        }
    }

    /// <summary>
    /// 加密验证码答案
    /// </summary>
    private static string EncryptAnswer(string answer)
    {
        var key = ENCRYPTION_KEY;
        var result = new StringBuilder(answer.Length);
        
        for (int i = 0; i < answer.Length; i++)
        {
            result.Append((char)(answer[i] ^ key[i % key.Length]));
        }
        
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(result.ToString()));
    }

    /// <summary>
    /// 解密验证码答案
    /// </summary>
    private static string DecryptAnswer(string encryptedAnswer)
    {
        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedAnswer);
            var encrypted = Encoding.UTF8.GetString(encryptedBytes);
            var key = ENCRYPTION_KEY;
            var result = new StringBuilder(encrypted.Length);
            
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

