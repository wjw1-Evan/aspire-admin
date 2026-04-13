using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models;

/// <summary>
/// 角色实体 (EFCore + MongoDB 兼容)
/// </summary>
public class Role : MultiTenantEntity
{
    /// <summary>
    /// 角色名称（唯一标识）
    /// </summary>
    [Required]
    [StringLength(50)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 角色显示标题
    /// </summary>
    [Required]
    [StringLength(100)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 角色描述
    /// </summary>
    [StringLength(200)]
    public string? Description { get; set; }

    /// <summary>
    /// 关联的菜单ID列表
    /// </summary>
    public List<string> MenuIds { get; set; } = new();

    /// <summary>
    /// 是否激活
    /// </summary>
    public bool IsActive { get; set; } = true;
}


