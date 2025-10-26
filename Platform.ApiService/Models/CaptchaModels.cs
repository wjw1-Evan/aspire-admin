using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 验证码实体（全局资源，不属于任何企业）
/// 使用 MongoDB TTL 索引自动清理过期验证码
/// v6.1: 使用自定义集合名称确保命名一致性
/// </summary>
[BsonCollectionName("captchas")]
public class Captcha : BaseEntity, ISoftDeletable, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 手机号（用作唯一标识）
    /// </summary>
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    /// <summary>
    /// 验证码
    /// </summary>
    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 过期时间（用于 TTL 索引）
    /// </summary>
    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 是否已使用
    /// </summary>
    [BsonElement("isUsed")]
    public bool IsUsed { get; set; } = false;

    // 软删除扩展字段
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}
