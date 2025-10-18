using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;
using System.Net;
using System.Text.Json;

namespace Platform.ServiceDefaults.Middleware;

/// <summary>
/// 全局异常处理器 - 统一处理所有异常
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "发生未处理的异常: {Message}", exception.Message);

        var response = httpContext.Response;
        response.ContentType = "application/json";

        var apiResponse = CreateErrorResponse(exception, httpContext);

        response.StatusCode = apiResponse.StatusCode;

        var jsonResponse = JsonSerializer.Serialize(apiResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await response.WriteAsync(jsonResponse, cancellationToken);
        return true;
    }

    private static (int StatusCode, ApiResponse<object> Response) CreateErrorResponse(Exception exception, HttpContext context)
    {
        return exception switch
        {
            UnauthorizedAccessException => (
                (int)HttpStatusCode.Unauthorized,
                ApiResponse<object>.UnauthorizedResult(exception.Message, context.TraceIdentifier)
            ),
            KeyNotFoundException => (
                (int)HttpStatusCode.NotFound,
                ApiResponse<object>.ErrorResult("NOT_FOUND", exception.Message, context.TraceIdentifier)
            ),
            ArgumentException => (
                (int)HttpStatusCode.BadRequest,
                ApiResponse<object>.ValidationErrorResult(exception.Message, context.TraceIdentifier)
            ),
            InvalidOperationException => (
                (int)HttpStatusCode.BadRequest,
                ApiResponse<object>.ErrorResult("INVALID_OPERATION", exception.Message, context.TraceIdentifier)
            ),
            TimeoutException => (
                (int)HttpStatusCode.RequestTimeout,
                ApiResponse<object>.ErrorResult("TIMEOUT", "请求超时", context.TraceIdentifier)
            ),
            _ => (
                (int)HttpStatusCode.InternalServerError,
                ApiResponse<object>.ErrorResult("INTERNAL_ERROR", "服务器内部错误", context.TraceIdentifier)
            )
        };
    }
}
