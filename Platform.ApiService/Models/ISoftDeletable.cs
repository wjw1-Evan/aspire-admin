using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

/// <summary>
/// 软删除接口，所有支持软删除的实体都应实现此接口
/// </summary>
public interface ISoftDeletable
{
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    bool IsDeleted { get; set; }

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除操作人ID
    /// </summary>
    [BsonElement("deletedBy")]
    string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    string? DeletedReason { get; set; }
}

