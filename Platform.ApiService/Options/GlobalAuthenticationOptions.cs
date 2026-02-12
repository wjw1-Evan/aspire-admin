namespace Platform.ApiService.Options;

/// <summary>
/// 全局身份验证配置选项
/// </summary>
public class GlobalAuthenticationOptions
{
    /// <summary>
    /// 配置节名称
    /// </summary>
    public const string SectionName = "GlobalAuthentication";

    /// <summary>
    /// 是否启用全局身份验证中间件
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// 无需认证的公共路径列表
    /// </summary>
    public List<string> PublicPaths { get; set; } = new();

    /// <summary>
    /// 是否在开发环境禁用严格验证
    /// </summary>
    public bool DisableStrictValidationInDevelopment { get; set; } = true;

    /// <summary>
    /// Token过期缓冲时间（分钟）
    /// </summary>
    public int TokenExpiryBufferMinutes { get; set; } = 5;

    /// <summary>
    /// 是否记录详细的安全日志
    /// </summary>
    public bool EnableDetailedSecurityLogging { get; set; } = false;

    /// <summary>
    /// 最大失败尝试次数（用于防暴力破解）
    /// </summary>
    public int MaxFailureAttempts { get; set; } = 5;

    /// <summary>
    /// 失败尝试锁定时间（分钟）
    /// </summary>
    public int FailureLockoutMinutes { get; set; } = 15;

    /// <summary>
    /// 初始化默认配置
    /// </summary>
    public void InitializeDefaults()
    {
        if (!PublicPaths.Any())
        {
            PublicPaths.AddRange(new[]
            {
                // 认证相关接口
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/captcha",
                "/api/auth/captcha/image",
                "/api/auth/verify-captcha",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/refresh-token",

                // 健康检查和系统信息
                "/health",
                "/healthz",
                "/.well-known",
                "/api/public",

                // API文档（仅在开发环境）
                "/swagger",
                "/openapi",
                "/docs",
                "/api-docs",

                // 静态资源
                "/static",
                "/content",
                "/assets",

                // 文件下载与预览（公开访问）
                "/api/files/download/public",
                "/api/images",
                "/api/avatar/view",
                "/api/avatar/preview",
                "/api/captcha"
            });
        }
    }
}