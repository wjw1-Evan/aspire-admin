using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Platform.AppHost.Tests.Helpers;

/// <summary>
/// Provides helper methods for validating JWT tokens in tests.
/// </summary>
public static class JwtValidator
{
    /// <summary>
    /// Validates that a token string is a properly formatted JWT token.
    /// </summary>
    /// <param name="token">The token string to validate.</param>
    /// <returns>True if the token is a valid JWT format, false otherwise.</returns>
    public static bool IsValidJwtFormat(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var handler = new JwtSecurityTokenHandler();
            return handler.CanReadToken(token);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Reads and parses a JWT token without validating its signature.
    /// </summary>
    /// <param name="token">The JWT token string to read.</param>
    /// <returns>The parsed JwtSecurityToken.</returns>
    /// <exception cref="ArgumentException">Thrown when the token is null, empty, or not a valid JWT format.</exception>
    public static JwtSecurityToken ReadToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Token cannot be null or empty.", nameof(token));
        }

        var handler = new JwtSecurityTokenHandler();

        if (!handler.CanReadToken(token))
        {
            throw new ArgumentException("Token is not a valid JWT format.", nameof(token));
        }

        return handler.ReadJwtToken(token);
    }

    /// <summary>
    /// Validates that a JWT token contains the required claims.
    /// </summary>
    /// <param name="token">The JWT token string to validate.</param>
    /// <param name="expectedUserId">The expected user ID claim value (optional).</param>
    /// <param name="expectedUsername">The expected username claim value (optional).</param>
    /// <returns>A validation result indicating success or failure with details.</returns>
    public static JwtValidationResult ValidateTokenClaims(
        string token,
        string? expectedUserId = null,
        string? expectedUsername = null)
    {
        try
        {
            var jwtToken = ReadToken(token);
            var claims = jwtToken.Claims.ToList();
            var errors = new List<string>();

            // Check for user ID claim (sub or nameid)
            var userIdClaim = claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == JwtRegisteredClaimNames.Sub ||
                c.Type == "nameid");

            if (userIdClaim == null)
            {
                errors.Add("Token does not contain a user ID claim (sub, nameid, or NameIdentifier).");
            }
            else if (expectedUserId != null && userIdClaim.Value != expectedUserId)
            {
                errors.Add($"User ID claim mismatch. Expected: {expectedUserId}, Actual: {userIdClaim.Value}");
            }

            // Check for username claim (name or unique_name)
            var usernameClaim = claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.Name ||
                c.Type == JwtRegisteredClaimNames.UniqueName ||
                c.Type == "unique_name");

            if (usernameClaim == null)
            {
                errors.Add("Token does not contain a username claim (name or unique_name).");
            }
            else if (expectedUsername != null && usernameClaim.Value != expectedUsername)
            {
                errors.Add($"Username claim mismatch. Expected: {expectedUsername}, Actual: {usernameClaim.Value}");
            }

            // Check for expiration claim
            if (jwtToken.ValidTo == DateTime.MinValue)
            {
                errors.Add("Token does not contain a valid expiration time (exp claim).");
            }
            else if (jwtToken.ValidTo <= DateTime.UtcNow)
            {
                errors.Add($"Token has expired. Expiration time: {jwtToken.ValidTo:O}");
            }

            return new JwtValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors,
                UserId = userIdClaim?.Value,
                Username = usernameClaim?.Value,
                ExpiresAt = jwtToken.ValidTo
            };
        }
        catch (Exception ex)
        {
            return new JwtValidationResult
            {
                IsValid = false,
                Errors = new List<string> { $"Failed to validate token: {ex.Message}" }
            };
        }
    }

    /// <summary>
    /// Extracts the user ID claim from a JWT token.
    /// </summary>
    /// <param name="token">The JWT token string.</param>
    /// <returns>The user ID claim value, or null if not found.</returns>
    public static string? GetUserId(string token)
    {
        try
        {
            var jwtToken = ReadToken(token);
            var userIdClaim = jwtToken.Claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == JwtRegisteredClaimNames.Sub ||
                c.Type == "nameid");

            return userIdClaim?.Value;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Extracts the username claim from a JWT token.
    /// </summary>
    /// <param name="token">The JWT token string.</param>
    /// <returns>The username claim value, or null if not found.</returns>
    public static string? GetUsername(string token)
    {
        try
        {
            var jwtToken = ReadToken(token);
            var usernameClaim = jwtToken.Claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.Name ||
                c.Type == JwtRegisteredClaimNames.UniqueName ||
                c.Type == "unique_name");

            return usernameClaim?.Value;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the expiration time from a JWT token.
    /// </summary>
    /// <param name="token">The JWT token string.</param>
    /// <returns>The expiration time, or null if not found or invalid.</returns>
    public static DateTime? GetExpirationTime(string token)
    {
        try
        {
            var jwtToken = ReadToken(token);
            return jwtToken.ValidTo != DateTime.MinValue ? jwtToken.ValidTo : null;
        }
        catch
        {
            return null;
        }
    }
}

/// <summary>
/// Represents the result of JWT token validation.
/// </summary>
public class JwtValidationResult
{
    /// <summary>
    /// Gets or sets whether the token is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the list of validation errors (empty if valid).
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Gets or sets the user ID extracted from the token.
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// Gets or sets the username extracted from the token.
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// Gets or sets the expiration time of the token.
    /// </summary>
    public DateTime ExpiresAt { get; set; }
}
