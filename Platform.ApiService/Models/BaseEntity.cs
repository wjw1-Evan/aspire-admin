using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 基础实体类 - 统一软删除和时间戳实现
/// 修复：避免每个实体重复实现软删除字段
/// </summary>
public abstract class BaseEntity : ISoftDeletable, IEntity, ITimestamped
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // 时间戳字段
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 多租户基础实体类 - 统一多租户字段
/// 修复：统一多租户字段命名和使用
/// </summary>
public abstract class MultiTenantEntity : BaseEntity
{
    /// <summary>
    /// 企业ID（多租户字段）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 命名实体接口 - 用于有名称的实体
/// </summary>
public interface INamedEntity
{
    string Name { get; set; }
}