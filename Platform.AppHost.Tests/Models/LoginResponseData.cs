namespace Platform.AppHost.Tests.Models;

/// <summary>
/// Represents the data returned from a successful user login.
/// </summary>
public class LoginResponseData
{
    /// <summary>
    /// The type of authentication token (e.g., "Bearer").
    /// </summary>
    public string? Type { get; set; }

    /// <summary>
    /// The current authority or role of the authenticated user.
    /// </summary>
    public string? CurrentAuthority { get; set; }

    /// <summary>
    /// The JWT access token for authenticating subsequent requests.
    /// </summary>
    public string? Token { get; set; }

    /// <summary>
    /// The refresh token for obtaining new access tokens.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// The expiration timestamp of the access token.
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
}
