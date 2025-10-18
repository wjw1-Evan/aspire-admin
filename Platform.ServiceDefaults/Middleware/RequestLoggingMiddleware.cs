using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Text;

namespace Platform.ServiceDefaults.Middleware;

/// <summary>
/// 请求日志中间件 - 记录所有HTTP请求
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
        var request = context.Request;

        // 记录请求开始
        _logger.LogInformation("请求开始: {Method} {Path} from {RemoteIpAddress}",
            request.Method, request.Path, context.Connection.RemoteIpAddress);

        // 读取请求体（如果需要）
        string? requestBody = null;
        if (request.ContentLength > 0 && request.ContentType?.Contains("application/json") == true)
        {
            request.EnableBuffering();
            requestBody = await ReadRequestBodyAsync(request);
            request.Body.Position = 0;
        }

        // 继续处理请求
        await _next(context);

        stopwatch.Stop();

        // 记录请求完成
        var response = context.Response;
        _logger.LogInformation("请求完成: {Method} {Path} -> {StatusCode} in {ElapsedMs}ms",
            request.Method, request.Path, response.StatusCode, stopwatch.ElapsedMilliseconds);

        // 如果是错误响应，记录详细信息
        if (response.StatusCode >= 400)
        {
            _logger.LogWarning("请求错误: {Method} {Path} -> {StatusCode} in {ElapsedMs}ms, 请求体: {RequestBody}",
                request.Method, request.Path, response.StatusCode, stopwatch.ElapsedMilliseconds, requestBody);
        }
    }

    private static async Task<string?> ReadRequestBodyAsync(HttpRequest request)
    {
        try
        {
            request.Body.Position = 0;
            using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            return body;
        }
        catch
        {
            return null;
        }
    }
}
