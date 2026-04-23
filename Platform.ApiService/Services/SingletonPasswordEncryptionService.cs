using Org.BouncyCastle.Asn1.GM;
using Org.BouncyCastle.Asn1.X9;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Math;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.Utilities.Encoders;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码传输加密服务实现
/// 使用国密 SM2 非对称加密算法保护传输中的敏感数据
/// </summary>
public class SingletonPasswordEncryptionService : IPasswordEncryptionService
{
    private readonly AsymmetricCipherKeyPair _keyPair;
    private readonly ILogger<SingletonPasswordEncryptionService> _logger;
    private readonly string _publicKeyHex;

    /// <summary>
    /// 初始化密码传输加密服务并生成 SM2 密钥对
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public SingletonPasswordEncryptionService(ILogger<SingletonPasswordEncryptionService> logger)
    {
        _logger = logger;

        try
        {
            var x9 = GMNamedCurves.GetByName("sm2p256v1");
            if (x9 == null) throw new InvalidOperationException("无法加载国密 SM2 曲线配置 (sm2p256v1)");

            var ecDomain = new ECDomainParameters(x9.Curve, x9.G, x9.N, x9.H);

            var gen = new ECKeyPairGenerator();
            gen.Init(new ECKeyGenerationParameters(ecDomain, new SecureRandom()));
            _keyPair = gen.GenerateKeyPair();

            var pubKey = (ECPublicKeyParameters)_keyPair.Public;
            var fullKey = pubKey.Q.GetEncoded(false);
            _publicKeyHex = Hex.ToHexString(fullKey).Substring(2);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "SingletonPasswordEncryptionService 初始化失败，国密加密组件不可用。");
            throw;
        }
    }

    /// <summary>
    /// 获取 SM2 公钥（十六进制编码字符串）
    /// </summary>
    public string GetPublicKey()
    {
        return "04" + _publicKeyHex;
    }

    /// <summary>
    /// SM2 解密密码
    /// </summary>
    /// <param name="encryptedPassword">前端传来的 SM2 加密数据</param>
    public string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
            return string.Empty;

        try
        {
            byte[] cipherText = Hex.Decode(encryptedPassword);

            var sm2Engine = new SM2Engine(new SM3Digest(), SM2Engine.Mode.C1C3C2);
            sm2Engine.Init(false, _keyPair.Private);

            var decryptedData = sm2Engine.ProcessBlock(cipherText, 0, cipherText.Length);
            return Encoding.UTF8.GetString(decryptedData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SM2 解密失败. Cipher length: {Len}", encryptedPassword.Length);
            throw new CryptographicException("密码解密失败，请检查加密格式或重试获取公钥。");
        }
    }

    /// <summary>
    /// 尝试解密，如果失败则返回原字符串
    /// </summary>
    public string TryDecryptPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            return password;

        var actualPassword = password.StartsWith("04") ? password.Substring(2) : password;

        if (actualPassword.Length < 64)
            return password;

        try
        {
            return DecryptPassword(actualPassword);
        }
        catch (Exception)
        {
            _logger.LogWarning("密码解密失败，尝试使用原始值进行处理。");
            return password;
        }
    }
}
