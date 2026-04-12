using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ITaskStatisticsService
{
    Task<TaskStatistics> GetTaskStatisticsAsync(string? userId = null);
    Task<System.Linq.Dynamic.Core.PagedResult<TaskExecutionLogDto>> GetTaskExecutionLogsAsync(string taskId, Platform.ServiceDefaults.Models.PageParams request);
    Task<TaskExecutionLogDto> LogTaskExecutionAsync(string taskId, TaskExecutionResult status, string? message = null, int progressPercentage = 0);
}
