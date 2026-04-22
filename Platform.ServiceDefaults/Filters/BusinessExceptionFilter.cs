using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Filters;

/// <summary>
/// 业务异常过滤器 - 将特定异常映射为统一的 HTTP 响应（含标准错误码）
/// 支持 ArgumentException→400/VALIDATION_ERROR、KeyNotFoundException→404/RESOURCE_NOT_FOUND 等映射
/// </summary>
public class BusinessExceptionFilter : IExceptionFilter
{
    private readonly ILogger<BusinessExceptionFilter> _logger;

    private static readonly Dictionary<Type, (int StatusCode, string ErrorCode)> _exceptionMap = new()
    {
        { typeof(ArgumentException), (400, ErrorCode.ValidationError) },
        { typeof(InvalidOperationException), (400, ErrorCode.InvalidOperation) },
        { typeof(NotImplementedException), (405, ErrorCode.OperationNotSupported) },
        { typeof(NotSupportedException), (405, ErrorCode.OperationNotSupported) },
        { typeof(IOException), (404, ErrorCode.ResourceNotFound) },
        { typeof(KeyNotFoundException), (404, ErrorCode.ResourceNotFound) },
        { typeof(System.Security.Authentication.AuthenticationException), (401, ErrorCode.Unauthenticated) },
        { typeof(UnauthorizedAccessException), (403, ErrorCode.UnauthorizedAccess) },
    };

    public BusinessExceptionFilter(ILogger<BusinessExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var exception = context.Exception;
        var exceptionType = exception.GetType();

        for (var type = exceptionType; type != null && type != typeof(Exception); type = type.BaseType)
        {
            if (_exceptionMap.TryGetValue(type, out var mapping))
            {
                context.Result = new ObjectResult(new ApiResponse(
                    success: false,
                    message: exception.Message,
                    errorCode: mapping.ErrorCode))
                {
                    StatusCode = mapping.StatusCode
                };
                context.ExceptionHandled = true;
                return;
            }
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }
}