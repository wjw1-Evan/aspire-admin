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
        _logger.LogDebug("[定时任务] 开始检查到期任务，当前时间: {Now}", now);

        var allEnabledTasks = await context.Set<WebScrapingTask>()
            .IgnoreQueryFilters()
            .Where(t => t.IsEnabled && !string.IsNullOrEmpty(t.ScheduleCron))
            .ToListAsync(stoppingToken);

        _logger.LogDebug("[定时任务] 查询到 {Count} 个启用了定时表达式的任务", allEnabledTasks.Count);

        if (allEnabledTasks.Count == 0)
        {
            _logger.LogWarning("[定时任务] 未查询到任何启用了定时表达式的任务，请检查数据");
            var totalTaskCount = await context.Set<WebScrapingTask>().IgnoreQueryFilters().CountAsync(stoppingToken);
            _logger.LogWarning("[定时任务] 数据库中WebScrapingTask总数: {Count}", totalTaskCount);
        }

        var nullNextRunTasks = allEnabledTasks.Where(t => t.NextRunAt == null).ToList();
        if (nullNextRunTasks.Any())
        {
            _logger.LogWarning("[定时任务] 有 {Count} 个任务的NextRunAt为null（这些任务不会执行）:", nullNextRunTasks.Count);
            foreach (var t in nullNextRunTasks)
            {
                _logger.LogWarning("  - {TaskName}, ScheduleCron={Cron}", t.Name, t.ScheduleCron);
            }
        }

        foreach (var t in allEnabledTasks.Where(t => t.NextRunAt != null))
        {
            _logger.LogDebug("[定时任务] 任务 {TaskName}, NextRunAt={NextRunAt}, IsEnabled={IsEnabled}, ScheduleCron={Cron}",
                t.Name, t.NextRunAt, t.IsEnabled, t.ScheduleCron);
        }

        var dueTasks = allEnabledTasks
            .Where(t => t.NextRunAt != null && t.NextRunAt <= now)
            .ToList();

        _logger.LogInformation("[定时任务] 到期任务数量: {Count}", dueTasks.Count);

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
        _logger.LogInformation("[定时任务] 开始执行任务: {TaskName}, CompanyId={CompanyId}, CreatedBy={CreatedBy}",
            task.Name, task.CompanyId, task.CreatedBy);

        using var taskScope = _serviceProvider.CreateScope();
        var tenantSetter = taskScope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
        tenantSetter.SetContext(task.CompanyId, task.CreatedBy);
        _logger.LogDebug("[定时任务] 租户上下文已设置: CompanyId={CompanyId}", task.CompanyId);

        var webScraperService = taskScope.ServiceProvider.GetRequiredService<IWebScraperService>();
        _logger.LogInformation("[定时任务] 调用ExecuteTaskAsync: TaskId={TaskId}", task.Id);
        await webScraperService.ExecuteTaskAsync(task.Id, task.CreatedBy ?? task.UserId);
        _logger.LogInformation("[定时任务] ExecuteTaskAsync完成: TaskName={TaskName}", task.Name);

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