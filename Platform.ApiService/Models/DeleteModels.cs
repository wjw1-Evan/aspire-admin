namespace Platform.ApiService.Models;

/// <summary>
/// 删除请求模型
/// </summary>
public class DeleteRequest
{
    /// <summary>
    /// 删除原因
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// 批量删除请求模型
/// </summary>
public class BulkDeleteRequest
{
    /// <summary>
    /// 要删除的ID列表
    /// </summary>
    public List<string> Ids { get; set; } = new();

    /// <summary>
    /// 删除原因
    /// </summary>
    public string? Reason { get; set; }
}

