using Platform.ApiService.Models;

namespace Platform.ApiService.Services.WebScraper;

public class WebCrawler
{
    private readonly HtmlScraper _scraper;
    private readonly HashSet<string> _visited = new();
    private readonly object _lock = new();

    public WebCrawler(HtmlScraper scraper)
    {
        _scraper = scraper;
    }

    public async Task<CrawlResult> CrawlAsync(string startUrl, CrawlConfig config)
    {
        var result = new CrawlResult();
        var startTime = DateTime.UtcNow;
        _visited.Clear();

        var queue = new Queue<(string url, int level)>();
        queue.Enqueue((startUrl, 0));

        while (queue.Count > 0 && result.Pages.Count < config.MaxTotalPages)
        {
            var (currentUrl, level) = queue.Dequeue();

            lock (_lock)
            {
                if (_visited.Contains(currentUrl))
                    continue;
                _visited.Add(currentUrl);
            }

            var sameLevelCount = result.Pages.Count(p => p.Level == level);
            if (sameLevelCount >= config.MaxPagesPerLevel)
                continue;

            var pageConfig = new ScrapingConfig
            {
                Url = currentUrl,
                TitleSelector = config.TitleSelector,
                ContentSelector = config.ContentSelector,
                ImageSelectors = config.ImageSelectors,
                Level = level,
                UrlFilterPattern = config.UrlFilterPattern,
                FollowExternalLinks = config.FollowExternalLinks,
                Deduplicate = config.Deduplicate
            };

            var pageResult = await _scraper.ScrapeAsync(currentUrl, pageConfig);
            result.Pages.Add(pageResult);

            if (pageResult.Success)
                result.SuccessCount++;
            else
                result.FailedCount++;

            if (level < config.CrawlDepth)
            {
                var baseUri = new Uri(startUrl);
                foreach (var link in pageResult.Links)
                {
                    if (queue.Count >= config.MaxTotalPages * 2)
                        break;

                    if (!IsUrlAllowed(link, baseUri, config))
                        continue;

                    lock (_lock)
                    {
                        if (_visited.Contains(link))
                            continue;
                    }

                    queue.Enqueue((link, level + 1));
                }
            }
        }

        result.TotalPages = result.Pages.Count;
        result.TotalDuration = DateTime.UtcNow - startTime;

        return result;
    }

    private static bool IsUrlAllowed(string url, Uri baseUri, CrawlConfig config)
    {
        if (!url.StartsWith("http://") && !url.StartsWith("https://"))
            return false;

        var urlUri = new Uri(url);

        if (!config.FollowExternalLinks && urlUri.Host != baseUri.Host)
            return false;

        if (!string.IsNullOrEmpty(config.UrlFilterPattern))
        {
            try
            {
                var regex = new System.Text.RegularExpressions.Regex(config.UrlFilterPattern);
                if (!regex.IsMatch(url))
                    return false;
            }
            catch
            {
            }
        }

        return true;
    }
}

public class CrawlConfig
{
    public string StartUrl { get; set; } = string.Empty;
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int CrawlDepth { get; set; } = 0;
    public int MaxPagesPerLevel { get; set; } = 100;
    public int MaxTotalPages { get; set; } = 500;
    public string? UrlFilterPattern { get; set; }
    public bool FollowExternalLinks { get; set; } = false;
    public bool Deduplicate { get; set; } = true;
}
