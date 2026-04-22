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

    /// <summary>
    /// 异常类型到 HTTP 响应创建器的静态映射表
    /// Key: 异常类型，Value: 创建对应 HTTP 状态码响应 ObjectResult 的委托
    /// </summary>
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

    /// <summary>
    /// 异常类型到 HTTP 状态码的映射关系
    /// 支持派生类匹配（如 ArgumentException 的子类也会匹配）
    /// </summary>
    /// <remarks>
    /// | 异常类型 | HTTP 状态码 | 说明 |
    /// |---------|-----------|------|
    /// | ArgumentException | 400 | 参数校验失败 |
    /// | FormatException | 400 | 格式错误 |
    /// | InvalidOperationException | 400 | 业务规则冲突 |
    /// | NotImplementedException | 405 | 未实现 |
    /// | NotSupportedException | 405 | 不支持 |
    /// | FileNotFoundException | 404 | 资源不存在 |
    /// | KeyNotFoundException | 404 | 记录不存在 |
    /// | AuthenticationException | 401 | 未认证 |
    /// | UnauthorizedAccessException | 403 | 无权限 |
    /// </remarks>

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
            if (_exceptionMappings.TryGetValue(type, out var createResult))
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
        }

        _logger.LogError(exception, "未处理的异常: {Message}", exception.Message);
    }
}