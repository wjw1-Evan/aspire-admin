using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ITaskLauncher
{
    void LaunchAsync(string taskId, string userId);
}

public class TaskLauncher(
    IServiceProvider ServiceProvider,
    ILogger<TaskLauncher> Logger) : ITaskLauncher
{
    public void LaunchAsync(string taskId, string userId)
    {
        Task.Run(async () =>
        {
            try
            {
                using var scope = ServiceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<DbContext>();
                var tenantSetter = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
                var ws = scope.ServiceProvider.GetRequiredService<IWebScraperService>();

                var task = await context.Set<WebScrapingTask>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == taskId);

                if (task == null)
                {
                    Logger.LogWarning("任务未找到: {TaskId}", taskId);
                    return;
                }

                tenantSetter.SetContext(task.CompanyId, task.UserId);
                var result = await ws.ExecuteTaskAsync(taskId, userId);

                if (!result.Success)
                {
                    Logger.LogWarning("抓取任务执行失败: {TaskId}, {Message}", taskId, result.Message);
                    return;
                }

                Logger.LogInformation("任务 {TaskId} 执行完成, EnableFilter={EnableFilter}, NotifyOnMatch={NotifyOnMatch}", 
                    taskId, task.EnableFilter, task.NotifyOnMatch);

                if (task.EnableFilter == true && task.NotifyOnMatch != false)
                {
                    await SendMatchNotificationsAsync(context, task, userId);
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "抓取任务执行异常: {TaskId}", taskId);
            }
        });
    }

    private async Task SendMatchNotificationsAsync(DbContext context, WebScrapingTask task, string userId)
    {
        Logger.LogInformation("SendMatchNotificationsAsync 开始查询匹配结果, TaskId={TaskId}", task.Id);
        
        var matchedResults = await context.Set<WebScrapingResult>()
            .Where(r => r.TaskId == task.Id && r.IsMatched == true)
            .OrderByDescending(r => r.RelevanceScore)
            .ToListAsync();

        Logger.LogInformation("任务 {TaskId} 匹配结果数量: {Count}", task.Id, matchedResults.Count);

        if (!matchedResults.Any()) return;

        using var scope = ServiceProvider.CreateScope();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        foreach (var page in matchedResults)
        {
            Logger.LogInformation("匹配记录: TaskId={TaskId}, PageId={PageId}, Title={Title}, Url={Url}, IsMatched={IsMatched}", 
                task.Id, page.Id, page.Title, page.Url, page.IsMatched);
            
            var title = string.IsNullOrWhiteSpace(page.Title) ? page.Url : page.Title;
            var score = page.RelevanceScore.HasValue ? $"{(int)page.RelevanceScore.Value}%" : "";
            var description = $"[{task.Name}] {score} 匹配相关".Trim();

            await notificationService.PublishAsync(
                task.UserId,
                title.Length > 50 ? title[..50] + "..." : title,
                description,
                NotificationCategory.System,
                NotificationLevel.Info,
                actionUrl: page.Url,
                metadata: new Dictionary<string, string> { { "TaskId", task.Id ?? "" }, { "ResultId", page.Id ?? "" } }
            );
        }

        Logger.LogInformation("任务 {TaskId} 发现 {Count} 条匹配记录，已通过新版通知系统发送", task.Id, matchedResults.Count);
    }
}
