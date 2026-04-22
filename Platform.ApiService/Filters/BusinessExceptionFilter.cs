using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ServiceDefaults.Models;
using System.Net;
using System.Linq;

namespace Platform.ApiService.Filters;

/// <summary>
/// 业务异常过滤器 - 自动捕捉业务异常并转换为标准 API 响应
/// </summary>
public class BusinessExceptionFilter : IExceptionFilter
{
    private readonly ILogger<BusinessExceptionFilter> _logger;

    public BusinessExceptionFilter(ILogger<BusinessExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var exception = context.Exception;
        var (code, userMessage) = ExtractErrorCodeAndMessage(exception.Message);

        if (exception is ArgumentException)
        {
            var response = new ApiResponse(
                success: false,
                message: userMessage,
                traceId: context.HttpContext.TraceIdentifier,
                code: code
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is KeyNotFoundException)
        {
            var response = new ApiResponse(
                success: false,
                message: userMessage,
                traceId: context.HttpContext.TraceIdentifier,
                code: code
            );

            context.Result = new NotFoundObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is UnauthorizedAccessException)
        {
            var response = new ApiResponse(
                success: false,
                message: userMessage,
                traceId: context.HttpContext.TraceIdentifier,
                code: code
            );

            context.Result = new UnauthorizedObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is InvalidOperationException)
        {
            var response = new ApiResponse(
                success: false,
                message: userMessage,
                traceId: context.HttpContext.TraceIdentifier,
                code: code
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }

    private static (string? code, string message) ExtractErrorCodeAndMessage(string message)
    {
        if (string.IsNullOrEmpty(message) || !message.Contains(':'))
            return (null, message);

        var colonIndex = message.IndexOf(':');
        if (colonIndex > 0 && colonIndex < 50)
        {
            var prefix = message.Substring(0, colonIndex);
            if (prefix.All(c => char.IsUpper(c) || c == '_' || char.IsDigit(c)))
            {
                var code = message;
                var userMessage = message.Substring(colonIndex + 1);
                if (string.IsNullOrWhiteSpace(userMessage))
                    userMessage = "操作失败";
                return (code, userMessage.Trim());
            }
        }

        return (null, message);
    }


}
