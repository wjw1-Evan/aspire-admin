using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 用户工作流过滤器偏好
/// </summary>
[BsonIgnoreExtraElements]
public class UserWorkflowFilterPreference : MultiTenantEntity
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 偏好名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 过滤器配置
    /// </summary>
    public WorkflowFilterConfig FilterConfig { get; set; } = new();
}

/// <summary>
/// 工作流过滤器配置
/// </summary>
public class WorkflowFilterConfig
{
    /// <summary>
    /// 关键词搜索
    /// </summary>
    public string? Keyword { get; set; }

    /// <summary>
    /// 类别列表
    /// </summary>
    public List<string> Categories { get; set; } = new();

    /// <summary>
    /// 状态列表
    /// </summary>
    public List<string> Statuses { get; set; } = new();

    /// <summary>
    /// 日期范围过滤
    /// </summary>
    public DateRangeFilter? DateRange { get; set; }

    /// <summary>
    /// 使用次数范围
    /// </summary>
    public UsageRangeFilter? UsageRange { get; set; }

    /// <summary>
    /// 创建者ID列表
    /// </summary>
    public List<string> CreatedBy { get; set; } = new();

    /// <summary>
    /// 排序字段
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 排序方向
    /// </summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 日期范围过滤
/// </summary>
public class DateRangeFilter
{
    /// <summary>
    /// 开始日期
    /// </summary>
    public DateTime? Start { get; set; }

    /// <summary>
    /// 结束日期
    /// </summary>
    public DateTime? End { get; set; }

    /// <summary>
    /// 日期字段（createdAt, updatedAt, lastUsed）
    /// </summary>
    public string? Field { get; set; }
}

/// <summary>
/// 使用次数范围过滤
/// </summary>
public class UsageRangeFilter
{
    /// <summary>
    /// 最小使用次数
    /// </summary>
    public int? Min { get; set; }

    /// <summary>
    /// 最大使用次数
    /// </summary>
    public int? Max { get; set; }
}
