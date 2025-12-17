using Microsoft.Extensions.Options;
using Platform.ApiService.Options;

namespace Platform.ApiService.Services;

/// <summary>
/// 网关状态检测后台服务（每分钟执行一次）
/// </summary>
public class IoTGatewayStatusCheckHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTGatewayStatusCheckHostedService> _logger;
    private readonly SemaphoreSlim _runLock = new(1, 1);

    /// <summary>
    /// 初始化网关状态检测后台服务
    /// </summary>
    /// <param name="scopeFactory">服务作用域工厂</param>
    /// <param name="optionsMonitor">数据采集配置选项监视器</param>
    /// <param name="logger">日志记录器</param>
    public IoTGatewayStatusCheckHostedService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTGatewayStatusCheckHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    /// <summary>
    /// 执行后台服务的主循环（每分钟检查一次网关状态）
    /// </summary>
    /// <param name="stoppingToken">停止令牌</param>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;
            if (!options.GatewayStatusCheckEnabled)
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                continue;
            }

            await RunOnceAsync(stoppingToken);

            // 等待1分钟后再次执行
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        if (!await _runLock.WaitAsync(0, cancellationToken).ConfigureAwait(false))
        {
            _logger.LogWarning("Previous gateway status check is still running, skip this schedule.");
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var checker = scope.ServiceProvider.GetRequiredService<IoTGatewayStatusChecker>();
            await checker.CheckAndUpdateGatewayStatusesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            // normal cancellation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gateway status check run failed");
        }
        finally
        {
            _runLock.Release();
        }
    }
}
