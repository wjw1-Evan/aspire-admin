namespace Platform.ApiService.Options;

/// <summary>
/// SMTP 邮件配置项
/// </summary>
public class SmtpOptions
{
    /// <summary>
    /// SMTP 服务器地址
    /// </summary>
    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// SMTP 服务器端口，通常是 465 (SSL) 或 587 (TLS)，对第三方有时为 465 或者 25
    /// </summary>
    public int Port { get; set; } = 465;

    /// <summary>
    /// 是否启用 SSL / TLS
    /// </summary>
    public bool EnableSsl { get; set; } = true;

    /// <summary>
    /// 发件人用户名 (通常为邮箱)
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// 发件人密码或授权码
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 发件人显示名称
    /// </summary>
    public string DisplayName { get; set; } = "Aspire Admin";

    /// <summary>
    /// 发件人邮箱地址 (如果为空则默认使用UserName)
    /// </summary>
    public string FromEmail { get; set; } = string.Empty;
}