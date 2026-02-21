using Microsoft.Extensions.Options;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 物联网数据保留后台服务
/// 每天 UTC 02:00 执行一次，根据设备配置清理过期遥测数据和命令
/// </summary>
public class IoTDataRetentionHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IoTDataRetentionHostedService> _logger;

    /// <summary>
    /// 初始化物联网数据保留后台服务
    /// </summary>
    /// <param name="scopeFactory">服务作用域工厂</param>
    /// <param name="logger">日志记录器</param>
    public IoTDataRetentionHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<IoTDataRetentionHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// 后台服务主循环（每天 UTC 02:00 执行一次）
    /// </summary>
    /// <param name="stoppingToken">停止令牌</param>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // 等待到下一个 UTC 02:00
            var now = DateTime.UtcNow;
            var nextRun = now.Date.AddDays(1).AddHours(2);
            var delay = nextRun - now;
            if (delay <= TimeSpan.Zero)
                delay = TimeSpan.FromHours(23);

            try
            {
                await Task.Delay(delay, stoppingToken);
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "IoT data retention run failed");
                // 失败后等待 1 小时重试
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var deviceFactory = scope.ServiceProvider.GetRequiredService<IDataFactory<IoTDevice>>();
        var recordFactory = scope.ServiceProvider.GetRequiredService<IDataFactory<IoTDataRecord>>();
        var iotService = scope.ServiceProvider.GetRequiredService<IIoTService>();

        // 1. 按设备保留策略清理过期遥测数据
        var devices = await deviceFactory.FindWithoutTenantFilterAsync(d => d.RetentionDays > 0 && d.IsDeleted != true);
        int deletedRecords = 0;

        foreach (var device in devices)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var cutoff = DateTime.UtcNow.AddDays(-device.RetentionDays);
            var expired = await recordFactory.FindWithoutTenantFilterAsync(
                r => r.DeviceId == device.DeviceId && r.ReportedAt < cutoff && r.IsDeleted != true);

            foreach (var record in expired)
            {
                await recordFactory.SoftDeleteAsync(record.Id);
                deletedRecords++;
            }
        }

        // 2. 过期 C2D 命令处理
        int expiredCommands = await iotService.ExpireCommandsAsync();

        _logger.LogInformation(
            "IoT data retention completed: deleted {Records} telemetry records, expired {Commands} commands",
            deletedRecords, expiredCommands);
    }
}
