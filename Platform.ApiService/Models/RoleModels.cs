using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 角色实体
/// </summary>
public class Role
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("menuIds")]
    public List<string> MenuIds { get; set; } = new();

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 创建角色请求
/// </summary>
public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> MenuIds { get; set; } = new();
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 更新角色请求
/// </summary>
public class UpdateRoleRequest
{
    public string? Name { get; set; }
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

