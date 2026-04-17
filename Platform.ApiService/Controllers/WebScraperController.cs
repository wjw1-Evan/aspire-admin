using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/web-scraper")]
[RequireMenu("web-scraper")]
public class WebScraperController : BaseApiController
{
    private readonly IWebScraperService _webScraperService;
    private readonly ILogger<WebScraperController> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly Platform.ApiService.Services.ITaskLauncher _taskLauncher;

    public WebScraperController(
        IWebScraperService webScraperService,
        ILogger<WebScraperController> logger,
        IServiceProvider serviceProvider,
        Platform.ApiService.Services.ITaskLauncher taskLauncher)
    {
        _webScraperService = webScraperService ?? throw new ArgumentNullException(nameof(webScraperService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _taskLauncher = taskLauncher ?? throw new ArgumentNullException(nameof(taskLauncher));
    }

    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask([FromBody] CreateWebScrapingTaskRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("任务名称不能为空");
        if (string.IsNullOrEmpty(request.TargetUrl))
            throw new ArgumentException("目标URL不能为空");

        var task = await _webScraperService.CreateTaskAsync(request, RequiredUserId);
        return Success(task);
    }

    [HttpGet("tasks")]
    [RequireMenu("web-scraper")]
    public async Task<IActionResult> GetTasks(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request,
        [FromQuery] string? keyword = null,
        [FromQuery] ScrapingStatus? status = null)
    {
        var result = await _webScraperService.GetTasksAsync(request, RequiredUserId, keyword, status);
        return Success(result);
    }

    [HttpGet("tasks/{id}")]
    public async Task<IActionResult> GetTask(string id)
    {
        var task = await _webScraperService.GetTaskByIdAsync(id, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    [HttpPut("tasks/{id}")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateWebScrapingTaskRequest request)
    {
        var task = await _webScraperService.UpdateTaskAsync(id, request, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    [HttpDelete("tasks/{id}")]
    public async Task<IActionResult> DeleteTask(string id)
    {
        var result = await _webScraperService.DeleteTaskAsync(id, RequiredUserId);
        if (!result)
            throw new ArgumentException("任务不存在");

        return Success(new { message = "删除成功" });
    }

    [HttpPost("tasks/{id}/toggle")]
    public async Task<IActionResult> ToggleTask(string id)
    {
        var task = await _webScraperService.ToggleTaskEnabledAsync(id, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    [HttpPost("execute/{id}")]
    public IActionResult ExecuteTask(string id)
    {
        // 以 TaskLauncher 统一启动执行，异步返回前端反馈
        _taskLauncher.LaunchAsync(id, RequiredUserId);
        return Success(new { message = "抓取任务已启动，请稍候查看结果" });
    }

    [HttpPost("tasks/{id}/stop")]
    public async Task<IActionResult> StopTask(string id)
    {
        var result = await _webScraperService.StopTaskAsync(id, RequiredUserId);
        if (!result)
            throw new ArgumentException("任务未在运行或不存在");

        return Success(new { message = "任务已停止" });
    }

    [HttpPost("execute-quick")]
    public async Task<IActionResult> ExecuteQuickScrape([FromBody] QuickScrapeRequest request)
    {
        if (string.IsNullOrEmpty(request.Url))
            throw new ArgumentException("URL不能为空");

        var result = await _webScraperService.ExecuteQuickScrapeAsync(request, RequiredUserId);
        return Success(result);
    }

    [HttpGet("preview")]
    public async Task<IActionResult> PreviewScrape(
        [FromQuery] string url,
        [FromQuery] string? titleSelector = null,
        [FromQuery] string? contentSelector = null,
        [FromQuery] int crawlDepth = 0,
        [FromQuery] int maxPagesPerLevel = 10)
    {
        if (string.IsNullOrEmpty(url))
            throw new ArgumentException("URL不能为空");

        var request = new ScrapePreviewRequest
        {
            Url = url,
            TitleSelector = titleSelector,
            ContentSelector = contentSelector,
            CrawlDepth = crawlDepth,
            MaxPagesPerLevel = maxPagesPerLevel
        };

        var result = await _webScraperService.PreviewScrapeAsync(request, RequiredUserId);
        return Success(result);
    }

    [HttpGet("logs")]
    [RequireMenu("web-scraper")]
    public async Task<IActionResult> GetLogs(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request,
        [FromQuery] string? taskId = null)
    {
        var result = await _webScraperService.GetLogsAsync(request, RequiredUserId, taskId);
        return Success(result);
    }

    [HttpGet("logs/{id}")]
    public async Task<IActionResult> GetLog(string id)
    {
        var log = await _webScraperService.GetLogByIdAsync(id, RequiredUserId);
        if (log == null)
            throw new ArgumentException("日志不存在");

        return Success(log);
    }

    [HttpGet("results")]
    [RequireMenu("web-scraper")]
    public async Task<IActionResult> GetResults(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request,
        [FromQuery] string? taskId = null,
        [FromQuery] string? logId = null)
    {
        var result = await _webScraperService.GetResultsAsync(request, RequiredUserId, taskId, logId);
        return Success(result);
    }

    [HttpGet("results/{id}")]
    public async Task<IActionResult> GetResult(string id)
    {
        var result = await _webScraperService.GetResultByIdAsync(id, RequiredUserId);
        if (result == null)
            throw new ArgumentException("结果不存在");

        return Success(result);
    }
}
