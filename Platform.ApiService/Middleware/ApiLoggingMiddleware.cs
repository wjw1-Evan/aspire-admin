using System.Diagnostics;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Middleware;

/// <summary>
/// API 日志中间件 - 同时记录到数据库和日志
/// </summary>
public class ApiLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiLoggingMiddleware> _logger;

    private static readonly string[] ExcludedPaths =
    {
        "/health",
        "/api/openapi",
        "/scalar/",
        "/metrics",
        "/_framework/",
        "/favicon.ico",
        "/api/chat/sse",
        "/chat/sse"
    };

    public ApiLoggingMiddleware(RequestDelegate next, ILogger<ApiLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, IUserActivityLogService logService)
    {
        var stopwatch = Stopwatch.StartNew();
        var requestTime = DateTime.UtcNow;
        var traceId = context.TraceIdentifier;
        string? requestBody = null;

        // 读取请求体（仅对小请求读取）
        if (context.Request.ContentLength > 0 && context.Request.ContentLength < 1024 * 10)
        {
            context.Request.EnableBuffering();
            using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
            requestBody = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
        }

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 500;
            _logger.LogError(ex, "ApiLoggingMiddleware: 请求处理异常");
            throw;
        }
        finally
        {
            stopwatch.Stop();

            var userId = context.User?.FindFirst("userId")?.Value
                ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? context.User?.FindFirst("sub")?.Value
                ?? "Anonymous";
            var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

            // 1. 输出到控制台（运维监控）
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

            // 2. 保存到数据库（业务审计）
            if (!ShouldExclude(context.Request.Path))
            {
                try
                {
                    var log = new LogHttpRequestRequest
                    {
                        CreatedBy = userId == "Anonymous" ? null : userId,
                        CompanyId = await tenantContext.GetCurrentCompanyIdAsync(),
                        HttpMethod = context.Request.Method,
                        Path = context.Request.Path.Value ?? string.Empty,
                        QueryString = context.Request.QueryString.Value,
                        Scheme = context.Request.Scheme,
                        Host = context.Request.Host.Value ?? "localhost",
                        StatusCode = context.Response.StatusCode,
                        DurationMs = stopwatch.ElapsedMilliseconds,
                        IpAddress = clientIp,
                        UserAgent = context.Request.Headers["User-Agent"].ToString(),
                        Metadata = new Dictionary<string, object>
                        {
                            ["RequestTime"] = requestTime,
                            ["TraceId"] = traceId,
                            ["RequestBody"] = requestBody ?? string.Empty,
                            ["ContentType"] = context.Request.ContentType ?? string.Empty,
                            ["Accept"] = context.Request.Headers["Accept"].ToString(),
                            ["Referer"] = context.Request.Headers["Referer"].ToString(),
                            ["Origin"] = context.Request.Headers["Origin"].ToString(),
                            ["RequestId"] = context.TraceIdentifier,
                            ["ResponseTime"] = DateTime.UtcNow,
                            ["RequestContentLength"] = context.Request.ContentLength ?? 0,
                            ["ResponseContentLength"] = context.Response.ContentLength ?? 0
                        }
                    };

                    await logService.LogHttpRequestAsync(log);
                }
                catch (Exception logEx)
                {
                    _logger.LogError(logEx, "ApiLoggingMiddleware: 保存日志到数据库失败");
                }
            }
        }
    }

    private bool ShouldExclude(PathString path)
    {
        var pathString = path.Value?.ToLower() ?? string.Empty;
        return ExcludedPaths.Any(excluded => pathString.Contains(excluded.ToLower()));
    }
}

/// <summary>
/// 中间件扩展方法
/// </summary>
public static class ApiLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseApiLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ApiLoggingMiddleware>();
    }
}
