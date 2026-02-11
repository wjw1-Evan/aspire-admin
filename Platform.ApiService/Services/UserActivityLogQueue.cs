using System.Threading.Channels;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户活动日志异步队列接口
/// </summary>
public interface IUserActivityLogQueue
{
    /// <summary>
    /// 将日志请求入队
    /// </summary>
    ValueTask EnqueueAsync(LogHttpRequestRequest logRequest, CancellationToken cancellationToken = default);

    /// <summary>
    /// 从队列中获取日志请求
    /// </summary>
    ValueTask<LogHttpRequestRequest> DequeueAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// 用户活动日志异步队列实现 (基于 System.Threading.Channels)
/// </summary>
public class UserActivityLogQueue : IUserActivityLogQueue
{
    private readonly Channel<LogHttpRequestRequest> _queue;

    /// <summary>
    /// 初始化异步日志队列
    /// </summary>
    /// <param name="capacity">队列容量，默认 10000</param>
    public UserActivityLogQueue(int capacity = 10000)
    {
        // 使用有界频道，防止内存溢出。在高并发场景下，如果队列满了，丢弃最旧的日志。
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true, // 只有一个后台 Worker 读取
            SingleWriter = false // 多个 HTTP 请求线程写入
        };
        _queue = Channel.CreateBounded<LogHttpRequestRequest>(options);
    }

    /// <summary>
    /// 将日志请求入队
    /// </summary>
    /// <param name="logRequest">日志请求对象</param>
    /// <param name="cancellationToken">取消令牌</param>
    public ValueTask EnqueueAsync(LogHttpRequestRequest logRequest, CancellationToken cancellationToken = default)
    {
        return _queue.Writer.WriteAsync(logRequest, cancellationToken);
    }

    /// <summary>
    /// 从队列中获取日志请求
    /// </summary>
    /// <param name="cancellationToken">取消令牌</param>
    public ValueTask<LogHttpRequestRequest> DequeueAsync(CancellationToken cancellationToken = default)
    {
        return _queue.Reader.ReadAsync(cancellationToken);
    }
}
