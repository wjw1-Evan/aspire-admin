using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 分布式锁模型
/// 用于多实例部署时的并发控制
/// </summary>
public class DistributedLock
{
    /// <summary>
    /// 锁ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// <summary>
    /// 锁名称（唯一标识）
    /// </summary>
    [BsonElement("lockName")]
    public string LockName { get; set; } = string.Empty;

    /// <summary>
    /// 锁持有者实例ID
    /// </summary>
    [BsonElement("instanceId")]
    public string InstanceId { get; set; } = string.Empty;

    /// <summary>
    /// 获取锁的时间
    /// </summary>
    [BsonElement("acquiredAt")]
    public DateTime AcquiredAt { get; set; }

    /// <summary>
    /// 锁过期时间（TTL索引使用）
    /// </summary>
    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 锁状态
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "locked"; // locked, released
}

