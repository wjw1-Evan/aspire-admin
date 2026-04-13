using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 审批记录实体
/// </summary>
public class ApprovalRecord : MultiTenantEntity
{
    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkflowInstanceId { get; set; } = string.Empty;

    /// <summary>
    /// 节点ID
    /// </summary>
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string ApproverId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人姓名
    /// </summary>
    public string? ApproverName { get; set; }

    /// <summary>
    /// 审批动作
    /// </summary>
    [BsonRepresentation(BsonType.String)]
    public ApprovalAction Action { get; set; }

    /// <summary>
    /// 审批意见
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DelegateToUserId { get; set; }

    /// <summary>
    /// 审批时间
    /// </summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>
    /// 审批顺序
    /// </summary>
    public int Sequence { get; set; }
}