using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Services;

namespace Platform.ApiService.Services;

public interface ITaskLauncher
{
    void LaunchAsync(string taskId, string userId);
}

public class TaskLauncher : ITaskLauncher
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TaskLauncher> _logger;

    public TaskLauncher(IServiceProvider serviceProvider, ILogger<TaskLauncher> logger)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void LaunchAsync(string taskId, string userId)
    {
        // Fire-and-forget: 采用独立的 DI Scope 执行任务，避免跨线程使用同一 DbContext
        Task.Run(async () =>
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var ws = scope.ServiceProvider.GetRequiredService<IWebScraperService>();
                var result = await ws.ExecuteTaskAsync(taskId, userId);
                if (!result.Success)
                {
                    _logger.LogWarning("抓取任务执行失败: {TaskId}, {Message}", taskId, result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "抓取任务执行异常: {TaskId}", taskId);
            }
        });
    }
}
