using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 菜单树节点（用于 API 响应）
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

