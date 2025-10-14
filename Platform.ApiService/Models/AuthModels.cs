using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class CurrentUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    [BsonElement("userid")]
    public string? UserId { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("signature")]
    public string? Signature { get; set; }

    [BsonElement("title")]
    public string? Title { get; set; }

    [BsonElement("group")]
    public string? Group { get; set; }

    [BsonElement("tags")]
    public List<UserTag>? Tags { get; set; }

    [BsonElement("notifyCount")]
    public int NotifyCount { get; set; }

    [BsonElement("unreadCount")]
    public int UnreadCount { get; set; }

    [BsonElement("country")]
    public string? Country { get; set; }

    [BsonElement("access")]
    public string? Access { get; set; }

    [BsonElement("geographic")]
    public GeographicInfo? Geographic { get; set; }

    [BsonElement("address")]
    public string? Address { get; set; }

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("isLogin")]
    public bool IsLogin { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserTag
{
    [BsonElement("key")]
    public string? Key { get; set; }

    [BsonElement("label")]
    public string? Label { get; set; }
}

public class GeographicInfo
{
    [BsonElement("province")]
    public LocationInfo? Province { get; set; }

    [BsonElement("city")]
    public LocationInfo? City { get; set; }
}

public class LocationInfo
{
    [BsonElement("label")]
    public string? Label { get; set; }

    [BsonElement("key")]
    public string? Key { get; set; }
}

public class LoginRequest
{
    /// <summary>
    /// 用户名（v3.1: 全局唯一，不需要企业代码）
    /// </summary>
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-50个字符之间")]
    public string? Username { get; set; }
    
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string? Password { get; set; }
    
    public bool AutoLogin { get; set; }
    public string? Type { get; set; }
}

public class LoginResult
{
    public string? Status { get; set; }
    public string? Type { get; set; }
    public string? CurrentAuthority { get; set; }
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 登录数据
/// </summary>
public class LoginData
{
    public string? Type { get; set; }
    public string? CurrentAuthority { get; set; }
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
}


public class PageParams
{
    public int Current { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如旧的 role 字段）
public class AppUser : ISoftDeletable, IEntity, ITimestamped
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("age")]
    public int? Age { get; set; }

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("email")]
    public string? Email { get; set; }

    /// <summary>
    /// 角色ID列表（v3.0 已废弃，v3.1使用 UserCompany.RoleIds）
    /// 保留用于向后兼容和数据迁移
    /// </summary>
    [BsonElement("roleIds")]
    [BsonIgnoreIfNull]
    [Obsolete("v3.1: 使用 UserCompany.RoleIds 代替")]
    public List<string>? RoleIds { get; set; }

    [BsonElement("customPermissionIds")]
    public List<string> CustomPermissionIds { get; set; } = new();

    /// <summary>
    /// 企业ID（v3.0 已废弃，v3.1使用 CurrentCompanyId）
    /// 保留用于向后兼容和数据迁移，但不再使用
    /// </summary>
    [BsonElement("companyId")]
    [BsonIgnoreIfNull]
    [Obsolete("v3.1: 使用 CurrentCompanyId 代替，此字段已废弃")]
    public string? CompanyId { get; set; }
    
    /// <summary>
    /// 当前选中的企业ID（v3.1新增）
    /// </summary>
    [BsonElement("currentCompanyId")]
    public string? CurrentCompanyId { get; set; }
    
    /// <summary>
    /// 个人企业ID（注册时自动创建，v3.1新增）
    /// </summary>
    [BsonElement("personalCompanyId")]
    public string? PersonalCompanyId { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

public class RegisterRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-20个字符之间")]
    public string Username { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string Password { get; set; } = string.Empty;
    
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string? Email { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "当前密码不能为空")]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "新密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "新密码长度至少6个字符")]
    public string NewPassword { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "确认密码不能为空")]
    [Compare("NewPassword", ErrorMessage = "新密码和确认密码不一致")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required(ErrorMessage = "刷新token不能为空")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class RefreshTokenResult
{
    public string? Status { get; set; }
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 验证验证码请求
/// </summary>
public class VerifyCaptchaRequest
{
    [Required(ErrorMessage = "手机号不能为空")]
    public string Phone { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "验证码不能为空")]
    public string Code { get; set; } = string.Empty;
}
