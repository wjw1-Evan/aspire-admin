using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 用户-企业关联表（多对多关系）
/// v3.1: 支持用户隶属多个企业
/// 修复：使用基础实体类，简化软删除实现
/// v6.1: 使用自定义集合名称修复命名规范问题
/// 注意：不实现 IMultiTenant，因为 CompanyId 是业务字段（表示用户所属的企业），不是多租户隔离字段
/// 用户需要能够访问自己所在的所有企业，不应该被当前企业的多租户机制限制
/// </summary>
[BsonCollectionName("user_companies")]
public class UserCompany : BaseEntity, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 用户在该企业的角色列表
    /// </summary>
    [BsonElement("roleIds")]
    public List<string> RoleIds { get; set; } = new();

    /// <summary>
    /// 是否是该企业的管理员
    /// </summary>
    [BsonElement("isAdmin")]
    public bool IsAdmin { get; set; } = false;

    /// <summary>
    /// 成员状态：active, pending, rejected, inactive
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "active";

    /// <summary>
    /// 加入时间
    /// </summary>
    [BsonElement("joinedAt")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 审核人ID（管理员）
    /// </summary>
    [BsonElement("approvedBy")]
    public string? ApprovedBy { get; set; }

    /// <summary>
    /// 审核时间
    /// </summary>
    [BsonElement("approvedAt")]
    public DateTime? ApprovedAt { get; set; }

}

/// <summary>
/// 企业加入申请表（简化模型）
/// 修复：使用基础实体类，简化软删除实现
/// </summary>
public class CompanyJoinRequest : BaseEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 申请人用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 目标企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 申请状态：pending, approved, rejected, cancelled
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "pending";

    /// <summary>
    /// 申请理由
    /// </summary>
    [BsonElement("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// 审核人ID（管理员）
    /// </summary>
    [BsonElement("reviewedBy")]
    public string? ReviewedBy { get; set; }

    /// <summary>
    /// 审核时间
    /// </summary>
    [BsonElement("reviewedAt")]
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// 拒绝原因
    /// </summary>
    [BsonElement("rejectReason")]
    public string? RejectReason { get; set; }

}

/// <summary>
/// 申请加入企业请求
/// </summary>
public class ApplyToJoinCompanyRequest
{
    /// <summary>
    /// 企业ID
    /// </summary>
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 申请理由（可选）
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// 企业搜索结果
/// </summary>
public class CompanySearchResult
{
    /// <summary>
    /// 企业信息
    /// </summary>
    public Company Company { get; set; } = new();

    /// <summary>
    /// 是否为该企业成员
    /// </summary>
    public bool IsMember { get; set; }

    /// <summary>
    /// 是否有待处理的加入申请
    /// </summary>
    public bool HasPendingRequest { get; set; }

    /// <summary>
    /// 成员状态（如果已加入）
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("memberStatus")]
    public string? MemberStatus { get; set; }

    /// <summary>
    /// 企业成员数量
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("memberCount")]
    public int MemberCount { get; set; }

    /// <summary>
    /// 待处理申请的ID（如果有）
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    /// <summary>
    /// 是否是该企业的创建者
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("isCreator")]
    public bool IsCreator { get; set; }

    /// <summary>
    /// 创建人姓名
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("creatorName")]
    public string? CreatorName { get; set; }
}

/// <summary>
/// 切换企业结果
/// </summary>
public class SwitchCompanyResult
{
    /// <summary>
    /// 企业ID
    /// </summary>
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 企业名称
    /// </summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// 该企业的菜单列表
    /// </summary>
    public List<MenuTreeNode> Menus { get; set; } = new();

    /// <summary>
    /// 可选的新 JWT Token（如果需要刷新）
    /// </summary>
    public string? Token { get; set; }
}

/// <summary>
/// 用户所属企业列表项
/// </summary>
public class UserCompanyItem
{
    /// <summary>
    /// 企业ID
    /// </summary>
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 企业名称
    /// </summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// 企业代码
    /// </summary>
    public string CompanyCode { get; set; } = string.Empty;

    /// <summary>
    /// 是否为企业管理员
    /// </summary>
    public bool IsAdmin { get; set; }

    /// <summary>
    /// 是否为当前选中的企业
    /// </summary>
    public bool IsCurrent { get; set; }

    /// <summary>
    /// 是否为个人企业
    /// </summary>
    public bool IsPersonal { get; set; }

    /// <summary>
    /// 加入时间
    /// </summary>
    public DateTime JoinedAt { get; set; }

    /// <summary>
    /// 在该企业的角色名称列表
    /// </summary>
    public List<string> RoleNames { get; set; } = new();
}

/// <summary>
/// 审核加入申请请求
/// </summary>
public class ReviewJoinRequestRequest
{
    /// <summary>
    /// 默认分配的角色ID列表（审核通过时使用）
    /// </summary>
    public List<string>? DefaultRoleIds { get; set; }

    /// <summary>
    /// 拒绝原因（审核拒绝时使用）
    /// </summary>
    public string? RejectReason { get; set; }
}

/// <summary>
/// 加入申请详情（带用户和企业信息）
/// </summary>
public class JoinRequestDetail
{
    /// <summary>
    /// 申请ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 申请人用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 申请人用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 申请人邮箱
    /// </summary>
    public string? UserEmail { get; set; }

    /// <summary>
    /// 目标企业ID
    /// </summary>
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 目标企业名称
    /// </summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// 申请状态：pending, approved, rejected, cancelled
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// 申请理由
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// 审核人ID
    /// </summary>
    public string? ReviewedBy { get; set; }

    /// <summary>
    /// 审核人用户名
    /// </summary>
    public string? ReviewedByName { get; set; }

    /// <summary>
    /// 审核时间
    /// </summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// 拒绝原因
    /// </summary>
    public string? RejectReason { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

