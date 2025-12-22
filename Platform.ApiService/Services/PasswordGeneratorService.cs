using System.Security.Cryptography;
using System.Text;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码生成器服务实现
/// </summary>
public class PasswordGeneratorService : IPasswordGeneratorService
{
    private const string LowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    private const string UppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string NumberChars = "0123456789";
    private const string SpecialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    /// <summary>
    /// 生成密码
    /// </summary>
    public string GeneratePassword(GeneratePasswordRequest request)
    {
        // 验证参数
        if (request.Length < 8 || request.Length > 32)
            throw new ArgumentException("密码长度必须在8-32之间", nameof(request));

        if (!request.IncludeUppercase && !request.IncludeLowercase && 
            !request.IncludeNumbers && !request.IncludeSpecialChars)
            throw new ArgumentException("至少需要选择一种字符类型", nameof(request));

        // 构建可用字符集
        var charSet = new StringBuilder();
        if (request.IncludeLowercase) charSet.Append(LowercaseChars);
        if (request.IncludeUppercase) charSet.Append(UppercaseChars);
        if (request.IncludeNumbers) charSet.Append(NumberChars);
        if (request.IncludeSpecialChars) charSet.Append(SpecialChars);

        var availableChars = charSet.ToString();
        if (string.IsNullOrEmpty(availableChars))
            throw new InvalidOperationException("字符集为空");

        // 确保至少包含每种选中的字符类型
        var password = new StringBuilder(request.Length);

        // 先确保每种类型至少有一个字符
        if (request.IncludeLowercase)
        {
            password.Append(GetRandomChar(LowercaseChars));
        }
        if (request.IncludeUppercase)
        {
            password.Append(GetRandomChar(UppercaseChars));
        }
        if (request.IncludeNumbers)
        {
            password.Append(GetRandomChar(NumberChars));
        }
        if (request.IncludeSpecialChars)
        {
            password.Append(GetRandomChar(SpecialChars));
        }

        // 填充剩余长度
        while (password.Length < request.Length)
        {
            password.Append(GetRandomChar(availableChars));
        }

        // 打乱字符顺序
        var result = password.ToString().ToCharArray();
        Shuffle(result);
        return new string(result);
    }

    /// <summary>
    /// 从字符集中随机选择一个字符
    /// </summary>
    private static char GetRandomChar(string charSet)
    {
        using (var rng = RandomNumberGenerator.Create())
        {
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var index = BitConverter.ToUInt32(bytes, 0) % (uint)charSet.Length;
            return charSet[(int)index];
        }
    }

    /// <summary>
    /// 打乱字符数组（Fisher-Yates洗牌算法）
    /// </summary>
    private static void Shuffle(char[] array)
    {
        using (var rng = RandomNumberGenerator.Create())
        {
            for (int i = array.Length - 1; i > 0; i--)
            {
                var bytes = new byte[4];
                rng.GetBytes(bytes);
                var j = BitConverter.ToUInt32(bytes, 0) % (uint)(i + 1);
                (array[i], array[j]) = (array[j], array[i]);
            }
        }
    }
}
