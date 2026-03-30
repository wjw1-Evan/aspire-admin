using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 标记多个通知为已读请求
/// </summary>
public class MarkMultipleAsReadRequest
{
    /// <summary>
    /// 通知ID列表
    /// </summary>
    public List<string> Ids { get; set; } = new();
}
