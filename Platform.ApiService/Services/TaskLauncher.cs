using System;
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

                tenantSetter.SetContext(task!.CompanyId, task.UserId);
                var result = await ws.ExecuteTaskAsync(taskId, userId);

                if (!result.Success)
                    Logger.LogWarning("抓取任务执行失败: {TaskId}, {Message}", taskId, result.Message);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "抓取任务执行异常: {TaskId}", taskId);
            }
        });
    }
}
