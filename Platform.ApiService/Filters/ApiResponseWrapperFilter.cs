using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

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

        // 只处理未被包裹的成功的 ObjectResult
        if (context.Result is ObjectResult objectResult &&
            context.HttpContext.Response.StatusCode >= 200 &&
            context.HttpContext.Response.StatusCode < 300)
        {
            // 检查是否已经包裹过了（避免重复包裹）
            if (objectResult.Value != null)
            {
                var type = objectResult.Value.GetType();
                var isAlreadyWrapped = type.GetProperty("success") != null && type.GetProperty("data") != null;

                if (!isAlreadyWrapped)
                {
                    objectResult.Value = new
                    {
                        success = true,
                        data = objectResult.Value,
                        timestamp = DateTime.UtcNow
                    };
                }
            }
        }

        await next();
    }
}
