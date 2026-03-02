using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Paddings;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.Utilities.Encoders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text;

namespace Platform.ServiceDefaults.Services;

public interface ISM4EncryptionProvider
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}

/// <summary>
/// 国密 SM4 对称加密服务 (精简版)
/// </summary>
public class SM4EncryptionProvider : ISM4EncryptionProvider
{
    private readonly byte[] _key;
    private readonly ILogger<SM4EncryptionProvider> _logger;

    public SM4EncryptionProvider(IConfiguration configuration, ILogger<SM4EncryptionProvider> logger)
    {
        _logger = logger;
        var keyHex = configuration["Security:SM4Key"] ?? "0123456789ABCDEF0123456789ABCDEF";
        _key = Hex.Decode(keyHex);
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return plainText;
        try
        {
            var cipher = new PaddedBufferedBlockCipher(new SM4Engine(), new Pkcs7Padding());
            cipher.Init(true, new KeyParameter(_key));
            
            byte[] inBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] outBytes = new byte[cipher.GetOutputSize(inBytes.Length)];
            int len = cipher.ProcessBytes(inBytes, 0, inBytes.Length, outBytes, 0);
            cipher.DoFinal(outBytes, len);
            
            return Convert.ToBase64String(outBytes).TrimEnd('\0');
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SM4 加密失败");
            throw;
        }
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return cipherText;
        try
        {
            var cipher = new PaddedBufferedBlockCipher(new SM4Engine(), new Pkcs7Padding());
            cipher.Init(false, new KeyParameter(_key));
            
            byte[] inBytes = Convert.FromBase64String(cipherText);
            byte[] outBytes = new byte[cipher.GetOutputSize(inBytes.Length)];
            int len = cipher.ProcessBytes(inBytes, 0, inBytes.Length, outBytes, 0);
            int finalLen = cipher.DoFinal(outBytes, len);
            
            return Encoding.UTF8.GetString(outBytes, 0, len + finalLen);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SM4 解密失败，可能为明文。");
            return cipherText;
        }
    }
}

