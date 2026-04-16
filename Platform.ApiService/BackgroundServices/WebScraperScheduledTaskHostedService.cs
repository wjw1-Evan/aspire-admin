using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.BackgroundServices;

public static class WebScraperCron
{
    public static DateTime? ParseNext(string cron, DateTime from) => CronExpressionParser.ParseNext(cron, from);
}

public class WebScraperScheduledTaskHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WebScraperScheduledTaskHostedService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly Platform.ApiService.Services.ITaskLauncher _taskLauncher;

    public WebScraperScheduledTaskHostedService(
        IServiceProvider serviceProvider,
        ILogger<WebScraperScheduledTaskHostedService> logger,
        Platform.ApiService.Services.ITaskLauncher taskLauncher)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _taskLauncher = taskLauncher;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndExecuteScheduledTasksAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行定时抓取任务时发生错误");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CheckAndExecuteScheduledTasksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();

        var now = DateTime.UtcNow;
        var allEnabledTasks = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.IsEnabled && !string.IsNullOrEmpty(t.ScheduleCron))
            .ToListAsync(stoppingToken);

        foreach (var t in allEnabledTasks.Where(t => t.NextRunAt == null))
        {
            t.NextRunAt = WebScraperCron.ParseNext(t.ScheduleCron!, now);
        }

        if (allEnabledTasks.Any(t => t.NextRunAt != null))
        {
            await context.SaveChangesAsync(stoppingToken);
        }

        var dueTasks = allEnabledTasks
            .Where(t => t.NextRunAt != null && t.NextRunAt <= now && t.LastStatus != ScrapingStatus.Running)
            .ToList();

        foreach (var task in dueTasks)
        {
            if (stoppingToken.IsCancellationRequested) break;

            var locked = await TryLockTaskAsync(task, context, stoppingToken);
            if (!locked)
            {
                _logger.LogDebug("[定时任务] 任务 {TaskName} 已在执行中，跳过", task.Name);
                continue;
            }

            try
            {
                // 通过 TaskLauncher 统一触发执行，确保与 API 手动执行路径一致性
                _taskLauncher.LaunchAsync(task.Id, task.CreatedBy ?? task.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行定时抓取任务失败: {TaskName}", task.Name);
                task.LastStatus = ScrapingStatus.Failed;
                task.LastError = ex.Message;
                task.NextRunAt = WebScraperCron.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
                await context.SaveChangesAsync(stoppingToken);
            }
        }
    }

    private async Task<bool> TryLockTaskAsync(WebScrapingTask task, PlatformDbContext context, CancellationToken stoppingToken)
    {
        var rowsAffected = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.Id == task.Id && t.LastStatus != ScrapingStatus.Running)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.LastStatus, ScrapingStatus.Running), stoppingToken);

        return rowsAffected > 0;
    }
}
