using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Exceptions;
using System.Net;

namespace Platform.ApiService.Filters;

/// <summary>
/// 业务异常过滤器 - 自动捕捉业务异常并转换为标准 API 响应
/// </summary>
public class BusinessExceptionFilter : IExceptionFilter
{
    private readonly ILogger<BusinessExceptionFilter> _logger;

    /// <summary>
    /// 初始化业务异常过滤器
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public BusinessExceptionFilter(ILogger<BusinessExceptionFilter> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 当 Action 发生未捕获异常时执行
    /// </summary>
    /// <param name="context">异常上下文</param>
    public void OnException(ExceptionContext context)
    {
        var exception = context.Exception;

        // 处理已知的业务异常
        if (exception is BusinessException bizEx)
        {
            var response = new ApiResponse(
                success: false,
                code: bizEx.Code,
                message: bizEx.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new ObjectResult(response)
            {
                StatusCode = bizEx.StatusCode
            };
            context.ExceptionHandled = true;
            return;
        }

        if (exception is ArgumentException || exception is InvalidOperationException)
        {
            var response = new ApiResponse(
                success: false,
                code: "VALIDATION_ERROR",
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new BadRequestObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        // 可以添加更多异常类型处理，例如 UnauthorizedAccessException -> 401
        if (exception is UnauthorizedAccessException)
        {
            var response = new ApiResponse(
                success: false,
                code: "UNAUTHORIZED",
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = new UnauthorizedObjectResult(response);
            context.ExceptionHandled = true;
            return;
        }

        // 其他未处理异常交由全局中间件处理，这里不 mark handled
    }
}
