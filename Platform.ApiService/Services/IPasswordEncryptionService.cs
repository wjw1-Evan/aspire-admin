using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码传输加密服务接口
/// 用于处理前端到后端的敏感数据（如密码）的非对称加密传输
/// </summary>
public interface IPasswordEncryptionService : ISingletonDependency
{
    /// <summary>
    /// 获取 RSA 公钥（用于前端加密）
    /// </summary>
    /// <returns>PEM 格式的公钥</returns>
    string GetPublicKey();

    /// <summary>
    /// 解密密码
    /// </summary>
    /// <param name="encryptedPassword">Base64 编码的加密密码</param>
    /// <returns>解密后的明文密码</returns>
    string DecryptPassword(string encryptedPassword);

    /// <summary>
    /// 尝试解密，如果失败则返回原字符串（处理未加密的旧请求）
    /// </summary>
    string TryDecryptPassword(string password);
}
