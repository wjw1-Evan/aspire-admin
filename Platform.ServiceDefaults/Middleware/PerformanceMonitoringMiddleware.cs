using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace Platform.ServiceDefaults.Middleware;

/// <summary>
/// 性能监控中间件 - 监控请求性能
/// </summary>
public class PerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMonitoringMiddleware> _logger;
    private static readonly ActivitySource ActivitySource = new("Platform.PerformanceMonitoring");

    public PerformanceMonitoringMiddleware(RequestDelegate next, ILogger<PerformanceMonitoringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var request = context.Request;

        // 设置性能监控标签
        using var activity = ActivitySource.StartActivity("HTTP Request");
        activity?.SetTag("http.method", request.Method);
        activity?.SetTag("http.url", request.Path);
        activity?.SetTag("http.user_agent", request.Headers.UserAgent.ToString());

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var response = context.Response;

            // 设置响应标签
            activity?.SetTag("http.status_code", response.StatusCode);
            activity?.SetTag("http.response_time_ms", stopwatch.ElapsedMilliseconds);

            // 记录性能指标
            LogPerformanceMetrics(request, response, stopwatch.ElapsedMilliseconds);

            // 如果响应时间过长，记录警告
            if (stopwatch.ElapsedMilliseconds > 5000) // 5秒
            {
                _logger.LogWarning("慢请求: {Method} {Path} 耗时 {ElapsedMs}ms",
                    request.Method, request.Path, stopwatch.ElapsedMilliseconds);
            }
        }
    }

    private void LogPerformanceMetrics(HttpRequest request, HttpResponse response, long elapsedMs)
    {
        // 这里可以集成到监控系统，如Prometheus、Application Insights等
        _logger.LogInformation("性能指标: {Method} {Path} -> {StatusCode} 耗时 {ElapsedMs}ms",
            request.Method, request.Path, response.StatusCode, elapsedMs);

        // 可以在这里添加自定义指标收集
        // TODO: 集成监控系统，如Prometheus、Application Insights等
        // _metricsCollector.RecordRequestDuration(request.Path, elapsedMs);
        // _metricsCollector.IncrementRequestCounter(request.Path, response.StatusCode);
    }
}
