using System.Text.RegularExpressions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码强度检测服务实现
/// </summary>
public class PasswordStrengthService : IPasswordStrengthService
{
    // 常见弱密码列表
    private static readonly HashSet<string> CommonWeakPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "123456", "12345678", "123456789", "1234567890",
        "qwerty", "abc123", "password1", "admin", "letmein",
        "welcome", "monkey", "1234567", "sunshine", "princess",
        "dragon", "passw0rd", "master", "hello", "freedom"
    };

    /// <summary>
    /// 检测密码强度
    /// </summary>
    public PasswordStrengthResult CheckStrength(string password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return new PasswordStrengthResult
            {
                Level = PasswordStrengthLevel.Weak,
                Score = 0,
                Description = "密码为空",
                Suggestions = new List<string> { "请输入密码" }
            };
        }

        var score = 0;
        var suggestions = new List<string>();

        // 长度评分（0-25分）
        if (password.Length >= 12)
            score += 25;
        else if (password.Length >= 8)
            score += 15;
        else
        {
            score += 5;
            suggestions.Add("密码长度建议至少8个字符，推荐12个字符以上");
        }

        // 字符类型评分（0-30分）
        var hasLowercase = Regex.IsMatch(password, "[a-z]");
        var hasUppercase = Regex.IsMatch(password, "[A-Z]");
        var hasNumber = Regex.IsMatch(password, "[0-9]");
        var hasSpecial = Regex.IsMatch(password, "[^a-zA-Z0-9]");

        var typeCount = 0;
        if (hasLowercase) { typeCount++; score += 7; }
        if (hasUppercase) { typeCount++; score += 7; }
        if (hasNumber) { typeCount++; score += 8; }
        if (hasSpecial) { typeCount++; score += 8; }

        if (typeCount < 2)
            suggestions.Add("建议包含大小写字母、数字和特殊字符的组合");
        else if (typeCount < 4)
            suggestions.Add("建议使用大小写字母、数字和特殊字符的组合以提高安全性");

        // 复杂度评分（0-25分）
        var hasRepeatingChars = HasRepeatingChars(password);
        var hasSequentialChars = HasSequentialChars(password);
        var hasCommonPattern = HasCommonPattern(password);

        if (!hasRepeatingChars) score += 8;
        else suggestions.Add("避免使用重复字符");

        if (!hasSequentialChars) score += 8;
        else suggestions.Add("避免使用连续字符（如123、abc）");

        if (!hasCommonPattern) score += 9;
        else suggestions.Add("避免使用常见模式（如qwerty、asdf）");

        // 常见密码检查（0-20分）
        if (CommonWeakPasswords.Contains(password))
        {
            score = Math.Min(score, 20);
            suggestions.Add("此密码过于常见，建议使用更复杂的密码");
        }
        else
        {
            score += 20;
        }

        // 确定强度等级
        PasswordStrengthLevel level;
        string description;
        if (score >= 80)
        {
            level = PasswordStrengthLevel.VeryStrong;
            description = "非常强";
        }
        else if (score >= 60)
        {
            level = PasswordStrengthLevel.Strong;
            description = "强";
        }
        else if (score >= 40)
        {
            level = PasswordStrengthLevel.Medium;
            description = "中等";
        }
        else
        {
            level = PasswordStrengthLevel.Weak;
            description = "弱";
        }

        return new PasswordStrengthResult
        {
            Level = level,
            Score = Math.Min(100, score),
            Description = description,
            Suggestions = suggestions
        };
    }

    /// <summary>
    /// 检查是否有重复字符
    /// </summary>
    private static bool HasRepeatingChars(string password)
    {
        for (int i = 0; i < password.Length - 2; i++)
        {
            if (password[i] == password[i + 1] && password[i] == password[i + 2])
                return true;
        }
        return false;
    }

    /// <summary>
    /// 检查是否有连续字符
    /// </summary>
    private static bool HasSequentialChars(string password)
    {
        for (int i = 0; i < password.Length - 2; i++)
        {
            var c1 = password[i];
            var c2 = password[i + 1];
            var c3 = password[i + 2];

            // 检查数字序列
            if (char.IsDigit(c1) && char.IsDigit(c2) && char.IsDigit(c3))
            {
                if (c2 == c1 + 1 && c3 == c2 + 1) return true;
                if (c2 == c1 - 1 && c3 == c2 - 1) return true;
            }

            // 检查字母序列
            if (char.IsLetter(c1) && char.IsLetter(c2) && char.IsLetter(c3))
            {
                if (char.ToLower(c2) == char.ToLower(c1) + 1 && 
                    char.ToLower(c3) == char.ToLower(c2) + 1) return true;
                if (char.ToLower(c2) == char.ToLower(c1) - 1 && 
                    char.ToLower(c3) == char.ToLower(c2) - 1) return true;
            }
        }
        return false;
    }

    /// <summary>
    /// 检查是否有常见模式
    /// </summary>
    private static bool HasCommonPattern(string password)
    {
        var lowerPassword = password.ToLower();
        var commonPatterns = new[] { "qwerty", "asdf", "zxcv", "1234", "abcd" };
        return commonPatterns.Any(pattern => lowerPassword.Contains(pattern));
    }
}
