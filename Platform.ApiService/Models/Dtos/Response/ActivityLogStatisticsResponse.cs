namespace Platform.ApiService.Models.Response;

/// <summary>
/// 活动日志统计数据响应
/// </summary>
public class ActivityLogStatisticsResponse
{
    /// <summary>
    /// 总记录数
    /// </summary>
    public long Total { get; set; }

    /// <summary>
    /// 成功记录数 (2xx)
    /// </summary>
    public long SuccessCount { get; set; }

    /// <summary>
    /// 错误记录数 (>= 400)
    /// </summary>
    public long ErrorCount { get; set; }

    /// <summary>
    /// 平均耗时（毫秒）
    /// </summary>
    public double AvgDuration { get; set; }

    /// <summary>
    /// 操作类型统计
    /// </summary>
    public List<ActionTypeStatistic> ActionTypes { get; set; } = new();
}

/// <summary>
/// 操作类型统计
/// </summary>
public class ActionTypeStatistic
{
    /// <summary>
    /// 操作类型
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 数量
    /// </summary>
    public long Count { get; set; }
}
