namespace Platform.ApiService.Services;

/// <summary>
/// 加密服务接口 - 用于密码本密码加密
/// </summary>
public interface IEncryptionService
{
    /// <summary>
    /// 加密文本
    /// </summary>
    /// <param name="plaintext">明文</param>
    /// <param name="userId">用户ID（用于密钥派生）</param>
    /// <returns>加密后的Base64字符串</returns>
    Task<string> EncryptAsync(string plaintext, string userId);

    /// <summary>
    /// 解密文本
    /// </summary>
    /// <param name="ciphertext">加密后的Base64字符串</param>
    /// <param name="userId">用户ID（用于密钥派生）</param>
    /// <returns>解密后的明文</returns>
    Task<string> DecryptAsync(string ciphertext, string userId);
}
