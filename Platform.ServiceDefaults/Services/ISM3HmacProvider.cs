using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Digests;
using Org.BouncyCastle.Crypto.Macs;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Utilities.Encoders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 国密 SM3-HMAC 防篡改服务接口
/// </summary>
public interface ISM3HmacProvider
{
    /// <summary>
    /// 计算 SM3-HMAC 指纹
    /// </summary>
    string ComputeHmac(string data, string? key = null);

    /// <summary>
    /// 验证 SM3-HMAC 指纹
    /// </summary>
    bool VerifyHmac(string data, string expectedHmac, string? key = null);

    /// <summary>
    /// 生成数据指纹（自动序列化关键字段）
    /// </summary>
    string ComputeEntityHmac(object entity, IEnumerable<string>? propertyNames = null);
}

/// <summary>
/// 国密 SM3-HMAC 防篡改服务实现
/// </summary>
public class SM3HmacProvider : ISM3HmacProvider
{
    private readonly byte[] _defaultKey;
    private readonly ILogger<SM3HmacProvider> _logger;

    public SM3HmacProvider(IConfiguration configuration, ILogger<SM3HmacProvider> logger)
    {
        _logger = logger;
        var keyHex = configuration["Security:SM3HmacKey"] ?? "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";
        try
        {
            _defaultKey = Hex.Decode(keyHex);
            if (_defaultKey.Length < 16)
            {
                _logger.LogWarning("SM3-HMAC key length is {Length}, expected at least 16 bytes. Using default key.", _defaultKey.Length);
                _defaultKey = Hex.Decode("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Invalid SM3-HMAC key hex string. Using default key.");
            _defaultKey = Hex.Decode("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF");
        }
    }

    public string ComputeHmac(string data, string? key = null)
    {
        if (string.IsNullOrEmpty(data)) return string.Empty;

        var keyBytes = !string.IsNullOrEmpty(key) ? Hex.Decode(key) : _defaultKey;
        try
        {
            var sm3 = new SM3Digest();
            var hmac = new HMac(sm3);
            hmac.Init(new KeyParameter(keyBytes));

            var inputBytes = Encoding.UTF8.GetBytes(data);
            hmac.BlockUpdate(inputBytes, 0, inputBytes.Length);

            var result = new byte[hmac.GetMacSize()];
            hmac.DoFinal(result, 0);

            return Hex.ToHexString(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SM3-HMAC 计算失败");
            throw;
        }
    }

    public bool VerifyHmac(string data, string expectedHmac, string? key = null)
    {
        if (string.IsNullOrEmpty(data) || string.IsNullOrEmpty(expectedHmac))
            return false;

        var computedHmac = ComputeHmac(data, key);
        var expectedBytes = Hex.Decode(expectedHmac);
        var computedBytes = Hex.Decode(computedHmac);

        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedBytes, computedBytes);
    }

    public string ComputeEntityHmac(object entity, IEnumerable<string>? propertyNames = null)
    {
        var type = entity.GetType();
        var props = propertyNames?.ToList() 
            ?? type.GetProperties()
                .Where(p => !p.CanRead || p.GetIndexParameters().Length > 0)
                .Select(p => p.Name)
                .ToList();

        var values = props
            .Select(p => type.GetProperty(p)?.GetValue(entity)?.ToString() ?? string.Empty)
            .Where(v => !string.IsNullOrEmpty(v));

        var data = string.Join("|", values);
        return ComputeHmac(data);
    }
}