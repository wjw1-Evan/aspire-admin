namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一的 API 响应格式载体，用于所有 API 接口的标准返回格式封装
/// </summary>
public class ApiResponse(
    bool success,
    string? message = null,
    object? data = default,
    string? traceId = null,
    object? errors = null,
    object? details = null)
{
    /// <summary>
    /// 操作是否成功的标志位
    /// true 表示请求成功（业务逻辑执行成功），false 表示请求失败或出现错误
    /// </summary>
    public bool Success { get; set; } = success;

    /// <summary>
    /// 响应消息，用于向前端传递提示信息（如错误描述、操作结果等）
    /// Success 为 false 时，前端应优先读取此字段显示错误提示
    /// </summary>
    public string? Message { get; set; } = message;

    /// <summary>
    /// 响应数据载荷，承载业务数据（可以是单个对象、数组、PagedResult 分页结果等）
    /// Success 为 true 时，前端通过此字段获取业务数据
    /// </summary>
    public object? Data { get; set; } = data;

    /// <summary>
    /// 错误详情对象，用于传递结构化的错误信息（如 ValidationProblemDetails、多个字段的错误列表）
    /// 通常在 Success 为 false 且需要详细错误信息时使用
    /// </summary>
    public object? Errors { get; set; } = errors;

    /// <summary>
    /// 附加详细信息，用于传递额外的调试信息或辅助数据
    /// 如内部错误码、堆栈信息、额外上下文等
    /// </summary>
    public object? Details { get; set; } = details;

    /// <summary>
    /// 响应生成时间（UTC 时间），格式为 ISO 8601: yyyy-MM-ddTHH:mm:ss.fffZ
    /// 用于前端日志追踪和请求耗时分析
    /// </summary>
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

    /// <summary>
    /// 分布式追踪标识，对应 HTTP 响应头 X-TraceId，用于跨服务请求的问题排查
    /// 在分布式系统中可通过此 ID 串联各服务的日志
    /// </summary>
    public string? TraceId { get; set; } = traceId;
}
