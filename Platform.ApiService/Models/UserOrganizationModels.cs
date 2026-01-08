using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 用户与组织架构的隶属关系（多租户隔离）
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("user_organizations")]
public class UserOrganization : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 组织节点ID
    /// </summary>
    [BsonElement("organizationUnitId")]
    public string OrganizationUnitId { get; set; } = string.Empty;

    /// <summary>
    /// 是否为主要组织（可选）
    /// </summary>
    [BsonElement("isPrimary")]
    public bool IsPrimary { get; set; } = false;
}

/// <summary>
/// 组织成员项（简化展示）
/// </summary>
public class OrganizationMemberItem
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string OrganizationUnitId { get; set; } = string.Empty;
    public string? OrganizationUnitName { get; set; }
}

/// <summary>
/// 设置用户组织请求
/// </summary>
public class AssignUserOrganizationRequest
{
    public string UserId { get; set; } = string.Empty;
    public string OrganizationUnitId { get; set; } = string.Empty;
    public bool? IsPrimary { get; set; }
}

/// <summary>
/// 移除用户组织请求
/// </summary>
public class RemoveUserOrganizationRequest
{
    public string UserId { get; set; } = string.Empty;
    public string OrganizationUnitId { get; set; } = string.Empty;
}
