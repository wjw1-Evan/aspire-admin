using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Parameters;
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
/// 国密 SM4 对称加密服务
/// 用于敏感数据的数据库存储透明加解密
/// </summary>
public class SM4EncryptionProvider : ISM4EncryptionProvider
{
    private readonly byte[] _key;
    private readonly ILogger<SM4EncryptionProvider> _logger;

    public SM4EncryptionProvider(IConfiguration configuration, ILogger<SM4EncryptionProvider> logger)
    {
        _logger = logger;

        // 尝试从配置获取 SM4 密钥，如果没有配置则使用一个固定/自动生成的密钥（生产环境应配置 KMS 密钥）
        var keyHex = configuration["Security:SM4Key"];
        if (string.IsNullOrEmpty(keyHex) || keyHex.Length != 32)
        {
            _logger.LogWarning("未配置 Security:SM4Key 密钥，或格式不正确(应为32位十六进制字符串)。使用默认演示密钥。生产环境请务必配置128位(32字长 Hex)随机密钥！");
            keyHex = "0123456789ABCDEF0123456789ABCDEF"; // 默认 16 bytes 的 Hex 表示
        }

        _key = Hex.Decode(keyHex);
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return string.Empty;

        try
        {
            var sm4 = new SM4Engine();
            sm4.Init(true, new KeyParameter(_key));

            byte[] input = Encoding.UTF8.GetBytes(plainText);

            // 实现简单的 PKCS7 Padding
            int blockSize = sm4.GetBlockSize();
            int padLength = blockSize - (input.Length % blockSize);
            byte[] paddedInput = new byte[input.Length + padLength];
            Buffer.BlockCopy(input, 0, paddedInput, 0, input.Length);
            for (int i = input.Length; i < paddedInput.Length; i++)
            {
                paddedInput[i] = (byte)padLength;
            }

            // 加密
            byte[] output = new byte[paddedInput.Length];
            for (int i = 0; i < paddedInput.Length; i += blockSize)
            {
                sm4.ProcessBlock(paddedInput, i, output, i);
            }

            return Convert.ToBase64String(output);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SM4 加密失败");
            // 失败时记录日志，并为了不中断应用流抛出异常，或在加密设计层面可酌情返回明文
            throw;
        }
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return string.Empty;

        try
        {
            var sm4 = new SM4Engine();
            sm4.Init(false, new KeyParameter(_key));

            byte[] input = Convert.FromBase64String(cipherText);
            byte[] output = new byte[input.Length];

            int blockSize = sm4.GetBlockSize();
            for (int i = 0; i < input.Length; i += blockSize)
            {
                sm4.ProcessBlock(input, i, output, i);
            }

            // 移除 PKCS7 Padding
            int padLength = output[output.Length - 1];
            if (padLength > 0 && padLength <= blockSize)
            {
                byte[] unpaddedOutput = new byte[output.Length - padLength];
                Buffer.BlockCopy(output, 0, unpaddedOutput, 0, unpaddedOutput.Length);
                return Encoding.UTF8.GetString(unpaddedOutput);
            }

            return Encoding.UTF8.GetString(output);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SM4 解密失败，可能密钥不匹配或是旧明文数据。");
            return cipherText; // 如果解密失败退回原文本
        }
    }
}
