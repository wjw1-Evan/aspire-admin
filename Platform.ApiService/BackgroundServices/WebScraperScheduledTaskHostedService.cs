using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ApiService.Services.WebScraper;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.BackgroundServices;

public class WebScraperScheduledTaskHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebScraperScheduledTaskHostedService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public WebScraperScheduledTaskHostedService(
        IServiceProvider serviceProvider,
        IHttpClientFactory httpClientFactory,
        ILogger<WebScraperScheduledTaskHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _httpClientFactory = httpClientFactory;
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
                _logger.LogInformation("开始执行定时抓取任务: {TaskName}", task.Name);

                var startTime = DateTime.UtcNow;
                var log = new WebScrapingLog
                {
                    Id = Guid.NewGuid().ToString(),
                    TaskId = task.Id,
                    TaskName = task.Name,
                    StartTime = startTime,
                    Status = ScrapingStatus.Running
                };
                await context.Set<WebScrapingLog>().AddAsync(log, stoppingToken);

                var scraper = new HtmlScraper(_httpClientFactory.CreateClient());
                var crawler = new WebCrawler(scraper);
                var config = new CrawlConfig
                {
                    StartUrl = task.TargetUrl,
                    TitleSelector = task.TitleSelector,
                    ContentSelector = task.ContentSelector,
                    ImageSelectors = task.ImageSelectors,
                    CrawlDepth = task.CrawlDepth,
                    MaxPagesPerLevel = task.MaxPagesPerLevel,
                    MaxTotalPages = task.MaxPagesPerLevel * (task.CrawlDepth + 1),
                    UrlFilterPattern = task.UrlFilterPattern,
                    FollowExternalLinks = task.FollowExternalLinks,
                    Deduplicate = task.Deduplicate
                };

                var result = await crawler.CrawlAsync(task.TargetUrl, config);

                var endTime = DateTime.UtcNow;
                log.EndTime = endTime;
                log.Duration = (int)(endTime - startTime).TotalMilliseconds;
                log.PagesCrawled = result.TotalPages;
                log.SuccessCount = result.SuccessCount;
                log.FailedCount = result.FailedCount;
                log.Status = result.FailedCount == 0 ? ScrapingStatus.Success :
                            result.SuccessCount == 0 ? ScrapingStatus.Failed : ScrapingStatus.PartialSuccess;
                log.ExtractedData = System.Text.Json.JsonSerializer.Serialize(result);

                task.LastRunAt = startTime;
                task.LastDuration = log.Duration;
                task.LastStatus = log.Status;
                task.TotalPagesCrawled += result.TotalPages;
                task.ResultCount += result.TotalPages;
                task.NextRunAt = CronExpressionParser.ParseNext(task.ScheduleCron!, DateTime.UtcNow);

                foreach (var page in result.Pages)
                {
                    var scrapingResult = new WebScrapingResult
                    {
                        TaskId = task.Id,
                        TaskName = task.Name,
                        LogId = log.Id,
                        Url = page.Url,
                        Level = page.Level,
                        Title = page.Title,
                        Content = page.Content,
                        Images = page.Images ?? new List<string>(),
                        Links = page.Links ?? new List<string>(),
                        Success = page.Success,
                        Error = page.Error,
                        ContentLength = page.Content?.Length ?? 0,
                        ImageCount = page.Images?.Count ?? 0,
                        LinkCount = page.Links?.Count ?? 0
                    };
                    await context.Set<WebScrapingResult>().AddAsync(scrapingResult, stoppingToken);
                }

                await context.SaveChangesAsync(stoppingToken);

                _logger.LogInformation("定时抓取任务完成: {TaskName}, 成功 {SuccessCount}/{TotalCount}",
                    task.Name, result.SuccessCount, result.TotalPages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行定时抓取任务失败: {TaskName}", task.Name);

                task.LastStatus = ScrapingStatus.Failed;
                task.LastError = ex.Message;
                task.NextRunAt = CronExpressionParser.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
                await context.SaveChangesAsync(stoppingToken);
            }
        }
    }
}
