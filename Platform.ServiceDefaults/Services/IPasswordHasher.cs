using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.Utilities.Encoders;
using System.Text;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 密码散列服务接口
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// 散列密码
    /// </summary>
    string HashPassword(string password);

    /// <summary>
    /// 验证密码
    /// </summary>
    bool VerifyPassword(string password, string hashedPassword);
}

/// <summary>
/// 基于国密 SM3 的密码散列实现
/// 格式: $sm3${salt}${hash}
/// </summary>
public class SM3PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const string SM3_PREFIX = "$sm3$";

    /// <summary>
    /// 散列密码
    /// </summary>
    /// <param name="password">原始密码</param>
    /// <returns>散列后的密码</returns>
    public string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password)) throw new ArgumentNullException(nameof(password));

        // 生成随机盐
        var salt = new byte[SaltSize];
        System.Security.Cryptography.RandomNumberGenerator.Fill(salt);
        var saltHex = Hex.ToHexString(salt);

        // 计算 SM3(password + salt)
        var hashHex = ComputeSM3Hash(password, saltHex);

        // 返回包含算法前缀和盐的字符串
        return $"{SM3_PREFIX}{saltHex}${hashHex}";
    }

    /// <summary>
    /// 验证密码
    /// </summary>
    /// <param name="password">原始密码</param>
    /// <param name="hashedPassword">散列后的密码</param>
    /// <returns>是否匹配</returns>
    public bool VerifyPassword(string password, string hashedPassword)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
            return false;

        // 检查前缀
        if (!hashedPassword.StartsWith(SM3_PREFIX))
        {
            // 兼容之前没有前缀的格式 {salt}${hash}
            var legacyParts = hashedPassword.Split('$');
            if (legacyParts.Length == 2)
            {
                return VerifyInternal(password, legacyParts[0], legacyParts[1]);
            }
            return false;
        }

        var content = hashedPassword.Substring(SM3_PREFIX.Length);
        var parts = content.Split('$');
        if (parts.Length != 2) return false;

        return VerifyInternal(password, parts[0], parts[1]);
    }

    private bool VerifyInternal(string password, string saltHex, string expectedHashHex)
    {
        var actualHashHex = ComputeSM3Hash(password, saltHex);

        // 固定时间比较防止时序攻击 (Constant-time comparison)
        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedHashHex),
            Encoding.UTF8.GetBytes(actualHashHex)
        );
    }

    private string ComputeSM3Hash(string password, string saltHex)
    {
        var inputBytes = Encoding.UTF8.GetBytes(password + saltHex);
        return Hex.ToHexString(DigestUtilities.CalculateDigest("SM3", inputBytes));
    }
}
