using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 云存储维护后台服务
/// 负责定期清理过期的回收站项目、重新校准存储配额等后台任务。
/// </summary>
public class CloudStorageMaintenanceService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CloudStorageMaintenanceService> _logger;

    // 定期间隔：每 24 小时执行一次
    private readonly TimeSpan _taskInterval = TimeSpan.FromHours(24);

    /// <summary>
    /// 初始化云存储维护后台服务
    /// </summary>
    public CloudStorageMaintenanceService(
        IServiceProvider serviceProvider,
        ILogger<CloudStorageMaintenanceService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// 执行后台维护任务循环
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cloud Storage Maintenance Service is starting.");

        // 首次启动延迟 1 分钟，等待系统完全启动
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Starting cloud storage maintenance tasks at: {Time}", DateTimeOffset.Now);

                using (var scope = _serviceProvider.CreateScope())
                {
                    var cloudStorageService = scope.ServiceProvider.GetRequiredService<ICloudStorageService>();
                    var storageQuotaService = scope.ServiceProvider.GetRequiredService<IStorageQuotaService>();

                    // 1. 清理过期回收站项目 (默认 30 天过期)
                    await PerformRecycleBinCleanupAsync(cloudStorageService);

                    // 2. 存储配额校准 (防止累计更新导致的偏差)
                    // 注意：这可能是一个耗时操作，如果用户量极大，建议分批进行
                    // 暂时这里只做逻辑演示，实际生产可能需要更细粒度的控制
                    // await PerformQuotaCalibrationAsync(storageQuotaService);
                }

                _logger.LogInformation("Cloud storage maintenance tasks completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while performing cloud storage maintenance tasks.");
            }

            // 等待下一次执行
            await Task.Delay(_taskInterval, stoppingToken);
        }

        _logger.LogInformation("Cloud Storage Maintenance Service is stopping.");
    }

    private async Task PerformRecycleBinCleanupAsync(ICloudStorageService cloudStorageService)
    {
        try
        {
            _logger.LogInformation("Cleaning up expired recycle bin items...");
            var (deletedCount, freedSpace) = await cloudStorageService.CleanupExpiredRecycleBinItemsAsync(30);
            _logger.LogInformation("Cleanup finished: deleted {Count} items, freed {Size} bytes.", deletedCount, freedSpace);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup expired recycle bin items.");
        }
    }
}
