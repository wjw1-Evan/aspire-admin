using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

public interface IWebScraperService
{
    Task<WebScrapingTask> CreateTaskAsync(CreateWebScrapingTaskRequest request, string userId);
    Task<PagedResult<WebScrapingTask>> GetTasksAsync(PageParams pageParams, string userId, string? keyword = null, ScrapingStatus? status = null);
    Task<WebScrapingTask?> GetTaskByIdAsync(string id, string userId);
    Task<WebScrapingTask?> UpdateTaskAsync(string id, UpdateWebScrapingTaskRequest request, string userId);
    Task<bool> DeleteTaskAsync(string id, string userId);
    Task<WebScrapingTask?> ToggleTaskEnabledAsync(string id, string userId);

    Task<ScrapeResultDto> ExecuteTaskAsync(string id, string userId);
    Task<bool> StopTaskAsync(string id, string userId);
    Task<ScrapeResultDto> ExecuteQuickScrapeAsync(QuickScrapeRequest request, string userId);
    Task<CrawlResultDto> PreviewScrapeAsync(ScrapePreviewRequest request, string userId);

    Task<PagedResult<WebScrapingLog>> GetLogsAsync(PageParams pageParams, string userId, string? taskId = null);
    Task<WebScrapingLog?> GetLogByIdAsync(string id, string userId);

    Task<PagedResult<WebScrapingResult>> GetResultsAsync(PageParams pageParams, string userId, string? taskId = null, string? logId = null);
    Task<WebScrapingResult?> GetResultByIdAsync(string id, string userId);

    Task UpdateScheduledTasksAsync();
}
