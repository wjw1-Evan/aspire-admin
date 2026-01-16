namespace Platform.ApiService.Models;

/// <summary>
/// 公文统计响应
/// </summary>
public class DocumentStatisticsResponse
{
    /// <summary>
    /// 总公文数
    /// </summary>
    public long TotalDocuments { get; set; }

    /// <summary>
    /// 草稿箱数量
    /// </summary>
    public long DraftCount { get; set; }

    /// <summary>
    /// 待审批数量
    /// </summary>
    public long PendingCount { get; set; }

    /// <summary>
    /// 已审批数量（通过）
    /// </summary>
    public long ApprovedCount { get; set; }

    /// <summary>
    /// 已驳回数量
    /// </summary>
    public long RejectedCount { get; set; }

    /// <summary>
    /// 我发起的数量
    /// </summary>
    public long MyCreatedCount { get; set; }
}
