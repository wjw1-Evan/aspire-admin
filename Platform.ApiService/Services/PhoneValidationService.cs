using Platform.ApiService.Constants;

namespace Platform.ApiService.Services;

/// <summary>
/// 手机号验证服务 - 扩展FieldValidationService的功能
/// </summary>
public interface IPhoneValidationService
{
    void ValidatePhone(string? phone);
    void ValidateCaptchaCode(string? code);
}

public class PhoneValidationService : IPhoneValidationService
{
    /// <summary>
    /// 验证手机号（简单格式检查）
    /// </summary>
    public void ValidatePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            throw new ArgumentException("手机号不能为空");
        }
        
        // 简单的手机号格式检查（11位数字）
        if (phone.Length != 11 || !phone.All(char.IsDigit))
        {
            throw new ArgumentException("手机号格式不正确");
        }
    }
    
    /// <summary>
    /// 验证验证码格式
    /// </summary>
    public void ValidateCaptchaCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("验证码不能为空");
        }
        
        // 验证码应该是6位数字
        if (code.Length != 6 || !code.All(char.IsDigit))
        {
            throw new ArgumentException("验证码格式不正确");
        }
    }
}





























