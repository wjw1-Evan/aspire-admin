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
    /// <param name="value">待验证的字符串值</param>
    /// <param name="parameterName">参数名称，用于错误消息</param>
    /// <returns>非空的字符串值</returns>
    /// <exception cref="ArgumentException">当字符串为空或null时抛出</exception>
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
    /// <typeparam name="T">对象类型</typeparam>
    /// <param name="value">待验证的对象值</param>
    /// <param name="parameterName">参数名称，用于错误消息</param>
    /// <returns>非空的对象值</returns>
    /// <exception cref="ArgumentNullException">当对象为null时抛出</exception>
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
    /// <typeparam name="T">集合元素类型</typeparam>
    /// <param name="collection">待验证的集合</param>
    /// <param name="parameterName">参数名称，用于错误消息</param>
    /// <returns>非空的集合</returns>
    /// <exception cref="ArgumentException">当集合为null或空时抛出</exception>
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
    /// <param name="value">待验证的字符串值</param>
    /// <param name="parameterName">参数名称，用于错误消息</param>
    /// <param name="minLength">最小长度</param>
    /// <param name="maxLength">最大长度</param>
    /// <returns>长度在范围内的字符串值</returns>
    /// <exception cref="ArgumentException">当字符串长度不在指定范围内时抛出</exception>
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
    /// <typeparam name="T">值类型，必须实现 IComparable&lt;T&gt;</typeparam>
    /// <param name="value">待验证的值</param>
    /// <param name="parameterName">参数名称，用于错误消息</param>
    /// <param name="minValue">最小值</param>
    /// <param name="maxValue">最大值</param>
    /// <returns>在范围内的值</returns>
    /// <exception cref="ArgumentOutOfRangeException">当值不在指定范围内时抛出</exception>
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
    /// <param name="email">待验证的邮箱地址</param>
    /// <returns>如果邮箱格式有效返回 true，否则返回 false</returns>
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
    /// <param name="email">待验证的邮箱地址</param>
    /// <param name="parameterName">参数名称，用于错误消息，默认为 "邮箱"</param>
    /// <returns>格式正确的邮箱地址</returns>
    /// <exception cref="ArgumentException">当邮箱格式无效时抛出</exception>
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
    /// <param name="username">待验证的用户名</param>
    /// <returns>如果用户名格式有效返回 true，否则返回 false</returns>
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
    /// <param name="username">待验证的用户名</param>
    /// <param name="parameterName">参数名称，用于错误消息，默认为 "用户名"</param>
    /// <returns>格式正确的用户名</returns>
    /// <exception cref="ArgumentException">当用户名格式无效时抛出</exception>
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
    /// <param name="password">待验证的密码</param>
    /// <returns>如果密码格式有效返回 true，否则返回 false</returns>
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
    /// <param name="password">待验证的密码</param>
    /// <param name="parameterName">参数名称，用于错误消息，默认为 "密码"</param>
    /// <returns>格式正确的密码</returns>
    /// <exception cref="ArgumentException">当密码格式无效或长度不符合要求时抛出</exception>
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
    /// <param name="value">待处理的字符串值</param>
    /// <returns>如果字符串为空或null则返回null，否则返回原字符串</returns>
    public static string? NullIfEmpty(this string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>
    /// 截断字符串到指定长度
    /// </summary>
    /// <param name="value">待截断的字符串值</param>
    /// <param name="maxLength">最大长度</param>
    /// <returns>截断后的字符串，如果原字符串长度小于等于maxLength则返回原字符串</returns>
    public static string? Truncate(this string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= maxLength ? value : value.Substring(0, maxLength);
    }
}

