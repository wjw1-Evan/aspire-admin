using Platform.ApiService.Services;
using System.Diagnostics;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 活动日志中间件 - 自动记录所有 API 请求
/// </summary>
public class ActivityLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ActivityLogMiddleware> _logger;
    private readonly IConfiguration _configuration;

    // 排除路径列表
    private static readonly string[] ExcludedPaths =
    {
        "/health",
        "/api/openapi",
        "/scalar/",
        "/metrics",
        "/_framework/",
        "/favicon.ico"
    };

    public ActivityLogMiddleware(
        RequestDelegate next,
        ILogger<ActivityLogMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, IUserActivityLogService logService)
    {
        // 检查是否启用日志记录
        var enabled = _configuration.GetValue<bool>("ActivityLog:Enabled", true);
        if (!enabled)
        {
            await _next(context);
            return;
        }

        // 检查是否需要排除此路径
        if (ShouldExclude(context.Request.Path))
        {
            await _next(context);
            return;
        }

        // 记录请求开始并计时
        var stopwatch = Stopwatch.StartNew();

        // 执行请求
        await _next(context);

        // 停止计时
        stopwatch.Stop();

        // 异步记录日志（不等待完成，避免阻塞响应）
        _ = Task.Run(async () =>
        {
            try
            {
                await LogRequestAsync(context, logService, stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log activity for {Path}", context.Request.Path);
            }
        });
    }

    /// <summary>
    /// 检查是否应该排除此路径
    /// </summary>
    private bool ShouldExclude(PathString path)
    {
        var pathString = path.Value?.ToLower() ?? string.Empty;

        // 检查预定义的排除路径
        foreach (var excludedPath in ExcludedPaths)
        {
            if (pathString.StartsWith(excludedPath.ToLower()))
            {
                return true;
            }
        }

        // 检查配置的排除路径
        var configuredExcludedPaths = _configuration.GetSection("ActivityLog:ExcludedPaths").Get<string[]>();
        if (configuredExcludedPaths != null)
        {
            foreach (var excludedPath in configuredExcludedPaths)
            {
                if (pathString.StartsWith(excludedPath.ToLower()))
                {
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// 记录请求信息
    /// </summary>
    private async Task LogRequestAsync(
        HttpContext context,
        IUserActivityLogService logService,
        long durationMs)
    {
        // 提取用户信息
        string? userId = null;
        string? username = null;

        if (context.User?.Identity?.IsAuthenticated == true)
        {
            userId = context.User.FindFirst("userId")?.Value;
            username = context.User.FindFirst("username")?.Value
                      ?? context.User.FindFirst("name")?.Value
                      ?? context.User.Identity.Name;
        }

        // 检查是否包含匿名用户
        var includeAnonymous = _configuration.GetValue<bool>("ActivityLog:IncludeAnonymous", false);
        if (string.IsNullOrEmpty(userId) && !includeAnonymous)
        {
            return; // 不记录匿名请求
        }

        // 提取请求信息
        var httpMethod = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;
        var queryString = context.Request.QueryString.Value;

        // 限制查询字符串长度
        var maxQueryStringLength = _configuration.GetValue<int>("ActivityLog:MaxQueryStringLength", 500);
        if (!string.IsNullOrEmpty(queryString) && queryString.Length > maxQueryStringLength)
        {
            queryString = queryString.Substring(0, maxQueryStringLength) + "...";
        }

        // 检查是否包含查询字符串
        var includeQueryString = _configuration.GetValue<bool>("ActivityLog:IncludeQueryString", true);
        if (!includeQueryString)
        {
            queryString = null;
        }

        // 提取IP地址
        var ipAddress = context.Connection.RemoteIpAddress?.ToString();

        // 提取User-Agent
        var userAgent = context.Request.Headers["User-Agent"].ToString();

        // 响应状态码
        var statusCode = context.Response.StatusCode;

        // 调用日志服务记录
        await logService.LogHttpRequestAsync(
            userId,
            username,
            httpMethod,
            path,
            queryString,
            statusCode,
            durationMs,
            ipAddress,
            userAgent
        );
    }
}

