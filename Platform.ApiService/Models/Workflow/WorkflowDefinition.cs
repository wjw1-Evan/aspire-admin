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
    public NodeConfig Config { get; set; } = new();

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

    [BsonElement("parallel")]
    public ParallelConfig? Parallel { get; set; }

    [BsonElement("ai")]
    public AiConfig? Ai { get; set; }

    [BsonElement("aiJudge")]
    public AiJudgeConfig? AiJudge { get; set; }

    [BsonElement("notification")]
    public NotificationConfig? Notification { get; set; }

    [BsonElement("form")]
    public FormBinding? Form { get; set; }

    [BsonElement("http")]
    public HttpConfig? Http { get; set; }

    [BsonElement("timer")]
    public TimerConfig? Timer { get; set; }

    [BsonElement("variable")]
    public VariableConfig? Variable { get; set; }

    [BsonElement("log")]
    public LogConfig? Log { get; set; }

    [BsonElement("knowledge")]
    public KnowledgeConfig? Knowledge { get; set; }

    [BsonElement("code")]
    public CodeConfig? Code { get; set; }

    [BsonElement("template")]
    public TemplateConfig? Template { get; set; }

    [BsonElement("variableAggregator")]
    public VariableAggregatorConfig? VariableAggregator { get; set; }

    [BsonElement("questionClassifier")]
    public QuestionClassifierConfig? QuestionClassifier { get; set; }

    [BsonElement("parameterExtractor")]
    public ParameterExtractorConfig? ParameterExtractor { get; set; }

    [BsonElement("iteration")]
    public IterationConfig? Iteration { get; set; }

    [BsonElement("answer")]
    public AnswerConfig? Answer { get; set; }

    [BsonElement("tool")]
    public ToolConfig? Tool { get; set; }

    [BsonElement("agent")]
    public AgentConfig? Agent { get; set; }

    [BsonElement("llm")]
    public LlmConfig? Llm { get; set; }

    [BsonElement("retrieval")]
    public RetrievalConfig? Retrieval { get; set; }

    [BsonElement("documentExtractor")]
    public DocumentExtractorConfig? DocumentExtractor { get; set; }

    [BsonElement("listOperator")]
    public ListOperatorConfig? ListOperator { get; set; }

    [BsonElement("variableAssigner")]
    public VariableAssignerConfig? VariableAssigner { get; set; }

    [BsonElement("humanInput")]
    public HumanInputConfig? HumanInput { get; set; }

    [BsonElement("script")]
    public ScriptConfig? Script { get; set; }
}

public class KnowledgeConfig
{
    [BsonElement("query")]
    public string? Query { get; set; }

    [BsonElement("queryVariable")]
    public string? QueryVariable { get; set; }

    [BsonElement("knowledgeBaseIds")]
    public List<string> KnowledgeBaseIds { get; set; } = new();

    [BsonElement("retrievalMode")]
    public string RetrievalMode { get; set; } = "hybrid";

    [BsonElement("topK")]
    public int TopK { get; set; } = 3;

    [BsonElement("scoreThreshold")]
    public double? ScoreThreshold { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "search_results";
}

public class LlmConfig
{
    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("provider")]
    public string? Provider { get; set; }

    [BsonElement("mode")]
    public string Mode { get; set; } = "chat";

    [BsonElement("systemPrompt")]
    public string? SystemPrompt { get; set; }

    [BsonElement("prompt")]
    public string? Prompt { get; set; }

    [BsonElement("variables")]
    public List<Variable> Variables { get; set; } = new();

    [BsonElement("maxTokens")]
    public int? MaxTokens { get; set; }

    [BsonElement("temperature")]
    public double? Temperature { get; set; }

    [BsonElement("topP")]
    public double? TopP { get; set; }

    [BsonElement("responseFormat")]
    public string? ResponseFormat { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "llm_result";
}

public class AgentConfig
{
    [BsonElement("strategy")]
    public string Strategy { get; set; } = "react";

    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("provider")]
    public string? Provider { get; set; }

