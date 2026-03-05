using Platform.ApiService.Services;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.BackgroundServices;

/// <summary>
/// 邮件后台处理服务
/// 从异步队列中消费邮件任务并执行发送，同时记录结果到数据库
/// </summary>
public class EmailBackgroundWorker : BackgroundService
{
    private readonly IEmailBackgroundQueue _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmailBackgroundWorker> _logger;

    public EmailBackgroundWorker(
        IEmailBackgroundQueue queue,
        IServiceProvider serviceProvider,
        ILogger<EmailBackgroundWorker> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("邮件后台处理程序已启动。");

        while (!stoppingToken.IsCancellationRequested)
        {
            EmailTaskItem? taskItem = null;
            try
            {
                // 1. 从队列中获取任务
                taskItem = await _queue.DequeueAsync(stoppingToken);
                _logger.LogInformation("正在后台发送邮件：To={To}, Subject={Subject}", taskItem.ToEmail, taskItem.Subject);

                using var scope = _serviceProvider.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<ISmtpEmailService>();
                var dataFactory = scope.ServiceProvider.GetRequiredService<IDataFactory<EmailLog>>();

                // 2. 更新日志状态为“发送中”
                await dataFactory.UpdateAsync(taskItem.LogId, log =>
                {
                    log.Status = EmailStatus.Sending;
                });

                // 3. 执行真实发送
                try
                {
                    await emailService.ExecuteRawSendAsync(taskItem.ToEmail, taskItem.Subject, taskItem.HtmlBody);

                    // 4. 发送成功，更新状态
                    await dataFactory.UpdateAsync(taskItem.LogId, log =>
                    {
                        log.Status = EmailStatus.Sent;
                        log.SentAt = DateTime.UtcNow;
                    });
                    _logger.LogInformation("邮件后台发送成功：ID={LogId}", taskItem.LogId);
                }
                catch (Exception sendEx)
                {
                    _logger.LogError(sendEx, "邮件后台发送失败：ID={LogId}", taskItem.LogId);

                    // 5. 发送失败，记录错误
                    await dataFactory.UpdateAsync(taskItem.LogId, log =>
                    {
                        log.Status = EmailStatus.Failed;
                        log.ErrorMessage = sendEx.Message;
                    });
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "邮件后台处理程序遇到未知错误。");
                await Task.Delay(2000, stoppingToken);
            }
        }

        _logger.LogInformation("邮件后台处理程序已停止。");
    }
}
