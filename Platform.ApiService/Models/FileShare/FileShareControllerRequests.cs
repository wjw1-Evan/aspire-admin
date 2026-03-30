using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 批量删除分享请求模型
/// </summary>
public class BatchDeleteSharesRequest
{
    /// <summary>分享ID列表</summary>
    public List<string> Ids { get; set; } = [];
}
