using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 图形验证码实体（全局资源，不属于任何企业）
/// 使用 MongoDB TTL 索引自动清理过期验证码
/// v6.1: 使用自定义集合名称修复命名规范问题
/// </summary>
public class CaptchaImage : BaseEntity
{
    /// <summary>
    /// 验证码ID（用作唯一标识）
    /// </summary>
    public string CaptchaId { get; set; } = string.Empty;

    /// <summary>
    /// 验证码答案（加密存储）
    /// </summary>
    public string Answer { get; set; } = string.Empty;

    /// <summary>
    /// 过期时间（用于 TTL 索引）
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 是否已使用
    /// </summary>
    public bool IsUsed { get; set; } = false;

    /// <summary>
    /// 验证码类型（login, register）
    /// </summary>
    public string Type { get; set; } = "login";

    /// <summary>
    /// 客户端IP（用于防刷）
    /// </summary>
    public string? ClientIp { get; set; }

}

