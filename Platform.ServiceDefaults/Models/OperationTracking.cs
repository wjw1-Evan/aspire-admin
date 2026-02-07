using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 操作追踪接口 - 支持操作审计
/// </summary>
public interface IOperationTrackable
{
    /// <summary>
    /// 创建人ID
    /// </summary>
    string? CreatedBy { get; set; }

    /// <summary>
    /// 最后更新人ID
    /// </summary>
    string? UpdatedBy { get; set; }

    /// <summary>
    /// 最后操作类型（CREATE, UPDATE, DELETE）
    /// </summary>
    string? LastOperationType { get; set; }

    /// <summary>
    /// 最后操作时间
    /// </summary>
    DateTime? LastOperationAt { get; set; }
}

/// <summary>
/// 操作审计记录
/// </summary>
public class OperationAudit : BaseEntity
{
    /// <summary>
    /// 实体类型
    /// </summary>
    [BsonElement("entityType")]
    public string EntityType { get; set; } = string.Empty;

    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonElement("entityId")]
    public string EntityId { get; set; } = string.Empty;

    /// <summary>
    /// 操作类型
    /// </summary>
    [BsonElement("operationType")]
    public OperationType OperationType { get; set; }

    /// <summary>
    /// 操作用户ID
    /// </summary>
    [BsonElement("userId")]
    public string? UserId { get; set; }

    /// <summary>
    /// 操作用户名
    /// </summary>
    [BsonElement("username")]
    public string? Username { get; set; }

    /// <summary>
    /// 企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string? CompanyId { get; set; }

    /// <summary>
    /// 操作前数据（JSON格式）
    /// </summary>
    [BsonElement("beforeData")]
    public string? BeforeData { get; set; }

    /// <summary>
    /// 操作后数据（JSON格式）
    /// </summary>
    [BsonElement("afterData")]
    public string? AfterData { get; set; }

    /// <summary>
    /// 操作描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 客户端IP
    /// </summary>
    [BsonElement("clientIp")]
    public string? ClientIp { get; set; }

    /// <summary>
    /// 用户代理
    /// </summary>
    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }

    /// <summary>
    /// 请求ID（用于追踪）
    /// </summary>
    [BsonElement("requestId")]
    public string? RequestId { get; set; }
}

/// <summary>
/// 操作类型枚举
/// </summary>
public enum OperationType
{
    /// <summary>
    /// 创建
    /// </summary>
    Create = 1,

    /// <summary>
    /// 更新
    /// </summary>
    Update = 2,

    /// <summary>
    /// 删除
    /// </summary>
    Delete = 3,

    /// <summary>
    /// 软删除
    /// </summary>
    SoftDelete = 4,

    /// <summary>
    /// 批量创建
    /// </summary>
    BatchCreate = 5,

    /// <summary>
    /// 批量更新
    /// </summary>
    BatchUpdate = 6,

    /// <summary>
    /// 批量删除
    /// </summary>
    BatchDelete = 7,

    /// <summary>
    /// 查询
    /// </summary>
    Query = 8,

    /// <summary>
    /// 替换（原子操作）
    /// </summary>
    Replace = 9,

    /// <summary>
    /// 硬删除（原子操作）
    /// </summary>
    HardDelete = 10
}
