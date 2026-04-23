namespace Platform.ApiService.Services;

/// <summary>
/// 密码传输加密服务接口
/// 使用国密 SM2 非对称加密算法（GM/T 0003 / GM/T 0009）保护传输中的敏感数据
/// 
/// 密文格式遵循 GM/T 0009-2012 标准 C1C3C2 模式：
///   04 || C1_x(32B) || C1_y(32B) || C3(SM3,32B) || C2(密文)
/// 
/// 公钥格式遵循 GM/T 0003.1-2012 非压缩点表示：
///   04 || x(32B) || y(32B)
/// </summary>
public interface IPasswordEncryptionService
{
    /// <summary>
    /// 获取 SM2 公钥（GM/T 0003.1-2012 非压缩点格式：04 || x || y，130 hex chars）
    /// </summary>
    string GetPublicKey();

    /// <summary>
    /// SM2 解密密码（GM/T 0009-2012 C1C3C2 模式）
    /// 密文应包含 04 前缀，直接传入 BouncyCastle SM2Engine ProcessBlock
    /// </summary>
    /// <param name="encryptedPassword">前端传来的 SM2 加密数据（GM/T 0009 格式，含 04 前缀）</param>
    string DecryptPassword(string encryptedPassword);

    /// <summary>
    /// 尝试解密，如果失败则返回原字符串（兼容未加密的旧请求）
    /// </summary>
    string TryDecryptPassword(string password);
}