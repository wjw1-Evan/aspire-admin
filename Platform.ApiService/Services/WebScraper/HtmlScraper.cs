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

            var titleNode = doc.DocumentNode.SelectSingleNode("//title");
            result.Title = titleNode?.InnerText?.Trim();

            var bodyNode = doc.DocumentNode.SelectSingleNode("//body");
            if (bodyNode != null)
            {
                result.Content = bodyNode.InnerText?.Trim();
            }
            else
            {
                result.Content = doc.DocumentNode.InnerText?.Trim();
            }

            var imgNodes = doc.DocumentNode.SelectNodes("//img[@src]");
            if (imgNodes != null)
            {
                foreach (var node in imgNodes)
                {
                    var src = node.GetAttributeValue("src", "");
                    if (!string.IsNullOrEmpty(src))
                    {
                        result.Images.Add(AbsoluteUrl(url, src));
                    }
                }
            }

            var linkNodes = doc.DocumentNode.SelectNodes("//a[@href]");
            if (linkNodes != null)
            {
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
        request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
        request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
        request.Headers.Add("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7");
        request.Headers.Add("Accept-Encoding", "gzip, deflate, br");
        request.Headers.Add("sec-ch-ua", "\"Chromium\";v=\"123\", \"Not:A-Brand\";v=\"8\"");
        request.Headers.Add("sec-ch-ua-mobile", "?0");
        request.Headers.Add("sec-ch-ua-platform", "\"Windows\"");
        request.Headers.Add("sec-fetch-dest", "document");
        request.Headers.Add("sec-fetch-mode", "navigate");
        request.Headers.Add("sec-fetch-site", "none");
        request.Headers.Add("sec-fetch-user", "?1");
        request.Headers.Add("upgrade-insecure-requests", "1");
        request.Headers.Add("Connection", "keep-alive");

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"HTTP {(int)response.StatusCode}: {response.ReasonPhrase} - {url}");
        }

        var content = await response.Content.ReadAsStringAsync();

        if (string.IsNullOrWhiteSpace(content) || content.Length < 100)
        {
            throw new HttpRequestException($"Empty or very short response ({content.Length} chars) from {url}");
        }

        return content;
    }

    private static string DecodeHtml(byte[] bytes, string? charset)
    {
        if (bytes.Length < 3) return System.Text.Encoding.UTF8.GetString(bytes);

        if (bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            return System.Text.Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);

        if (bytes[0] == 0xFF && bytes[1] == 0xFE)
            return System.Text.Encoding.Unicode.GetString(bytes, 2, bytes.Length - 2);

        if (bytes[0] == 0xFE && bytes[1] == 0xFF)
            return System.Text.Encoding.BigEndianUnicode.GetString(bytes, 2, bytes.Length - 2);

        var detectedCharset = charset?.Replace("\"", "").Trim();
        if (!string.IsNullOrEmpty(detectedCharset))
        {
            try
            {
                var encoding = System.Text.Encoding.GetEncoding(detectedCharset);
                return encoding.GetString(bytes);
            }
            catch { }
        }

        var possibleEncodings = new[] { "utf-8", "gb2312", "gbk", "gb18030", "big5" };
        foreach (var encName in possibleEncodings)
        {
            try
            {
                var encoding = System.Text.Encoding.GetEncoding(encName);
                var decoded = encoding.GetString(bytes);
                if (decoded.Contains("�")) continue;
                if (decoded.Contains("<html") || decoded.Contains("<body"))
                    return decoded;
            }
            catch { }
        }

        return System.Text.Encoding.UTF8.GetString(bytes);
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
