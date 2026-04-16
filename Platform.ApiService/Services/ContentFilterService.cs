using Microsoft.Extensions.AI;
using Platform.ApiService.Models;
using System.Text;
using System.Text.Json;

namespace Platform.ApiService.Services;

public class ContentFilterService : IContentFilterService
{
    private readonly IChatClient _chatClient;
    private readonly ILogger<ContentFilterService> _logger;
    private const int MaxContentLength = 8000;
    private const int MaxConcurrentRequests = 3;

    public ContentFilterService(
        IChatClient chatClient,
        ILogger<ContentFilterService> logger)
    {
        _chatClient = chatClient;
        _logger = logger;
    }

    public async Task<FilterResult> FilterPageAsync(string prompt, PageResult page)
    {
        if (!page.Success || string.IsNullOrWhiteSpace(page.Content))
        {
            return new FilterResult
            {
                IsMatched = false,
                Reason = "页面抓取失败或无内容",
                Score = 0
            };
        }

        try
        {
            var systemPrompt = @"你是一个内容筛选助手。请根据用户提供的筛选条件，分析网页内容是否符合要求。

请返回JSON格式的结果：
{
    ""isMatched"": true或false,
    ""reason"": ""简要说明匹配或不匹配的原因（50字以内）"",
    ""score"": 0到100的评分（数字）
}

注意：
- 如果内容明显符合筛选条件，score应为70-100
- 如果内容部分符合，score应为40-69
- 如果内容不符合，score应为0-39";

            var truncatedContent = TruncateContent(page.Content ?? "", MaxContentLength);
            var userMessage = $@"用户筛选条件：{prompt}

页面标题：{page.Title ?? "无标题"}
页面URL：{page.Url}
页面内容：
{truncatedContent}";

            var messages = new List<Microsoft.Extensions.AI.ChatMessage>
            {
                new(ChatRole.System, systemPrompt),
                new(ChatRole.User, userMessage)
            };

            var response = await _chatClient.GetResponseAsync(messages, new ChatOptions
            {
                Temperature = 0.1f
            });

            var content = response.ToString();
            return ParseFilterResult(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI筛选失败: {Url}", page.Url);
            return new FilterResult
            {
                IsMatched = false,
                Reason = $"AI分析失败: {ex.Message}",
                Score = 0
            };
        }
    }

    public async Task<List<FilterResult>> FilterPagesAsync(string prompt, List<PageResult> pages)
    {
        var results = new List<FilterResult>();
        var successPages = pages.Where(p => p.Success && !string.IsNullOrWhiteSpace(p.Content)).ToList();

        if (successPages.Count == 0)
        {
            return pages.Select(p => new FilterResult { IsMatched = false, Reason = "无有效页面", Score = 0 }).ToList();
        }

        var semaphore = new SemaphoreSlim(MaxConcurrentRequests);
        var tasks = pages.Select(async page =>
        {
            await semaphore.WaitAsync();
            try
            {
                var result = await FilterPageAsync(prompt, page);
                return (page, result);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var taskResults = await Task.WhenAll(tasks);
        var resultMap = taskResults.ToDictionary(t => t.page.Url, t => t.result);

        foreach (var page in pages)
        {
            results.Add(resultMap.GetValueOrDefault(page.Url, new FilterResult { IsMatched = false, Reason = "未知错误", Score = 0 }));
        }

        return results;
    }

    private static string TruncateContent(string content, int maxLength)
    {
        if (string.IsNullOrEmpty(content) || content.Length <= maxLength)
            return content;

        return content.Substring(0, maxLength) + "...(内容已截断)";
    }

    private static FilterResult ParseFilterResult(string json)
    {
        try
        {
            json = json.Trim();
            if (json.Contains("```json"))
            {
                var start = json.IndexOf("```json") + 7;
                var end = json.LastIndexOf("```");
                if (end > start)
                    json = json.Substring(start, end - start).Trim();
            }
            else if (json.Contains("```"))
            {
                var start = json.IndexOf("```") + 3;
                var end = json.LastIndexOf("```");
                if (end > start)
                    json = json.Substring(start, end - start).Trim();
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var isMatched = root.TryGetProperty("isMatched", out var matchedEl) && matchedEl.GetBoolean();
            var reason = root.TryGetProperty("reason", out var reasonEl) ? reasonEl.GetString() : null;
            var score = root.TryGetProperty("score", out var scoreEl) ? scoreEl.GetDouble() : 0;

            return new FilterResult
            {
                IsMatched = isMatched,
                Reason = reason,
                Score = Math.Max(0, Math.Min(100, score))
            };
        }
        catch
        {
            return new FilterResult
            {
                IsMatched = false,
                Reason = "解析AI响应失败",
                Score = 0
            };
        }
    }
}
