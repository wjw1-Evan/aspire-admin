using Org.BouncyCastle.Asn1.GM;
using Org.BouncyCastle.Asn1.X9;
using Platform.ServiceDefaults.Services;
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
public class PasswordEncryptionService : IPasswordEncryptionService, ISingletonDependency
{
    private readonly AsymmetricCipherKeyPair _keyPair;
    private readonly ILogger<PasswordEncryptionService> _logger;
    private readonly string _publicKeyHex;

    /// <summary>
    /// 初始化密码传输加密服务并生成 SM2 密钥对
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public PasswordEncryptionService(ILogger<PasswordEncryptionService> logger)
    {
        _logger = logger;

        try
        {
            // 🚀 核心修复：SM2 曲线应从 GMNamedCurves 获取，而非 X962NamedCurves
            var x9 = GMNamedCurves.GetByName("sm2p256v1");
            if (x9 == null) throw new InvalidOperationException("无法加载国密 SM2 曲线配置 (sm2p256v1)");

            var ecDomain = new ECDomainParameters(x9.Curve, x9.G, x9.N, x9.H);

            var gen = new ECKeyPairGenerator();
            gen.Init(new ECKeyGenerationParameters(ecDomain, new SecureRandom()));
            _keyPair = gen.GenerateKeyPair();

            // 获取无压缩公钥，移除 04 前缀（前端 sm-crypto 需要 128 字符纯坐标）
            var pubKey = (ECPublicKeyParameters)_keyPair.Public;
            var fullKey = pubKey.Q.GetEncoded(false);
            _publicKeyHex = Hex.ToHexString(fullKey).Substring(2); // 去掉开头的 04
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "PasswordEncryptionService 初始化失败，国密加密组件不可用。");
            throw;
        }
    }

    /// <summary>
    /// 获取 SM2 公钥（十六进制编码字符串）
    /// </summary>
    public string GetPublicKey()
    {
        // 配合前端 sm-crypto 组件，这里只需直接返回包含 04 前缀的 130 字符 Hex
        return _publicKeyHex;
    }

    /// <summary>
    /// SM2 解密密码
    /// </summary>
    /// <param name="encryptedPassword">前端传来的 SM2 加密数据（格式：04 + Hex 字符串）</param>
    public string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
            return string.Empty;

        try
        {
            // 前端 sm-crypto 若采用非 ASN.1 (C1C3C2) 模式会使用 Hex 字符串（并带有 04 前缀）
            // 如果只有 04 前缀而没有被截取，这里要确保解析正常
            byte[] cipherText = Hex.Decode(encryptedPassword);

            // 使用 BouncyCastle SM2 引擎解密
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
        // 简单的猜测如果长度太短，可能就是明文或者格式不符
        if (string.IsNullOrEmpty(password) || password.Length < 90)
            return password;

        try
        {
            // 如果能解密成功，则是加密数据
            return DecryptPassword(password);
        }
        catch (Exception)
        {
            // 解密失败说明可能不是加密过的或者加密版本不匹配，返回原始值
            _logger.LogWarning("密码解密失败，尝试使用原始值进行处理。");
            return password;
        }
    }
}