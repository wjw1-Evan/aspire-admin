using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 菜单实体（全局系统资源）
/// 菜单不属于任何企业，通过权限控制显示，所有企业共享相同菜单
/// v7.0: 统一模型定义，从 ApiService 和 DataInitializer 迁移到 ServiceDefaults
/// </summary>
[BsonCollectionName("menus")]
[BsonIgnoreExtraElements]
public class Menu : BaseEntity
{
    /// <summary>
    /// 菜单名称（全局唯一）
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 菜单标题
    /// </summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 路由路径
    /// </summary>
    [BsonElement("path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// 组件路径
    /// </summary>
    [BsonElement("component")]
    public string? Component { get; set; }

    /// <summary>
    /// 图标
    /// </summary>
    [BsonElement("icon")]
    public string? Icon { get; set; }

    /// <summary>
    /// 排序顺序
    /// </summary>
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 是否为外部链接
    /// </summary>
    [BsonElement("isExternal")]
    public bool IsExternal { get; set; } = false;

    /// <summary>
    /// 是否在新标签页打开
    /// </summary>
    [BsonElement("openInNewTab")]
    public bool OpenInNewTab { get; set; } = false;

    /// <summary>
    /// 是否在菜单中隐藏
    /// </summary>
    [BsonElement("hideInMenu")]
    public bool HideInMenu { get; set; } = false;

    /// <summary>
    /// 父菜单ID
    /// </summary>
    [BsonElement("parentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentId { get; set; }

    /// <summary>
    /// 权限列表（已废弃，保留仅用于数据库兼容）
    /// 权限控制现在基于菜单名称，不再使用此字段
    /// </summary>
    [BsonElement("permissions")]
    [Obsolete("权限控制已改为菜单级别，此字段不再使用")]
    public List<string>? Permissions { get; set; }

}

