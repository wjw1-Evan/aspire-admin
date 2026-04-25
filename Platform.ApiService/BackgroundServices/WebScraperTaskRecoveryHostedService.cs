using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.BackgroundServices;

/// <summary>
/// 网页抓取任务恢复服务
/// 通过心跳机制检测并恢复卡住的任务
/// </summary>
public class WebScraperTaskRecoveryHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WebScraperTaskRecoveryHostedService> _logger;
    private readonly TimeSpan _recoveryInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _heartbeatTimeout = TimeSpan.FromMinutes(2);

    public WebScraperTaskRecoveryHostedService(
        IServiceProvider serviceProvider,
        ILogger<WebScraperTaskRecoveryHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverStuckTasksAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_recoveryInterval, stoppingToken);
                await RecoverStuckTasksAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行任务恢复时发生错误");
            }
        }
    }

    private async Task RecoverStuckTasksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DbContext>();

        var now = DateTime.UtcNow;
        var stuckTasks = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.LastStatus == ScrapingStatus.Running && t.IsDeleted != true)
            .ToListAsync(stoppingToken);

        if (stuckTasks.Count == 0)
        {
            _logger.LogDebug("[任务恢复] 没有发现运行中的任务");
            return;
        }

        _logger.LogInformation("[任务恢复] 发现 {Count} 个运行中的任务，开始检查心跳", stuckTasks.Count);

        var recoveredCount = 0;
        foreach (var task in stuckTasks)
        {
            var isStuck = task.LastHeartbeatAt == null ||
                          (now - task.LastHeartbeatAt.Value) > _heartbeatTimeout;

            if (isStuck)
            {
                var elapsed = task.LastHeartbeatAt.HasValue
                    ? (now - task.LastHeartbeatAt.Value).TotalMinutes
                    : (now - (task.LastRunAt ?? now)).TotalMinutes;

                _logger.LogWarning(
                    "[任务恢复] 任务 {TaskId}({TaskName}) 心跳超时 {ElapsedMinutes} 分钟，重置为失败状态",
                    task.Id, task.Name, elapsed);

                task.LastStatus = ScrapingStatus.Failed;
                task.LastError = "任务心跳超时，可能已卡死或程序异常中断";
                recoveredCount++;
            }
        }

        if (recoveredCount > 0)
        {
            await context.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("[任务恢复] 已恢复 {Count} 个卡住的任务", recoveredCount);
        }
    }
}
