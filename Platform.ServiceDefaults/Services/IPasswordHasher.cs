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

        var salt = new byte[SaltSize];
        System.Security.Cryptography.RandomNumberGenerator.Fill(salt);
        var saltHex = Hex.ToHexString(salt);

        var hashHex = ComputeSM3Hash(password, saltHex);

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

        if (!hashedPassword.StartsWith(SM3_PREFIX))
        {
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

        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedHashHex),
            Encoding.UTF8.GetBytes(actualHashHex)
        );
    }

    private string ComputeSM3Hash(string password, string saltHex)
    {
        var inputBytes = Encoding.UTF8.GetBytes(password + saltHex);
        var digest = new SM3Digest();
        digest.BlockUpdate(inputBytes, 0, inputBytes.Length);
        var result = new byte[digest.GetDigestSize()];
        digest.DoFinal(result, 0);
        return Hex.ToHexString(result);
    }
}
