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

    public WebScraperScheduledTaskHostedService(
        IServiceProvider serviceProvider,
        ILogger<WebScraperScheduledTaskHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("网页抓取定时任务服务已启动");

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
        var dueTasks = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.IsEnabled
                     && !string.IsNullOrEmpty(t.ScheduleCron)
                     && t.NextRunAt != null
                     && t.NextRunAt <= now)
            .ToListAsync(stoppingToken);

        foreach (var task in dueTasks)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                await ExecuteTaskInTenantScopeAsync(task, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行定时抓取任务失败: {TaskName}", task.Name);

                try
                {
                    using var errorScope = _serviceProvider.CreateScope();
                    var errorTenantSetter = errorScope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
                    errorTenantSetter.SetContext(task.CompanyId, task.CreatedBy);
                    var errorContext = errorScope.ServiceProvider.GetRequiredService<PlatformDbContext>();

                    var errorTask = await errorContext.Set<WebScrapingTask>()
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(t => t.Id == task.Id, stoppingToken);
                    if (errorTask != null)
                    {
                        errorTask.LastStatus = ScrapingStatus.Failed;
                        errorTask.LastError = ex.Message;
                        errorTask.NextRunAt = WebScraperCron.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
                        await errorContext.SaveChangesAsync(stoppingToken);
                    }
                }
                catch (Exception updateEx)
                {
                    _logger.LogError(updateEx, "更新任务失败状态时出错: {TaskName}", task.Name);
                }
            }
        }
    }

    private async Task ExecuteTaskInTenantScopeAsync(WebScrapingTask task, CancellationToken stoppingToken)
    {
        using var taskScope = _serviceProvider.CreateScope();
        var tenantSetter = taskScope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
        tenantSetter.SetContext(task.CompanyId, task.CreatedBy);

        var webScraperService = taskScope.ServiceProvider.GetRequiredService<IWebScraperService>();
        await webScraperService.ExecuteTaskAsync(task.Id, task.CreatedBy ?? task.UserId);

        using var updateScope = _serviceProvider.CreateScope();
        var updateTenantSetter = updateScope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
        updateTenantSetter.SetContext(task.CompanyId, task.CreatedBy);
        var updateContext = updateScope.ServiceProvider.GetRequiredService<PlatformDbContext>();

        var updateTask = await updateContext.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == task.Id, stoppingToken);
        if (updateTask != null)
        {
            updateTask.NextRunAt = WebScraperCron.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
            await updateContext.SaveChangesAsync(stoppingToken);
        }

        _logger.LogInformation("定时抓取任务完成: {TaskName}", task.Name);
    }
}