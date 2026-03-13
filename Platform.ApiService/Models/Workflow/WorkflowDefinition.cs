using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ApiService.Models.Workflow;

public class WorkflowVersion
{
    [BsonElement("major")]
    public int Major { get; set; } = 1;

    [BsonElement("minor")]
    public int Minor { get; set; } = 0;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class WorkflowGraph
{
    [BsonElement("nodes")]
    public List<WorkflowNode> Nodes { get; set; } = new();

    [BsonElement("edges")]
    public List<WorkflowEdge> Edges { get; set; } = new();

    [BsonElement("viewport")]
    public Viewport? Viewport { get; set; }
}

public class Viewport
{
    [BsonElement("x")]
    public double X { get; set; }

    [BsonElement("y")]
    public double Y { get; set; }

    [BsonElement("zoom")]
    public double Zoom { get; set; } = 1.0;
}

public class WorkflowNode
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    [BsonElement("data")]
    public NodeData Data { get; set; } = new();

    [BsonElement("position")]
    public NodePosition Position { get; set; } = new();

    [BsonElement("parentId")]
    public string? ParentId { get; set; }

    [BsonElement("handleIds")]
    public NodeHandles? HandleIds { get; set; }
}

public class NodeHandles
{
    [BsonElement("top")]
    public string? Top { get; set; }

    [BsonElement("right")]
    public string? Right { get; set; }

    [BsonElement("bottom")]
    public string? Bottom { get; set; }

    [BsonElement("left")]
    public string? Left { get; set; }

    [BsonElement("source")]
    public List<string>? Source { get; set; }

    [BsonElement("target")]
    public List<string>? Target { get; set; }
}

public class NodeData
{
    [BsonElement("label")]
    public string? Label { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("nodeType")]
    public string NodeType { get; set; } = string.Empty;

    [BsonElement("version")]
    public string? Version { get; set; }

    [BsonElement("config")]
    public NodeConfig? Config { get; set; }

    [BsonElement("credentials")]
    public string? Credentials { get; set; }

    [BsonElement("isDisabled")]
    public bool IsDisabled { get; set; } = false;

    [BsonElement("retry")]
    public RetryConfig? Retry { get; set; }

    [BsonElement("timeout")]
    public TimeoutConfig? Timeout { get; set; }
}

public class RetryConfig
{
    [BsonElement("enabled")]
    public bool Enabled { get; set; } = false;

    [BsonElement("maxAttempts")]
    public int MaxAttempts { get; set; } = 3;

    [BsonElement("interval")]
    public int Interval { get; set; } = 1;
}

public class TimeoutConfig
{
    [BsonElement("enabled")]
    public bool Enabled { get; set; } = false;

    [BsonElement("maxTimeout")]
    public int MaxTimeout { get; set; } = 300;
}

public class NodePosition
{
    [BsonElement("x")]
    public double X { get; set; }

    [BsonElement("y")]
    public double Y { get; set; }
}

public class WorkflowEdge
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("source")]
    public string Source { get; set; } = string.Empty;

    [BsonElement("target")]
    public string Target { get; set; } = string.Empty;

    [BsonElement("sourceHandle")]
    public string? SourceHandle { get; set; }

    [BsonElement("targetHandle")]
    public string? TargetHandle { get; set; }

    [BsonElement("type")]
    public string Type { get; set; } = "edge";

    [BsonElement("label")]
    public string? Label { get; set; }

    [BsonElement("data")]
    public EdgeData? Data { get; set; }

    [BsonElement("animated")]
    public bool Animated { get; set; } = false;

    [BsonElement("style")]
    public EdgeStyle? Style { get; set; }
}

public class EdgeData
{
    [BsonElement("condition")]
    public string? Condition { get; set; }

    [BsonElement("branchId")]
    public string? BranchId { get; set; }

    [BsonElement("isMemory")]
    public bool IsMemory { get; set; } = false;
}

public class EdgeStyle
{
    [BsonElement("stroke")]
    public string? Stroke { get; set; }

    [BsonElement("strokeWidth")]
    public int StrokeWidth { get; set; } = 2;
}

public class NodeConfig
{
    [BsonElement("approval")]
    public ApprovalConfig? Approval { get; set; }

    [BsonElement("condition")]
    public ConditionConfig? Condition { get; set; }

    [BsonElement("form")]
    public FormBinding? Form { get; set; }
}

