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
