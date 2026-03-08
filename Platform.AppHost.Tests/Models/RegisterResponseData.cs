namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Represents the data returned from a successful user registration.
/// </summary>
public class RegisterResponseData
{
    /// <summary>
    /// The unique identifier of the created user.
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// The username of the created user.
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// The email address of the created user.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Indicates whether the user account is active.
    /// </summary>
    public bool IsActive { get; set; }
}
