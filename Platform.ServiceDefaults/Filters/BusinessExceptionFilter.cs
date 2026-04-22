using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Filters;

/// <summary>
/// 业务异常过滤器 - 将特定异常映射为统一的 HTTP 响应（含标准错误码）
/// 
/// 优先级：
/// 1. 如果异常消息是已知错误码（存在于 ErrorCode.ErrorMessages 字典中），
///    则自动将 errorCode 设为该错误码，message 设为字典中的中文消息
/// 2. 否则按异常类型映射默认的 errorCode 和 HTTP 状态码
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
        var traceId = context.HttpContext.TraceIdentifier;

        // 优先检测：异常消息是否是已知错误码
        // 如果是，使用错误码作为 errorCode，字典中的中文消息作为 message
        if (!string.IsNullOrEmpty(exception.Message) &&
            ErrorCode.ErrorMessages.TryGetValue(exception.Message, out var humanMessage))
        {
            // 根据异常类型确定 HTTP 状态码
            var statusCode = GetStatusCodeForType(exceptionType);

            context.Result = new ObjectResult(new ApiResponse(
                success: false,
                message: humanMessage,
                errorCode: exception.Message,
                traceId: traceId))
            {
                StatusCode = statusCode
            };
            context.ExceptionHandled = true;
            return;
        }

        // 回退到异常类型映射
        for (var type = exceptionType; type != null && type != typeof(Exception); type = type.BaseType)
        {
            if (_exceptionMap.TryGetValue(type, out var mapping))
            {
                context.Result = new ObjectResult(new ApiResponse(
                    success: false,
                    message: exception.Message,
                    errorCode: mapping.ErrorCode,
                    traceId: traceId))
                {
                    StatusCode = mapping.StatusCode
                };
                context.ExceptionHandled = true;
                return;
            }
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }

    /// <summary>
    /// 根据异常类型获取 HTTP 状态码
    /// 遍历继承链查找匹配的映射，找不到则返回 500
    /// </summary>
    private int GetStatusCodeForType(Type exceptionType)
    {
        for (var type = exceptionType; type != null && type != typeof(Exception); type = type.BaseType)
        {
            if (_exceptionMap.TryGetValue(type, out var mapping))
            {
                return mapping.StatusCode;
            }
        }
        return 500;
    }
}