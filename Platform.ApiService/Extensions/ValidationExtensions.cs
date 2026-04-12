using Platform.ApiService.Constants;

namespace Platform.ApiService.Extensions;

public static class ValidationExtensions
{
    public static string EnsureNotEmpty(this string? value, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return value;
    }

    public static T EnsureNotNull<T>(this T? value, string parameterName) where T : class
    {
        if (value == null)
        {
            throw new ArgumentNullException(parameterName, string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return value;
    }

    public static IEnumerable<T> EnsureNotEmpty<T>(this IEnumerable<T>? collection, string parameterName)
    {
        if (collection == null || !collection.Any())
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        }
        return collection;
    }

    public static bool IsValidEmail(this string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch { return false; }
    }

    public static string EnsureValidEmail(this string? email, string parameterName = "邮箱")
    {
        if (!email.IsValidEmail()) throw new ArgumentException(ErrorMessages.InvalidEmailFormat);
        return email!;
    }

    public static bool IsValidUsername(this string? username)
    {
        if (string.IsNullOrWhiteSpace(username)) return false;
        if (username.Length < 3 || username.Length > 20) return false;
        return System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$");
    }

    public static string EnsureValidUsername(this string? username, string parameterName = "用户名")
    {
        if (!username.IsValidUsername()) throw new ArgumentException(ErrorMessages.InvalidUsernameFormat);
        return username!;
    }

    public static bool IsValidPassword(this string? password)
    {
        if (string.IsNullOrWhiteSpace(password)) return false;
        return password.Length >= 6 && password.Length <= 50;
    }

    public static string EnsureValidPassword(this string? password, string parameterName = "密码")
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, parameterName));
        if (password.Length < 6) throw new ArgumentException(ErrorMessages.PasswordTooShort);
        if (password.Length > 50) throw new ArgumentException(ErrorMessages.PasswordTooLong);
        return password;
    }
}
