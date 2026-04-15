using HtmlAgilityPack;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services.WebScraper;

public class HtmlScraper
{
    private readonly HttpClient _httpClient;

    public HtmlScraper(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PageResult> ScrapeAsync(string url, ScrapingConfig config)
    {
        var result = new PageResult
        {
            Url = url,
            Level = config.Level
        };

        try
        {
            var html = await FetchHtmlAsync(url);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            if (!string.IsNullOrEmpty(config.TitleSelector))
            {
                var titleNode = doc.QuerySelector(config.TitleSelector);
                result.Title = titleNode?.InnerText?.Trim();
            }
            else
            {
                var titleNode = doc.QuerySelector("title");
                result.Title = titleNode?.InnerText?.Trim();
            }

            if (!string.IsNullOrEmpty(config.ContentSelector))
            {
                var contentNode = doc.QuerySelector(config.ContentSelector);
                result.Content = contentNode?.InnerText?.Trim();
            }
            else
            {
                var bodyNode = doc.QuerySelector("body");
                result.Content = bodyNode?.InnerText?.Trim();
            }

            if (config.ImageSelectors != null && config.ImageSelectors.Count > 0)
            {
                foreach (var selector in config.ImageSelectors)
                {
                    var imageNodes = doc.QuerySelectorAll(selector);
                    foreach (var node in imageNodes)
                    {
                        var src = node.GetAttributeValue("src", "");
                        if (!string.IsNullOrEmpty(src))
                        {
                            result.Images.Add(AbsoluteUrl(url, src));
                        }
                    }
                }
            }
            else
            {
                var imgNodes = doc.QuerySelectorAll("img[src]");
                foreach (var node in imgNodes)
                {
                    var src = node.GetAttributeValue("src", "");
                    if (!string.IsNullOrEmpty(src))
                    {
                        result.Images.Add(AbsoluteUrl(url, src));
                    }
                }
            }

            var linkNodes = doc.QuerySelectorAll("a[href]");
            foreach (var node in linkNodes)
            {
                var href = node.GetAttributeValue("href", "");
                if (!string.IsNullOrEmpty(href))
                {
                    var absoluteUrl = AbsoluteUrl(url, href);
                    if (IsValidUrl(absoluteUrl))
                    {
                        result.Links.Add(absoluteUrl);
                    }
                }
            }

            result.Success = true;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Error = ex.Message;
        }

        return result;
    }

    private async Task<string> FetchHtmlAsync(string url)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
        request.Headers.Add("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }

    private static string AbsoluteUrl(string baseUrl, string relativeUrl)
    {
        if (relativeUrl.StartsWith("http://") || relativeUrl.StartsWith("https://"))
            return relativeUrl;

        if (relativeUrl.StartsWith("//"))
            return "https:" + relativeUrl;

        if (relativeUrl.StartsWith("/"))
        {
            var uri = new Uri(baseUrl);
            return $"{uri.Scheme}://{uri.Host}{relativeUrl}";
        }

        var baseUri = new Uri(baseUrl);
        return new Uri(baseUri, relativeUrl).ToString();
    }

    private static bool IsValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

public class ScrapingConfig
{
    public string Url { get; set; } = string.Empty;
    public string? TitleSelector { get; set; }
    public string? ContentSelector { get; set; }
    public List<string>? ImageSelectors { get; set; }
    public int Level { get; set; } = 0;
    public string? UrlFilterPattern { get; set; }
    public bool FollowExternalLinks { get; set; } = false;
    public bool Deduplicate { get; set; } = true;
}

public static class HtmlNodeExtensions
{
    public static HtmlNode? QuerySelector(this HtmlDocument doc, string selector)
    {
        return doc.DocumentNode.SelectSingleNode(selector);
    }

    public static HtmlNodeCollection QuerySelectorAll(this HtmlDocument doc, string selector)
    {
        return doc.DocumentNode.SelectNodes(selector) ?? new HtmlNodeCollection(doc.DocumentNode);
    }

    public static HtmlNodeCollection QuerySelectorAll(this HtmlNode node, string selector)
    {
        return node.SelectNodes(selector) ?? new HtmlNodeCollection(node);
    }
}
