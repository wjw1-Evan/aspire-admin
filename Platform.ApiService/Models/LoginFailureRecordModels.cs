using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 登录/注册失败记录实体（全局资源，不属于任何企业）
/// 用于记录用户登录或注册失败次数，失败后要求验证码
/// 使用 MongoDB TTL 索引自动清理过期记录
/// </summary>
[BsonCollectionName("login_failure_records")]
public class LoginFailureRecord : BaseEntity, ISoftDeletable, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 客户端标识（用户名或IP地址）
    /// </summary>
    [BsonElement("clientId")]
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// 失败类型（login 或 register）
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = "login";

    /// <summary>
    /// 失败次数
    /// </summary>
    [BsonElement("failureCount")]
    public int FailureCount { get; set; } = 1;

    /// <summary>
    /// 过期时间（用于 TTL 索引，30分钟后过期）
    /// </summary>
    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 最后失败时间
    /// </summary>
    [BsonElement("lastFailureAt")]
    public DateTime LastFailureAt { get; set; } = DateTime.UtcNow;
}

