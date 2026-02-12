using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models;

/// <summary>
/// 角色实体 (EFCore + MongoDB 兼容)
/// </summary>
[BsonIgnoreExtraElements]
[Table("roles")]
public class Role : MultiTenantEntity
{
    /// <summary>
    /// 角色名称（唯一标识）
    /// </summary>
    [Required]
    [StringLength(50)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 角色显示标题
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 角色描述
    /// </summary>
    [StringLength(200)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 关联的菜单ID列表
    /// </summary>
    [Column("menuIds")]
    [BsonElement("menuIds")]
    public List<string> MenuIds { get; set; } = new();

    /// <summary>
    /// 是否激活
    /// </summary>
    [Column("isActive")]
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 创建者用户名
    /// </summary>
    [StringLength(50)]
    [Column("createdByUsername")]
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新者用户名
    /// </summary>
    [StringLength(50)]
    [Column("updatedByUsername")]
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}

/// <summary>
/// 创建角色请求
/// </summary>
public class CreateRoleRequest
{
    /// <summary>
    /// 角色名称（2-50个字符）
    /// </summary>
    [Required(ErrorMessage = "角色名称不能为空")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 角色描述
    /// </summary>
    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
    
    /// <summary>
    /// 关联的菜单ID列表
    /// </summary>
    public List<string> MenuIds { get; set; } = new();
    
    /// <summary>
    /// 是否激活（默认true）
    /// </summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 更新角色请求
/// </summary>
public class UpdateRoleRequest
{
    /// <summary>
    /// 角色名称
    /// </summary>
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string? Name { get; set; }
    
    /// <summary>
    /// 角色描述
    /// </summary>
    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
    
    /// <summary>
    /// 关联的菜单ID列表
    /// </summary>
    public List<string>? MenuIds { get; set; }
    
    /// <summary>
    /// 是否激活
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 分配菜单到角色请求
/// </summary>
public class AssignMenusToRoleRequest
{
    /// <summary>
    /// 菜单ID列表
    /// </summary>
    public List<string> MenuIds { get; set; } = new();
}

/// <summary>
/// 角色列表响应
/// </summary>
public class RoleListResponse
{
    /// <summary>
    /// 角色列表
    /// </summary>
    public List<Role> Roles { get; set; } = new();
    
    /// <summary>
    /// 总记录数
    /// </summary>
    public int Total { get; set; }
}

/// <summary>
/// 带统计信息的角色
/// </summary>
public class RoleWithStats
{
    /// <summary>
    /// 角色ID
    /// </summary>
    public string? Id { get; set; }
    
    /// <summary>
    /// 角色名称
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 角色描述
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// 关联的菜单ID列表
    /// </summary>
    public List<string> MenuIds { get; set; } = new();
    
    /// <summary>
    /// 是否激活
    /// </summary>
    public bool IsActive { get; set; }
    
    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// 使用此角色的用户数量
    /// </summary>
    public int UserCount { get; set; }
    
    /// <summary>
    /// 菜单数量
    /// </summary>
    public int MenuCount { get; set; }
}

/// <summary>
/// 带统计信息的角色列表响应
/// </summary>
public class RoleListWithStatsResponse
{
    /// <summary>
    /// 角色列表（包含统计信息）
    /// </summary>
    public List<RoleWithStats> Roles { get; set; } = new();
    
    /// <summary>
    /// 总记录数
    /// </summary>
    public int Total { get; set; }
}

