using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Text;
using Color = SixLabors.ImageSharp.Color;

namespace Platform.ApiService.Services;

/// <summary>
/// 图形验证码服务实现
/// </summary>
public class ImageCaptchaService : IImageCaptchaService
{
    private readonly DbContext _context;
    private readonly IConfiguration _configuration;

    private const int EXPIRATION_MINUTES = 5;
    private const int IMAGE_WIDTH = 130;
    private const int IMAGE_HEIGHT = 40;
    private const int CHAR_WIDTH = 18;
    private const int CHAR_HEIGHT = 24;
    private const int NOISE_LINES = 5;
    private const int NOISE_DOTS = 50;

    private string EncryptionKey => _configuration["Captcha:EncryptionKey"] ?? GenerateFallbackKey();

    private static readonly string[] CHARACTERS = { "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" };

    public ImageCaptchaService(DbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private static string GenerateFallbackKey()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())[..16];
    }

    public async Task<CaptchaImageResult> GenerateCaptchaAsync(string type = "login", string? clientIp = null)
    {
        var answer = GenerateRandomAnswer();
        var captchaId = Guid.NewGuid().ToString("N")[..16];
        var imageData = GenerateCaptchaImage(answer);
        var encryptedAnswer = EncryptAnswer(answer, EncryptionKey);
        var expiresAt = DateTime.UtcNow.AddMinutes(EXPIRATION_MINUTES);

        var existingCaptchas = await _context.Set<CaptchaImage>().IgnoreQueryFilters().Where(x => x.IsDeleted != true).Where(
            c => c.IsUsed == false && c.Type == type && (string.IsNullOrEmpty(clientIp) || c.ClientIp == clientIp))
            .Take(1).ToListAsync();

        CaptchaImage captcha;
        if (existingCaptchas.Any())
        {
            captcha = existingCaptchas.First();
            var entity = await _context.Set<CaptchaImage>().FirstOrDefaultAsync(x => x.Id == captcha.Id);
            if (entity != null)
            {
                entity.CaptchaId = captchaId;
                entity.Answer = encryptedAnswer;
                entity.ExpiresAt = expiresAt;
                entity.Type = type;
                entity.ClientIp = clientIp!;
                entity.IsUsed = false;
                await _context.SaveChangesAsync();
            }
        }
        else
        {
            captcha = new CaptchaImage
            {
                CaptchaId = captchaId,
                Answer = encryptedAnswer,
                ExpiresAt = expiresAt,
                Type = type,
                ClientIp = clientIp!,
                IsUsed = false
            };
            await _context.Set<CaptchaImage>().AddAsync(captcha);
            await _context.SaveChangesAsync();
        }

        return new CaptchaImageResult
        {
            CaptchaId = captchaId,
            ImageData = imageData,
            ExpiresIn = EXPIRATION_MINUTES * 60
        };
    }

    public async Task<bool> ValidateCaptchaAsync(string captchaId, string answer, string type = "login")
    {
        if (string.IsNullOrWhiteSpace(captchaId) || string.IsNullOrWhiteSpace(answer))
        {
            return false;
        }

        var captchas = await _context.Set<CaptchaImage>().IgnoreQueryFilters().Where(x => x.IsDeleted != true).Where(
            c => c.CaptchaId == captchaId && c.Type == type && c.IsUsed == false && c.ExpiresAt > DateTime.UtcNow)
            .Take(1).ToListAsync();

        var result = captchas.FirstOrDefault();
        if (result == null)
        {
            return false;
        }

        var entity = await _context.Set<CaptchaImage>().FirstOrDefaultAsync(x => x.Id == result.Id);
        if (entity != null)
        {
            entity.IsUsed = true;
            await _context.SaveChangesAsync();
        }

        var decryptedAnswer = DecryptAnswer(result.Answer, EncryptionKey);
        return string.Equals(decryptedAnswer, answer, StringComparison.OrdinalIgnoreCase);
    }

    public async Task<bool> IsCaptchaRequiredAsync(string type = "login", string? clientIp = null, string? username = null)
    {
        var ip = clientIp ?? "unknown";
        var record = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == ip &&
                r.Type == type &&
                r.ExpiresAt > DateTime.UtcNow);
        return (record?.FailureCount ?? 0) >= 1;
    }

    private static string GenerateRandomAnswer()
    {
        var random = Random.Shared;
        var length = 4;
        var answer = new StringBuilder(length);

        for (int i = 0; i < length; i++)
        {
            answer.Append(CHARACTERS[random.Next(CHARACTERS.Length)]);
        }

        return answer.ToString();
    }

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

    private static void DrawCharacter(Image<Rgba32> image, char ch, int x, int y, Color color, Random random)
    {
        x += random.Next(-1, 1);
        y += random.Next(-1, 1);

        switch (ch)
        {
            case '0':
                DrawLine(image, x + 2, y + 2, x + CHAR_WIDTH - 2, y + 2, color);
                DrawLine(image, x + 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + 2, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH - 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH - 2, y + 2, x + 2, y + CHAR_HEIGHT - 2, color);
                break;
            case '1':
                DrawLine(image, x + CHAR_WIDTH / 2, y + 2, x + CHAR_WIDTH / 2, y + CHAR_HEIGHT - 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2 - 3, y + 5, x + CHAR_WIDTH / 2, y + 2, color);
                DrawLine(image, x + CHAR_WIDTH / 2 - 4, y + CHAR_HEIGHT - 2, x + CHAR_WIDTH / 2 + 4, y + CHAR_HEIGHT - 2, color);
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

    private static string EncryptAnswer(string answer, string key)
    {
        var result = new StringBuilder(answer.Length);

        for (int i = 0; i < answer.Length; i++)
        {
            result.Append((char)(answer[i] ^ key[i % key.Length]));
        }

        return Convert.ToBase64String(Encoding.UTF8.GetBytes(result.ToString()));
    }

    private static string DecryptAnswer(string encryptedAnswer, string key)
    {
        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedAnswer);
            var encrypted = Encoding.UTF8.GetString(encryptedBytes);
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