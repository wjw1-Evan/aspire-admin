using System.Threading.Channels;

using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 邮件后台发送队列接口
/// </summary>
public interface IEmailBackgroundQueue
{
    /// <summary>
    /// 将邮件任务推入队列
    /// </summary>
    ValueTask QueueEmailAsync(EmailTaskItem item);

    /// <summary>
    /// 从队列中取出一个邮件任务
    /// </summary>
    ValueTask<EmailTaskItem> DequeueAsync(CancellationToken cancellationToken);
}

/// <summary>
/// 邮件后台发送队列实现 (基于内存 Channel)
/// </summary>
public class EmailBackgroundQueue : IEmailBackgroundQueue
{
    private readonly Channel<EmailTaskItem> _channel;

    public EmailBackgroundQueue(int capacity = 1000)
    {
        // 配置队列选项
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _channel = Channel.CreateBounded<EmailTaskItem>(options);
    }

    public async ValueTask QueueEmailAsync(EmailTaskItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        await _channel.Writer.WriteAsync(item);
    }

    public async ValueTask<EmailTaskItem> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _channel.Reader.ReadAsync(cancellationToken);
    }
}
