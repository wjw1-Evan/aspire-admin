using System.Diagnostics;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;

/// <summary>
/// 活动日志中间件 - 自动记录 API 请求（简化版）
/// </summary>
public class ActivityLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ActivityLogMiddleware> _logger;
    private readonly IConfiguration _configuration;

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

    public ActivityLogMiddleware(
        RequestDelegate next,
        ILogger<ActivityLogMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, IUserActivityLogService logService)
    {
        var enabled = _configuration.GetValue<bool>("ActivityLog:Enabled", true);
        if (!enabled)
        {
            await _next(context);
            return;
        }

        if (ShouldExclude(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 500;
            _logger.LogError(ex, "ActivityLogMiddleware: 请求处理异常");
            throw;
        }
        finally
        {
            stopwatch.Stop();

            try
            {
                var log = new LogHttpRequestRequest
                {
                    CreatedBy = context.User?.FindFirst("userId")?.Value
                        ?? context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? context.User?.FindFirst("sub")?.Value,
                    CompanyId = await tenantContext.GetCurrentCompanyIdAsync(),
                    HttpMethod = context.Request.Method,
                    Path = context.Request.Path.Value ?? string.Empty,
                    QueryString = context.Request.QueryString.Value,
                    Scheme = context.Request.Scheme,
                    Host = context.Request.Host.Value ?? "localhost",
                    StatusCode = context.Response.StatusCode,
                    DurationMs = stopwatch.ElapsedMilliseconds,
                    IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = context.Request.Headers["User-Agent"].ToString(),
                    Metadata = new Dictionary<string, object>()
                };

                await logService.LogHttpRequestAsync(log);
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "ActivityLogMiddleware: 记录日志失败");
            }
        }
    }

    private bool ShouldExclude(PathString path)
    {
        var pathString = path.Value?.ToLower() ?? string.Empty;
        return ExcludedPaths.Any(excluded => pathString.Contains(excluded.ToLower()));
    }
}
