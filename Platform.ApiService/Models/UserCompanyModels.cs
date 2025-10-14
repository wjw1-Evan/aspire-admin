using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 用户-企业关联表（多对多关系）
/// v3.1: 支持用户隶属多个企业
/// 修复：使用基础实体类，简化软删除实现
/// </summary>
public class UserCompany : BaseEntity
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
public class CompanyJoinRequest : BaseEntity
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
    public string CompanyId { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

/// <summary>
/// 企业搜索结果
/// </summary>
public class CompanySearchResult
{
    public Company Company { get; set; } = new();
    public bool IsMember { get; set; }
    public bool HasPendingRequest { get; set; }
    public string? MemberStatus { get; set; }
    public int MemberCount { get; set; }
}

/// <summary>
/// 切换企业结果
/// </summary>
public class SwitchCompanyResult
{
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public List<MenuTreeNode> Menus { get; set; } = new();
    public List<string> PermissionCodes { get; set; } = new();
    public string? Token { get; set; }  // 可选的新token
}

/// <summary>
/// 用户所属企业列表项
/// </summary>
public class UserCompanyItem
{
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyCode { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsPersonal { get; set; }
    public DateTime JoinedAt { get; set; }
    public List<string> RoleNames { get; set; } = new();
}

/// <summary>
/// 审核加入申请请求
/// </summary>
public class ReviewJoinRequestRequest
{
    public List<string>? DefaultRoleIds { get; set; }
    public string? RejectReason { get; set; }
}

/// <summary>
/// 加入申请详情（带用户和企业信息）
/// </summary>
public class JoinRequestDetail
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? ReviewedBy { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

