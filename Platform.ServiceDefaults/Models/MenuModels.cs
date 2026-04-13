using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 菜单实体（全局系统资源）
/// 菜单不属于任何企业，通过权限控制显示，所有企业共享相同菜单
/// v7.0: 统一模型定义，从 ApiService 和 DataInitializer 迁移到 ServiceDefaults
/// </summary>
[BsonIgnoreExtraElements]
public class Menu : BaseEntity
{
    /// <summary>
    /// 菜单名称（全局唯一）
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 菜单标题
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 路由路径
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// 组件路径
    /// </summary>
    public string? Component { get; set; }

    /// <summary>
    /// 图标
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// 排序顺序
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 是否为外部链接
    /// </summary>
    public bool IsExternal { get; set; } = false;

    /// <summary>
    /// 是否在新标签页打开
    /// </summary>
    public bool OpenInNewTab { get; set; } = false;

    /// <summary>
    /// 是否在菜单中隐藏
    /// </summary>
    public bool HideInMenu { get; set; } = false;

    /// <summary>
    /// 父菜单ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentId { get; set; }
}

