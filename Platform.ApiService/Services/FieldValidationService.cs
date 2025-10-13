using System.Text.RegularExpressions;
using Platform.ApiService.Constants;

namespace Platform.ApiService.Services;

/// <summary>
/// 字段验证服务 - 统一所有字段验证逻辑
/// </summary>
public interface IFieldValidationService
{
    void ValidateUsername(string? username);
    void ValidatePassword(string? password);
    void ValidateEmail(string? email, bool required = false);
    void ValidateRequired(string? value, string fieldName);
    void ValidateStringLength(string? value, string fieldName, int minLength, int maxLength);
}

public class FieldValidationService : IFieldValidationService
{
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    /// <summary>
    /// 验证用户名
    /// </summary>
    public void ValidateUsername(string? username)
    {
        ValidateRequired(username, "用户名");
        ValidateStringLength(username!, "用户名", ValidationRules.UsernameMinLength, ValidationRules.UsernameMaxLength);
    }

    /// <summary>
    /// 验证密码
    /// </summary>
    public void ValidatePassword(string? password)
    {
        ValidateRequired(password, "密码");
        
        if (password!.Length < ValidationRules.PasswordMinLength)
        {
            throw new ArgumentException($"密码长度至少{ValidationRules.PasswordMinLength}个字符");
        }
        
        if (password.Length > ValidationRules.PasswordMaxLength)
        {
            throw new ArgumentException($"密码长度不能超过{ValidationRules.PasswordMaxLength}个字符");
        }
    }

    /// <summary>
    /// 验证邮箱
    /// </summary>
    public void ValidateEmail(string? email, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            if (required)
            {
                throw new ArgumentException("邮箱不能为空");
            }
            return;
        }

        if (!EmailRegex.IsMatch(email))
        {
            throw new ArgumentException("邮箱格式不正确");
        }
    }

    /// <summary>
    /// 验证必填字段
    /// </summary>
    public void ValidateRequired(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, fieldName));
        }
    }

    /// <summary>
    /// 验证字符串长度
    /// </summary>
    public void ValidateStringLength(string? value, string fieldName, int minLength, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
            return;

        if (value.Length < minLength || value.Length > maxLength)
        {
            throw new ArgumentException($"{fieldName}长度必须在{minLength}-{maxLength}个字符之间");
        }
    }
}

