using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 基础实体类 - 所有微服务通用
/// </summary>
public abstract class BaseEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }

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
/// 多租户实体基类 - 包含企业隔离
/// </summary>
public abstract class MultiTenantEntity : BaseEntity, IMultiTenant
{
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 命名实体接口 - 提供名称和标题属性
/// </summary>
public interface INamedEntity
{
    string Name { get; set; }
    string Title { get; set; }
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