public class ApprovalConfig
{
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApprovalType Type { get; set; } = ApprovalType.All;

    [BsonElement("approvers")]
    public List<ApproverRule> Approvers { get; set; } = new();

    [BsonElement("ccRules")]
    public List<ApproverRule>? CcRules { get; set; }

    [BsonElement("allowDelegate")]
    public bool AllowDelegate { get; set; } = false;

    [BsonElement("allowReject")]
    public bool AllowReject { get; set; } = true;

    [BsonElement("allowReturn")]
    public bool AllowReturn { get; set; } = false;

    [BsonElement("timeoutHours")]
    public int? TimeoutHours { get; set; }
}

public class ApproverRule
{
    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ApproverType Type { get; set; }

    [BsonElement("userId")]
    public string? UserId { get; set; }

    [BsonElement("roleId")]
    public string? RoleId { get; set; }

    [BsonElement("departmentId")]
    public string? DepartmentId { get; set; }

    [BsonElement("formFieldKey")]
    public string? FormFieldKey { get; set; }
}

public class ConditionBranch
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("conditions")]
    public List<ConditionRule> Conditions { get; set; } = new();

    [BsonElement("logicalOperator")]
    public string LogicalOperator { get; set; } = "and";

    [BsonElement("targetNodeId")]
    public string TargetNodeId { get; set; } = string.Empty;

    [BsonElement("order")]
    public int Order { get; set; } = 0;
}

public class ConditionConfig
{
    [BsonElement("branches")]
    public List<ConditionBranch> Branches { get; set; } = new();

    [BsonElement("defaultBranchId")]
    public string? DefaultBranchId { get; set; }

    [BsonElement("expression")]
    public string? Expression { get; set; }

    // 向后兼容：保留旧字段
    [BsonElement("conditions")]
    public List<ConditionRule>? LegacyConditions { get; set; }

    [BsonElement("logicalOperator")]
    public string? LegacyLogicalOperator { get; set; }
}

public class ConditionRule
{
    [BsonElement("formId")]
    public string? FormId { get; set; }

    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("operator")]
    public string Operator { get; set; } = "equals";

    [BsonElement("value")]
    public string? Value { get; set; }
}






[BsonIgnoreExtraElements]
[BsonCollectionName("workflow_definitions")]
public class WorkflowDefinition : MultiTenantEntity
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("version")]
    public WorkflowVersion Version { get; set; } = new();

    [BsonElement("graph")]
    public WorkflowGraph Graph { get; set; } = new();

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("mode")]
    public WorkflowMode Mode { get; set; } = WorkflowMode.Workflow;

    [BsonElement("trigger")]
    public WorkflowTrigger? Trigger { get; set; }

    [BsonElement("inputs")]
    public List<WorkflowInput> Inputs { get; set; } = new();

    [BsonElement("outputs")]
    public List<WorkflowOutput> Outputs { get; set; } = new();

    [BsonElement("analytics")]
    public WorkflowAnalytics Analytics { get; set; } = new();

    [BsonElement("validationResult")]
    public WorkflowValidationResult? ValidationResult { get; set; }

    [BsonElement("templateId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? TemplateId { get; set; }

    [BsonElement("templateVersion")]
    public string? TemplateVersion { get; set; }

    [BsonElement("conversationId")]
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
    [BsonElement("type")]
    public string Type { get; set; } = "manual";

    [BsonElement("cron")]
    public string? Cron { get; set; }

    [BsonElement("webhook")]
    public WebhookConfig? Webhook { get; set; }

    [BsonElement("event")]
    public EventConfig? Event { get; set; }
}

public class WebhookConfig
{
    [BsonElement("enabled")]
    public bool Enabled { get; set; } = true;

    [BsonElement("method")]
    public string Method { get; set; } = "POST";

    [BsonElement("url")]
    public string? Url { get; set; }
}

public class EventConfig
{
    [BsonElement("provider")]
    public string Provider { get; set; } = string.Empty;

    [BsonElement("eventType")]
    public string EventType { get; set; } = string.Empty;
}

public class WorkflowInput
{
    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "text";

    [BsonElement("required")]
    public bool Required { get; set; } = true;

    [BsonElement("default")]
    public string? Default { get; set; }

    [BsonElement("maxLength")]
    public int? MaxLength { get; set; }
}

public class WorkflowOutput
{
    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "text";
}
