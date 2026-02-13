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
                    // 检查是否包含 success 和 (data 或 errorCode) 字段，不区分大小写
                    var hasSuccess = type.GetProperty("success", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase) != null;
                    var hasData = type.GetProperty("data", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase) != null;
                    var hasErrorCode = type.GetProperty("errorCode", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase) != null;

                    if (!(hasSuccess && (hasData || hasErrorCode)))
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
        }

        await next();
    }
}
