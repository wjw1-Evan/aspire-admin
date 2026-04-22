using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ServiceDefaults.Models;
using System.Net;

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
        var message = exception.Message;
        var code = exception is BusinessException be ? be.Code : null;

        if (exception is ArgumentException)
        {
            var response = new ApiResponse(
                success: false,
                message: message,
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
                message: message,
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
                message: message,
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
                message: message,
                traceId: context.HttpContext.TraceIdentifier,
                code: code
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }
}
