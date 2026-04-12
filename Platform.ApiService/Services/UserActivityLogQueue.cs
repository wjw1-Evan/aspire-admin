using System.Threading.Channels;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志异步队列实现 (基于 System.Threading.Channels)
/// </summary>
public class UserActivityLogQueue : IUserActivityLogQueue
{
    private readonly Channel<LogHttpRequestRequest> _queue;

    public UserActivityLogQueue(int capacity = 10000)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        };
        _queue = Channel.CreateBounded<LogHttpRequestRequest>(options);
    }

    public ValueTask EnqueueAsync(LogHttpRequestRequest logRequest, CancellationToken cancellationToken = default)
    {
        return _queue.Writer.WriteAsync(logRequest, cancellationToken);
    }

    public ValueTask<LogHttpRequestRequest> DequeueAsync(CancellationToken cancellationToken = default)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
