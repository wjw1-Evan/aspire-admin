using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 用户与组织架构的隶属关系（多租户隔离）
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("user_organizations")]
public class UserOrganization : MultiTenantEntity
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
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;
    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;
    /// <summary>
    /// 邮箱
    /// </summary>
    public string? Email { get; set; }
    /// <summary>
    /// 组织节点ID
    /// </summary>
    public string OrganizationUnitId { get; set; } = string.Empty;
    /// <summary>
    /// 组织节点名称
    /// </summary>
    public string? OrganizationUnitName { get; set; }
}

/// <summary>
/// 设置用户组织请求
/// </summary>
public class AssignUserOrganizationRequest
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;
    /// <summary>
    /// 组织节点ID
    /// </summary>
    public string OrganizationUnitId { get; set; } = string.Empty;
    /// <summary>
    /// 是否设为主要组织
    /// </summary>
    public bool? IsPrimary { get; set; }
}

/// <summary>
/// 移除用户组织请求
/// </summary>
public class RemoveUserOrganizationRequest
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;
    /// <summary>
    /// 组织节点ID
    /// </summary>
    public string OrganizationUnitId { get; set; } = string.Empty;
}
