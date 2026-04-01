using System.Diagnostics;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 请求日志中间件 - 自动记录所有 API 请求
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        await _next(context);
        
        stopwatch.Stop();

        var userId = context.User?.FindFirst("userId")?.Value ?? "Anonymous";
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        _logger.LogInformation(
            "[API] {Method} {Path}{QueryString} {StatusCode} {Elapsed}ms - UserId:{UserId} - IP:{ClientIp}",
            context.Request.Method,
            context.Request.Path,
            context.Request.QueryString,
            context.Response.StatusCode,
            stopwatch.ElapsedMilliseconds,
            userId,
            clientIp
        );
    }
}

/// <summary>
/// 中间件扩展方法
/// </summary>
public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestLoggingMiddleware>();
    }
}
