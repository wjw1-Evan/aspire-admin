namespace Platform.ApiService.Services;

/// <summary>
/// 邮件后台发送队列接口
/// </summary>
public interface IEmailBackgroundQueue
{
    /// <summary>
    /// 将邮件任务推入队列
    /// </summary>
    ValueTask QueueEmailAsync(Platform.ApiService.Models.EmailTaskItem item);

    /// <summary>
    /// 从队列中取出一个邮件任务
    /// </summary>
    ValueTask<Platform.ApiService.Models.EmailTaskItem> DequeueAsync(CancellationToken cancellationToken);
}
