namespace Platform.ApiService.Services;

/// <summary>
/// 密码散列服务接口
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// 散列密码
    /// </summary>
    string HashPassword(string password);

    /// <summary>
    /// 验证密码
    /// </summary>
    bool VerifyPassword(string password, string hashedPassword);
}

/// <summary>
/// 基于 BCrypt 的密码散列实现
/// </summary>
public class BCryptPasswordHasher : IPasswordHasher
{
    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string hashedPassword)
    {
        return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
    }
}

