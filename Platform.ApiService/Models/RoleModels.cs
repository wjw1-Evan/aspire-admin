using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 角色实体
/// </summary>
public class Role : Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.INamedEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("menuIds")]
    public List<string> MenuIds { get; set; } = new();

    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 创建角色请求
/// </summary>
public class CreateRoleRequest
{
    [Required(ErrorMessage = "角色名称不能为空")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
    
    public List<string> MenuIds { get; set; } = new();
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 更新角色请求
/// </summary>
public class UpdateRoleRequest
{
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string? Name { get; set; }
    
    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }
    
    public List<string>? MenuIds { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// 分配菜单到角色请求
/// </summary>
public class AssignMenusToRoleRequest
{
    public List<string> MenuIds { get; set; } = new();
}

/// <summary>
/// 角色列表响应
/// </summary>
public class RoleListResponse
{
    public List<Role> Roles { get; set; } = new();
    public int Total { get; set; }
}

/// <summary>
/// 带统计信息的角色
/// </summary>
public class RoleWithStats
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> MenuIds { get; set; } = new();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // 统计信息
    public int UserCount { get; set; }          // 使用此角色的用户数量
    public int MenuCount { get; set; }          // 菜单数量
}

/// <summary>
/// 带统计信息的角色列表响应
/// </summary>
public class RoleListWithStatsResponse
{
    public List<RoleWithStats> Roles { get; set; } = new();
    public int Total { get; set; }
}

