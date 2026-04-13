using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models;


/// <summary>
/// 应用用户实体（多企业模型）
/// v3.1: 用户与企业是多对多关系，通过 UserCompany 中间表管理
/// 用户实体 - 支持多企业登录 (EFCore + MongoDB 兼容)
/// 注意：AppUser 不支持 IMultiTenant，因为它是多企业模型，使用 CurrentCompanyId 进行过滤
/// </summary>
public class AppUser : BaseEntity
{
    /// <summary>
    /// 用户名（全局唯一）
    /// </summary>
    [Required]
    [StringLength(50)]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 显示名称
    /// </summary>
    [StringLength(100)]
    public string? Name { get; set; }

    /// <summary>
    /// 年龄
    /// </summary>
    public int? Age { get; set; }

    /// <summary>
    /// 密码哈希值
    /// </summary>
    [Required]
    [StringLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// 邮箱地址
    /// </summary>
    [EmailAddress]
    [StringLength(255)]
    public string? Email { get; set; }

    /// <summary>
    /// 头像地址
    /// </summary>
    [StringLength(500)]
    public string? Avatar { get; set; }

    /// <summary>
    /// 手机号码
    /// </summary>
    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 当前选中的企业ID（v3.1新增）
    /// 指向用户当前正在操作的企业上下文。可在切换企业时更新。
    /// 示例：69895113d644cf046d97904a
    /// </summary>
    [StringLength(50)]
    public string? CurrentCompanyId { get; set; }

    /// <summary>
    /// 个人企业ID（注册时自动创建，v3.1新增）
    /// 用户永远拥有的默认"个人空间"企业 ID。当 CurrentCompanyId 丢失时作为最终后备。
    /// ⚠️ 请勿将其与用户自身的 ID (Id) 混淆。
    /// </summary>
    [StringLength(50)]
    public string? PersonalCompanyId { get; set; }

    /// <summary>
    /// 是否活跃
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最后登录时间
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// 兴趣标签列表
    /// </summary>
    public List<UserTag>? Tags { get; set; }



    /// <summary>
    /// 备注
    /// </summary>
    [StringLength(500)]
    public string? Remark { get; set; }

    /// <summary>
    /// AI 助手"小科"的角色定义（用户自定义）
    /// </summary>
    [StringLength(2000)]
    public string? AiRoleDefinition { get; set; }

    /// <summary>
    /// 欢迎页面布局配置（JSON 格式）
    /// </summary>
    public string? WelcomeLayoutConfig { get; set; }
}



/// <summary>
/// 刷新 Token 实体
/// 用于存储和管理刷新令牌，支持 Token 轮换检测和安全撤销
/// </summary>
public class RefreshToken : BaseEntity
{
    /// <summary>
    /// 用户ID
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 当前有效的刷新 Token
    /// </summary>
    [Required]
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// 上一次的刷新 Token（用于轮换检测）
    /// </summary>
    public string? PreviousToken { get; set; }

    /// <summary>
    /// Token 过期时间
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 最后使用时间
    /// </summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// 创建时的 IP 地址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// 创建时的 User-Agent
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// 是否已被撤销
    /// </summary>
    public bool IsRevoked { get; set; } = false;

    /// <summary>
    /// 撤销时间
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// 撤销原因
    /// </summary>
    public string? RevokedReason { get; set; }
}