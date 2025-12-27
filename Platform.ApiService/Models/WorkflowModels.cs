using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 工作流状态枚举
/// </summary>
public enum WorkflowStatus
{
    /// <summary>运行中</summary>
    Running = 0,

    /// <summary>已完成</summary>
    Completed = 1,

    /// <summary>已取消</summary>
    Cancelled = 2,

    /// <summary>已拒绝</summary>
    Rejected = 3
}

/// <summary>
/// 审批动作枚举
/// </summary>
public enum ApprovalAction
{
    /// <summary>通过</summary>
    Approve = 0,

    /// <summary>拒绝</summary>
    Reject = 1,

    /// <summary>退回</summary>
    Return = 2,

    /// <summary>转办</summary>
    Delegate = 3
}

/// <summary>
/// 审批类型枚举
/// </summary>
public enum ApprovalType
{
    /// <summary>会签（所有人必须通过）</summary>
    All = 0,

    /// <summary>或签（任意一人通过即可）</summary>
    Any = 1
}

/// <summary>
/// 审批人类型枚举
/// </summary>
public enum ApproverType
{
    /// <summary>指定用户</summary>
    User = 0,

    /// <summary>角色</summary>
    Role = 1,

    /// <summary>部门</summary>
    Department = 2
}

/// <summary>
/// 公文状态枚举
/// </summary>
public enum DocumentStatus
{
    /// <summary>草稿</summary>
    Draft = 0,

    /// <summary>审批中</summary>
    Pending = 1,

    /// <summary>已通过</summary>
    Approved = 2,

    /// <summary>已拒绝</summary>
    Rejected = 3
}

/// <summary>
/// 工作流版本信息
/// </summary>
public class WorkflowVersion
{
    /// <summary>
    /// 主版本号
    /// </summary>
    [BsonElement("major")]
    public int Major { get; set; } = 1;

    /// <summary>
    /// 次版本号
    /// </summary>
    [BsonElement("minor")]
    public int Minor { get; set; } = 0;

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 工作流图形定义
/// </summary>
public class WorkflowGraph
{
    /// <summary>
    /// 节点列表
    /// </summary>
    [BsonElement("nodes")]
    public List<WorkflowNode> Nodes { get; set; } = new();

    /// <summary>
    /// 边列表（连接线）
    /// </summary>
    [BsonElement("edges")]
    public List<WorkflowEdge> Edges { get; set; } = new();
}

/// <summary>
/// 工作流节点
/// </summary>
public class WorkflowNode
{
    /// <summary>
    /// 节点ID
    /// </summary>
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 节点类型：start/end/approval/condition/parallel
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 节点标签
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }

    /// <summary>
    /// 节点位置
    /// </summary>
    [BsonElement("position")]
    public NodePosition Position { get; set; } = new();

    /// <summary>
    /// 节点配置
    /// </summary>
    [BsonElement("config")]
    public NodeConfig Config { get; set; } = new();
}

/// <summary>
/// 节点位置
/// </summary>
public class NodePosition
{
    /// <summary>
    /// X坐标
    /// </summary>
    [BsonElement("x")]
    public double X { get; set; }

    /// <summary>
    /// Y坐标
    /// </summary>
    [BsonElement("y")]
    public double Y { get; set; }
}

/// <summary>
/// 节点配置
/// </summary>
public class NodeConfig
{
    /// <summary>
    /// 审批节点配置
    /// </summary>
    [BsonElement("approval")]
    public ApprovalConfig? Approval { get; set; }

    /// <summary>
    /// 条件节点配置
    /// </summary>
    [BsonElement("condition")]
    public ConditionConfig? Condition { get; set; }

    /// <summary>
    /// 并行网关配置
    /// </summary>
    [BsonElement("parallel")]
    public ParallelConfig? Parallel { get; set; }

    /// <summary>
    /// 表单绑定配置（用于起始节点或审批节点收集数据）
    /// </summary>
    [BsonElement("form")]
    public FormBinding? Form { get; set; }
}

/// <summary>
/// 审批节点配置
/// </summary>
public class ApprovalConfig
{
    /// <summary>
    /// 审批类型：会签或或签
    /// </summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApprovalType Type { get; set; } = ApprovalType.All;

    /// <summary>
    /// 审批人规则列表
    /// </summary>
    [BsonElement("approvers")]
    public List<ApproverRule> Approvers { get; set; } = new();

