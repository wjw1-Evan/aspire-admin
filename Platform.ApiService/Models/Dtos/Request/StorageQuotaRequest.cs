using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Services;

namespace Platform.ApiService.Models;

/// <summary>
/// 设置配额请求模型
/// </summary>
public class SetQuotaRequest
{
    /// <summary>总配额（字节）</summary>
    public long TotalQuota { get; set; }

    /// <summary>警告阈值（百分比，0-100，可选）</summary>
    [Range(0, 100)]
    public int? WarningThreshold { get; set; }

    /// <summary>是否启用（可选）</summary>
    public bool? IsEnabled { get; set; }
}

/// <summary>
/// 批量设置配额请求模型
/// </summary>
public class BatchSetQuotasRequest
{
    /// <summary>配额设置列表</summary>
    public List<UserQuotaSetting> QuotaSettings { get; set; } = [];
}

/// <summary>
/// 更新存储使用量请求模型
/// </summary>
public class UpdateStorageUsageRequest
{
    /// <summary>大小变化（字节，可为负数）</summary>
    public long SizeChange { get; set; }
}
