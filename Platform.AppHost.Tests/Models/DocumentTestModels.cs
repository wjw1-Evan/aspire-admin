namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Request model for creating or updating a document.
/// </summary>
public record DocumentRequest
{
    /// <summary>
    /// The title of the document.
    /// </summary>
    public string Title { get; init; } = string.Empty;

    /// <summary>
    /// Optional content of the document.
    /// </summary>
    public string? Content { get; init; }

    /// <summary>
    /// The type of the document (e.g., "公文", "报告", "通知").
    /// </summary>
    public string DocumentType { get; init; } = string.Empty;

    /// <summary>
    /// Optional category of the document.
    /// </summary>
    public string? Category { get; init; }

    /// <summary>
    /// Optional form data as key-value pairs for dynamic form fields.
    /// </summary>
    public Dictionary<string, object>? FormData { get; init; }
}

/// <summary>
/// Response model for a document.
/// </summary>
public record DocumentResponse
{
    /// <summary>
    /// The unique identifier of the document.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The title of the document.
    /// </summary>
    public string Title { get; init; } = string.Empty;

    /// <summary>
    /// Optional content of the document.
    /// </summary>
    public string? Content { get; init; }

    /// <summary>
    /// The type of the document.
    /// </summary>
    public string DocumentType { get; init; } = string.Empty;

    /// <summary>
    /// The current status of the document (e.g., "Draft", "Submitted", "Approved", "Rejected").
    /// </summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>
    /// Optional workflow instance ID if the document has been submitted for approval.
    /// </summary>
    public string? WorkflowInstanceId { get; init; }
}

/// <summary>
/// Request model for submitting a document for approval workflow.
/// </summary>
public record SubmitDocumentRequest
{
    /// <summary>
    /// The workflow definition ID to use for the approval process.
    /// </summary>
    public string WorkflowDefinitionId { get; init; } = string.Empty;

    /// <summary>
    /// Optional variables to pass to the workflow instance.
    /// </summary>
    public Dictionary<string, object>? Variables { get; init; }
}

/// <summary>
/// Request model for performing an approval action on a document.
/// </summary>
public record ApprovalRequest
{
    /// <summary>
    /// Optional comment for the approval action (required for rejection).
    /// </summary>
    public string? Comment { get; init; }

    /// <summary>
    /// Optional variables to update during the approval action.
    /// </summary>
    public Dictionary<string, object>? Variables { get; init; }
}



/// <summary>
/// Response model for an approval record in the approval history.
/// </summary>
public record ApprovalRecordResponse
{
    /// <summary>
    /// The unique identifier of the approval record.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The workflow instance ID this approval record belongs to.
    /// </summary>
    public string WorkflowInstanceId { get; init; } = string.Empty;

    /// <summary>
    /// The node ID in the workflow where this approval occurred.
    /// </summary>
    public string NodeId { get; init; } = string.Empty;

    /// <summary>
    /// The ID of the user who performed the approval action.
    /// </summary>
    public string ApproverId { get; init; } = string.Empty;

    /// <summary>
    /// The name of the approver.
    /// </summary>
    public string? ApproverName { get; init; }

    /// <summary>
    /// The approval action performed (e.g., "Approve", "Reject", "Return", "Delegate").
    /// </summary>
    public string Action { get; init; } = string.Empty;

    /// <summary>
    /// Optional comment provided by the approver.
    /// </summary>
    public string? Comment { get; init; }

    /// <summary>
    /// The timestamp when the approval action was performed.
    /// </summary>
    public DateTime? ApprovedAt { get; init; }

    /// <summary>
    /// The sequence number of this approval in the workflow.
    /// </summary>
    public int Sequence { get; init; }
}
