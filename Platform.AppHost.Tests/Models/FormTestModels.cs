namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Request model for creating or updating a form definition.
/// </summary>
public record FormDefinitionRequest
{
    /// <summary>
    /// The name of the form definition.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the form definition.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Optional unique key for the form definition. If not provided, will be auto-generated.
    /// </summary>
    public string? Key { get; init; }

    /// <summary>
    /// List of fields in the form definition.
    /// </summary>
    public List<FormFieldRequest> Fields { get; init; } = new();

    /// <summary>
    /// Indicates whether the form definition is active.
    /// </summary>
    public bool IsActive { get; init; } = true;
}

/// <summary>
/// Request model for a form field.
/// </summary>
public record FormFieldRequest
{
    /// <summary>
    /// The display label for the field.
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// The type of the field (e.g., "Text", "Number", "Date").
    /// </summary>
    public string Type { get; init; } = "Text";

    /// <summary>
    /// Indicates whether the field is required.
    /// </summary>
    public bool Required { get; init; } = false;

    /// <summary>
    /// The data key used to store the field value.
    /// </summary>
    public string DataKey { get; init; } = string.Empty;
}

/// <summary>
/// Response model for a form definition.
/// </summary>
public record FormDefinitionResponse
{
    /// <summary>
    /// The unique identifier of the form definition.
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// The name of the form definition.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Optional description of the form definition.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The unique key of the form definition.
    /// </summary>
    public string Key { get; init; } = string.Empty;

    /// <summary>
    /// List of fields in the form definition.
    /// </summary>
    public List<FormFieldRequest> Fields { get; init; } = new();

    /// <summary>
    /// Indicates whether the form definition is active.
    /// </summary>
    public bool IsActive { get; init; }
}
