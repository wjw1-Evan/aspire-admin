using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 权限实体（简化模型）
/// 修复：使用多租户基础实体类，简化软删除实现
/// </summary>
public class Permission : MultiTenantEntity
{
    [BsonElement("resourceName")]
    public string ResourceName { get; set; } = string.Empty;

    [BsonElement("resourceTitle")]
    public string ResourceTitle { get; set; } = string.Empty;

    [BsonElement("action")]
    public string Action { get; set; } = string.Empty;

    [BsonElement("actionTitle")]
    public string ActionTitle { get; set; } = string.Empty;

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }
}

/// <summary>
/// 创建权限请求
/// </summary>
public class CreatePermissionRequest
{
    [Required(ErrorMessage = "资源名称不能为空")]
    [StringLength(50, ErrorMessage = "资源名称长度不能超过50个字符")]
    public string ResourceName { get; set; } = string.Empty;

    [Required(ErrorMessage = "资源显示名不能为空")]
    [StringLength(50, ErrorMessage = "资源显示名长度不能超过50个字符")]
    public string ResourceTitle { get; set; } = string.Empty;

    [Required(ErrorMessage = "操作类型不能为空")]
    [StringLength(20, ErrorMessage = "操作类型长度不能超过20个字符")]
    public string Action { get; set; } = string.Empty;

    [Required(ErrorMessage = "操作显示名不能为空")]
    [StringLength(20, ErrorMessage = "操作显示名长度不能超过20个字符")]
    public string ActionTitle { get; set; } = string.Empty;

    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
}

/// <summary>
/// 更新权限请求
/// </summary>
public class UpdatePermissionRequest
{
    [StringLength(50, ErrorMessage = "资源名称长度不能超过50个字符")]
    public string? ResourceName { get; set; }

    [StringLength(50, ErrorMessage = "资源显示名长度不能超过50个字符")]
    public string? ResourceTitle { get; set; }

    [StringLength(20, ErrorMessage = "操作类型长度不能超过20个字符")]
    public string? Action { get; set; }

    [StringLength(20, ErrorMessage = "操作显示名长度不能超过20个字符")]
    public string? ActionTitle { get; set; }

    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
}

/// <summary>
/// 检查权限请求
/// </summary>
public class CheckPermissionRequest
{
    [Required(ErrorMessage = "资源名称不能为空")]
    public string Resource { get; set; } = string.Empty;

    [Required(ErrorMessage = "操作类型不能为空")]
    public string Action { get; set; } = string.Empty;
}

/// <summary>
/// 用户权限响应
/// </summary>
public class UserPermissionsResponse
{
    public List<Permission> RolePermissions { get; set; } = new();
    public List<Permission> CustomPermissions { get; set; } = new();
    public List<string> AllPermissionCodes { get; set; } = new();
    public List<string> RoleNames { get; set; } = new();
}

/// <summary>
/// 分配权限请求
/// </summary>
public class AssignPermissionsRequest
{
    public List<string> PermissionIds { get; set; } = new();
}

/// <summary>
/// 权限分组
/// </summary>
public class PermissionGroup
{
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceTitle { get; set; } = string.Empty;
    public List<Permission> Permissions { get; set; } = new();
}

