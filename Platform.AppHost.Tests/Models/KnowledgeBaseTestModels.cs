namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Request model for creating or updating a knowledge base.
/// </summary>
public record KnowledgeBaseRequest
{
    /// <summary>
    /// The name of the knowledge base.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the knowledge base.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The category of the knowledge base.
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Indicates whether the knowledge base is active.
    /// </summary>
    public bool IsActive { get; init; } = true;
}

/// <summary>
/// Response model for a knowledge base.
/// </summary>
public record KnowledgeBaseResponse
{
    /// <summary>
    /// The unique identifier of the knowledge base.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The name of the knowledge base.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the knowledge base.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The category of the knowledge base.
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Indicates whether the knowledge base is active.
    /// </summary>
    public bool IsActive { get; init; }

    /// <summary>
    /// The number of items in the knowledge base.
    /// </summary>
    public int ItemCount { get; init; }
}
