using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ServiceDefaults.Models;
using System.Net;

namespace Platform.ApiService.Filters;

/// <summary>
/// 服务异常 - 支持自定义 HTTP 状态码
/// </summary>
public class ServiceException : Exception
{
    public int StatusCode { get; }

    public ServiceException(string message, int statusCode = 400)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public ServiceException(string message, int statusCode, Exception innerException)
        : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}

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

        if (exception is ServiceException serviceEx)
        {
            var (_, result) = CreateResponse(serviceEx, context.HttpContext.TraceIdentifier);
            context.Result = result;
            context.ExceptionHandled = true;
            return;
        }

        if (exception is ArgumentException)
        {
            var response = new ApiResponse(
                success: false,
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is KeyNotFoundException)
        {
            var response = new ApiResponse(
                success: false,
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new NotFoundObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is UnauthorizedAccessException)
        {
            var response = new ApiResponse(
                success: false,
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new UnauthorizedObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        if (exception is InvalidOperationException)
        {
            var response = new ApiResponse(
                success: false,
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }

    private (int statusCode, ObjectResult result) CreateResponse(ServiceException ex, string traceId)
    {
        var response = new ApiResponse(
            success: false,
            message: ex.Message,
            traceId: traceId
        );

        var result = ex.StatusCode switch
        {
            401 => new UnauthorizedObjectResult(response),
            403 => new ObjectResult(response) { StatusCode = 403 },
            404 => new NotFoundObjectResult(response),
            500 => new ObjectResult(response) { StatusCode = 500 },
            _ => new BadRequestObjectResult(response)
        };

        return (ex.StatusCode, result);
    }
}
