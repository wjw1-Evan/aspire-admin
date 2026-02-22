using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Collections.Concurrent;
using System.Reflection;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Filters;

/// <summary>
/// 全局响应包裹过滤器 - 统一成功响应格式
/// 相比于中间件拦截流的方式，ActionFilter 在对象序列化之前拦截，
/// 避免了 "对象 -> JSON -> 字符串 -> 对象 -> JSON" 的重复开销。
/// </summary>
public class ApiResponseWrapperFilter : IAsyncResultFilter
{
    // 定义排除路径列表（与中间件保持一致）
    private static readonly string[] ExcludedPaths =
    {
        "/health",
        "/api/openapi",
        "/scalar/",
        "/metrics",
        "/_framework/",
        "/favicon.ico",
        "/chat/sse",
        "/api/chat/sse"
    };

    // 缓存类型的反射结果：Key 是对象的 Type，Value 是该类型是否包含了 success/data/code 字段
    private static readonly ConcurrentDictionary<Type, bool> _typeFormatCache = new();

    /// <summary>
    /// 在结果执行时拦截并包裹成功响应
    /// </summary>
    /// <param name="context">结果执行上下文</param>
    /// <param name="next">执行委托</param>
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        var path = context.HttpContext.Request.Path.Value?.ToLower() ?? string.Empty;

        // 检查是否在排除列表中
        if (ExcludedPaths.Any(p => path.Contains(p)))
        {
            await next();
            return;
        }

        // 检查是否是流式请求（SSE 等）
        if (context.HttpContext.Request.Query.ContainsKey("stream") &&
            context.HttpContext.Request.Query["stream"].ToString().Equals("true", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }

        // 只处理 ObjectResult
        if (context.Result is ObjectResult objectResult)
        {
            // 获取状态码（优先从结果对象获取，因为此时 Response.StatusCode 映射可能还没更新）
            var statusCode = objectResult.StatusCode ?? context.HttpContext.Response.StatusCode;

            // 只处理成功的 ObjectResult (2xx)
            if (statusCode >= 200 && statusCode < 300)
            {
                // 检查是否已经包裹过了（避免重复包裹）
                if (objectResult.Value != null)
                {
                    var type = objectResult.Value.GetType();

                    // 使用缓存避免每次都进行昂贵的反射查询
                    var isAlreadyFormatted = _typeFormatCache.GetOrAdd(type, t =>
                    {
                        var hasSuccess = t.GetProperty("success", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase) != null;
                        var hasData = t.GetProperty("data", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase) != null;
                        var hasCode = t.GetProperty("code", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase) != null;

                        return hasSuccess && (hasData || hasCode);
                    });

                    if (!isAlreadyFormatted)
                    {
                        // 使用 ApiResponse 来统一返回成功结构
                        objectResult.Value = new ApiResponse(
                            success: true,
                            code: "OK",
                            message: "操作成功",
                            data: objectResult.Value,
                            traceId: context.HttpContext.TraceIdentifier
                        );
                    }
                }
            }
        }

        await next();
    }
}
