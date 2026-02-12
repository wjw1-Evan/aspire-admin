using Platform.ApiService.Services;

namespace Platform.ApiService.BackgroundServices;

/// <summary>
/// 用户活动日志后台处理服务
/// 从异步队列中消费日志请求并持久化到数据库
/// </summary>
public class UserActivityLogBackgroundWorker : BackgroundService
{
    private readonly IUserActivityLogQueue _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<UserActivityLogBackgroundWorker> _logger;

    /// <summary>
    /// 初始化用户活动日志后台处理服务
    /// </summary>
    /// <param name="queue">日志异步队列</param>
    /// <param name="serviceProvider">服务提供者</param>
    /// <param name="logger">日志记录器</param>
    public UserActivityLogBackgroundWorker(
        IUserActivityLogQueue queue,
        IServiceProvider serviceProvider,
        ILogger<UserActivityLogBackgroundWorker> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <param name="stoppingToken">指示处理应停止的时间。</param>
    /// <returns>一个表示后台操作的 <see cref="Task"/>。</returns>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("用户活动日志后台处理程序已启动。");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 从队列中获取日志请求（异步等待）
                var logRequest = await _queue.DequeueAsync(stoppingToken);

                // 创建 Scope 以获取 Scoped 服务 (IUserActivityLogService)
                using var scope = _serviceProvider.CreateScope();
                var logService = scope.ServiceProvider.GetRequiredService<IUserActivityLogService>();

                // 持久化日志
                await logService.LogHttpRequestAsync(logRequest);
            }
            catch (OperationCanceledException)
            {
                // 正常停止
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "处理异步活动日志时发生错误。");

                // 发生错误时稍作停顿，避免在极端情况下刷屏日志
                await Task.Delay(1000, stoppingToken);
            }
        }

        _logger.LogInformation("用户活动日志后台处理程序已停止。");
    }
}
