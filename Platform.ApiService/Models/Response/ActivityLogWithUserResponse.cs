namespace Platform.ApiService.Models.Response;

/// <summary>
/// 活动日志响应模型（包含用户信息）
/// </summary>
public class ActivityLogWithUserResponse
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
    /// 用户代理
    /// </summary>
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// HTTP方法
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
    /// HTTP状态码
    /// </summary>
    public int? StatusCode { get; set; }
    
    /// <summary>
    /// 请求耗时（毫秒）
    /// </summary>
    public long? Duration { get; set; }
    
    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
}














































