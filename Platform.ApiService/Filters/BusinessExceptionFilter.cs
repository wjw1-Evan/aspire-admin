using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Filters;

public class BusinessExceptionFilter : IExceptionFilter
{
    private readonly ILogger<BusinessExceptionFilter> _logger;
    private static readonly Dictionary<Type, Func<ApiResponse, ObjectResult>> _exceptionMappings = new()
    {
        { typeof(ArgumentException), r => new BadRequestObjectResult(r) },
        { typeof(FormatException), r => new BadRequestObjectResult(r) },
        { typeof(InvalidOperationException), r => new BadRequestObjectResult(r) },
        { typeof(NotImplementedException), r => new ObjectResult(r) { StatusCode = 405 } },
        { typeof(NotSupportedException), r => new ObjectResult(r) { StatusCode = 405 } },
        { typeof(FileNotFoundException), r => new NotFoundObjectResult(r) },
        { typeof(KeyNotFoundException), r => new NotFoundObjectResult(r) },
        { typeof(System.Security.Authentication.AuthenticationException), r => new UnauthorizedObjectResult(r) },
        { typeof(UnauthorizedAccessException), r => new ObjectResult(r) { StatusCode = 403 } },
    };

    public BusinessExceptionFilter(ILogger<BusinessExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var exception = context.Exception;

        if (_exceptionMappings.TryGetValue(exception.GetType(), out var createResult))
        {
            var response = new ApiResponse(
                success: false,
                message: exception.Message,
                traceId: context.HttpContext.TraceIdentifier
            );

            context.Result = createResult(response);
            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }
}