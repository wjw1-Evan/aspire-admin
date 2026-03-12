namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Request model for creating or updating a workflow definition.
/// </summary>
public record WorkflowDefinitionRequest
{
    /// <summary>
    /// The name of the workflow definition.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the workflow definition.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The category of the workflow definition.
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// The graph structure of the workflow definition.
    /// </summary>
    public WorkflowGraphRequest Graph { get; init; } = new();

    /// <summary>
    /// Indicates whether the workflow definition is active.
    /// </summary>
    public bool IsActive { get; init; } = true;
}

/// <summary>
/// Generic paged result model for API responses.
/// </summary>
/// <typeparam name="T">The type of items in the list.</typeparam>
public record PagedResult<T>
{
    public List<T> List { get; init; } = new();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int Total { get; init; }
}


/// <summary>
/// Request model for a workflow graph structure.
/// </summary>
public record WorkflowGraphRequest
{
    /// <summary>
    /// List of nodes in the workflow graph.
    /// </summary>
    public List<WorkflowNodeRequest> Nodes { get; init; } = new();

    /// <summary>
    /// List of edges connecting nodes in the workflow graph.
    /// </summary>
    public List<WorkflowEdgeRequest> Edges { get; init; } = new();
}

/// <summary>
/// Request model for a workflow node.
/// </summary>
public record WorkflowNodeRequest
{
    /// <summary>
    /// The unique identifier of the node.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The type of the node.
    /// </summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>
    /// The data associated with the node.
    /// </summary>
    public NodeDataRequest Data { get; init; } = new();

    /// <summary>
    /// The position of the node in the graph.
    /// </summary>
    public NodePositionRequest Position { get; init; } = new();
}

/// <summary>
/// Request model for node data.
/// </summary>
public record NodeDataRequest
{
    /// <summary>
    /// Optional label for the node.
    /// </summary>
    public string? Label { get; init; }

    /// <summary>
    /// The type of the node (e.g., "start", "end", "ai", "approval").
    /// </summary>
    public string NodeType { get; init; } = string.Empty;

    /// <summary>
    /// Node-specific configuration object. The structure varies by node type.
    /// </summary>
    public object? Config { get; init; }
}

/// <summary>
/// Request model for node position in the graph.
/// </summary>
public record NodePositionRequest
{
    /// <summary>
    /// The X coordinate of the node.
    /// </summary>
    public double X { get; init; }

    /// <summary>
    /// The Y coordinate of the node.
    /// </summary>
    public double Y { get; init; }
}

/// <summary>
/// Request model for a workflow edge connecting two nodes.
/// </summary>
public record WorkflowEdgeRequest
{
    /// <summary>
    /// The unique identifier of the edge.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The source node ID.
    /// </summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>
    /// The target node ID.
    /// </summary>
    public string Target { get; init; } = string.Empty;

    /// <summary>
    /// Optional source handle for conditional branches.
    /// </summary>
    public string? SourceHandle { get; init; }
}

/// <summary>
/// Response model for a workflow instance.
/// </summary>
public record WorkflowInstanceResponse
{
    /// <summary>
    /// The unique identifier of the workflow instance.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The workflow definition ID that this instance is based on.
    /// </summary>
    public string WorkflowDefinitionId { get; init; } = string.Empty;

    /// <summary>
    /// The document ID associated with this workflow instance.
    /// </summary>
    public string DocumentId { get; init; } = string.Empty;

    /// <summary>
    /// The current status of the workflow instance (e.g., "Running", "Completed", "Failed").
    /// </summary>
    public string Status { get; init; } = string.Empty;
}
/// <summary>
/// Response model for a workflow definition.
/// </summary>
public record WorkflowDefinitionResponse
{
    /// <summary>
    /// The unique identifier of the workflow definition.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The name of the workflow definition.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the workflow definition.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The category of the workflow definition.
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// The graph structure of the workflow definition.
    /// </summary>
    public WorkflowGraphRequest Graph { get; init; } = new();

