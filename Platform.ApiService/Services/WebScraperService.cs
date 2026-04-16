using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using Platform.ApiService.Services.WebScraper;
using System.Linq.Dynamic.Core;
using System.Text.Json;
using System.Reflection;

namespace Platform.ApiService.Services;

public class WebScraperService : IWebScraperService
{
    private readonly DbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IContentFilterService _contentFilterService;
    private readonly ILogger<WebScraperService> _logger;
    private static readonly Dictionary<string, CancellationTokenSource> _runningTasks = new();

    public WebScraperService(
        DbContext context,
        IHttpClientFactory httpClientFactory,
        IContentFilterService contentFilterService,
        ILogger<WebScraperService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _contentFilterService = contentFilterService;
        _logger = logger;
    }

    public async Task<WebScrapingTask> CreateTaskAsync(CreateWebScrapingTaskRequest request, string userId)
    {
        var task = new WebScrapingTask
        {
            Name = request.Name,
            TargetUrl = request.TargetUrl,
            Description = request.Description,
            TitleSelector = request.TitleSelector,
            ContentSelector = request.ContentSelector,
            ImageSelectors = request.ImageSelectors,
            CrawlDepth = request.CrawlDepth,
            MaxPagesPerLevel = request.MaxPagesPerLevel,
            UrlFilterPattern = request.UrlFilterPattern,
            FollowExternalLinks = request.FollowExternalLinks,
            Deduplicate = request.Deduplicate,
            Mode = request.Mode,
            ScheduleCron = request.ScheduleCron,
            NextRunAt = !string.IsNullOrEmpty(request.ScheduleCron)
                ? CronExpressionParser.ParseNext(request.ScheduleCron, DateTime.UtcNow)
                : null,
            IsEnabled = request.IsEnabled,
            IsPublic = request.IsPublic,
            FilterPrompt = request.FilterPrompt,
            EnableFilter = request.EnableFilter,
            UserId = userId,
            LastStatus = ScrapingStatus.Idle
        };

        _logger.LogInformation("[CreateTask] ScheduleCron={Cron}, NextRunAt={NextRun}", request.ScheduleCron, task.NextRunAt);

        await _context.Set<WebScrapingTask>().AddAsync(task);
        await _context.SaveChangesAsync();

        return task;
    }

    public async Task<PagedResult<WebScrapingTask>> GetTasksAsync(
        PageParams pageParams, string userId, string? keyword = null, ScrapingStatus? status = null)
    {
        var query = _context.Set<WebScrapingTask>().AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(t => t.LastStatus == status.Value);
        }

