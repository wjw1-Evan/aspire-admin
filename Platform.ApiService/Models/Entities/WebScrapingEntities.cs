using Platform.ServiceDefaults.Models;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Models;

public class WebScrapingTask : MultiTenantEntity
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

    public bool IsEnabled { get; set; } = true;
    public string? ScheduleCron { get; set; }
    public DateTime? NextRunAt { get; set; }

    public ScrapingStatus LastStatus { get; set; } = ScrapingStatus.Idle;
    public DateTime? LastRunAt { get; set; }
    public int? LastDuration { get; set; }
    public string? LastError { get; set; }
    public int TotalPagesCrawled { get; set; }
    public int ResultCount { get; set; }
    public int? MatchedCount { get; set; }

    public string UserId { get; set; } = string.Empty;
    public bool IsPublic { get; set; } = false;

    public string? FilterPrompt { get; set; }
    public bool? EnableFilter { get; set; }
    public bool? NotifyOnMatch { get; set; } = true;
}

public class WebScrapingLog : MultiTenantEntity
{
    public string TaskId { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public ScrapingStatus Status { get; set; }
    public int Duration { get; set; }
    public int PagesCrawled { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public int? MatchedCount { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ExtractedData { get; set; }
}

public enum CrawlMode
{
    SinglePage,
    DepthFirst,
    BreadthFirst
}

[JsonConverter(typeof(JsonStringEnumConverter<ScrapingStatus>))]
public enum ScrapingStatus
{
    Idle,
    Running,
    Success,
    Failed,
    PartialSuccess
}

public class CrawlResult
{
    public int TotalPages { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public int MatchedCount { get; set; }
    public int FilteredCount { get; set; }
    public List<PageResult> Pages { get; set; } = new();
    public TimeSpan TotalDuration { get; set; }
}

public class PageResult
{
    public int Level { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Content { get; set; }
    public List<string> Images { get; set; } = new();
    public List<string> Links { get; set; } = new();
    public bool Success { get; set; }
    public string? Error { get; set; }
    public bool IsFiltered { get; set; }
    public bool IsMatched { get; set; }
    public string? MatchReason { get; set; }
    public double? RelevanceScore { get; set; }
}

public class WebScrapingResult : MultiTenantEntity
{
    public string TaskId { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public string LogId { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int Level { get; set; }
    public string? Title { get; set; }
    public string? Content { get; set; }
    public List<string> Images { get; set; } = new();
    public List<string> Links { get; set; } = new();
    public bool Success { get; set; }
    public string? Error { get; set; }
    public int ContentLength { get; set; }
    public int ImageCount { get; set; }
    public int LinkCount { get; set; }

    public bool? IsFiltered { get; set; }
    public bool? IsMatched { get; set; }
    public string? MatchReason { get; set; }
    public double? RelevanceScore { get; set; }
}
