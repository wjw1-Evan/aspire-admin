namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 认证相关常量
/// </summary>
public static class AuthConstants
{
    /// <summary>默认 Token 过期分钟数（24小时）</summary>
    public const int DefaultTokenExpirationMinutes = 1440;

    /// <summary>刷新 Token 过期天数（7天）</summary>
    public const int DefaultRefreshTokenExpirationDays = 7;

    /// <summary>登录失败记录过期分钟数（30分钟）</summary>
    public const int LoginFailureExpiresMinutes = 30;

    /// <summary>密码重置验证码过期分钟数（5分钟）</summary>
    public const int PasswordResetCodeExpiresMinutes = 5;

    /// <summary>密码重置验证码长度（6位）</summary>
    public const int PasswordResetCodeLength = 6;

    /// <summary>密码重置验证码最小值（100000）</summary>
    public const int PasswordResetCodeMin = 100000;

    /// <summary>密码重置验证码最大值（900000）</summary>
    public const int PasswordResetCodeMax = 900000;
}