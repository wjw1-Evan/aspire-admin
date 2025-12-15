using Cronos;
using Microsoft.Extensions.Options;
using Platform.ApiService.Options;

namespace Platform.ApiService.Services;

/// <summary>
/// 定时调度 IoT 数据采集的后台服务
/// </summary>
public class IoTDataCollectionHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<IoTDataCollectionOptions> _optionsMonitor;
    private readonly ILogger<IoTDataCollectionHostedService> _logger;
    private CronExpression? _cronExpression;
    private readonly SemaphoreSlim _runLock = new(1, 1);

    /// <summary>
    /// 初始化后台采集调度服务
    /// </summary>
    public IoTDataCollectionHostedService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<IoTDataCollectionOptions> optionsMonitor,
        ILogger<IoTDataCollectionHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
        _cronExpression = CreateCron(optionsMonitor.CurrentValue.Cron);

        _optionsMonitor.OnChange(options =>
        {
            _cronExpression = CreateCron(options.Cron);
            _logger.LogInformation("IoT data collection cron updated to {Cron}", options.Cron);
        });
    }

    /// <summary>
    /// 调度循环，按 Cron 执行采集任务
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;
            if (!options.Enabled)
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                continue;
            }

            if (_cronExpression == null)
            {
                _cronExpression = CreateCron(options.Cron);
                if (_cronExpression == null)
                {
                    _logger.LogWarning("Invalid cron expression: {Cron}, will retry in 1 minute", options.Cron);
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                    continue;
                }
            }

            var next = _cronExpression.GetNextOccurrence(DateTimeOffset.UtcNow, TimeZoneInfo.Utc);
            if (next == null)
            {
                _logger.LogWarning("Cron expression {Cron} produced no next occurrence, sleeping 1 minute", options.Cron);
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                continue;
            }

            var delay = next.Value - DateTimeOffset.UtcNow;
            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, stoppingToken);
            }

            await RunOnceAsync(stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        if (!await _runLock.WaitAsync(0, cancellationToken).ConfigureAwait(false))
        {
            _logger.LogWarning("Previous IoT data collection is still running, skip this schedule.");
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var collector = scope.ServiceProvider.GetRequiredService<IoTDataCollector>();
            var result = await collector.RunOnceAsync(cancellationToken).ConfigureAwait(false);

            _logger.LogInformation(
                "IoT data collection finished: devices={Devices}, datapoints={DataPoints}, inserted={Inserted}, skipped={Skipped}, warnings={Warnings}",
                result.DevicesProcessed,
                result.DataPointsProcessed,
                result.RecordsInserted,
                result.RecordsSkipped,
                result.Warnings.Count);

            if (result.Warnings.Count > 0)
            {
                foreach (var warning in result.Warnings.Take(5))
                {
                    _logger.LogWarning("IoT collection warning: {Warning}", warning);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // normal cancellation
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IoT data collection run failed");
        }
        finally
        {
            _runLock.Release();
        }
    }

    private static CronExpression? CreateCron(string cron)
    {
        if (string.IsNullOrWhiteSpace(cron))
        {
            return null;
        }

        try
        {
            return CronExpression.Parse(cron, CronFormat.IncludeSeconds);
        }
        catch
        {
            return null;
        }
    }
}
