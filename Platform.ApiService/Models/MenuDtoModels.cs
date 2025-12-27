using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 菜单树节点（用于 API 响应）
/// </summary>
public class MenuTreeNode
{
    /// <summary>
    /// 菜单ID
    /// </summary>
    public string? Id { get; set; }
    
    /// <summary>
    /// 菜单名称（唯一标识）
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// 菜单显示标题
    /// </summary>
    public string Title { get; set; } = string.Empty;
    
    /// <summary>
    /// 菜单路径
    /// </summary>
    public string Path { get; set; } = string.Empty;
    
    /// <summary>
    /// 组件路径
    /// </summary>
    public string? Component { get; set; }
    
    /// <summary>
    /// 图标名称
    /// </summary>
    public string? Icon { get; set; }
    
    /// <summary>
    /// 排序顺序
    /// </summary>
    public int SortOrder { get; set; }
    
    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; }
    
    /// <summary>
    /// 是否外部链接
    /// </summary>
    public bool IsExternal { get; set; }
    
    /// <summary>
    /// 是否在新标签页打开
    /// </summary>
    public bool OpenInNewTab { get; set; }
    
    /// <summary>
    /// 是否在菜单中隐藏
    /// </summary>
    public bool HideInMenu { get; set; }
    
    /// <summary>
    /// 父菜单ID
    /// </summary>
    public string? ParentId { get; set; }
    
    /// <summary>
    /// 所需权限列表（已废弃，权限控制现在基于菜单名称）
    /// </summary>
    [Obsolete("权限控制已改为菜单级别，此字段不再使用")]
    public List<string>? Permissions { get; set; }
    
    /// <summary>
    /// 子菜单列表
    /// </summary>
    public List<MenuTreeNode> Children { get; set; } = new();
    
    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

