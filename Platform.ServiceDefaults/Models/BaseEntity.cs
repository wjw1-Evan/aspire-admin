using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 基础实体类 - 所有微服务通用 (EFCore + MongoDB 兼容)
/// </summary>
[BsonIgnoreExtraElements]
public abstract class BaseEntity : IEntity, ISoftDeletable, ITimestamped, IOperationTrackable
{
    /// <summary>
    /// 主键ID - 支持 EFCore 和 MongoDB
    /// </summary>
    [Key]
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 创建时间 - 自动设置 UTC 时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间 - 自动更新 UTC 时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 软删除标识
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除者ID
    /// </summary>
    [BsonElement("deletedBy")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    /// <summary>
    /// 创建者ID
    /// </summary>
    [BsonElement("createdBy")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 更新者ID
    /// </summary>
    [BsonElement("updatedBy")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 最后操作类型
    /// </summary>
    [BsonElement("lastOperationType")]
    public string? LastOperationType { get; set; }

    /// <summary>
    /// 最后操作时间
    /// </summary>
    [BsonElement("lastOperationAt")]
    public DateTime? LastOperationAt { get; set; }

    /// <summary>
    /// 构造函数 - 生成新的ObjectId
    /// </summary>
    protected BaseEntity()
    {
        try
        {
            Id = ObjectId.GenerateNewId().ToString();
        }
        catch
        {
            // 如果ObjectId生成失败，使用GUID作为备选方案
            Id = Guid.NewGuid().ToString("N");
        }
    }
}

/// <summary>
/// 多租户实体基类 - 包含企业隔离 (EFCore + MongoDB 兼容)
/// </summary>
public abstract class MultiTenantEntity : BaseEntity, IMultiTenant
{
    /// <summary>
    /// 企业ID - 多租户隔离标识
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 实体接口 - 提供基础实体标识
/// </summary>
public interface IEntity
{
    string Id { get; set; }
}

/// <summary>
/// 软删除接口 - 支持软删除功能
/// </summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
    string? DeletedBy { get; set; }
    string? DeletedReason { get; set; }
}

/// <summary>
/// 时间戳接口 - 提供创建和更新时间
/// </summary>
public interface ITimestamped
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
    DateTime? DeletedAt { get; set; }
}

/// <summary>
/// 多租户接口 - 提供企业隔离
/// </summary>
public interface IMultiTenant
{
    string CompanyId { get; set; }
}
