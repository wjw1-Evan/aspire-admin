using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 分享列表查询请求
/// </summary>
public class ShareListRequest : Platform.ServiceDefaults.Models.PageParams
{
    /// <summary>分享类型</summary>
    public ShareType? Type { get; set; }

    /// <summary>分享权限</summary>
    public SharePermission? Permission { get; set; }

    /// <summary>是否有效</summary>
    public bool? IsActive { get; set; }

    /// <summary>创建开始时间</summary>
    public DateTime? CreatedAfter { get; set; }

    /// <summary>创建结束时间</summary>
    public DateTime? CreatedBefore { get; set; }

    /// <summary>过期开始时间</summary>
    public DateTime? ExpiresAfter { get; set; }

    /// <summary>过期结束时间</summary>
    public DateTime? ExpiresBefore { get; set; }
}

/// <summary>
/// 批量删除分享请求模型
/// </summary>
public class BatchDeleteSharesRequest
{
    /// <summary>分享ID列表</summary>
    public List<string> Ids { get; set; } = new();
}
