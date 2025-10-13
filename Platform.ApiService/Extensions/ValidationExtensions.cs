using Platform.ApiService.Constants;

namespace Platform.ApiService.Extensions;

/// <summary>
/// 参数验证扩展方法
/// </summary>
public static class ValidationExtensions
{
    /// <summary>
    /// 确保字符串不为空，否则抛出异常
    /// </summary>
    public static string EnsureNotEmpty(this string? value, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return value;
    }

    /// <summary>
    /// 确保对象不为空，否则抛出异常
    /// </summary>
    public static T EnsureNotNull<T>(this T? value, string parameterName) where T : class
    {
        if (value == null)
        {
            throw new ArgumentNullException(parameterName, string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return value;
    }

    /// <summary>
    /// 确保集合不为空且有元素，否则抛出异常
    /// </summary>
    public static IEnumerable<T> EnsureNotEmpty<T>(this IEnumerable<T>? collection, string parameterName)
    {
        if (collection == null || !collection.Any())
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return collection;
    }

    /// <summary>
    /// 确保字符串长度在指定范围内，否则抛出异常
    /// </summary>
    public static string EnsureLength(this string value, string parameterName, int minLength, int maxLength)
    {
        if (value.Length < minLength)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterTooShort, parameterName, minLength));
        }
        if (value.Length > maxLength)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, parameterName, maxLength));
        }
        return value;
    }

    /// <summary>
    /// 确保值在指定范围内，否则抛出异常
    /// </summary>
    public static T EnsureInRange<T>(this T value, string parameterName, T minValue, T maxValue) where T : IComparable<T>
    {
        if (value.CompareTo(minValue) < 0 || value.CompareTo(maxValue) > 0)
        {
            throw new ArgumentOutOfRangeException(parameterName, $"{parameterName} 必须在 {minValue} 到 {maxValue} 之间");
        }
        return value;
    }

    /// <summary>
    /// 验证邮箱格式
    /// </summary>
    public static bool IsValidEmail(this string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 确保邮箱格式正确，否则抛出异常
    /// </summary>
    public static string EnsureValidEmail(this string? email, string parameterName = "邮箱")
    {
        if (!email.IsValidEmail())
        {
            throw new ArgumentException(ErrorMessages.InvalidEmailFormat);
        }
        return email!;
    }

    /// <summary>
    /// 验证用户名格式（只允许字母、数字、下划线，3-20个字符）
    /// </summary>
    public static bool IsValidUsername(this string? username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }

        if (username.Length < 3 || username.Length > 20)
        {
            return false;
        }

        return System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$");
    }

    /// <summary>
    /// 确保用户名格式正确，否则抛出异常
    /// </summary>
    public static string EnsureValidUsername(this string? username, string parameterName = "用户名")
    {
        if (!username.IsValidUsername())
        {
            throw new ArgumentException(ErrorMessages.InvalidUsernameFormat);
        }
        return username!;
    }

    /// <summary>
    /// 验证密码强度（至少6个字符）
    /// </summary>
    public static bool IsValidPassword(this string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        return password.Length >= 6 && password.Length <= 50;
    }

    /// <summary>
    /// 确保密码格式正确，否则抛出异常
    /// </summary>
    public static string EnsureValidPassword(this string? password, string parameterName = "密码")
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        }

        if (password.Length < 6)
        {
            throw new ArgumentException(ErrorMessages.PasswordTooShort);
        }

        if (password.Length > 50)
        {
            throw new ArgumentException(ErrorMessages.PasswordTooLong);
        }

        return password;
    }

    /// <summary>
    /// 如果字符串为空则返回null，用于可选参数
    /// </summary>
    public static string? NullIfEmpty(this string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>
    /// 截断字符串到指定长度
    /// </summary>
    public static string? Truncate(this string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= maxLength ? value : value.Substring(0, maxLength);
    }
}

