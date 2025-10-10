using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 菜单实体
/// </summary>
public class Menu
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("path")]
    public string Path { get; set; } = string.Empty;

    [BsonElement("component")]
    public string? Component { get; set; }

    [BsonElement("icon")]
    public string? Icon { get; set; }

    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("isExternal")]
    public bool IsExternal { get; set; } = false;

    [BsonElement("openInNewTab")]
    public bool OpenInNewTab { get; set; } = false;

    [BsonElement("hideInMenu")]
    public bool HideInMenu { get; set; } = false;

    [BsonElement("parentId")]
    public string? ParentId { get; set; }

    [BsonElement("permissions")]
    public List<string> Permissions { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 创建菜单请求
/// </summary>
public class CreateMenuRequest
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? Component { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public bool IsExternal { get; set; } = false;
    public bool OpenInNewTab { get; set; } = false;
    public bool HideInMenu { get; set; } = false;
    public string? ParentId { get; set; }
    public List<string> Permissions { get; set; } = new();
}

/// <summary>
/// 更新菜单请求
/// </summary>
public class UpdateMenuRequest
{
    public string? Name { get; set; }
    public string? Path { get; set; }
    public string? Component { get; set; }
    public string? Icon { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsEnabled { get; set; }
    public bool? IsExternal { get; set; }
    public bool? OpenInNewTab { get; set; }
    public bool? HideInMenu { get; set; }
    public string? ParentId { get; set; }
    public List<string>? Permissions { get; set; }
}

/// <summary>
/// 菜单树节点
/// </summary>
public class MenuTreeNode
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? Component { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsExternal { get; set; }
    public bool OpenInNewTab { get; set; }
    public bool HideInMenu { get; set; }
    public string? ParentId { get; set; }
    public List<string> Permissions { get; set; } = new();
    public List<MenuTreeNode> Children { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 菜单排序请求
/// </summary>
public class ReorderMenusRequest
{
    public List<string> MenuIds { get; set; } = new();
    public string? ParentId { get; set; }
}

