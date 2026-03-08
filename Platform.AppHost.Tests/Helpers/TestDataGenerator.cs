namespace Platform.AppHost.Tests.Helpers;

/// <summary>
/// Generates test data for authentication API tests.
/// Ensures data isolation by creating unique usernames and emails for each test execution.
/// </summary>
public static class TestDataGenerator
{
    /// <summary>
    /// Generates a valid registration request with unique username and email.
    /// Uses timestamp + GUID to ensure uniqueness across test runs.
    /// Username is kept under 20 characters to comply with validation rules.
    /// Phone number is generated uniquely to avoid MongoDB unique index conflicts.
    /// </summary>
    /// <returns>A valid RegisterRequest with unique credentials.</returns>
    public static RegisterRequest GenerateValidRegistration()
    {
        // Use last 6 digits of timestamp + 6 chars of GUID to keep username under 20 chars
        // Format: u_{timestamp6}_{guid6} = 2 + 6 + 1 + 6 = 15 characters
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var timestampSuffix = timestamp.Length >= 6 ? timestamp[^6..] : timestamp;
        var guid = Guid.NewGuid().ToString("N")[..6];

        return new RegisterRequest
        {
            Username = $"u_{timestampSuffix}_{guid}",
            Password = "Test@123456",
            Email = $"test_{timestamp}_{guid}@example.com",
            // Generate unique phone number to avoid MongoDB unique index conflicts on null values
            // Format: +1 followed by 10 digits from timestamp
            PhoneNumber = $"+1{timestamp[^10..]}"
        };
    }

    /// <summary>
    /// Generates an invalid registration request based on the specified validation type.
    /// Used for testing validation error handling.
    /// </summary>
    /// <param name="type">The type of validation error to generate.</param>
    /// <returns>A RegisterRequest with the specified validation error.</returns>
    /// <exception cref="ArgumentException">Thrown when an unknown validation type is specified.</exception>
    public static RegisterRequest GenerateInvalidRegistration(InvalidationType type)
    {
        var valid = GenerateValidRegistration();

        return type switch
        {
            InvalidationType.EmptyUsername => valid with { Username = "" },
            InvalidationType.ShortUsername => valid with { Username = "ab" },
            InvalidationType.ShortPassword => valid with { Password = "123" },
            InvalidationType.InvalidEmail => valid with { Email = "not-an-email" },
            _ => throw new ArgumentException($"Unknown validation type: {type}", nameof(type))
        };
    }
}

/// <summary>
/// Defines the types of validation errors that can be generated for testing.
/// </summary>
public enum InvalidationType
{
    /// <summary>
    /// Empty username (violates required field validation).
    /// </summary>
    EmptyUsername,

    /// <summary>
    /// Username shorter than minimum length (violates length validation).
    /// </summary>
    ShortUsername,

    /// <summary>
    /// Password shorter than minimum length (violates length validation).
    /// </summary>
    ShortPassword,

    /// <summary>
    /// Invalid email format (violates email format validation).
    /// </summary>
    InvalidEmail
}

/// <summary>
/// Represents a user registration request.
/// </summary>
public record RegisterRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
}

/// <summary>
/// Represents a user login request.
/// </summary>
public record LoginRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
