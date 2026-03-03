using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 工作流实例实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_instances")]
public class WorkflowInstance : MultiTenantEntity
{
    /// <summary>
    /// 关联流程定义ID
    /// </summary>
    [BsonElement("workflowDefinitionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联公文ID
    /// </summary>
    [BsonElement("documentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// 流程状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;

    /// <summary>
    /// 当前审批任务的审批人 ID 列表（用于优化待办列表查询）
    /// </summary>
    [BsonElement("currentApproverIds")]
    public List<string> CurrentApproverIds { get; set; } = new();

    /// <summary>
    /// 流程实例在当前节点的预计超时时间
    /// </summary>
    [BsonElement("timeoutAt")]
    public DateTime? TimeoutAt { get; set; }

    /// <summary>
    /// 当前节点ID
    /// </summary>
    [BsonElement("currentNodeId")]
    public string CurrentNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量
    /// </summary>
    [BsonElement("variables")]
    [NotMapped]
    public Dictionary<string, object> Variables { get; set; } = new();

    /// <summary>
    /// 审批记录列表
    /// </summary>
    [BsonElement("approvalRecords")]
    public List<ApprovalRecord> ApprovalRecords { get; set; } = new();

    /// <summary>
    /// 发起人ID
    /// </summary>
    [BsonElement("startedBy")]
    public string StartedBy { get; set; } = string.Empty;

    /// <summary>
    /// 启动时间
    /// </summary>
    [BsonElement("startedAt")]
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// 完成时间
    /// </summary>
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 并行网关状态跟踪（nodeId -> completed branchIds）
    /// </summary>
    [BsonElement("parallelBranches")]
    [NotMapped]
    public Dictionary<string, List<string>> ParallelBranches { get; set; } = new();

    /// <summary>
    /// 流程定义快照（创建实例时保存，确保已创建的流程不受后续定义变更影响）
    /// </summary>
    [BsonElement("workflowDefinitionSnapshot")]
    [NotMapped]
    public WorkflowDefinition? WorkflowDefinitionSnapshot { get; set; }

    /// <summary>
    /// 表单定义快照（节点ID -> 表单定义，创建实例时保存）
    /// </summary>
    [BsonElement("formDefinitionSnapshots")]
    [NotMapped]
    public Dictionary<string, FormDefinition> FormDefinitionSnapshots { get; set; } = new();
}
