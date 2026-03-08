namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Represents the data returned from the current user endpoint.
/// </summary>
public class CurrentUserResponseData
{
    /// <summary>
    /// The user's unique identifier (MongoDB ObjectId).
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// The username.
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// The display name.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The user's avatar URL.
    /// </summary>
    public string? Avatar { get; set; }

    /// <summary>
    /// The user's email address.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// The user's roles.
    /// </summary>
    public List<string>? Roles { get; set; }

    /// <summary>
    /// The user's phone number.
    /// </summary>
    public string? PhoneNumber { get; set; }
}
