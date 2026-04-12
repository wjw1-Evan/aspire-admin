using System.Threading.Channels;

namespace Platform.ApiService.Services;

/// <summary>
/// 邮件后台发送队列实现 (基于内存 Channel)
/// </summary>
public class EmailBackgroundQueue : IEmailBackgroundQueue
{
    private readonly Channel<Platform.ApiService.Models.EmailTaskItem> _channel;

    public EmailBackgroundQueue(int capacity = 1000)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _channel = Channel.CreateBounded<Platform.ApiService.Models.EmailTaskItem>(options);
    }

    public async ValueTask QueueEmailAsync(Platform.ApiService.Models.EmailTaskItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        await _channel.Writer.WriteAsync(item);
    }

    public async ValueTask<Platform.ApiService.Models.EmailTaskItem> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _channel.Reader.ReadAsync(cancellationToken);
    }
}
