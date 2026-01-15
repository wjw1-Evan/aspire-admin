namespace Platform.ApiService.Models.Response;

/// <summary>
/// 活动日志列表响应（精简版，不包含大字段）
/// </summary>
public class ActivityLogListItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? HttpMethod { get; set; }
    public string? Path { get; set; }
    public string? QueryString { get; set; }
    public string? FullUrl { get; set; }
    public int? StatusCode { get; set; }
    public long? Duration { get; set; }
    public DateTime CreatedAt { get; set; }
}