    [BsonElement("systemPrompt")]
    public string? SystemPrompt { get; set; }

    [BsonElement("tools")]
    public List<ToolDefinition> Tools { get; set; } = new();

    [BsonElement("maxIterations")]
    public int MaxIterations { get; set; } = 10;

    [BsonElement("maxTokens")]
    public int? MaxTokens { get; set; }

    [BsonElement("temperature")]
    public double? Temperature { get; set; }

    [BsonElement("memory")]
    public AgentMemoryConfig? Memory { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "agent_result";
}

public class AgentMemoryConfig
{
    [BsonElement("enabled")]
    public bool Enabled { get; set; } = false;

    [BsonElement("maxMessages")]
    public int MaxMessages { get; set; } = 10;
}

public class ToolDefinition
{
    [BsonElement("toolName")]
    public string ToolName { get; set; } = string.Empty;

    [BsonElement("provider")]
    public string Provider { get; set; } = string.Empty;

    [BsonElement("parameters")]
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public class RetrievalConfig
{
    [BsonElement("query")]
    public string? Query { get; set; }

    [BsonElement("knowledgeBaseId")]
    public string? KnowledgeBaseId { get; set; }

    [BsonElement("retrievalStrategy")]
    public string RetrievalStrategy { get; set; } = "semantic_search";

    [BsonElement("topK")]
    public int TopK { get; set; } = 3;

    [BsonElement("scoreThreshold")]
    public double? ScoreThreshold { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "retrieved_documents";
}

public class DocumentExtractorConfig
{
    [BsonElement("variable")]
    public string? Variable { get; set; }

    [BsonElement("extractions")]
    public List<ExtractionRule> Extractions { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "extracted_data";
}

public class ExtractionRule
{
    [BsonElement("field")]
    public string Field { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "text";

    [BsonElement("description")]
    public string? Description { get; set; }
}

public class ListOperatorConfig
{
    [BsonElement("operator")]
    public string Operator { get; set; } = "transform";

    [BsonElement("inputVariable")]
    public string? InputVariable { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "list_result";
}

public class VariableAssignerConfig
{
    [BsonElement("assignments")]
    public List<VariableAssignment> Assignments { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "assigned_value";
}

public class VariableAssignment
{
    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("value")]
    public string? Value { get; set; }
}

public class HumanInputConfig
{
    [BsonElement("inputLabel")]
    public string InputLabel { get; set; } = "请输入";

    [BsonElement("inputType")]
    public string InputType { get; set; } = "text";

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("timeout")]
    public int? Timeout { get; set; }

    [BsonElement("defaultValue")]
    public string? DefaultValue { get; set; }
}

public class ScriptConfig
{
    [BsonElement("language")]
    public string Language { get; set; } = "python";

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("inputVariables")]
    public List<string> InputVariables { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "script_result";
}

public class Variable
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "string";

    [BsonElement("default")]
    public string? Default { get; set; }
}

public class CodeConfig
{
    [BsonElement("language")]
    public string Language { get; set; } = "python";

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("inputVariables")]
    public List<string> InputVariables { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "code_result";
}

public class TemplateConfig
{
    [BsonElement("template")]
    public string Template { get; set; } = string.Empty;

    [BsonElement("variables")]
    public Dictionary<string, string> Variables { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "template_result";
}

public class VariableAggregatorConfig
{
    [BsonElement("variables")]
    public List<string> Variables { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "aggregated_result";
}

public class QuestionClassifierConfig
{
    [BsonElement("inputVariable")]
    public string? InputVariable { get; set; }

    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("classes")]
    public List<ClassifierClass> Classes { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "class_name";
}

public class ClassifierClass
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }
}

public class ParameterExtractorConfig
{
    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("inputVariable")]
    public string? InputVariable { get; set; }

    [BsonElement("parameters")]
    public List<ParameterDefinition> Parameters { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "extracted_params";
}

public class ParameterDefinition
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "string";

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("required")]
    public bool Required { get; set; } = false;
}

public class IterationConfig
{
    [BsonElement("iteratorVariable")]
    public string? IteratorVariable { get; set; }