        return  query.ToPagedList(pageParams);
        
    }

    public async Task<WebScrapingTask?> GetTaskByIdAsync(string id, string userId)
    {
        return await _context.Set<WebScrapingTask>()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    }

    public async Task<WebScrapingTask?> UpdateTaskAsync(string id, UpdateWebScrapingTaskRequest request, string userId)
    {
        _logger.LogInformation("[Service UpdateTaskAsync] request.ScheduleCron={SC}", request.ScheduleCron);
        var task = await GetTaskByIdAsync(id, userId);
        if (task == null)
        {
            _logger.LogWarning("[Service UpdateTaskAsync] 任务未找到, id={Id}", id);
            return null;
        }

        _logger.LogInformation("[Service UpdateTaskAsync] task.NextRunAt before={NRA}", task.NextRunAt);

        if (request.Name != null) task.Name = request.Name;
        if (request.TargetUrl != null) task.TargetUrl = request.TargetUrl;
        if (request.Description != null) task.Description = request.Description;
        if (request.TitleSelector != null) task.TitleSelector = request.TitleSelector;
        if (request.ContentSelector != null) task.ContentSelector = request.ContentSelector;
        if (request.ImageSelectors != null) task.ImageSelectors = request.ImageSelectors;
        if (request.CrawlDepth.HasValue) task.CrawlDepth = request.CrawlDepth.Value;
        if (request.MaxPagesPerLevel.HasValue) task.MaxPagesPerLevel = request.MaxPagesPerLevel.Value;
        if (request.UrlFilterPattern != null) task.UrlFilterPattern = request.UrlFilterPattern;
        if (request.FollowExternalLinks.HasValue) task.FollowExternalLinks = request.FollowExternalLinks.Value;
        if (request.Deduplicate.HasValue) task.Deduplicate = request.Deduplicate.Value;
        if (request.Mode.HasValue) task.Mode = request.Mode.Value;
        if (request.ScheduleCron != null)
        {
            task.ScheduleCron = request.ScheduleCron;
            var cronVal = request.ScheduleCron;
            if (!string.IsNullOrEmpty(cronVal))
            {
                var nextRun = CronExpressionParser.ParseNext(cronVal, DateTime.UtcNow);
                task.NextRunAt = nextRun;
                _logger.LogInformation("[UpdateTask] ScheduleCron={Cron}, NextRunAt={NextRun}", cronVal, nextRun);
            }
            else
            {
                task.NextRunAt = null;
            }
        }
        if (request.IsEnabled.HasValue) task.IsEnabled = request.IsEnabled.Value;
        if (request.IsPublic.HasValue) task.IsPublic = request.IsPublic.Value;
        if (request.FilterPrompt != null) task.FilterPrompt = request.FilterPrompt;
        if (request.EnableFilter.HasValue) task.EnableFilter = request.EnableFilter.Value;

        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<bool> DeleteTaskAsync(string id, string userId)
    {
        var task = await GetTaskByIdAsync(id, userId);
        if (task == null) return false;

        _context.Set<WebScrapingTask>().Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<WebScrapingTask?> ToggleTaskEnabledAsync(string id, string userId)
    {
        var task = await GetTaskByIdAsync(id, userId);
        if (task == null) return null;

        task.IsEnabled = !task.IsEnabled;
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<bool> StopTaskAsync(string id, string userId)
    {
        if (_runningTasks.TryGetValue(id, out var cts))
        {
            cts.Cancel();
            _runningTasks.Remove(id);
            _logger.LogInformation("[StopTaskAsync] 任务已停止, id={Id}", id);
            return true;
        }

        var task = await _context.Set<WebScrapingTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == id);
        if (task != null && task.LastStatus == ScrapingStatus.Running)
        {
            task.LastStatus = ScrapingStatus.Failed;
            task.LastError = "用户手动停止";
            task.LastRunAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("[StopTaskAsync] 强制重置任务状态, id={Id}", id);
            return true;
        }

        return false;
    }

    public async Task<ScrapeResultDto> ExecuteTaskAsync(string id, string userId)
    {
        var cts = new CancellationTokenSource();
        _runningTasks[id] = cts;

        try
        {
            var dbContext = _context as PlatformDbContext;
            var prop = dbContext?.GetType().BaseType?.GetProperty("CurrentCompanyId", BindingFlags.NonPublic | BindingFlags.Instance);
            var companyId = prop?.GetValue(dbContext) as string;
            _logger.LogInformation("[ExecuteTaskAsync] 开始执行, id={Id}, userId={UserId}, DbContextCompanyId={DbCompanyId}", id, userId, companyId);
            var task = await _context.Set<WebScrapingTask>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
            {
                _logger.LogWarning("[ExecuteTaskAsync] 任务未找到, id={Id}", id);
                return new ScrapeResultDto { Success = false, Message = "任务不存在" };
            }

            _logger.LogInformation("[ExecuteTaskAsync] 任务已找到: {TaskName}, CompanyId={CompanyId}", task.Name, task.CompanyId);

            var taskCompanyId = task.CompanyId;
            task.LastStatus = ScrapingStatus.Running;
            await _context.SaveChangesAsync();

            var startTime = DateTime.UtcNow;
            var log = new WebScrapingLog
            {
                TaskId = task.Id,
                TaskName = task.Name,
                StartTime = startTime,
                Status = ScrapingStatus.Running,
                CompanyId = taskCompanyId
            };

            try
            {
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

                var scraper = new HtmlScraper(_httpClientFactory.CreateClient());
                var crawler = new WebCrawler(scraper);
                var result = await crawler.CrawlAsync(task.TargetUrl, config);

                var filterStartTime = DateTime.UtcNow;
                var matchedCount = 0;
                if (task.EnableFilter == true && !string.IsNullOrWhiteSpace(task.FilterPrompt))
                {
                    _logger.LogInformation("[ExecuteTaskAsync] 开始AI筛选, FilterPrompt={Filter}", task.FilterPrompt);
                    var filterResults = await _contentFilterService.FilterPagesAsync(task.FilterPrompt!, result.Pages);
                    for (int i = 0; i < result.Pages.Count; i++)
                    {
                        if (result.Pages[i].Success)
                        {
                            result.Pages[i].IsFiltered = true;
                            result.Pages[i].IsMatched = filterResults[i].IsMatched;
                            result.Pages[i].MatchReason = filterResults[i].Reason;
                            result.Pages[i].RelevanceScore = filterResults[i].Score;
                            if (filterResults[i].IsMatched) matchedCount++;
                        }
                        else
                        {
                            result.Pages[i].IsFiltered = false;
                        }
                    }
                    _logger.LogInformation("[ExecuteTaskAsync] AI筛选完成, 匹配={MatchedCount}", matchedCount);
                }

                var endTime = DateTime.UtcNow;
                log.EndTime = endTime;
                log.Duration = (int)(endTime - startTime).TotalMilliseconds;
                log.PagesCrawled = result.TotalPages;
                log.SuccessCount = result.SuccessCount;
                log.FailedCount = result.FailedCount;
                log.MatchedCount = matchedCount;
                log.Status = result.FailedCount == 0 ? ScrapingStatus.Success :
                            result.SuccessCount == 0 ? ScrapingStatus.Failed : ScrapingStatus.PartialSuccess;
                log.ExtractedData = JsonSerializer.Serialize(result);

                task.LastStatus = log.Status;
                task.LastRunAt = startTime;
                task.LastDuration = log.Duration;
                task.TotalPagesCrawled += result.TotalPages;
                task.ResultCount += result.TotalPages;
                task.MatchedCount = matchedCount;
                task.LastError = null;

                await _context.Set<WebScrapingLog>().AddAsync(log);
                await _context.SaveChangesAsync();

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
                        LinkCount = page.Links?.Count ?? 0,
                        IsFiltered = page.IsFiltered,
                        IsMatched = page.IsMatched,
                        MatchReason = page.MatchReason,
                        RelevanceScore = page.RelevanceScore,
                        CompanyId = taskCompanyId
                    };
                    await _context.Set<WebScrapingResult>().AddAsync(scrapingResult);
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("[ExecuteTaskAsync] 保存{ResultCount}条结果, LogId={LogId}, CompanyId={CompanyId}", result.TotalPages, log.Id, taskCompanyId);

                task.NextRunAt = CronExpressionParser.ParseNext(task.ScheduleCron!, DateTime.UtcNow);
                await _context.SaveChangesAsync();
                _logger.LogInformation("[ExecuteTaskAsync] NextRunAt更新为: {NextRunAt}", task.NextRunAt);

                return new ScrapeResultDto
                {
                    Success = true,
                    Message = $"抓取完成，共 {result.TotalPages} 页，成功 {result.SuccessCount} 页",
                    Data = MapToCrawlResultDto(result)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "执行抓取任务失败: {TaskId}", id);

                log.EndTime = DateTime.UtcNow;
                log.Status = ScrapingStatus.Failed;
                log.ErrorMessage = ex.Message;
                log.Duration = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

                task.LastStatus = ScrapingStatus.Failed;
                task.LastRunAt = startTime;
                task.LastDuration = log.Duration;
                task.LastError = ex.Message;

                await _context.Set<WebScrapingLog>().AddAsync(log);
                await _context.SaveChangesAsync();

                return new ScrapeResultDto { Success = false, Message = ex.Message };
            }
        }
        finally
        {
            _runningTasks.Remove(id);
        }
    }

    public async Task<ScrapeResultDto> ExecuteQuickScrapeAsync(QuickScrapeRequest request, string userId)
    {
        var config = new CrawlConfig
        {
            StartUrl = request.Url,
            TitleSelector = request.TitleSelector,
            ContentSelector = request.ContentSelector,
            ImageSelectors = request.ImageSelectors,
            CrawlDepth = request.CrawlDepth,
            MaxPagesPerLevel = request.MaxPagesPerLevel,
            MaxTotalPages = request.MaxPagesPerLevel * (request.CrawlDepth + 1)
        };

        try
        {
            var scraper = new HtmlScraper(_httpClientFactory.CreateClient());
            var crawler = new WebCrawler(scraper);
            var result = await crawler.CrawlAsync(request.Url, config);

            return new ScrapeResultDto
            {
                Success = true,
                Message = $"抓取完成，共 {result.TotalPages} 页",
                Data = MapToCrawlResultDto(result)
            };
        }
        catch (Exception ex)
        {
            return new ScrapeResultDto { Success = false, Message = ex.Message };
        }
    }

    public async Task<CrawlResultDto> PreviewScrapeAsync(ScrapePreviewRequest request, string userId)
    {
        var config = new CrawlConfig
        {
            StartUrl = request.Url,
            TitleSelector = request.TitleSelector,
            ContentSelector = request.ContentSelector,
            ImageSelectors = request.ImageSelectors,
            CrawlDepth = Math.Min(request.CrawlDepth, 1),
            MaxPagesPerLevel = Math.Min(request.MaxPagesPerLevel, 10),
            MaxTotalPages = 10,
            UrlFilterPattern = request.UrlFilterPattern,
            FollowExternalLinks = request.FollowExternalLinks
        };

        var scraper = new HtmlScraper(_httpClientFactory.CreateClient());
        var crawler = new WebCrawler(scraper);
        var result = await crawler.CrawlAsync(request.Url, config);

        return MapToCrawlResultDto(result);
    }

    public async Task<PagedResult<WebScrapingLog>> GetLogsAsync(
        PageParams pageParams, string userId, string? taskId = null)
    {
        var taskIds = await _context.Set<WebScrapingTask>()
            .Where(t => t.UserId == userId)
            .Select(t => t.Id)
            .ToListAsync();

        var query = _context.Set<WebScrapingLog>()
            .Where(l => taskIds.Contains(l.TaskId));

        if (!string.IsNullOrEmpty(taskId))
        {
            query = query.Where(l => l.TaskId == taskId);
        }

        return query.ToPagedList(pageParams);
    }

    public async Task<WebScrapingLog?> GetLogByIdAsync(string id, string userId)
    {
        var log = await _context.Set<WebScrapingLog>().FirstOrDefaultAsync(l => l.Id == id);
        if (log == null) return null;

        var task = await _context.Set<WebScrapingTask>()
            .FirstOrDefaultAsync(t => t.Id == log.TaskId && t.UserId == userId);

        return task != null ? log : null;
    }

    public async Task<PagedResult<WebScrapingResult>> GetResultsAsync(
        PageParams pageParams, string userId, string? taskId = null, string? logId = null)
    {
        var taskIds = await _context.Set<WebScrapingTask>()
            .Where(t => t.UserId == userId || t.IsPublic)
            .Select(t => t.Id)
            .ToListAsync();

        var query = _context.Set<WebScrapingResult>()
            .Where(r => taskIds.Contains(r.TaskId));

        if (!string.IsNullOrEmpty(taskId))
        {
            query = query.Where(r => r.TaskId == taskId);
        }

        if (!string.IsNullOrEmpty(logId))
        {
            query = query.Where(r => r.LogId == logId);
        }

        return query.ToPagedList(pageParams);
    }

    public async Task<WebScrapingResult?> GetResultByIdAsync(string id, string userId)
    {
        var result = await _context.Set<WebScrapingResult>().FirstOrDefaultAsync(r => r.Id == id);
        if (result == null) return null;

        var task = await _context.Set<WebScrapingTask>()
            .FirstOrDefaultAsync(t => t.Id == result.TaskId && t.UserId == userId);

        return task != null ? result : null;
    }

    public async Task UpdateScheduledTasksAsync()
    {
        var now = DateTime.UtcNow;
        var enabledTasks = await _context.Set<WebScrapingTask>()
            .Where(t => t.IsEnabled && !string.IsNullOrEmpty(t.ScheduleCron))
            .ToListAsync();

        foreach (var task in enabledTasks)
        {
            if (!string.IsNullOrEmpty(task.ScheduleCron))
            {
                var nextRun = CronExpressionParser.ParseNext(task.ScheduleCron, now);
                task.NextRunAt = nextRun;
            }
        }

        await _context.SaveChangesAsync();
    }

    private static CrawlResultDto MapToCrawlResultDto(CrawlResult result)
    {
        return new CrawlResultDto
        {
            TotalPages = result.TotalPages,
            SuccessCount = result.SuccessCount,
            FailedCount = result.FailedCount,
            MatchedCount = result.MatchedCount,
            FilteredCount = result.FilteredCount,
            TotalDuration = result.TotalDuration.ToString(@"hh\:mm\:ss\.fff"),
            Pages = result.Pages.Select(p => new PageResultDto
            {
                Level = p.Level,
                Url = p.Url,
                Title = p.Title,
                Content = p.Content,
                Images = p.Images,
                Links = p.Links,
                Success = p.Success,
                Error = p.Error,
                IsFiltered = p.IsFiltered,
                IsMatched = p.IsMatched,
                MatchReason = p.MatchReason,
                RelevanceScore = p.RelevanceScore
            }).ToList()
        };
    }
}

