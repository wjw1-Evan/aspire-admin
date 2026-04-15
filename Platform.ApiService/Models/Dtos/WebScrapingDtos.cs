using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

public class CreateWebScrapingTaskRequest
{
    public string Name { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int CrawlDepth { get; set; } = 0;
    public int MaxPagesPerLevel { get; set; } = 100;
    public string? UrlFilterPattern { get; set; }
    public bool FollowExternalLinks { get; set; } = false;
    public bool Deduplicate { get; set; } = true;
    public CrawlMode Mode { get; set; } = CrawlMode.BreadthFirst;
    public string? ScheduleCron { get; set; }
    public bool IsEnabled { get; set; } = true;
    public bool IsPublic { get; set; } = false;
}

public class UpdateWebScrapingTaskRequest
{
    public string? Name { get; set; }
    public string? TargetUrl { get; set; }
    public string? Description { get; set; }
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int? CrawlDepth { get; set; }
    public int? MaxPagesPerLevel { get; set; }
    public string? UrlFilterPattern { get; set; }
    public bool? FollowExternalLinks { get; set; }
    public bool? Deduplicate { get; set; }
    public CrawlMode? Mode { get; set; }
    public string? ScheduleCron { get; set; }
    public bool? IsEnabled { get; set; }
    public bool? IsPublic { get; set; }
}

public class WebScrapingTaskDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int CrawlDepth { get; set; }
    public int MaxPagesPerLevel { get; set; }
    public string? UrlFilterPattern { get; set; }
    public bool FollowExternalLinks { get; set; }
    public bool Deduplicate { get; set; }
    public CrawlMode Mode { get; set; }
    public bool IsEnabled { get; set; }
    public string? ScheduleCron { get; set; }
    public DateTime? NextRunAt { get; set; }
    public ScrapingStatus LastStatus { get; set; }
    public DateTime? LastRunAt { get; set; }
    public int? LastDuration { get; set; }
    public string? LastError { get; set; }
    public int TotalPagesCrawled { get; set; }
    public int ResultCount { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class WebScrapingLogDto
{
    public string Id { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public ScrapingStatus Status { get; set; }
    public int Duration { get; set; }
    public int PagesCrawled { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ExtractedData { get; set; }
}

public class QuickScrapeRequest
{
    public string Url { get; set; } = string.Empty;
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int CrawlDepth { get; set; } = 0;
    public int MaxPagesPerLevel { get; set; } = 100;
}

public class ScrapePreviewRequest
{
    public string Url { get; set; } = string.Empty;
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int CrawlDepth { get; set; } = 0;
    public int MaxPagesPerLevel { get; set; } = 100;
    public string? UrlFilterPattern { get; set; }
    public bool FollowExternalLinks { get; set; } = false;
}

public class ScrapeResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public CrawlResultDto? Data { get; set; }
}

public class CrawlResultDto
{
    public int TotalPages { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<PageResultDto> Pages { get; set; } = new();
    public string TotalDuration { get; set; } = string.Empty;
}

public class PageResultDto
{
    public int Level { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Content { get; set; }
    public List<string> Images { get; set; } = new();
    public List<string> Links { get; set; } = new();
    public bool Success { get; set; }
    public string? Error { get; set; }
}
