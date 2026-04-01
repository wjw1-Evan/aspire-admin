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
                    var (resourceType, operationType) = AnalyzeOperation(
                        context.Request.Method,
                        context.Request.Path.Value ?? string.Empty);

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
                            ["ResourceType"] = resourceType,
                            ["OperationType"] = operationType,
                            ["IsSuccess"] = context.Response.StatusCode >= 200 && context.Response.StatusCode < 400
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

    private static (string resourceType, string operationType) AnalyzeOperation(string httpMethod, string path)
    {
        var pathLower = path.ToLower();
        
        // 根据路径推断资源类型和操作类型
        return (httpMethod.ToUpper(), pathLower) switch
        {
            // 用户相关
            ("GET", var p) when p.Contains("/api/users") => ("user", p.Contains("/me") ? "get_current_user" : "list_user"),
            ("POST", var p) when p.Contains("/api/users") => ("user", "create_user"),
            ("PUT", var p) when p.Contains("/api/users") => ("user", "update_user"),
            ("DELETE", var p) when p.Contains("/api/users") => ("user", "delete_user"),
            
            // 企业相关
            ("GET", var p) when p.Contains("/api/companies") => ("company", "get_company"),
            ("POST", var p) when p.Contains("/api/companies") => ("company", "create_company"),
            ("PUT", var p) when p.Contains("/api/companies") => ("company", "update_company"),
            ("DELETE", var p) when p.Contains("/api/companies") => ("company", "delete_company"),
            
            // 认证相关
            ("POST", var p) when p.Contains("/api/auth/login") => ("auth", "login"),
            ("POST", var p) when p.Contains("/api/auth/register") => ("auth", "register"),
            ("POST", var p) when p.Contains("/api/auth/logout") => ("auth", "logout"),
            
            // 文件存储相关
            ("GET", var p) when p.Contains("/api/cloud-storage") => ("file", "download_file"),
            ("POST", var p) when p.Contains("/api/cloud-storage") => ("file", "upload_file"),
            ("PUT", var p) when p.Contains("/api/cloud-storage") => ("file", "update_file"),
            ("DELETE", var p) when p.Contains("/api/cloud-storage") => ("file", "delete_file"),
            
            // 流程相关
            ("GET", var p) when p.Contains("/api/workflow") => ("workflow", "query_workflow"),
            ("POST", var p) when p.Contains("/api/workflow") => ("workflow", "create_workflow"),
            ("PUT", var p) when p.Contains("/api/workflow") => ("workflow", "update_workflow"),
            
            // 任务相关
            ("GET", var p) when p.Contains("/api/tasks") => ("task", "get_task"),
            ("POST", var p) when p.Contains("/api/tasks") => ("task", "create_task"),
            ("PUT", var p) when p.Contains("/api/tasks") => ("task", "update_task"),
            ("DELETE", var p) when p.Contains("/api/tasks") => ("task", "delete_task"),
            
            // 通知相关
            ("GET", var p) when p.Contains("/api/notifications") => ("notification", "get_notification"),
            ("POST", var p) when p.Contains("/api/notifications") => ("notification", "send_notification"),
            
            // 默认
            _ => ("unknown", "unknown")
        };
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
