namespace Platform.ApiService.Models;

/// <summary>
/// 服务评价请求
/// </summary>
public class RateServiceRequest
{
    /// <summary>
    /// 评分 (1-5)
    /// </summary>
    public int Rating { get; set; }

    /// <summary>
    /// 评价反馈
    /// </summary>
    public string? Feedback { get; set; }
}
