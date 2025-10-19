namespace Platform.ApiService.Services;

/// <summary>
/// 密码策略服务 - 实施强密码要求
/// </summary>
public interface IPasswordPolicyService
{
    /// <summary>
    /// 验证密码是否符合安全策略
    /// </summary>
    void ValidatePassword(string password);
}

/// <summary>
/// 密码策略实现
/// </summary>
public class PasswordPolicyService : IPasswordPolicyService
{
    public const int MinLength = 8;
    public const int MaxLength = 128;
    
    // 常见弱密码列表
    private static readonly string[] CommonPasswords = new[]
    {
        "password", "123456", "12345678", "qwerty", "admin", "letmein",
        "welcome", "monkey", "dragon", "master", "sunshine", "princess",
        "abc123", "password123", "admin123"
    };
    
    public void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("密码不能为空");
        
        // 检查长度
        if (password.Length < MinLength)
            throw new ArgumentException($"密码长度至少 {MinLength} 个字符");
        
        if (password.Length > MaxLength)
            throw new ArgumentException($"密码长度不能超过 {MaxLength} 个字符");
        
        // 检查复杂度
        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(ch => "!@#$%^&*()_+-=[]{}|;:,.<>?".Contains(ch));
        
        var complexity = 0;
        if (hasUpper) complexity++;
        if (hasLower) complexity++;
        if (hasDigit) complexity++;
        if (hasSpecial) complexity++;
        
        // 至少包含3种字符类型
        if (complexity < 3)
        {
            throw new ArgumentException(
                "密码必须包含以下至少3种字符类型：大写字母、小写字母、数字、特殊字符(!@#$%^&*()等)");
        }
        
        // 检查常见弱密码
        var lowerPassword = password.ToLower();
        foreach (var commonPassword in CommonPasswords)
        {
            if (lowerPassword.Contains(commonPassword))
            {
                throw new ArgumentException(
                    $"密码不能包含常见弱密码模式 (如: password, 123456 等)");
            }
        }
        
        // 检查连续字符
        if (HasConsecutiveChars(password, 3))
        {
            throw new ArgumentException("密码不能包含3个或以上连续字符 (如: abc, 123)");
        }
        
        // 检查重复字符
        if (HasRepeatingChars(password, 3))
        {
            throw new ArgumentException("密码不能包含3个或以上重复字符 (如: aaa, 111)");
        }
    }
    
    /// <summary>
    /// 检查是否有连续字符
    /// </summary>
    private bool HasConsecutiveChars(string password, int length)
    {
        for (int i = 0; i <= password.Length - length; i++)
        {
            bool isConsecutive = true;
            for (int j = 0; j < length - 1; j++)
            {
                if (password[i + j + 1] != password[i + j] + 1)
                {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive) return true;
        }
        return false;
    }
    
    /// <summary>
    /// 检查是否有重复字符
    /// </summary>
    private bool HasRepeatingChars(string password, int length)
    {
        for (int i = 0; i <= password.Length - length; i++)
        {
            bool isRepeating = true;
            for (int j = 1; j < length; j++)
            {
                if (password[i + j] != password[i])
                {
                    isRepeating = false;
                    break;
                }
            }
            if (isRepeating) return true;
        }
        return false;
    }
}