    /// <summary>
    /// 是否允许转办
    /// </summary>
    [BsonElement("allowDelegate")]
    public bool AllowDelegate { get; set; } = false;

    /// <summary>
    /// 是否允许拒绝
    /// </summary>
    [BsonElement("allowReject")]
    public bool AllowReject { get; set; } = true;

    /// <summary>
    /// 是否允许退回
    /// </summary>
    [BsonElement("allowReturn")]
    public bool AllowReturn { get; set; } = false;

    /// <summary>
    /// 超时时间（小时）
    /// </summary>
    [BsonElement("timeoutHours")]
    public int? TimeoutHours { get; set; }
}

/// <summary>
/// 审批人规则
/// </summary>
public class ApproverRule
{
    /// <summary>
    /// 审批人类型：用户/角色/部门
    /// </summary>
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApproverType Type { get; set; }

    /// <summary>
    /// 用户ID（当Type为User时使用）
    /// </summary>
    [BsonElement("userId")]
    public string? UserId { get; set; }

    /// <summary>
    /// 角色ID（当Type为Role时使用）
    /// </summary>
    [BsonElement("roleId")]
    public string? RoleId { get; set; }

    /// <summary>
    /// 部门ID（当Type为Department时使用）
    /// </summary>
    [BsonElement("departmentId")]
    public string? DepartmentId { get; set; }
}

/// <summary>
/// 条件节点配置
/// </summary>
public class ConditionConfig
{
    /// <summary>
    /// 条件表达式，如：amount > 10000
    /// </summary>
    [BsonElement("expression")]
    public string Expression { get; set; } = string.Empty;
}

/// <summary>
/// 并行网关配置
/// </summary>
public class ParallelConfig
{
    /// <summary>
    /// 分支节点ID列表
    /// </summary>
    [BsonElement("branches")]
    public List<string> Branches { get; set; } = new();
}

/// <summary>
/// 工作流边（连接线）
/// </summary>
public class WorkflowEdge
{
    /// <summary>
    /// 边ID
    /// </summary>
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 源节点ID
    /// </summary>
    [BsonElement("source")]
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// 目标节点ID
    /// </summary>
    [BsonElement("target")]
    public string Target { get; set; } = string.Empty;

    /// <summary>
    /// 边标签
    /// </summary>
    [BsonElement("label")]
    public string? Label { get; set; }

    /// <summary>
    /// 条件分支表达式
    /// </summary>
    [BsonElement("condition")]
    public string? Condition { get; set; }
}

/// <summary>
/// 工作流定义实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_definitions")]
public class WorkflowDefinition : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 流程名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 流程描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 版本信息
    /// </summary>
    [BsonElement("version")]
    public WorkflowVersion Version { get; set; } = new();

    /// <summary>
    /// 流程图形定义
    /// </summary>
    [BsonElement("graph")]
    public WorkflowGraph Graph { get; set; } = new();

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

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
    public Dictionary<string, List<string>> ParallelBranches { get; set; } = new();

    /// <summary>
    /// 流程定义快照（创建实例时保存，确保已创建的流程不受后续定义变更影响）
    /// </summary>
    [BsonElement("workflowDefinitionSnapshot")]
    public WorkflowDefinition? WorkflowDefinitionSnapshot { get; set; }

    /// <summary>
    /// 表单定义快照（节点ID -> 表单定义，创建实例时保存）
    /// </summary>
    [BsonElement("formDefinitionSnapshots")]
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

/// <summary>
/// 审批记录实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("approval_records")]
public class ApprovalRecord : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
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

    // IMultiTenant
    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 公文实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("documents")]
public class Document : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 实体ID
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 公文标题
    /// </summary>
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 公文内容
    /// </summary>
    [BsonElement("content")]
    public string? Content { get; set; }

    /// <summary>
    /// 公文类型
    /// </summary>
    [BsonElement("documentType")]
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>
    /// 分类
    /// </summary>
    [BsonElement("category")]
    public string? Category { get; set; }

    /// <summary>
    /// 关联流程实例ID
    /// </summary>
    [BsonElement("workflowInstanceId")]
    public string? WorkflowInstanceId { get; set; }

    /// <summary>
    /// 公文状态
    /// </summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;

    /// <summary>
    /// 附件ID列表（GridFS）
    /// </summary>
    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = new();

    /// <summary>
    /// 表单数据
    /// </summary>
    [BsonElement("formData")]
    public Dictionary<string, object> FormData { get; set; } = new();

    /// <summary>
    /// 企业ID（多租户）
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

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