    [BsonElement("graph")]
    [NotMapped]
    public WorkflowGraph Graph { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "iteration_results";
}

public class AnswerConfig
{
    [BsonElement("answer")]
    public string Answer { get; set; } = string.Empty;

    [BsonElement("variables")]
    public Dictionary<string, string> Variables { get; set; } = new();
}

public class ToolConfig
{
    [BsonElement("provider")]
    public string Provider { get; set; } = string.Empty;

    [BsonElement("tool")]
    public string Tool { get; set; } = string.Empty;

    [BsonElement("params")]
    public Dictionary<string, string> Params { get; set; } = new();

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "tool_result";
}

public class HttpConfig
{
    [BsonElement("method")]
    public string? Method { get; set; }

    [BsonElement("url")]
    public string? Url { get; set; }

    [BsonElement("headers")]
    public Dictionary<string, string>? Headers { get; set; }

    [BsonElement("body")]
    public string? Body { get; set; }

    [BsonElement("timeout")]
    public int Timeout { get; set; } = 30;

    [BsonElement("outputVariable")]
    public string? OutputVariable { get; set; }
}

public class TimerConfig
{
    [BsonElement("waitDuration")]
    public string? WaitDuration { get; set; }

    [BsonElement("cron")]
    public string? Cron { get; set; }
}

public class VariableConfig
{
    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("value")]
    public string? Value { get; set; }
}

public class LogConfig
{
    [BsonElement("level")]
    public string Level { get; set; } = "Information";

    [BsonElement("message")]
    public string? Message { get; set; }
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

public class ConditionConfig
{
    [BsonElement("conditions")]
    public List<ConditionRule> Conditions { get; set; } = new();

    [BsonElement("logicalOperator")]
    public string LogicalOperator { get; set; } = "and";
}

public class ConditionRule
{
    [BsonElement("variable")]
    public string Variable { get; set; } = string.Empty;

    [BsonElement("operator")]
    public string Operator { get; set; } = "equals";

    [BsonElement("value")]
    public string? Value { get; set; }

    [BsonElement("targetNodeId")]
    public string? TargetNodeId { get; set; }
}

public class AiConfig
{
    [BsonElement("inputVariable")]
    public string? InputVariable { get; set; }

    [BsonElement("promptTemplate")]
    public string PromptTemplate { get; set; } = string.Empty;

    [BsonElement("systemPrompt")]
    public string? SystemPrompt { get; set; }

    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "ai_result";

    [BsonElement("maxTokens")]
    public int? MaxTokens { get; set; }

    [BsonElement("temperature")]
    public double? Temperature { get; set; }
}

public class AiJudgeConfig
{
    [BsonElement("inputVariable")]
    public string? InputVariable { get; set; }

    [BsonElement("judgePrompt")]
    public string JudgePrompt { get; set; } = string.Empty;

    [BsonElement("systemPrompt")]
    public string? SystemPrompt { get; set; }

    [BsonElement("model")]
    public string? Model { get; set; }

    [BsonElement("outputVariable")]
    public string OutputVariable { get; set; } = "judge_result";
}

public class NotificationConfig
{
    [BsonElement("actionType")]
    public string ActionType { get; set; } = "workflow_notification";

    [BsonElement("remarksTemplate")]
    public string? RemarksTemplate { get; set; }

    [BsonElement("recipients")]
    public List<ApproverRule> Recipients { get; set; } = new();
}

public class ParallelConfig
{
    [BsonElement("branches")]
    public List<string> Branches { get; set; } = new();

    [BsonElement("mode")]
    public string Mode { get; set; } = "parallel";
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