public static class CronExpressionParser
{
    public static DateTime? ParseNext(string cron, DateTime from)
    {
        try
        {
            var parts = cron.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 5) return null;

            var minute = ParseCronPart(parts[0], 0, 59);
            var hour = ParseCronPart(parts[1], 0, 23);
            var dayOfMonth = ParseCronPart(parts[2], 1, 31);
            var month = ParseCronPart(parts[3], 1, 12);
            var dayOfWeek = ParseCronPart(parts[4], 0, 6);

            var current = from.AddMinutes(1).AddSeconds(-from.Second).AddMilliseconds(-from.Millisecond);

            for (int i = 0; i < 60 * 24 * 366; i++)
            {
                if (month.Contains(current.Month)
                    && dayOfMonth.Contains(current.Day)
                    && dayOfWeek.Contains((int)current.DayOfWeek)
                    && hour.Contains(current.Hour)
                    && minute.Contains(current.Minute))
                {
                    return new DateTime(current.Year, current.Month, current.Day, current.Hour, current.Minute, 0, DateTimeKind.Utc);
                }
                current = current.AddMinutes(1);
            }
        }
        catch
        {
        }

        return null;
    }

    private static List<int> ParseCronPart(string part, int min, int max)
    {
        var result = new List<int>();
        if (part == "*") return Enumerable.Range(min, max - min + 1).ToList();

        foreach (var token in part.Split(','))
        {
            if (token.Contains('/'))
            {
                var stepParts = token.Split('/');
                var range = stepParts[0] == "*" ? Enumerable.Range(min, max - min + 1) : ParseCronPart(stepParts[0], min, max);
                var step = int.Parse(stepParts[1]);
                result.AddRange(range.Where((_, i) => i % step == 0));
            }
            else if (token.Contains('-'))
            {
                var rangeParts = token.Split('-');
                var start = int.Parse(rangeParts[0]);
                var end = int.Parse(rangeParts[1]);
                result.AddRange(Enumerable.Range(start, end - start + 1));
            }
            else
            {
                result.Add(int.Parse(token));
            }
        }

        return result.Distinct().ToList();
    }
}
