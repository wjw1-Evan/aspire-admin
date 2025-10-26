using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.DataInitializer.Models;

/// <summary>
/// 菜单模型（与 ApiService 保持一致）
/// v6.1: 统一字段映射，确保序列化一致性
/// </summary>
public class Menu
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

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
    /// 父菜单ID
    /// </summary>
    [BsonElement("parentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ParentId { get; set; }

    /// <summary>
    /// 排序
    /// </summary>
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 权限列表
    /// </summary>
    [BsonElement("permissions")]
    public List<string> Permissions { get; set; } = new();

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 软删除标记
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;
}
