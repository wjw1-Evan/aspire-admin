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
    /// <summary>
    /// 用户ID（MongoDB ObjectId）
    /// </summary>
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

/// <summary>
/// 用户标签
/// </summary>
public class UserTag
{
    /// <summary>
    /// 标签键
    /// </summary>
    [BsonElement("key")]
    public string? Key { get; set; }

    /// <summary>
    /// 标签显示名称
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }
}

/// <summary>
/// 地理信息
/// </summary>
public class GeographicInfo
{
    /// <summary>
    /// 省份信息
    /// </summary>
    [BsonElement("province")]
    public LocationInfo? Province { get; set; }

    /// <summary>
    /// 城市信息
    /// </summary>
    [BsonElement("city")]
    public LocationInfo? City { get; set; }
}

/// <summary>
/// 位置信息
/// </summary>
public class LocationInfo
{
    /// <summary>
    /// 位置显示名称
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }

    /// <summary>
    /// 位置键
    /// </summary>
    [BsonElement("key")]
    public string? Key { get; set; }
}

/// <summary>
/// 登录请求
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// 用户名（v3.1: 全局唯一，不需要企业代码）
    /// </summary>
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-50个字符之间")]
    public string? Username { get; set; }
    
    /// <summary>
    /// 密码
    /// </summary>
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string? Password { get; set; }
    
    /// <summary>
    /// 是否自动登录
    /// </summary>
    public bool AutoLogin { get; set; }
    
    /// <summary>
    /// 登录类型
    /// </summary>
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

/// <summary>
/// 登录结果
/// </summary>
public class LoginResult
{
    /// <summary>
    /// 登录状态
    /// </summary>
    public string? Status { get; set; }
    
    /// <summary>
    /// 登录类型
    /// </summary>
    public string? Type { get; set; }
    
    /// <summary>
    /// 当前权限
    /// </summary>
    public string? CurrentAuthority { get; set; }
    
    /// <summary>
    /// JWT Token
    /// </summary>
    public string? Token { get; set; }
    
    /// <summary>
    /// 刷新 Token
    /// </summary>
    public string? RefreshToken { get; set; }
    
    /// <summary>
    /// Token 过期时间
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 登录数据
/// </summary>
public class LoginData
{
    /// <summary>
    /// 登录类型
    /// </summary>
    public string? Type { get; set; }
    
    /// <summary>
    /// 当前权限
    /// </summary>
    public string? CurrentAuthority { get; set; }
    
    /// <summary>
    /// JWT Token
    /// </summary>
    public string? Token { get; set; }
    
    /// <summary>
    /// 刷新 Token
    /// </summary>
    public string? RefreshToken { get; set; }
    
    /// <summary>
    /// Token 过期时间
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// 分页参数
/// </summary>
public class PageParams
{
    /// <summary>
    /// 当前页码
    /// </summary>
    public int Current { get; set; } = 1;
    
    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// 应用用户实体（多企业模型）
/// v3.1: 用户与企业是多对多关系，通过 UserCompany 中间表管理
/// 注意：AppUser 不支持 IMultiTenant，因为它是多企业模型，使用 CurrentCompanyId 进行过滤
/// </summary>
[BsonIgnoreExtraElements]  // 忽略数据库中存在但模型中不存在的字段（如旧的 role 字段、companyId 字段）
public class AppUser : BaseEntity, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 用户名（全局唯一）
    /// </summary>
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称
    /// </summary>
    [BsonElement("name")]
    public string? Name { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    [BsonElement("age")]
    public int? Age { get; set; }

    /// <summary>
    /// 密码哈希值
    /// </summary>
    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [BsonElement("email")]
    public string? Email { get; set; }

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

    /// <summary>
    /// 是否活跃
    /// </summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最后登录时间
    /// </summary>
    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

}

/// <summary>
/// 用户注册请求
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// 用户名（3-20个字符）
    /// </summary>
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-20个字符之间")]
    public string Username { get; set; } = string.Empty;
    
    /// <summary>
    /// 密码（至少6个字符）
    /// </summary>
    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "密码长度至少6个字符")]
    public string Password { get; set; } = string.Empty;
    
    /// <summary>
    /// 邮箱地址（可选）
    /// </summary>
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

/// <summary>
/// 修改密码请求
/// </summary>
public class ChangePasswordRequest
{
    /// <summary>
    /// 当前密码
    /// </summary>
    [Required(ErrorMessage = "当前密码不能为空")]
    public string CurrentPassword { get; set; } = string.Empty;
    
    /// <summary>
    /// 新密码
    /// </summary>
    [Required(ErrorMessage = "新密码不能为空")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "新密码长度至少6个字符")]
    public string NewPassword { get; set; } = string.Empty;
    
    /// <summary>
    /// 确认密码
    /// </summary>
    [Required(ErrorMessage = "确认密码不能为空")]
    [Compare("NewPassword", ErrorMessage = "新密码和确认密码不一致")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>
/// 刷新 Token 请求
/// </summary>
public class RefreshTokenRequest
{
    /// <summary>
    /// 刷新 Token
    /// </summary>
    [Required(ErrorMessage = "刷新token不能为空")]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// 刷新 Token 结果
/// </summary>
public class RefreshTokenResult
{
    /// <summary>
    /// 状态
    /// </summary>
    public string? Status { get; set; }
    
    /// <summary>
    /// 新的 JWT Token
    /// </summary>
    public string? Token { get; set; }
    
    /// <summary>
    /// 新的刷新 Token
    /// </summary>
    public string? RefreshToken { get; set; }
    
    /// <summary>
    /// Token 过期时间
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
    
    /// <summary>
    /// 错误消息
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 验证验证码请求
/// </summary>
public class VerifyCaptchaRequest
{
    /// <summary>
    /// 手机号
    /// </summary>
    [Required(ErrorMessage = "手机号不能为空")]
    public string Phone { get; set; } = string.Empty;
    
    /// <summary>
    /// 验证码
    /// </summary>
    [Required(ErrorMessage = "验证码不能为空")]
    public string Code { get; set; } = string.Empty;
}
