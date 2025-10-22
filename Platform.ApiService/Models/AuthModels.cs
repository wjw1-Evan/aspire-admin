using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 统一的用户信息模型（前端使用）
/// 修复：统一字段命名，简化权限系统
/// </summary>
public class CurrentUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// <summary>
    /// 用户名（对应 AppUser.Username）
    /// </summary>
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称（对应 AppUser.Name）
    /// </summary>
    [BsonElement("displayName")]
    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string? DisplayName { get; set; }

    /// <summary>
    /// 头像
    /// </summary>
    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    /// <summary>
    /// 邮箱
    /// </summary>
    [BsonElement("email")]
    public string? Email { get; set; }

    /// <summary>
    /// 个人签名
    /// </summary>
    [BsonElement("signature")]
    public string? Signature { get; set; }

    /// <summary>
    /// 职位
    /// </summary>
    [BsonElement("title")]
    public string? Title { get; set; }

    /// <summary>
    /// 组织
    /// </summary>
    [BsonElement("group")]
    public string? Group { get; set; }

    /// <summary>
    /// 标签
    /// </summary>
    [BsonElement("tags")]
    public List<UserTag>? Tags { get; set; }

    /// <summary>
    /// 通知数量
    /// </summary>
    [BsonElement("notifyCount")]
    public int NotifyCount { get; set; }

    /// <summary>
    /// 未读数量
    /// </summary>
    [BsonElement("unreadCount")]
    public int UnreadCount { get; set; }

    /// <summary>
    /// 国家
    /// </summary>
    [BsonElement("country")]
    public string? Country { get; set; }

    /// <summary>
    /// 角色列表
    /// </summary>
    [BsonElement("roles")]
    public List<string> Roles { get; set; } = new();

    /// <summary>
    /// 地理信息
    /// </summary>
    [BsonElement("geographic")]
    public GeographicInfo? Geographic { get; set; }

    /// <summary>
    /// 地址
    /// </summary>
    [BsonElement("address")]
    public string? Address { get; set; }

    /// <summary>
    /// 电话
    /// </summary>
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>
    /// 是否已登录
    /// </summary>
    [BsonElement("isLogin")]
    public bool IsLogin { get; set; } = true;

    /// <summary>
    /// 当前企业ID
    /// </summary>
    [BsonElement("currentCompanyId")]
    public string? CurrentCompanyId { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
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

    /// <summary>
    /// 图形验证码ID
    /// </summary>
    public string? CaptchaId { get; set; }

    /// <summary>
    /// 图形验证码答案
    /// </summary>
    public string? CaptchaAnswer { get; set; }
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

/// <summary>
/// 应用用户实体（多租户模型）
/// 修复：继承 MultiTenantEntity 以支持多企业功能
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如旧的 role 字段）
public class AppUser : MultiTenantEntity, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.ITimestamped
{
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
    /// 角色ID列表（v3.1 后改为 UserCompany.RoleIds）
    /// 保留用于向后兼容和数据迁移，v6.0 仍在使用
    /// </summary>
    [BsonElement("roleIds")]
    [BsonIgnoreIfNull]
    [Obsolete("v3.1: 使用 UserCompany.RoleIds 代替")]
    public List<string>? RoleIds { get; set; }
    
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

    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    // 软删除扩展字段
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

    /// <summary>
    /// 图形验证码ID
    /// </summary>
    public string? CaptchaId { get; set; }

    /// <summary>
    /// 图形验证码答案
    /// </summary>
    public string? CaptchaAnswer { get; set; }
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
