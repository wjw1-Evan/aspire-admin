using Microsoft.AspNetCore.Authorization;

namespace Platform.ApiService.Attributes;

/// <summary>
/// 跳过全局身份验证的属性
/// 用于标记不需要认证的控制器或操作方法
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, Inherited = true, AllowMultiple = false)]
public class SkipGlobalAuthenticationAttribute : Attribute
{
    /// <summary>
    /// 跳过原因（可选，用于日志记录）
    /// </summary>
    public string? Reason { get; }

    /// <summary>
    /// 初始化跳过全局身份验证属性
    /// </summary>
    /// <param name="reason">跳过原因</param>
    public SkipGlobalAuthenticationAttribute(string? reason = null)
    {
        Reason = reason;
    }
}

/// <summary>
/// 要求全局身份验证的属性
/// 用于强制要求认证，即使路径在公共列表中
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, Inherited = true, AllowMultiple = false)]
public class RequireGlobalAuthenticationAttribute : Attribute
{
    /// <summary>
    /// 认证要求说明（可选）
    /// </summary>
    public string? Requirement { get; }

    /// <summary>
    /// 初始化要求全局身份验证属性
    /// </summary>
    /// <param name="requirement">认证要求说明</param>
    public RequireGlobalAuthenticationAttribute(string? requirement = null)
    {
        Requirement = requirement;
    }
}