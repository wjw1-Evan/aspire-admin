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
public class WorkflowInstance : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 关联流程定义ID
    /// </summary>
    [BsonElement("workflowDefinitionId")]
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 关联公文ID
    /// </summary>
    [BsonElement("documentId")]
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
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

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

    // IEntity
    // Id 已定义

    // ISoftDeletable
    /// <summary>
    /// 是否已删除
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除人ID
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }

    // ITimestamped
    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建人ID
    /// </summary>
    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    [BsonElement("createdByUsername")]
    public string? CreatedByUsername { get; set; }

    /// <summary>
    /// 更新人ID
    /// </summary>
    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// 更新人用户名
    /// </summary>
    [BsonElement("updatedByUsername")]
    public string? UpdatedByUsername { get; set; }
}
