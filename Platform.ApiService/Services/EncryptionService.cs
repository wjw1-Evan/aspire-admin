using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// AES-256-GCM 加密服务实现
/// 使用用户ID派生密钥，确保每个用户的数据独立加密
/// </summary>
public class EncryptionService : IEncryptionService
{
    private const int KeySize = 32; // AES-256
    private const int NonceSize = 12; // GCM推荐12字节
    private const int TagSize = 16; // GCM标签大小
    private const int SaltSize = 16; // PBKDF2盐值大小
    private const int Iterations = 100000; // PBKDF2迭代次数

    /// <summary>
    /// 加密文本
    /// </summary>
    public async Task<string> EncryptAsync(string plaintext, string userId)
    {
        if (string.IsNullOrEmpty(plaintext))
            throw new ArgumentException("明文不能为空", nameof(plaintext));
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        return await Task.Run(() =>
        {
            // 生成随机盐值
            var salt = new byte[SaltSize];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }

            // 使用PBKDF2从用户ID派生密钥
            var key = DeriveKey(userId, salt);

            // 生成随机Nonce
            var nonce = new byte[NonceSize];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(nonce);
            }

            // 加密
            var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
            var ciphertext = new byte[plaintextBytes.Length];
            var tag = new byte[TagSize];

            using (var aes = new AesGcm(key, TagSize))
            {
                aes.Encrypt(nonce, plaintextBytes, ciphertext, tag);
            }

            // 组合：盐值(16) + Nonce(12) + 标签(16) + 密文
            var result = new byte[SaltSize + NonceSize + TagSize + ciphertext.Length];
            Buffer.BlockCopy(salt, 0, result, 0, SaltSize);
            Buffer.BlockCopy(nonce, 0, result, SaltSize, NonceSize);
            Buffer.BlockCopy(tag, 0, result, SaltSize + NonceSize, TagSize);
            Buffer.BlockCopy(ciphertext, 0, result, SaltSize + NonceSize + TagSize, ciphertext.Length);

            return Convert.ToBase64String(result);
        });
    }

    /// <summary>
    /// 解密文本
    /// </summary>
    public async Task<string> DecryptAsync(string ciphertext, string userId)
    {
        if (string.IsNullOrEmpty(ciphertext))
            throw new ArgumentException("密文不能为空", nameof(ciphertext));
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        return await Task.Run(() =>
        {
            try
            {
                var data = Convert.FromBase64String(ciphertext);

                // 验证数据长度
                if (data.Length < SaltSize + NonceSize + TagSize)
                    throw new CryptographicException("密文格式无效");

                // 提取各部分
                var salt = new byte[SaltSize];
                var nonce = new byte[NonceSize];
                var tag = new byte[TagSize];
                var encryptedData = new byte[data.Length - SaltSize - NonceSize - TagSize];

                Buffer.BlockCopy(data, 0, salt, 0, SaltSize);
                Buffer.BlockCopy(data, SaltSize, nonce, 0, NonceSize);
                Buffer.BlockCopy(data, SaltSize + NonceSize, tag, 0, TagSize);
                Buffer.BlockCopy(data, SaltSize + NonceSize + TagSize, encryptedData, 0, encryptedData.Length);

                // 派生密钥
                var key = DeriveKey(userId, salt);

                // 解密
                var plaintext = new byte[encryptedData.Length];
                using (var aes = new AesGcm(key, TagSize))
                {
                    aes.Decrypt(nonce, encryptedData, tag, plaintext);
                }

                return Encoding.UTF8.GetString(plaintext);
            }
            catch (Exception ex)
            {
                throw new CryptographicException("解密失败", ex);
            }
        });
    }

    /// <summary>
    /// 使用PBKDF2从用户ID派生密钥
    /// </summary>
    private static byte[] DeriveKey(string userId, byte[] salt)
    {
        var userIdBytes = Encoding.UTF8.GetBytes(userId);
        return Rfc2898DeriveBytes.Pbkdf2(
            userIdBytes,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            KeySize);
    }
}
