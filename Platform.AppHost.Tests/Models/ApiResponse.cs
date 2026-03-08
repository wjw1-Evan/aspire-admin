namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Represents the standard API response wrapper used by the Platform.ApiService.
/// </summary>
/// <typeparam name="T">The type of the response data.</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Indicates whether the request was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Application-specific response code (e.g., "VALIDATION_ERROR", "UNAUTHORIZED").
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// Human-readable message describing the response.
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// The response data payload.
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Trace ID for request correlation and debugging.
    /// </summary>
    public string? TraceId { get; set; }

    /// <summary>
    /// Validation errors mapped by field name.
    /// </summary>
    public Dictionary<string, string[]>? Errors { get; set; }
}
