namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 统一的 API 响应格式载体，用于所有 API 接口的标准返回格式封装
/// </summary>
public class ApiResponse(
    bool success,
    string? message = null,
    object? data = default,
    string? errorCode = null,
    string? traceId = null,
    object? errors = null)
{
    /// <summary>
    /// 操作是否成功的标志位
    /// true 表示请求成功（业务逻辑执行成功），false 表示请求失败或出现错误
    /// </summary>
    public bool Success { get; set; } = success;

    /// <summary>
    /// 响应消息，用于向前端传递提示信息（如错误描述、操作结果等）
    /// 前端应优先读取 ErrorCode 进行翻译，此字段作为 fallback 显示
    /// </summary>
    public string? Message { get; set; } = message;

    /// <summary>
    /// 响应数据载荷，承载业务数据（可以是单个对象、数组、PagedResult 分页结果等）
    /// Success 为 true 时，前端通过此字段获取业务数据
    /// </summary>
    public object? Data { get; set; } = data;

    /// <summary>
    /// 标准化错误码，用于前端 i18n 翻译的优先键
    /// 前端应优先根据 ErrorCode 查找翻译文本，找不到时再 fallback 到 Message
    /// Success 为 false 时此字段有值，Success 为 true 时为 null
    /// </summary>
    public string? ErrorCode { get; set; } = errorCode;

    /// <summary>
    /// 错误详情对象，用于传递结构化的验证错误信息（如字段级验证错误）
    /// 格式为 Dictionary&lt;string, string[]&gt;，键为字段名，值为错误消息数组
    /// </summary>
    public object? Errors { get; set; } = errors;

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
