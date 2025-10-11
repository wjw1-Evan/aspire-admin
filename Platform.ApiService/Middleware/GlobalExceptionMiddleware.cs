using Platform.ApiService.Models;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 全局异常处理中间件
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;

        // 记录错误日志
        _logger.LogError(exception,
            "Unhandled exception. TraceId: {TraceId}, Path: {Path}, Method: {Method}",
            traceId,
            context.Request.Path,
            context.Request.Method);

        // 确定状态码和错误信息
        var (statusCode, errorCode, errorMessage, showType) = exception switch
        {
            UnauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "UNAUTHORIZED",
                string.IsNullOrEmpty(exception.Message) ? "未授权访问" : exception.Message,
                2
            ),
            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "NOT_FOUND",
                string.IsNullOrEmpty(exception.Message) ? "资源不存在" : exception.Message,
                2
            ),
            ArgumentNullException => (
                StatusCodes.Status400BadRequest,
                "NULL_ARGUMENT",
                exception.Message,
                2
            ),
            ArgumentException => (
                StatusCodes.Status400BadRequest,
                "INVALID_ARGUMENT",
                exception.Message,
                2
            ),
            InvalidOperationException => (
                StatusCodes.Status400BadRequest,
                "BAD_REQUEST",
                exception.Message,
                2
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR",
                "服务器内部错误",
                2
            )
        };

        // 设置响应
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        // 构建统一的错误响应
        var response = new
        {
            success = false,
            errorCode,
            errorMessage,
            showType,
            traceId,
            timestamp = DateTime.UtcNow,
            path = context.Request.Path.Value
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}

