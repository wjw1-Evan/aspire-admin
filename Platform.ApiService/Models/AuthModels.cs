using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

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
    /// 标签
    /// </summary>
    [BsonElement("tags")]
    public List<UserTag>? Tags { get; set; }

    /// <summary>
    /// 角色列表
    /// </summary>
    [BsonElement("roles")]
    public List<string> Roles { get; set; } = new();

    /// <summary>
    /// 电话号码
    /// </summary>
    [BsonElement("phone")]
    [System.Text.Json.Serialization.JsonPropertyName("phone")]
    public string? Phone { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    [BsonElement("age")]
    public int? Age { get; set; }

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

    /// <summary>
    /// 所在城市（从最后一次保存的位置信标中获取）
    /// </summary>
    [BsonElement("city")]
    [System.Text.Json.Serialization.JsonPropertyName("city")]
    public string? City { get; set; }

    /// <summary>
    /// 当前企业显示名称
    /// </summary>
    [BsonElement("currentCompanyDisplayName")]
    [System.Text.Json.Serialization.JsonPropertyName("currentCompanyDisplayName")]
    public string? CurrentCompanyDisplayName { get; set; }

    /// <summary>
    /// 当前企业正式名称（作为后备）
    /// </summary>
    [BsonElement("currentCompanyName")]
    [System.Text.Json.Serialization.JsonPropertyName("currentCompanyName")]
    public string? CurrentCompanyName { get; set; }

    /// <summary>
    /// 当前企业Logo
    /// </summary>
    [BsonElement("currentCompanyLogo")]
    [System.Text.Json.Serialization.JsonPropertyName("currentCompanyLogo")]
    public string? CurrentCompanyLogo { get; set; }
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
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "密码长度不符合要求")]
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
/// 用户实体 - 支持多企业登录 (EFCore + MongoDB 兼容)
/// 注意：AppUser 不支持 IMultiTenant，因为它是多企业模型，使用 CurrentCompanyId 进行过滤
/// </summary>
[BsonIgnoreExtraElements]
[Table("appusers")]
public class AppUser : BaseEntity
{
    /// <summary>
    /// 用户名（全局唯一）
    /// </summary>
    [Required]
    [StringLength(50)]
    [Column("username")]
    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称
    /// </summary>
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string? Name { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    [Column("age")]
    [BsonElement("age")]
    public int? Age { get; set; }

    /// <summary>
    /// 密码哈希值
    /// </summary>
    [Required]
    [StringLength(255)]
    [Column("passwordHash")]
    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [EmailAddress]
    [StringLength(255)]
    [Column("email")]
    [BsonElement("email")]
    public string? Email { get; set; }

    /// <summary>
    /// 头像地址
    /// </summary>
    [StringLength(500)]
    [Column("avatar")]
    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    /// <summary>
    /// 手机号码
    /// </summary>
    [Phone]
    [StringLength(20)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 当前选中的企业ID（v3.1新增）
    /// 指向用户当前正在操作的企业上下文。可在切换企业时更新。
    /// 示例：69895113d644cf046d97904a
    /// </summary>
    [StringLength(50)]
    [Column("currentCompanyId")]
    [BsonElement("currentCompanyId")]
    public string? CurrentCompanyId { get; set; }

    /// <summary>
    /// 个人企业ID（注册时自动创建，v3.1新增）
    /// 用户永远拥有的默认“个人空间”企业 ID。当 CurrentCompanyId 丢失时作为最终后备。
    /// ⚠️ 请勿将其与用户自身的 ID (Id) 混淆。
    /// </summary>
    [StringLength(50)]
    [Column("personalCompanyId")]
    [BsonElement("personalCompanyId")]
    public string? PersonalCompanyId { get; set; }

    /// <summary>
    /// 是否活跃
    /// </summary>
    [Column("isActive")]
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最后登录时间
    /// </summary>
    [Column("lastLoginAt")]
    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// 兴趣标签列表
    /// </summary>
    [Column("tags")]
    [BsonElement("tags")]
    public List<UserTag>? Tags { get; set; }



    /// <summary>
    /// 备注
    /// </summary>
    [StringLength(500)]
    [Column("remark")]
    [BsonElement("remark")]
    public string? Remark { get; set; }

    /// <summary>
    /// AI 助手"小科"的角色定义（用户自定义）
    /// </summary>
    [StringLength(2000)]
    [Column("aiRoleDefinition")]
    [BsonElement("aiRoleDefinition")]
    public string? AiRoleDefinition { get; set; }
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
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "密码长度不符合要求")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 手机号码（可选，中国标准：11位数字，符合中国手机号号段规则）
    /// </summary>
    /// <remarks>
    /// 验证规则：如果提供了手机号，必须符合中国手机号标准（11位数字，以1开头，第二位为3-9）
    /// 空字符串或 null 值将被视为未提供手机号，不会触发验证错误
    /// 注意：验证在服务层手动进行，避免 [RegularExpression] 特性对空字符串的验证问题
    /// </remarks>
    public string? PhoneNumber { get; set; }

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
    [StringLength(2000, ErrorMessage = "当前密码长度超限")]
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>
    /// 新密码
    /// </summary>
    [Required(ErrorMessage = "新密码不能为空")]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "新密码长度不符合要求")]
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

/// <summary>
/// 刷新 Token 实体
/// 用于存储和管理刷新令牌，支持 Token 轮换检测和安全撤销
/// </summary>
[BsonIgnoreExtraElements]
public class RefreshToken : BaseEntity
{
    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 当前有效的刷新 Token
    /// </summary>
    [BsonElement("token")]
    [Required]
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// 上一次的刷新 Token（用于轮换检测）
    /// </summary>
    [BsonElement("previousToken")]
    public string? PreviousToken { get; set; }

    /// <summary>
    /// Token 过期时间
    /// </summary>
    [BsonElement("expiresAt")]
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 最后使用时间
    /// </summary>
    [BsonElement("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// 创建时的 IP 地址
    /// </summary>
    [BsonElement("ipAddress")]
    public string? IpAddress { get; set; }

    /// <summary>
    /// 创建时的 User-Agent
    /// </summary>
    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }

    /// <summary>
    /// 是否已被撤销
    /// </summary>
    [BsonElement("isRevoked")]
    public bool IsRevoked { get; set; } = false;

    /// <summary>
    /// 撤销时间
    /// </summary>
    [BsonElement("revokedAt")]
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// 撤销原因
    /// </summary>
    [BsonElement("revokedReason")]
    public string? RevokedReason { get; set; }
}