    /// <summary>
    /// The version of the workflow definition.
    /// </summary>
    public int Version { get; init; }

    /// <summary>
    /// Indicates whether the workflow definition is active.
    /// </summary>
    public bool IsActive { get; init; }
}



/// <summary>
/// Static class containing constants for all 26 supported workflow node types.
/// </summary>
public static class NodeTypes
{
    /// <summary>
    /// Start node - marks the beginning of a workflow.
    /// </summary>
    public const string Start = "start";

    /// <summary>
    /// End node - marks the completion of a workflow.
    /// </summary>
    public const string End = "end";

    /// <summary>
    /// AI node - performs AI-based operations.
    /// </summary>
    public const string Ai = "ai";

    /// <summary>
    /// AI Judge node - makes AI-based decisions.
    /// </summary>
    public const string AiJudge = "ai-judge";

    /// <summary>
    /// Answer node - provides responses or answers.
    /// </summary>
    public const string Answer = "answer";

    /// <summary>
    /// Approval node - handles approval workflows.
    /// </summary>
    public const string Approval = "approval";

    /// <summary>
    /// Code node - executes custom code.
    /// </summary>
    public const string Code = "code";

    /// <summary>
    /// Condition node - evaluates conditions for branching.
    /// </summary>
    public const string Condition = "condition";

    /// <summary>
    /// Document Extractor node - extracts data from documents.
    /// </summary>
    public const string DocumentExtractor = "document-extractor";

    /// <summary>
    /// Email node - sends email notifications.
    /// </summary>
    public const string Email = "email";

    /// <summary>
    /// HTTP Request node - makes HTTP API calls.
    /// </summary>
    public const string HttpRequest = "http-request";

    /// <summary>
    /// Human Input node - waits for human input.
    /// </summary>
    public const string HumanInput = "human-input";

    /// <summary>
    /// Iteration node - performs loops or iterations.
    /// </summary>
    public const string Iteration = "iteration";

    /// <summary>
    /// Knowledge Search node - searches knowledge bases.
    /// </summary>
    public const string KnowledgeSearch = "knowledge-search";

    /// <summary>
    /// List Operator node - performs operations on lists.
    /// </summary>
    public const string ListOperator = "list-operator";

    /// <summary>
    /// Log node - logs information.
    /// </summary>
    public const string Log = "log";

    /// <summary>
    /// Notification node - sends notifications.
    /// </summary>
    public const string Notification = "notification";

    /// <summary>
    /// Parameter Extractor node - extracts parameters from data.
    /// </summary>
    public const string ParameterExtractor = "parameter-extractor";

    /// <summary>
    /// Question Classifier node - classifies questions.
    /// </summary>
    public const string QuestionClassifier = "question-classifier";

    /// <summary>
    /// Set Variable node - sets workflow variables.
    /// </summary>
    public const string SetVariable = "set-variable";

    /// <summary>
    /// Speech to Text node - converts speech to text.
    /// </summary>
    public const string SpeechToText = "speech-to-text";

    /// <summary>
    /// Template node - processes templates.
    /// </summary>
    public const string Template = "template";

    /// <summary>
    /// Text to Speech node - converts text to speech.
    /// </summary>
    public const string TextToSpeech = "text-to-speech";

    /// <summary>
    /// Timer node - handles time-based operations.
    /// </summary>
    public const string Timer = "timer";

    /// <summary>
    /// Tool node - executes external tools.
    /// </summary>
    public const string Tool = "tool";

    /// <summary>
    /// Variable Aggregator node - aggregates multiple variables.
    /// </summary>
    public const string VariableAggregator = "variable-aggregator";

    /// <summary>
    /// Variable Assigner node - assigns values to variables.
    /// </summary>
    public const string VariableAssigner = "variable-assigner";

    /// <summary>
    /// Vision node - performs vision-based operations.
    /// </summary>
    public const string Vision = "vision";

    /// <summary>
    /// Parallel gateway node - handles parallel execution branches.
    /// </summary>
    public const string Parallel = "parallel";
}

