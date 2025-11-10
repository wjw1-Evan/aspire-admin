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

        // 保存原始响应流
        var originalBodyStream = context.Response.Body;

        using (var responseBody = new MemoryStream())
        {
            // 替换响应流
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                var isJsonResponse = context.Response.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true;
                string? responseBodyText = null;

                if (isJsonResponse)
                {
                    responseBody.Seek(0, SeekOrigin.Begin);
                    responseBodyText = await new StreamReader(responseBody).ReadToEndAsync();

                    StoreResponseBody(context, responseBodyText);
                    responseBody.Seek(0, SeekOrigin.Begin);
                }

                if (context.Response.StatusCode == 200 &&
                    isJsonResponse &&
                    !string.IsNullOrEmpty(responseBodyText) &&
                    !IsAlreadyFormatted(responseBodyText))
                {
                    var wrappedResponse = new
                    {
                        success = true,
                        data = JsonSerializer.Deserialize<object>(responseBodyText, JsonOptions),
                        timestamp = DateTime.UtcNow
                    };

                    responseBodyText = JsonSerializer.Serialize(wrappedResponse, JsonOptions);
                    StoreResponseBody(context, responseBodyText);

                    var bytes = Encoding.UTF8.GetBytes(responseBodyText);
                    context.Response.ContentLength = bytes.Length;

                    responseBody.SetLength(0);
                    await responseBody.WriteAsync(bytes);
                }

                // 复制响应到原始流
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (TaskCanceledException ex)
            {
                // 任务取消是正常的操作（如健康检查超时），不记录为错误
                _logger.LogDebug(ex, "Request was canceled");
                
                // 恢复原始流
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (OperationCanceledException ex)
            {
                // 操作取消也是正常的操作，不记录为错误
                _logger.LogDebug(ex, "Operation was canceled");
                
                // 恢复原始流
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in response formatting middleware");
                
                // 恢复原始流
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
        if (path.StartsWith("/health") || path.StartsWith("/healthz"))
        {
            return true;
        }
        
        // 跳过 Scalar API 文档端点
        if (path.StartsWith("/scalar"))
        {
            return true;
        }
        
        // 跳过 OpenAPI 文档端点（.NET 9 原生）
        if (path.StartsWith("/openapi"))
        {
            return true;
        }
        
        // 跳过 SignalR Hub 相关端点（协商与 WebSocket）
        if (path.StartsWith("/hubs/"))
        {
            return true;
        }
        
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

