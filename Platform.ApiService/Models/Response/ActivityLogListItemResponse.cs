namespace Platform.ApiService.Models.Response;

/// <summary>
/// 活动日志列表响应（精简版，不包含大字段）
/// </summary>
public class ActivityLogListItemResponse
{
    /// <summary>
    /// 日志ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 操作类型
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 操作描述
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// IP地址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// HTTP请求方法
    /// </summary>
    public string? HttpMethod { get; set; }

    /// <summary>
    /// 请求路径
    /// </summary>
    public string? Path { get; set; }

    /// <summary>
    /// 查询字符串
    /// </summary>
    public string? QueryString { get; set; }

    /// <summary>
    /// 完整URL
    /// </summary>
    public string? FullUrl { get; set; }

    /// <summary>
    /// HTTP状态码
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// 耗时（毫秒）
    /// </summary>
    public long? Duration { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
