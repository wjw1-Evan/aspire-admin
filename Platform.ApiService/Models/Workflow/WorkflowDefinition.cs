using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models.Workflow;

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
    /// AI节点配置
    /// </summary>
    [BsonElement("ai")]
    public AiConfig? Ai { get; set; }

    /// <summary>
    /// 通知配置
    /// </summary>
    [BsonElement("notification")]
    public NotificationConfig? Notification { get; set; }

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
    /// 抄送规则列表
    /// </summary>
    [BsonElement("ccRules")]
    public List<ApproverRule>? CcRules { get; set; }

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

    /// <summary>
    /// 表单字段Key（当Type为FormField时使用）
    /// </summary>
    [BsonElement("formFieldKey")]
    public string? FormFieldKey { get; set; }
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

    /// <summary>
    /// 跳转目标节点ID（如果是简单跳转）
    /// </summary>
    [BsonElement("targetNodeId")]
    public string? TargetNodeId { get; set; }
}

/// <summary>
/// AI节点配置
/// </summary>
public class AiConfig
{
    /// <summary>
    /// 提示词模板
    /// </summary>
    [BsonElement("promptTemplate")]
    public string PromptTemplate { get; set; } = string.Empty;

    /// <summary>
    /// 系统提示词
    /// </summary>
    [BsonElement("systemPrompt")]
    public string? SystemPrompt { get; set; }

    /// <summary>
    /// 模型名称
    /// </summary>
    [BsonElement("model")]
    public string? Model { get; set; }

    /// <summary>
    /// 输出变量名
    /// </summary>
    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "ai_result";

    /// <summary>
    /// 最大生成 Token 数
    /// </summary>
    [BsonElement("maxTokens")]
    public int? MaxTokens { get; set; }

    /// <summary>
    /// 温度（Temperature）
    /// </summary>
    [BsonElement("temperature")]
    public double? Temperature { get; set; }
}

/// <summary>
/// 通知节点配置
/// </summary>
public class NotificationConfig
{
    /// <summary>
    /// 通知操作类型
    /// </summary>
    [BsonElement("actionType")]
    public string ActionType { get; set; } = "workflow_notification";

    /// <summary>
    /// 备注内容模板（支持动态变量）
    /// </summary>
    [BsonElement("remarksTemplate")]
    public string? RemarksTemplate { get; set; }

    /// <summary>
    /// 接收人规则列表
    /// </summary>
    [BsonElement("recipients")]
    public List<ApproverRule> Recipients { get; set; } = new();
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
    /// 分析数据
    /// </summary>
    [BsonElement("analytics")]
    public WorkflowAnalytics Analytics { get; set; } = new();

    /// <summary>
    /// 验证结果
    /// </summary>
    [BsonElement("validationResult")]
    public WorkflowValidationResult? ValidationResult { get; set; }

    /// <summary>
    /// 基于的模板ID（如果从模板创建）
    /// </summary>
    [BsonElement("templateId")]
    public string? TemplateId { get; set; }

    /// <summary>
    /// 模板版本（如果从模板创建）
    /// </summary>
    [BsonElement("templateVersion")]
    public string? TemplateVersion { get; set; }

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
