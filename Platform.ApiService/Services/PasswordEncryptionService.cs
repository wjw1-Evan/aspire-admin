using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码传输加密服务实现
/// 使用 RSA 非对称加密算法保护传输中的敏感数据
/// </summary>
public class PasswordEncryptionService : IPasswordEncryptionService
{
    private readonly RSA _rsa;
    private readonly ILogger<PasswordEncryptionService> _logger;

    /// <summary>
    /// 初始化密码传输加密服务
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public PasswordEncryptionService(ILogger<PasswordEncryptionService> logger)
    {
        _logger = logger;
        // 自动生成 2048 位 RSA 密钥对
        _rsa = RSA.Create(2048);
    }

    /// <summary>
    /// 获取 RSA 公钥（PEM 格式，PKCS#8）
    /// </summary>
    public string GetPublicKey()
    {
        // 🔧 修复：使用 ExportSubjectPublicKeyInfo 导出标准 PKCS#8 格式
        // 以确保与主流前端加密库（如 jsrsasign, jsencrypt）的常规加载方式兼容
        var publicKey = _rsa.ExportSubjectPublicKeyInfo();
        var base64 = Convert.ToBase64String(publicKey);
 
        // 构造 PEM 格式
        var sb = new StringBuilder();
        sb.AppendLine("-----BEGIN PUBLIC KEY-----");
        for (int i = 0; i < base64.Length; i += 64)
        {
            sb.AppendLine(base64.Substring(i, Math.Min(64, base64.Length - i)));
        }
        sb.AppendLine("-----END PUBLIC KEY-----");
 
        return sb.ToString();
    }

    /// <summary>
    /// 解密密码
    /// </summary>
    /// <param name="encryptedPassword">前端传来的经过 RSA 公钥加密后的 Base64 字符串</param>
    public string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
            return string.Empty;

        try
        {
            var data = Convert.FromBase64String(encryptedPassword);
            var decryptedData = _rsa.Decrypt(data, RSAEncryptionPadding.Pkcs1);
            return Encoding.UTF8.GetString(decryptedData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RSA 解密失败");
            throw new CryptographicException("密码解密失败，请检查加密格式或重试获取公钥。");
        }
    }

    /// <summary>
    /// 尝试解密，如果失败（例如是非 Base64 或不是加密数据）则返回原字符串
    /// 用于兼容性处理
    /// </summary>
    public string TryDecryptPassword(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 128) // RSA 2048 密文至少 128-256 字节
            return password;

        try
        {
            // 如果能解密成功，则是加密数据
            return DecryptPassword(password);
        }
        catch (Exception)
        {
            // 解密失败说明可能不是加密过的，或者加密版本不匹配，返回原始值
            _logger.LogWarning("密码解密失败，尝试使用原始值进行处理。");
            return password;
        }
    }
}
