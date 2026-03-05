using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using Platform.ApiService.Options;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 基于 MailKit 实现的邮件发送服务 (.NET 10 官方推荐替代方案)
/// </summary>
public class SmtpEmailService : ISmtpEmailService
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly IDataFactory<EmailLog> _dataFactory;
    private readonly IEmailBackgroundQueue _queue;

    public SmtpEmailService(
        IOptions<SmtpOptions> options, 
        ILogger<SmtpEmailService> logger,
        IDataFactory<EmailLog> dataFactory,
        IEmailBackgroundQueue queue)
    {
        _options = options.Value;
        _logger = logger;
        _dataFactory = dataFactory;
        _queue = queue;
    }

    /// <summary>
    /// 异步发送邮件（用户调用：入队并记录日志）
    /// </summary>
    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        _logger.LogInformation("正在入队异步邮件任务：To={To}, Subject={Subject}", toEmail, subject);

        // 1. 创建待发送日志
        var log = new EmailLog
        {
            ToEmail = toEmail,
            Subject = subject,
            Body = htmlBody,
            Status = EmailStatus.Pending
        };

        await _dataFactory.CreateAsync(log);

        // 2. 推入后台队列
        await _queue.QueueEmailAsync(new EmailTaskItem(log.Id, toEmail, subject, htmlBody));
    }

    /// <summary>
    /// 执行真实的 SMTP 发送逻辑 (使用 MailKit 实现)
    /// </summary>
    public async Task ExecuteRawSendAsync(string toEmail, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(_options.Host))
        {
            _logger.LogWarning("⚠️ SMTP 服务器未配置，跳过发送。主题：{Subject}，收件人：{To}", subject, toEmail);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.DisplayName ?? "System", _options.FromEmail ?? _options.UserName));
        message.To.Add(new MailboxAddress("", toEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            // 对于国内 SMTP (如 126/163), 证书链验证有时会因为网络环境失败
            // 在开发/部署环境下通过回调跳过证书校验以保证连通性
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;
            client.Timeout = 15000; // 15秒超时

            // 精确确定安全策略
            SecureSocketOptions secureOption;
            if (!_options.EnableSsl)
            {
                secureOption = SecureSocketOptions.None;
            }
            else if (_options.Port == 465 || _options.Port == 994)
            {
                // 465/994 通常使用隐式 SSL/TLS (SslOnConnect)
                secureOption = SecureSocketOptions.SslOnConnect;
            }
            else
            {
                // 其他端口 (如 587, 25) 当 EnableSsl 为 true 时通常使用显式 TLS (StartTls)
                secureOption = SecureSocketOptions.StartTls;
            }
            
            _logger.LogInformation("正在连接 SMTP 服务器：Host={Host}, Port={Port}, Option={Option}", _options.Host, _options.Port, secureOption);
            
            await client.ConnectAsync(_options.Host, _options.Port, secureOption);

            if (!string.IsNullOrEmpty(_options.UserName))
            {
                await client.AuthenticateAsync(_options.UserName, _options.Password);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            
            _logger.LogInformation("MailKit 发送成功：To={To}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MailKit 底层发送失败(Detail={Message})：To={To}, Subject={Subject}", ex.Message, toEmail, subject);
            throw;
        }
    }
}
