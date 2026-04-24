using Platform.ApiService.Models;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class WebScraperMcpToolHandler : McpToolHandlerBase
{
    private readonly IWebScraperService _webScraperService;
    private readonly HttpClient _httpClient;
    private readonly ILogger<WebScraperMcpToolHandler> _logger;

    public WebScraperMcpToolHandler(
        IWebScraperService webScraperService,
        HttpClient httpClient,
        ILogger<WebScraperMcpToolHandler> logger)
    {
        _webScraperService = webScraperService;
        _httpClient = httpClient;
        _logger = logger;

        RegisterTool("scrape_webpage", "抓取指定网页的内容，支持深度抓取。关键词：网页抓取,爬取网页,抓取内容,采集网页,抓取链接",
            ObjectSchema(new Dictionary<string, object>
            {
                ["url"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "目标URL" },
                ["title_selector"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "标题CSS选择器，默认title标签" },
                ["content_selector"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "内容CSS选择器，默认body" },
                ["crawl_depth"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "抓取深度，0=仅当前页，默认0" },
                ["max_pages"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "每层最大页面数，默认100" }
            }, ["url"]),
            async (args, uid) =>
            {
                var url = args.GetValueOrDefault("url")?.ToString();
                if (string.IsNullOrEmpty(url)) return new { error = "url 必填" };

                var request = new QuickScrapeRequest
                {
                    Url = url,
                    TitleSelector = args.GetValueOrDefault("title_selector")?.ToString(),
                    ContentSelector = args.GetValueOrDefault("content_selector")?.ToString(),
                    CrawlDepth = int.TryParse(args.GetValueOrDefault("crawl_depth")?.ToString(), out var d) ? d : 0,
                    MaxPagesPerLevel = int.TryParse(args.GetValueOrDefault("max_pages")?.ToString(), out var m) ? m : 100
                };

                return await _webScraperService.ExecuteQuickScrapeAsync(request, uid);
            });

        RegisterTool("get_scraping_tasks", "获取网页抓取任务列表。关键词：抓取任务列表,抓取任务管理",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();

                var pageParams = new Platform.ServiceDefaults.Models.ProTableRequest
                {
                    Current = page,
                    PageSize = pageSize
                };

                var result = await _webScraperService.GetTasksAsync(pageParams, uid, keyword);
                return new
                {
                    items = result.Queryable.ToList(),
                    rowCount = result.RowCount,
                    currentPage = result.CurrentPage,
                    pageSize = result.PageSize,
                    pageCount = result.PageCount
                };
            });

        RegisterTool("create_scraping_task", "创建网页抓取任务。关键词：创建抓取任务,新增爬虫任务",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务名称" },
                ["url"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "目标URL" },
                ["crawl_depth"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "抓取深度，默认0" },
                ["schedule_cron"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "Cron表达式，用于定时执行" }
            }, ["name", "url"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                var url = args.GetValueOrDefault("url")?.ToString();
                if (string.IsNullOrEmpty(name)) return new { error = "name 必填" };
                if (string.IsNullOrEmpty(url)) return new { error = "url 必填" };

                return await _webScraperService.CreateTaskAsync(new CreateWebScrapingTaskRequest
                {
                    Name = name,
                    TargetUrl = url,
                    CrawlDepth = int.TryParse(args.GetValueOrDefault("crawl_depth")?.ToString(), out var d) ? d : 0,
                    ScheduleCron = args.GetValueOrDefault("schedule_cron")?.ToString()
                }, uid);
            });

        RegisterTool("execute_scraping_task", "执行网页抓取任务。关键词：执行抓取,运行爬虫,开始抓取",
            ObjectSchema(new Dictionary<string, object>
            {
                ["task_id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" }
            }, ["task_id"]),
            async (args, uid) =>
            {
                var taskId = args.GetValueOrDefault("task_id")?.ToString();
                if (string.IsNullOrEmpty(taskId)) return new { error = "task_id 必填" };

                return await _webScraperService.ExecuteTaskAsync(taskId, uid);
            });

        RegisterTool("get_scraping_logs", "获取网页抓取执行日志。关键词：抓取日志,爬虫日志",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["task_id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID筛选" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var taskId = args.GetValueOrDefault("task_id")?.ToString();

                var pageParams = new Platform.ServiceDefaults.Models.ProTableRequest
                {
                    Current = page,
                    PageSize = pageSize
                };

                var result = await _webScraperService.GetLogsAsync(pageParams, uid, taskId);
                return new
                {
                    items = result.Queryable.ToList(),
                    rowCount = result.RowCount,
                    currentPage = result.CurrentPage,
                    pageSize = result.PageSize,
                    pageCount = result.PageCount
                };
            });
    }
}
