using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

public class WorkflowVersion
{
    public int Major { get; set; } = 1;

    public int Minor { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class WorkflowGraph
{
    public List<WorkflowNode> Nodes { get; set; } = new();

    public List<WorkflowEdge> Edges { get; set; } = new();

    public Viewport? Viewport { get; set; }
}

public class Viewport
{
    public double X { get; set; }

    public double Y { get; set; }

    public double Zoom { get; set; } = 1.0;
}

public class WorkflowNode
{
    public string Id { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public NodeData Data { get; set; } = new();

    public NodePosition Position { get; set; } = new();

    public string? ParentId { get; set; }

    public NodeHandles? HandleIds { get; set; }
}

public class NodeHandles
{
    public string? Top { get; set; }

    public string? Right { get; set; }

    public string? Bottom { get; set; }

    public string? Left { get; set; }

    public List<string>? Source { get; set; }

    public List<string>? Target { get; set; }
}

public class NodeData
{
    public string? Label { get; set; }

    public string? Description { get; set; }

    public string NodeType { get; set; } = string.Empty;

    public string? Version { get; set; }

    public NodeConfig? Config { get; set; }

    public string? Credentials { get; set; }

    public bool IsDisabled { get; set; } = false;

    public RetryConfig? Retry { get; set; }

    public TimeoutConfig? Timeout { get; set; }
}

public class RetryConfig
{
    public bool Enabled { get; set; } = false;

    public int MaxAttempts { get; set; } = 3;

    public int Interval { get; set; } = 1;
}

public class TimeoutConfig
{
    public bool Enabled { get; set; } = false;

    public int MaxTimeout { get; set; } = 300;
}

public class NodePosition
{
    public double X { get; set; }

    public double Y { get; set; }
}

public class WorkflowEdge
{
    public string Id { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;

    public string Target { get; set; } = string.Empty;

    public string? SourceHandle { get; set; }

    public string? TargetHandle { get; set; }

    public string Type { get; set; } = "edge";

    public string? Label { get; set; }

    public EdgeData? Data { get; set; }

    public bool Animated { get; set; } = false;

    public EdgeStyle? Style { get; set; }
}

public class EdgeData
{
    public string? Condition { get; set; }

    public string? BranchId { get; set; }

    public bool IsMemory { get; set; } = false;
}

public class EdgeStyle
{
    public string? Stroke { get; set; }

    public int StrokeWidth { get; set; } = 2;
}

public class NodeConfig
{
    public ApprovalConfig? Approval { get; set; }

    public ConditionConfig? Condition { get; set; }

    public FormBinding? Form { get; set; }
}

public class ApprovalConfig
{
    [BsonRepresentation(BsonType.String)]
    public ApprovalType Type { get; set; } = ApprovalType.All;

    public List<ApproverRule> Approvers { get; set; } = new();

    public List<ApproverRule>? CcRules { get; set; }

    public bool AllowDelegate { get; set; } = false;

    public bool AllowReject { get; set; } = true;

    public bool AllowReturn { get; set; } = false;

    public int? TimeoutHours { get; set; }
}

public class ApproverRule
{
    [BsonRepresentation(BsonType.String)]
    public ApproverType Type { get; set; }

    public string? UserId { get; set; }

    public string? RoleId { get; set; }

    public string? DepartmentId { get; set; }

    public string? FormFieldKey { get; set; }

    public int? SupervisorLevel { get; set; }
}

public class ConditionBranch
{
    public string Id { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public List<ConditionRule> Conditions { get; set; } = new();

    public string LogicalOperator { get; set; } = "and";

    public string TargetNodeId { get; set; } = string.Empty;

    public int Order { get; set; } = 0;
}

public class ConditionConfig
{
    public List<ConditionBranch> Branches { get; set; } = new();

    public string? DefaultNodeId { get; set; }

    public string? Expression { get; set; }

    // 向后兼容：保留旧字段
    public List<ConditionRule>? LegacyConditions { get; set; }

    public string? LegacyLogicalOperator { get; set; }
}

public class ConditionRule
{
    public string? FormId { get; set; }

    public string Variable { get; set; } = string.Empty;

    public string Operator { get; set; } = "equals";

    public string? Value { get; set; }
}






[BsonIgnoreExtraElements]
public class WorkflowDefinition : MultiTenantEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Category { get; set; } = string.Empty;

    public WorkflowVersion Version { get; set; } = new();

    public WorkflowGraph Graph { get; set; } = new();

    public bool IsActive { get; set; } = true;

    public WorkflowMode Mode { get; set; } = WorkflowMode.Workflow;

    public WorkflowTrigger? Trigger { get; set; }

    public List<WorkflowInput> Inputs { get; set; } = new();

    public List<WorkflowOutput> Outputs { get; set; } = new();

    public WorkflowAnalytics Analytics { get; set; } = new();

    public WorkflowValidationResult? ValidationResult { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string? TemplateId { get; set; }

    public string? TemplateVersion { get; set; }

    public string? ConversationId { get; set; }
}

public enum WorkflowMode
{
    Workflow,
    ChatFlow,
    Agent
}

public class WorkflowTrigger
{
    public string Type { get; set; } = "manual";

    public string? Cron { get; set; }

    public WebhookConfig? Webhook { get; set; }

    public EventConfig? Event { get; set; }
}

public class WebhookConfig
{
    public bool Enabled { get; set; } = true;

    public string Method { get; set; } = "POST";

    public string? Url { get; set; }
}

public class EventConfig
{
    public string Provider { get; set; } = string.Empty;

    public string EventType { get; set; } = string.Empty;
}

public class WorkflowInput
{
    public string Variable { get; set; } = string.Empty;

    public string Type { get; set; } = "text";

    public bool Required { get; set; } = true;

    public string? Default { get; set; }

    public int? MaxLength { get; set; }
}

public class WorkflowOutput
{
    public string Variable { get; set; } = string.Empty;

    public string Type { get; set; } = "text";
}