using System;
using Platform.ApiService.Models;
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
    private readonly IServiceProvider _serviceProvider;

    // 排除路径列表
    private static readonly string[] ExcludedPaths =
    {
        "/health",
        "/api/openapi",
        "/scalar/",
        "/metrics",
        "/_framework/",
        "/favicon.ico",
        "/api/chat/sse",  // SSE 端点
        "/chat/sse"  // SSE 端点（直接访问）
    };

    /// <summary>
    /// 初始化活动日志中间件
    /// </summary>
    /// <param name="next">下一个中间件委托</param>
    /// <param name="logger">日志记录器</param>
    /// <param name="configuration">配置对象</param>
    /// <param name="serviceProvider">服务提供者</param>
    public ActivityLogMiddleware(
        RequestDelegate next,
        ILogger<ActivityLogMiddleware> logger,
        IConfiguration configuration,
        IServiceProvider serviceProvider)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// 执行中间件逻辑
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    public async Task InvokeAsync(HttpContext context)
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

        // ⚠️ 关键修复：在请求线程中提取所有数据，避免在后台线程访问 HttpContext
        var logData = ExtractLogData(context, stopwatch.ElapsedMilliseconds);
        
        if (logData.HasValue)
        {
            // 异步记录日志（不等待完成，避免阻塞响应）
            // 使用根 ServiceProvider 创建新的 Scope
            _ = Task.Run(async () =>
            {
                try
                {
                    // 创建新的 Scope，确保 Scoped 服务正常工作
                    using var scope = _serviceProvider.CreateScope();
                    var scopedLogService = scope.ServiceProvider.GetRequiredService<IUserActivityLogService>();
                    
                    await LogRequestAsync(logData.Value, scopedLogService);
                }
                catch (OperationCanceledException)
                {
                    // 正常取消，不记录日志
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to log activity for {Path}", logData.Value.path);
                }
            }, context.RequestAborted);
        }
    }

    /// <summary>
    /// 检查是否应该排除此路径
    /// </summary>
    private bool ShouldExclude(PathString path)
    {
        var pathString = path.Value?.ToLower() ?? string.Empty;

        // 检查预定义的排除路径
        if (ExcludedPaths.Any(excludedPath => pathString.StartsWith(excludedPath.ToLower())))
        {
            return true;
        }

        // 检查配置的排除路径
        var configuredExcludedPaths = _configuration.GetSection("ActivityLog:ExcludedPaths").Get<string[]>();
        if (configuredExcludedPaths != null && configuredExcludedPaths.Any(excludedPath => pathString.StartsWith(excludedPath.ToLower())))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// 在请求线程中提取日志数据（避免后台线程访问 HttpContext）
    /// </summary>
    private (string? userId, string? username, string httpMethod, string path, string? queryString, string scheme, string host, int statusCode, long durationMs, string? ipAddress, string? userAgent, string? responseBody)? ExtractLogData(HttpContext context, long durationMs)
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
            return null; // 不记录匿名请求
        }

        // 提取请求信息
        var httpMethod = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;
        var queryString = context.Request.QueryString.Value;

        // 提取 URL 相关信息
        var scheme = context.Request.Scheme; // http 或 https
        var host = context.Request.Host.Value ?? "localhost"; // 包含主机名和端口，例如：localhost:15000

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

        var responseBody = ExtractResponseBody(context);

        return (userId, username, httpMethod, path, queryString, scheme, host, statusCode, durationMs, ipAddress, userAgent, responseBody);
    }

    /// <summary>
    /// 记录请求信息（使用已提取的数据，不访问 HttpContext）
    /// </summary>
    private static async Task LogRequestAsync(
        (string? userId, string? username, string httpMethod, string path, string? queryString, string scheme, string host, int statusCode, long durationMs, string? ipAddress, string? userAgent, string? responseBody) logData,
        IUserActivityLogService logService)
    {
        var (userId, username, httpMethod, path, queryString, scheme, host, statusCode, durationMs, ipAddress, userAgent, responseBody) = logData;

        // 构建请求对象
        var request = new LogHttpRequestRequest
        {
            UserId = userId,
            Username = username,
            HttpMethod = httpMethod,
            Path = path,
            QueryString = queryString,
            Scheme = scheme,
            Host = host,
            StatusCode = statusCode,
            DurationMs = durationMs,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            ResponseBody = responseBody
        };

        // 调用日志服务记录
        await logService.LogHttpRequestAsync(request);
    }

    /// <summary>
    /// 提取响应体，过滤敏感信息（如密码）
    /// </summary>
    private static string? ExtractResponseBody(HttpContext context)
    {
        if (!context.Items.TryGetValue(ResponseFormattingMiddleware.ResponseBodyContextItemKey, out var value))
        {
            return null;
        }

        if (value is not string body || string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        // 🔒 安全修复：过滤密码本相关 API 响应中的敏感信息
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        if (path.Contains("/password-book"))
        {
            // 过滤密码相关字段
            body = FilterSensitiveData(body);
        }

        return body;
    }

    /// <summary>
    /// 过滤响应体中的敏感数据（密码等）
    /// </summary>
    private static string FilterSensitiveData(string body)
    {
        try
        {
            // 使用简单的字符串替换过滤密码字段
            // 注意：这不是完美的解决方案，但对于 JSON 响应通常有效
            var filtered = body;
            
            // 过滤 "password" 字段（不区分大小写）
            // 匹配模式：\"password\"\s*:\s*\"[^\"]*\"
            filtered = System.Text.RegularExpressions.Regex.Replace(
                filtered,
                @"""password""\s*:\s*""[^""]*""",
                @"""password"":""***FILTERED***""",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
            
            // 过滤 "Password" 字段（大写开头）
            filtered = System.Text.RegularExpressions.Regex.Replace(
                filtered,
                @"""Password""\s*:\s*""[^""]*""",
                @"""Password"":""***FILTERED***""",
                System.Text.RegularExpressions.RegexOptions.None
            );

            return filtered;
        }
        catch
        {
            // 如果过滤失败，返回空字符串而不是原始内容（更安全）
            return string.Empty;
        }
    }
}
