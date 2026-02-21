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


