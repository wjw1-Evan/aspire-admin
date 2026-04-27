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

    /// <summary>
    /// 创建网页抓取任务
    /// </summary>
    /// <param name="request">创建任务请求</param>
    /// <returns>创建的任务信息</returns>
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

    /// <summary>
    /// 分页查询网页抓取任务列表
    /// </summary>
    /// <param name="request">分页请求参数</param>
    /// <param name="keyword">关键词搜索</param>
    /// <param name="status">任务状态筛选</param>
    /// <returns>任务分页列表</returns>
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

    /// <summary>
    /// 获取网页抓取任务详情
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <returns>任务详细信息</returns>
    [HttpGet("tasks/{id}")]
    public async Task<IActionResult> GetTask(string id)
    {
        var task = await _webScraperService.GetTaskByIdAsync(id, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    /// <summary>
    /// 更新网页抓取任务
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <param name="request">更新任务请求</param>
    /// <returns>更新后的任务信息</returns>
    [HttpPut("tasks/{id}")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateWebScrapingTaskRequest request)
    {
        var task = await _webScraperService.UpdateTaskAsync(id, request, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    /// <summary>
    /// 删除网页抓取任务
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <returns>删除结果</returns>
    [HttpDelete("tasks/{id}")]
    public async Task<IActionResult> DeleteTask(string id)
    {
        var result = await _webScraperService.DeleteTaskAsync(id, RequiredUserId);
        if (!result)
            throw new ArgumentException("任务不存在");

        return Success(new { message = "删除成功" });
    }

    /// <summary>
    /// 启用/禁用网页抓取任务
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <returns>更新后的任务信息</returns>
    [HttpPost("tasks/{id}/toggle")]
    public async Task<IActionResult> ToggleTask(string id)
    {
        var task = await _webScraperService.ToggleTaskEnabledAsync(id, RequiredUserId);
        if (task == null)
            throw new ArgumentException("任务不存在");

        return Success(task);
    }

    /// <summary>
    /// 执行网页抓取任务
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <returns>执行结果提示</returns>
    [HttpPost("execute/{id}")]
    public IActionResult ExecuteTask(string id)
    {
        // 以 TaskLauncher 统一启动执行，异步返回前端反馈
        _taskLauncher.LaunchAsync(id, RequiredUserId);
        return Success(new { message = "抓取任务已启动，请稍候查看结果" });
    }

    /// <summary>
    /// 停止正在运行的网页抓取任务
    /// </summary>
    /// <param name="id">任务ID</param>
    /// <returns>停止结果提示</returns>
    [HttpPost("tasks/{id}/stop")]
    public async Task<IActionResult> StopTask(string id)
    {
        var result = await _webScraperService.StopTaskAsync(id, RequiredUserId);
        if (!result)
            throw new ArgumentException("任务未在运行或不存在");

        return Success(new { message = "任务已停止" });
    }

    /// <summary>
    /// 快速抓取网页内容（无需创建任务）
    /// </summary>
    /// <param name="request">快速抓取请求</param>
    /// <returns>抓取结果</returns>
    [HttpPost("execute-quick")]
    public async Task<IActionResult> ExecuteQuickScrape([FromBody] QuickScrapeRequest request)
    {
        if (string.IsNullOrEmpty(request.Url))
            throw new ArgumentException("URL不能为空");

        var result = await _webScraperService.ExecuteQuickScrapeAsync(request, RequiredUserId);
        return Success(result);
    }

    /// <summary>
    /// 预览网页抓取结果
    /// </summary>
    /// <param name="url">目标URL</param>
    /// <param name="titleSelector">标题选择器</param>
    /// <param name="contentSelector">内容选择器</param>
    /// <param name="crawlDepth">爬取深度</param>
    /// <param name="maxPagesPerLevel">每层最大页面数</param>
    /// <returns>预览抓取结果</returns>
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

    /// <summary>
    /// 分页查询网页抓取日志列表
    /// </summary>
    /// <param name="request">分页请求参数</param>
    /// <param name="taskId">任务ID筛选</param>
    /// <returns>日志分页列表</returns>
    [HttpGet("logs")]
    [RequireMenu("web-scraper")]
    public async Task<IActionResult> GetLogs(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request,
        [FromQuery] string? taskId = null)
    {
        var result = await _webScraperService.GetLogsAsync(request, RequiredUserId, taskId);
        return Success(result);
    }

    /// <summary>
    /// 获取网页抓取日志详情
    /// </summary>
    /// <param name="id">日志ID</param>
    /// <returns>日志详细信息</returns>
    [HttpGet("logs/{id}")]
    public async Task<IActionResult> GetLog(string id)
    {
        var log = await _webScraperService.GetLogByIdAsync(id, RequiredUserId);
        if (log == null)
            throw new ArgumentException("日志不存在");

        return Success(log);
    }

    /// <summary>
    /// 分页查询网页抓取结果列表
    /// </summary>
    /// <param name="request">分页请求参数</param>
    /// <param name="taskId">任务ID筛选</param>
    /// <param name="logId">日志ID筛选</param>
    /// <returns>结果分页列表</returns>
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

    /// <summary>
    /// 获取网页抓取结果详情
    /// </summary>
    /// <param name="id">结果ID</param>
    /// <returns>结果详细信息</returns>
    [HttpGet("results/{id}")]
    public async Task<IActionResult> GetResult(string id)
    {
        var result = await _webScraperService.GetResultByIdAsync(id, RequiredUserId);
        if (result == null)
            throw new ArgumentException("结果不存在");

        return Success(result);
    }
}
