using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 菜单实体（全局系统资源）
/// 菜单不属于任何企业，通过权限控制显示，所有企业共享相同菜单
/// </summary>
public class Menu : BaseEntity, Platform.ServiceDefaults.Models.INamedEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

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
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentId { get; set; }

    /// <summary>
    /// 权限列表
    /// </summary>
    [BsonElement("permissions")]
    public List<string> Permissions { get; set; } = new();

    // 软删除扩展字段
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 创建菜单请求
/// </summary>
public class CreateMenuRequest
{
    [Required(ErrorMessage = "菜单名称不能为空")]
    [StringLength(50, ErrorMessage = "菜单名称长度不能超过50个字符")]
    public string Name { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "菜单标题不能为空")]
    [StringLength(100, ErrorMessage = "菜单标题长度不能超过100个字符")]
    public string Title { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "菜单路径不能为空")]
    [StringLength(200, ErrorMessage = "菜单路径长度不能超过200个字符")]
    public string Path { get; set; } = string.Empty;
    
    [StringLength(200, ErrorMessage = "组件路径长度不能超过200个字符")]
    public string? Component { get; set; }
    
    [StringLength(50, ErrorMessage = "图标名称长度不能超过50个字符")]
    public string? Icon { get; set; }
    
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public bool IsExternal { get; set; } = false;
    public bool OpenInNewTab { get; set; } = false;
    public bool HideInMenu { get; set; } = false;
    public string? ParentId { get; set; }
}

/// <summary>
/// 更新菜单请求
/// </summary>
public class UpdateMenuRequest
{
    [StringLength(50, ErrorMessage = "菜单名称长度不能超过50个字符")]
    public string? Name { get; set; }
    
    [StringLength(100, ErrorMessage = "菜单标题长度不能超过100个字符")]
    public string? Title { get; set; }
    
    [StringLength(200, ErrorMessage = "菜单路径长度不能超过200个字符")]
    public string? Path { get; set; }
    
    [StringLength(200, ErrorMessage = "组件路径长度不能超过200个字符")]
    public string? Component { get; set; }
    
    [StringLength(50, ErrorMessage = "图标名称长度不能超过50个字符")]
    public string? Icon { get; set; }
    
    public int? SortOrder { get; set; }
    public bool? IsEnabled { get; set; }
    public bool? IsExternal { get; set; }
    public bool? OpenInNewTab { get; set; }
    public bool? HideInMenu { get; set; }
    public string? ParentId { get; set; }
}

/// <summary>
/// 菜单树节点
/// </summary>
public class MenuTreeNode
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
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

