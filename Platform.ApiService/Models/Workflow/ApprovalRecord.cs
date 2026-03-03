using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 审批记录实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("approval_records")]
public class ApprovalRecord : MultiTenantEntity
{
    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkflowInstanceId { get; set; } = string.Empty;

    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("nodeId")]
    public string NodeId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人ID
    /// </summary>
    [BsonElement("approverId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ApproverId { get; set; } = string.Empty;

    /// <summary>
    /// 审批人姓名
    /// </summary>
    [BsonElement("approverName")]
    public string? ApproverName { get; set; }

    /// <summary>
    /// 审批动作
    /// </summary>
    [BsonElement("action")]
    [BsonRepresentation(BsonType.String)]
    public ApprovalAction Action { get; set; }

    /// <summary>
    /// 审批意见
    /// </summary>
    [BsonElement("comment")]
    public string? Comment { get; set; }

    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    [BsonElement("delegateToUserId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DelegateToUserId { get; set; }

    /// <summary>
    /// 审批时间
    /// </summary>
    [BsonElement("approvedAt")]
    public DateTime? ApprovedAt { get; set; }

    /// <summary>
    /// 审批顺序
    /// </summary>
    [BsonElement("sequence")]
    public int Sequence { get; set; }
}
