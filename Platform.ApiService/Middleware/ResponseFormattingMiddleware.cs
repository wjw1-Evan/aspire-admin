using System;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 响应格式化中间件 - 统一所有 API 响应格式
/// </summary>
public class ResponseFormattingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ResponseFormattingMiddleware> _logger;

    internal const string ResponseBodyContextItemKey = "__FormattedResponseBody";
    /// <summary>
    /// JSON 序列化选项 - 使用 camelCase 命名策略
    /// </summary>
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    static ResponseFormattingMiddleware()
    {
        // 确保输出的枚举值为 camelCase 字符串
        JsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    }

    /// <summary>
    /// 初始化响应格式化中间件
    /// </summary>
    /// <param name="next">下一个中间件委托</param>
    /// <param name="logger">日志记录器</param>
    public ResponseFormattingMiddleware(RequestDelegate next, ILogger<ResponseFormattingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// 执行中间件逻辑
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // 跳过健康检查端点和特殊端点
        if (ShouldSkip(context))
        {
            await _next(context);
            return;
        }

        // 检查是否是流式请求（在调用 _next 之前检查，避免缓冲 SSE 流）
        var isStreamingRequest = context.Request.Query.ContainsKey("stream") &&
                                 context.Request.Query["stream"].ToString().Equals("true", StringComparison.OrdinalIgnoreCase);

        // 如果是流式请求，直接传递，不进行缓冲和格式化
        if (isStreamingRequest)
        {
            await _next(context);
            return;
        }

        // 保存原始响应流
        var originalBodyStream = context.Response.Body;

        using (var responseBody = new MemoryStream())
        {
            // 替换响应流
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                // 检查响应 Content-Type（控制器可能已设置为 text/event-stream）
                // 如果是 SSE 流，直接复制流，不进行格式化
                var contentType = context.Response.ContentType;
                if (!string.IsNullOrEmpty(contentType) && contentType.Contains("text/event-stream", StringComparison.OrdinalIgnoreCase))
                {
                    // SSE 流：直接复制到原始流，不进行格式化
                    responseBody.Seek(0, SeekOrigin.Begin);
                    await responseBody.CopyToAsync(originalBodyStream);
                    return;
                }

                var isJsonResponse = context.Response.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true;
                string? responseBodyText = null;

                if (isJsonResponse)
                {
                    responseBody.Seek(0, SeekOrigin.Begin);
                    responseBodyText = await new StreamReader(responseBody).ReadToEndAsync();

                    // 存储响应体供 ActivityLogMiddleware 使用
                    StoreResponseBody(context, responseBodyText);
                    responseBody.Seek(0, SeekOrigin.Begin);
                }

                // 注意：响应包裹逻辑已迁移到 ApiResponseWrapperFilter (Action Filter)
                // 这里不再进行反序列化和重新序列化，从而大幅提升性能。

                // 复制响应到原始流
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (Exception ex)
            {
                // 如果响应已经开始发送，则无法修改
                if (context.Response.HasStarted)
                {
                    throw;
                }

                // 对于未捕获的异常，在此进行兜底包装并记录
                responseBody.SetLength(0);
                context.Response.StatusCode = 500; // 未捕获异常应视为 500
                context.Response.ContentType = "application/json";

                var errorResponse = new
                {
                    success = false,
                    errorMessage = ex.Message,
                    errorCode = "BUSINESS_ERROR",
                    timestamp = DateTime.UtcNow,
                    traceId = context.TraceIdentifier
                };

                var json = JsonSerializer.Serialize(errorResponse, JsonOptions);
                var bytes = Encoding.UTF8.GetBytes(json);
                context.Response.ContentLength = bytes.Length;

                await responseBody.WriteAsync(bytes);

                // 恢复流位置并复制到原始流
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
        }
    }

    /// <summary>
    /// 检查是否应该跳过响应格式化
    /// </summary>
    private static bool ShouldSkip(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;

        // 跳过健康检查端点
        if (path.Contains("/health") || path.Contains("/healthz"))
        {
            return true;
        }

        // 跳过 Scalar API 文档端点
        if (path.Contains("/scalar"))
        {
            return true;
        }

        // 跳过 OpenAPI 文档端点（.NET 9/10 原生）
        if (path.Contains("/openapi"))
        {
            return true;
        }

        // 跳过 SSE 端点（Server-Sent Events）
        if (path.Contains("/chat/sse") || path.Contains("/api/chat/sse"))
        {
            return true;
        }

        // 跳过文件和图片下载相关的端点（避免缓冲二进制大对象）
        if (path.Contains("/api/avatar/view") ||
            path.Contains("/api/avatar/preview") ||
            path.Contains("/api/files/download") ||
            path.Contains("/api/images"))
        {
            return true;
        }

        // 跳过流式响应（检查查询参数或响应 Content-Type）
        var query = context.Request.Query;
        if (query.ContainsKey("stream") && query["stream"].ToString().Equals("true", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // 如果响应 Content-Type 是 text/event-stream，跳过格式化（SSE 流）
        // 注意：这里需要在 InvokeAsync 中检查，因为 Content-Type 可能在控制器中设置
        // 但我们可以先检查请求路径和查询参数

        return false;
    }

    /// <summary>
    /// 检查响应是否已经是标准格式
    /// </summary>
    private static bool IsAlreadyFormatted(string bodyText)
    {
        try
        {
            // 检查是否包含 success 字段（标准格式）
            return bodyText.Contains("\"success\"") || bodyText.Contains("'success'");
        }
        catch
        {
            return false;
        }
    }

    private static void StoreResponseBody(HttpContext context, string? bodyText)
    {
        if (string.IsNullOrWhiteSpace(bodyText))
        {
            context.Items.Remove(ResponseBodyContextItemKey);
            return;
        }

        context.Items[ResponseBodyContextItemKey] = bodyText;
    }
}

