using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

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
        var context = scope.ServiceProvider.GetRequiredService<DbContext>();

        var now = DateTime.UtcNow;
        var allEnabledTasks = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.IsEnabled && !string.IsNullOrEmpty(t.ScheduleCron) && t.IsDeleted != true)
            .ToListAsync(stoppingToken);

        if (allEnabledTasks.Count == 0) return;

        _logger.LogInformation("[定时调度] 发现 {Count} 个启用的定时任务", allEnabledTasks.Count);

        var initialized = 0;
        foreach (var t in allEnabledTasks.Where(t => t.NextRunAt == null))
        {
            t.NextRunAt = WebScraperCron.ParseNext(t.ScheduleCron!, now);
            if (t.NextRunAt == null)
                _logger.LogWarning("[定时调度] 任务 {TaskId}({TaskName}) Cron 表达式解析失败: {Cron}", t.Id, t.Name, t.ScheduleCron);
            else
                initialized++;
        }

        if (initialized > 0)
        {
            _logger.LogInformation("[定时调度] 初始化 {Count} 个任务的 NextRunAt", initialized);
            await context.SaveChangesAsync(stoppingToken);
        }

        foreach (var task in allEnabledTasks)
        {
            var isDue = task.NextRunAt != null && task.NextRunAt <= now;
            var isRunning = task.LastStatus == ScrapingStatus.Running;

            if (isDue && isRunning)
            {
                _logger.LogInformation("[定时调度] 任务 {TaskId}({TaskName}) 已在运行中，跳过", task.Id, task.Name);
                continue;
            }

            if (isDue)
            {
                _logger.LogInformation("[定时调度] 触发任务 {TaskId}({TaskName}), NextRunAt={NextRunAt}", task.Id, task.Name, task.NextRunAt);
                task.LastStatus = ScrapingStatus.Running;
                await context.SaveChangesAsync(CancellationToken.None);
                _taskLauncher.LaunchAsync(task.Id, task.CreatedBy ?? task.UserId);
            }
            else if (task.NextRunAt != null && task.LastStatus == ScrapingStatus.Running)
            {
                var elapsed = now - (task.LastRunAt ?? now.AddMinutes(-5));
                if (elapsed.TotalMinutes > 10)
                {
                    _logger.LogWarning("[定时调度] 任务 {TaskId}({TaskName}) 运行超过10分钟，重置为空闲", task.Id, task.Name);
                    task.LastStatus = ScrapingStatus.Idle;
                    await context.SaveChangesAsync(CancellationToken.None);
                }
            }
        }
    }
}