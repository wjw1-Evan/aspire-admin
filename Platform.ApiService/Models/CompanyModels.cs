using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 企业实体（简化模型）
/// 修复：使用基础实体类，简化软删除实现
/// </summary>
public class Company : BaseEntity
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("logo")]
    public string? Logo { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("industry")]
    public string? Industry { get; set; }

    [BsonElement("contactName")]
    public string? ContactName { get; set; }

    [BsonElement("contactEmail")]
    public string? ContactEmail { get; set; }

    [BsonElement("contactPhone")]
    public string? ContactPhone { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("maxUsers")]
    public int MaxUsers { get; set; } = 100;

    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 创建企业请求
/// </summary>
public class CreateCompanyRequest
{
    [Required(ErrorMessage = "企业名称不能为空")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "企业名称长度必须在2-100个字符之间")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "企业代码不能为空")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "企业代码长度必须在3-20个字符之间")]
    [RegularExpression("^[a-zA-Z0-9_-]+$", ErrorMessage = "企业代码只能包含字母、数字、下划线和横线")]
    public string Code { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "描述长度不能超过500个字符")]
    public string? Description { get; set; }

    [StringLength(50, ErrorMessage = "行业长度不能超过50个字符")]
    public string? Industry { get; set; }

    [StringLength(50, ErrorMessage = "联系人长度不能超过50个字符")]
    public string? ContactName { get; set; }

    [EmailAddress(ErrorMessage = "联系邮箱格式不正确")]
    public string? ContactEmail { get; set; }

    [Phone(ErrorMessage = "联系电话格式不正确")]
    public string? ContactPhone { get; set; }

    public int MaxUsers { get; set; } = 100;
}

/// <summary>
/// 更新企业请求
/// </summary>
public class UpdateCompanyRequest
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "企业名称长度必须在2-100个字符之间")]
    public string? Name { get; set; }

    [StringLength(500, ErrorMessage = "描述长度不能超过500个字符")]
    public string? Description { get; set; }

    [StringLength(50, ErrorMessage = "行业长度不能超过50个字符")]
    public string? Industry { get; set; }

    [StringLength(50, ErrorMessage = "联系人长度不能超过50个字符")]
    public string? ContactName { get; set; }

    [EmailAddress(ErrorMessage = "联系邮箱格式不正确")]
    public string? ContactEmail { get; set; }

    [Phone(ErrorMessage = "联系电话格式不正确")]
    public string? ContactPhone { get; set; }

    public string? Logo { get; set; }
}

/// <summary>
/// 企业注册请求
/// </summary>
public class RegisterCompanyRequest
{
    [Required(ErrorMessage = "企业名称不能为空")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "企业名称长度必须在2-100个字符之间")]
    public string CompanyName { get; set; } = string.Empty;

    [Required(ErrorMessage = "企业代码不能为空")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "企业代码长度必须在3-20个字符之间")]
    [RegularExpression("^[a-zA-Z0-9_-]+$", ErrorMessage = "企业代码只能包含字母、数字、下划线和横线")]
    public string CompanyCode { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "描述长度不能超过500个字符")]
    public string? CompanyDescription { get; set; }

    [StringLength(50, ErrorMessage = "行业长度不能超过50个字符")]
    public string? Industry { get; set; }

    [Required(ErrorMessage = "管理员用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "管理员用户名长度必须在3-50个字符之间")]
    public string AdminUsername { get; set; } = string.Empty;

    [Required(ErrorMessage = "管理员密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "管理员密码长度至少6个字符")]
    public string AdminPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "管理员邮箱不能为空")]
    [EmailAddress(ErrorMessage = "管理员邮箱格式不正确")]
    public string AdminEmail { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "联系人长度不能超过50个字符")]
    public string? ContactName { get; set; }

    [Phone(ErrorMessage = "联系电话格式不正确")]
    public string? ContactPhone { get; set; }
}

/// <summary>
/// 企业统计信息
/// </summary>
public class CompanyStatistics
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalRoles { get; set; }
    public int TotalMenus { get; set; }
    public int MaxUsers { get; set; }
    public int RemainingUsers { get; set; }
    public bool IsExpired { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 企业注册结果
/// </summary>
public class RegisterCompanyResult
{
    public Company? Company { get; set; }
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

