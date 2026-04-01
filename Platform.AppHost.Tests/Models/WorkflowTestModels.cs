using System.Text.Json;

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
    public int TotalPages { get; init; }
    public object? Summary { get; init; }
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

    /// <summary>
    /// Optional label for the edge (displayed on the connection line).
    /// </summary>
    public string? Label { get; init; }
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

    /// <summary>
    /// The current active node ID.
    /// </summary>
    public string? CurrentNodeId { get; init; }

    /// <summary>
    /// Workflow variables.
    /// </summary>
    public List<WorkflowVariableResponse>? Variables { get; init; }

    /// <summary>
    /// Current approver IDs for the active node.
    /// </summary>
    public List<string>? CurrentApproverIds { get; init; }

    /// <summary>
    /// Active approvals at the current node.
    /// </summary>
    public List<ActiveApprovalResponse>? ActiveApprovals { get; init; }

    /// <summary>
    /// The user who started this instance.
    /// </summary>
    public string? StartedBy { get; init; }

    /// <summary>
    /// When the instance was started.
    /// </summary>
    public DateTime? StartedAt { get; init; }
}

public record ActiveApprovalResponse
{
    public string NodeId { get; init; } = string.Empty;
    public List<string> ApproverIds { get; init; } = new();
}

/// <summary>
/// Response model for a workflow variable.
/// </summary>
public record WorkflowVariableResponse
{
    public string Key { get; init; } = string.Empty;
    public string? ValueJson { get; init; }
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
    public JsonElement? Version { get; init; }

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
    public const string Start = "start";
    public const string End = "end";
    public const string Approval = "approval";
    public const string Condition = "condition";
}
