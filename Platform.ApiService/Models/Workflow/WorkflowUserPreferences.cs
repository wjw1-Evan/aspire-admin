using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 用户工作流过滤器偏好
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("user_workflow_filter_preferences")]
public class UserWorkflowFilterPreference : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 偏好名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    [BsonElement("isDefault")]
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 过滤器配置
    /// </summary>
    [BsonElement("filterConfig")]
    public WorkflowFilterConfig FilterConfig { get; set; } = new();

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    // IEntity, ISoftDeletable, ITimestamped 接口实现
    /// <summary>
    /// 是否已软删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 软删除时间（UTC）
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 软删除操作人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 软删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 创建时间（UTC）
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 最近更新时间（UTC）
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 工作流过滤器配置
/// </summary>
public class WorkflowFilterConfig
{
    /// <summary>
    /// 关键词搜索
    /// </summary>
    [BsonElement("keyword")]
    public string? Keyword { get; set; }

    /// <summary>
    /// 类别列表
    /// </summary>
    [BsonElement("categories")]
    public List<string> Categories { get; set; } = new();

    /// <summary>
    /// 状态列表
    /// </summary>
    [BsonElement("statuses")]
    public List<string> Statuses { get; set; } = new();

    /// <summary>
    /// 日期范围过滤
    /// </summary>
    [BsonElement("dateRange")]
    public DateRangeFilter? DateRange { get; set; }

    /// <summary>
    /// 使用次数范围
    /// </summary>
    [BsonElement("usageRange")]
    public UsageRangeFilter? UsageRange { get; set; }

    /// <summary>
    /// 创建者ID列表
    /// </summary>
    [BsonElement("createdBy")]
    public List<string> CreatedBy { get; set; } = new();

    /// <summary>
    /// 排序字段
    /// </summary>
    [BsonElement("sortBy")]
    public string? SortBy { get; set; }

    /// <summary>
    /// 排序方向
    /// </summary>
    [BsonElement("sortOrder")]
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
