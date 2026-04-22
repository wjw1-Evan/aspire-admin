using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Filters;

/// <summary>
/// 业务异常过滤器 - 将特定异常映射为统一的 HTTP 响应
/// 支持 ArgumentException→400、KeyNotFoundException→404、UnauthorizedAccessException→403 等映射
/// </summary>
public class BusinessExceptionFilter : IExceptionFilter
{
    /// <summary>
    /// 日志记录器，用于记录未处理的异常信息
    /// </summary>
    private readonly ILogger<BusinessExceptionFilter> _logger;

    private static readonly Dictionary<Type, int> _statusCodeMap = new()
    {
        { typeof(ArgumentException), 400 },
        { typeof(InvalidOperationException), 400 },
        { typeof(NotImplementedException), 405 },
        { typeof(NotSupportedException), 405 },
        { typeof(IOException), 404 },
        { typeof(KeyNotFoundException), 404 },
        { typeof(System.Security.Authentication.AuthenticationException), 401 },
        { typeof(UnauthorizedAccessException), 403 },
    };

    /// <summary>
    /// 构造 BusinessExceptionFilter 实例
    /// </summary>
    /// <param name="logger">日志记录器，用于输出未处理异常的详细信息</param>
    public BusinessExceptionFilter(ILogger<BusinessExceptionFilter> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 处理 Action/Controller 抛出的异常
    /// 将已映射的异常转换为统一的 API 响应，未映射的异常记录日志
    /// </summary>
    /// <param name="context">异常上下文，包含异常对象和 HTTP 请求信息</param>
    public void OnException(ExceptionContext context)
    {
        var exception = context.Exception;
        var exceptionType = exception.GetType();

        for (var type = exceptionType; type != null && type != typeof(Exception); type = type.BaseType)
        {
            if (_statusCodeMap.TryGetValue(type, out var statusCode))
            {
                context.Result = new ObjectResult(new ApiResponse(success: false, message: exception.Message))
                {
                    StatusCode = statusCode
                };
                context.ExceptionHandled = true;
                return;
            }
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }
}