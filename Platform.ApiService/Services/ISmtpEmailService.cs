namespace Platform.ApiService.Services;

/// <summary>
/// SMTP 专用邮件服务接口，包含后台工作程序所需的底层发送方法
/// </summary>
public interface ISmtpEmailService : IEmailService
{
    /// <summary>
    /// 执行真实的 SMTP 发送逻辑（由后台任务调用）
    /// </summary>
    Task ExecuteRawSendAsync(string toEmail, string subject, string htmlBody);
}
