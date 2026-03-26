namespace Platform.ApiService.Services;

/// <summary>
/// 邮件服务接口
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// 发送一封 HTML 格式的邮件
    /// </summary>
    /// <param name="toEmail">收件人邮箱</param>
    /// <param name="subject">邮件主题</param>
    /// <param name="htmlBody">邮件内容 (HTML)</param>
    /// <returns>异步任务</returns>
    Task SendEmailAsync(string toEmail, string subject, string htmlBody);
}