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
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;
}

/// <summary>
/// 多租户实体基类 - 包含企业隔离
/// </summary>
public abstract class MultiTenantEntity : BaseEntity
{
    [BsonElement("companyId")]
    public string? CompanyId { get; set; }
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
}

/// <summary>
/// 时间戳接口 - 提供创建和更新时间
/// </summary>
public interface ITimestamped
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 多租户接口 - 提供企业隔离
/// </summary>
public interface IMultiTenant
{
    string? CompanyId { get; set; }
}
