using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models;

/// <summary>
/// 企业实体（EFCore + MongoDB 兼容）
/// 修复：使用基础实体类，简化软删除实现
/// </summary>
[BsonIgnoreExtraElements]
[Table("companies")]
public class Company : BaseEntity
{
    /// <summary>
    /// 企业名称
    /// </summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 企业代码（唯一标识）
    /// </summary>
    [Required]
    [StringLength(20)]
    [Column("code")]
    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 系统显示名称 (admin端左上角显示，替换默认的 Aspire Admin Platform)
    /// </summary>
    [StringLength(100)]
    [Column("displayName")]
    [BsonElement("displayName")]
    public string? DisplayName { get; set; }

    /// <summary>
    /// 企业Logo URL
    /// </summary>
    [StringLength(500)]
    [Column("logo")]
    [BsonElement("logo")]
    public string? Logo { get; set; }

    /// <summary>
    /// 企业描述
    /// </summary>
    [StringLength(500)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 所属行业
    /// </summary>
    [StringLength(50)]
    [Column("industry")]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    /// <summary>
    /// 联系人姓名
    /// </summary>
    [StringLength(50)]
    [Column("contactName")]
    [BsonElement("contactName")]
    public string? ContactName { get; set; }

    /// <summary>
    /// 联系人邮箱
    /// </summary>
    [EmailAddress]
    [StringLength(255)]
    [Column("contactEmail")]
    [BsonElement("contactEmail")]
    public string? ContactEmail { get; set; }

    /// <summary>
    /// 联系人电话
    /// </summary>
    [Phone]
    [StringLength(20)]
    [Column("contactPhone")]
    [BsonElement("contactPhone")]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// 是否激活
    /// </summary>
    [Column("isActive")]
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最大用户数
    /// </summary>
    [Range(1, int.MaxValue)]
    [Column("maxUsers")]
    [BsonElement("maxUsers")]
    public int MaxUsers { get; set; } = 100;

    /// <summary>
    /// 过期时间
    /// </summary>
    [Column("expiresAt")]
    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

}

/// <summary>
/// 创建企业请求
/// </summary>
public class CreateCompanyRequest
{
    /// <summary>
    /// 企业名称（2-100个字符）
    /// </summary>
    [Required(ErrorMessage = "企业名称不能为空")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "企业名称长度必须在2-100个字符之间")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 企业代码（可选，如果为空则由系统自动生成）
    /// </summary>
    [StringLength(20, MinimumLength = 3, ErrorMessage = "企业代码长度必须在3-20个字符之间")]
    [RegularExpression("^[a-zA-Z0-9_-]+$", ErrorMessage = "企业代码只能包含字母、数字、下划线和横线")]
    public string? Code { get; set; }

    /// <summary>
    /// 企业描述
    /// </summary>
    [StringLength(500, ErrorMessage = "描述长度不能超过500个字符")]
    public string? Description { get; set; }

    /// <summary>
    /// 所属行业
    /// </summary>
    [StringLength(50, ErrorMessage = "行业长度不能超过50个字符")]
    public string? Industry { get; set; }

    /// <summary>
    /// 联系人姓名
    /// </summary>
    [StringLength(50, ErrorMessage = "联系人长度不能超过50个字符")]
    public string? ContactName { get; set; }

    /// <summary>
    /// 联系人邮箱
    /// </summary>
    [EmailAddress(ErrorMessage = "联系邮箱格式不正确")]
    public string? ContactEmail { get; set; }

    /// <summary>
    /// 联系人电话
    /// </summary>
    [Phone(ErrorMessage = "联系电话格式不正确")]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// 最大用户数（默认100）
    /// </summary>
    public int MaxUsers { get; set; } = 100;
}

/// <summary>
/// 更新企业请求
/// </summary>
public class UpdateCompanyRequest
{
    /// <summary>
    /// 企业名称
    /// </summary>
    [StringLength(100, MinimumLength = 2, ErrorMessage = "企业名称长度必须在2-100个字符之间")]
    public string? Name { get; set; }

    /// <summary>
    /// 企业描述
    /// </summary>
    [StringLength(500, ErrorMessage = "描述长度不能超过500个字符")]
    public string? Description { get; set; }

    /// <summary>
    /// 所属行业
    /// </summary>
    [StringLength(50, ErrorMessage = "行业长度不能超过50个字符")]
    public string? Industry { get; set; }

    /// <summary>
    /// 联系人姓名
    /// </summary>
    [StringLength(50, ErrorMessage = "联系人长度不能超过50个字符")]
    public string? ContactName { get; set; }

    /// <summary>
    /// 联系人邮箱
    /// </summary>
    [EmailAddress(ErrorMessage = "联系邮箱格式不正确")]
    public string? ContactEmail { get; set; }

    /// <summary>
    /// 联系人电话
    /// </summary>
    [Phone(ErrorMessage = "联系电话格式不正确")]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// 企业Logo URL
    /// </summary>
    public string? Logo { get; set; }

    /// <summary>
    /// 系统显示名称
    /// </summary>
    [StringLength(100, ErrorMessage = "显示名称长度不能超过100个字符")]
    public string? DisplayName { get; set; }
}

/// <summary>
/// 企业统计信息
/// </summary>
public class CompanyStatistics
{
    /// <summary>
    /// 总用户数
    /// </summary>
    public int TotalUsers { get; set; }

    /// <summary>
    /// 活跃用户数
    /// </summary>
    public int ActiveUsers { get; set; }

    /// <summary>
    /// 总角色数
    /// </summary>
    public int TotalRoles { get; set; }

    /// <summary>
    /// 总菜单数
    /// </summary>
    public int TotalMenus { get; set; }

    /// <summary>
    /// 最大用户数
    /// </summary>
    public int MaxUsers { get; set; }

    /// <summary>
    /// 剩余用户数
    /// </summary>
    public int RemainingUsers { get; set; }

    /// <summary>
    /// 是否已过期
    /// </summary>
    public bool IsExpired { get; set; }

    /// <summary>
    /// 过期时间
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
}
