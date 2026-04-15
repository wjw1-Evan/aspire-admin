using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Services.WebScraper;
using System.Linq.Dynamic.Core;
using System.Text.Json;

namespace Platform.ApiService.Services;

public class WebScraperService : IWebScraperService
{
    private readonly DbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebScraperService> _logger;

    public WebScraperService(
        DbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<WebScraperService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
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
            UserId = userId,
            LastStatus = ScrapingStatus.Idle
        };

        await _context.Set<WebScrapingTask>().AddAsync(task);
        await _context.SaveChangesAsync();

        return task;
    }

    public async Task<PagedResult<WebScrapingTask>> GetTasksAsync(
        PageParams pageParams, string userId, string? keyword = null, ScrapingStatus? status = null)
    {
        var query = _context.Set<WebScrapingTask>().AsQueryable();

        if (!string.IsNullOrEmpty(keyword))
        {
            query = query.Where(t => t.Name.Contains(keyword) || t.TargetUrl.Contains(keyword));
        }

        if (status.HasValue)
        {
            query = query.Where(t => t.LastStatus == status.Value);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((pageParams.Page - 1) * pageParams.PageSize)
            .Take(pageParams.PageSize)
            .ToListAsync();

        return new PagedResult<WebScrapingTask>
        {
            Queryable = items.AsQueryable(),
            CurrentPage = pageParams.Page,
            PageSize = pageParams.PageSize,
            RowCount = total,
            PageCount = (int)Math.Ceiling(total / (double)pageParams.PageSize)
        };
    }

    public async Task<WebScrapingTask?> GetTaskByIdAsync(string id, string userId)
    {
        return await _context.Set<WebScrapingTask>()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    }

    public async Task<WebScrapingTask?> UpdateTaskAsync(string id, UpdateWebScrapingTaskRequest request, string userId)
    {
        var task = await GetTaskByIdAsync(id, userId);
        if (task == null) return null;

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
            task.NextRunAt = !string.IsNullOrEmpty(request.ScheduleCron)
                ? CronExpressionParser.ParseNext(request.ScheduleCron, DateTime.UtcNow)
                : null;
        }
        if (request.IsEnabled.HasValue) task.IsEnabled = request.IsEnabled.Value;
        if (request.IsPublic.HasValue) task.IsPublic = request.IsPublic.Value;

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

    public async Task<ScrapeResultDto> ExecuteTaskAsync(string id, string userId)
    {
        var task = await GetTaskByIdAsync(id, userId);
        if (task == null)
        {
            return new ScrapeResultDto { Success = false, Message = "任务不存在" };
        }

        task.LastStatus = ScrapingStatus.Running;
        await _context.SaveChangesAsync();

        var startTime = DateTime.UtcNow;
        var log = new WebScrapingLog
        {
            TaskId = task.Id,
            TaskName = task.Name,
            StartTime = startTime,
            Status = ScrapingStatus.Running
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

            var endTime = DateTime.UtcNow;
            log.EndTime = endTime;
            log.Duration = (int)(endTime - startTime).TotalMilliseconds;
            log.PagesCrawled = result.TotalPages;
            log.SuccessCount = result.SuccessCount;
            log.FailedCount = result.FailedCount;
            log.Status = result.FailedCount == 0 ? ScrapingStatus.Success :
                        result.SuccessCount == 0 ? ScrapingStatus.Failed : ScrapingStatus.PartialSuccess;
            log.ExtractedData = JsonSerializer.Serialize(result);

            task.LastStatus = log.Status;
            task.LastRunAt = startTime;
            task.LastDuration = log.Duration;
            task.TotalPagesCrawled += result.TotalPages;
            task.ResultCount += result.TotalPages;
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
                    LinkCount = page.Links?.Count ?? 0
                };
                await _context.Set<WebScrapingResult>().AddAsync(scrapingResult);
            }
            await _context.SaveChangesAsync();

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
        var query = _context.Set<WebScrapingLog>().AsQueryable();

        if (!string.IsNullOrEmpty(taskId))
        {
            query = query.Where(l => l.TaskId == taskId);
        }

        var taskIds = await _context.Set<WebScrapingTask>()
            .Where(t => t.UserId == userId)
            .Select(t => t.Id)
            .ToListAsync();

        query = query.Where(l => taskIds.Contains(l.TaskId));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.StartTime)
            .Skip((pageParams.Page - 1) * pageParams.PageSize)
            .Take(pageParams.PageSize)
            .ToListAsync();

        return new PagedResult<WebScrapingLog>
        {
            Queryable = items.AsQueryable(),
            CurrentPage = pageParams.Page,
            PageSize = pageParams.PageSize,
            RowCount = total,
            PageCount = (int)Math.Ceiling(total / (double)pageParams.PageSize)
        };
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
        var query = _context.Set<WebScrapingResult>().AsQueryable();

        if (!string.IsNullOrEmpty(taskId))
        {
            query = query.Where(r => r.TaskId == taskId);
        }

        if (!string.IsNullOrEmpty(logId))
        {
            query = query.Where(r => r.LogId == logId);
        }

        var taskIds = await _context.Set<WebScrapingTask>()
            .Where(t => t.UserId == userId)
            .Select(t => t.Id)
            .ToListAsync();

        query = query.Where(r => taskIds.Contains(r.TaskId));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pageParams.Page - 1) * pageParams.PageSize)
            .Take(pageParams.PageSize)
            .ToListAsync();

        return new PagedResult<WebScrapingResult>
        {
            Queryable = items.AsQueryable(),
            CurrentPage = pageParams.Page,
            PageSize = pageParams.PageSize,
            RowCount = total,
            PageCount = (int)Math.Ceiling(total / (double)pageParams.PageSize)
        };
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
                Error = p.Error
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
            var parts = cron.Split(' ');
            if (parts.Length < 5) return null;

            var minute = ParseCronPart(parts[0], 0, 59);
            var hour = ParseCronPart(parts[1], 0, 23);
            var dayOfMonth = ParseCronPart(parts[2], 1, 31);
            var month = ParseCronPart(parts[3], 1, 12);
            var dayOfWeek = ParseCronPart(parts[4], 0, 6);

            for (int i = 0; i < 366; i++)
            {
                var candidate = from.AddDays(i);
                if (!month.Contains(candidate.Month)) continue;
                if (!dayOfMonth.Contains(candidate.Day)) continue;
                if (!dayOfWeek.Contains((int)candidate.DayOfWeek)) continue;
                if (!hour.Contains(candidate.Hour)) continue;
                if (!minute.Contains(candidate.Minute)) continue;

                return new DateTime(candidate.Year, candidate.Month, candidate.Day, candidate.Hour, candidate.Minute, 0, DateTimeKind.Utc);
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
