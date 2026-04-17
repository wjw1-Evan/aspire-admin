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
            .GroupBy(t => t.Id)
            .Select(g => g.First())
            .ToList();

        _logger.LogInformation("[定时任务] 检查到 {Count} 个到期任务", dueTasks.Count);

        foreach (var task in dueTasks)
        {
            if (stoppingToken.IsCancellationRequested) break;

            _logger.LogInformation("[定时任务] 准备执行任务 {TaskName}, NextRunAt={NextRunAt}", task.Name, task.NextRunAt);

            task.LastStatus = ScrapingStatus.Running;
            task.NextRunAt = CronExpressionParser.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
            await context.SaveChangesAsync(CancellationToken.None);

            _logger.LogInformation("[定时任务] 已启动任务 {TaskName}", task.Name);
            _taskLauncher.LaunchAsync(task.Id, task.CreatedBy ?? task.UserId);
        }
    }
}
