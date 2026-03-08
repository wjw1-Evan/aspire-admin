using System.Net;
using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Integration tests for the user login API endpoint.
/// Tests verify that the login endpoint behaves correctly in the distributed application context,
/// including authentication validation, token generation, and error handling.
/// </summary>
/// <remarks>
/// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
/// </remarks>
public class LoginTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;

    public LoginTests(AppHostFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    /// <summary>
    /// Feature: aspire-apphost-auth-tests, Property 4: 有效登录成功并返回完整令牌响应
    /// **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
    /// 
    /// Property: For any valid login credentials (correct username and password) of a registered user,
    /// sending a request to the login endpoint should return 200 OK status code, and the response
    /// should contain a valid JWT access token and refresh token, with the access token being a
    /// properly formatted JWT containing necessary claims (user ID, username, expiration time).
    /// </summary>
    [Fact]
    public async Task ValidLogin_ShouldSucceed_WithCompleteTokenResponse()
    {
        const int iterations = 100;
        var successCount = 0;
        var failureCount = 0;

        _output.WriteLine($"Starting property test: ValidLogin_ShouldSucceed_WithCompleteTokenResponse");
        _output.WriteLine($"Running {iterations} iterations...");

        for (int i = 0; i < iterations; i++)
        {
            try
            {
                // Generate unique registration data
                var registerRequest = TestDataGenerator.GenerateValidRegistration();

                _output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");
                _output.WriteLine($"Username: {registerRequest.Username}");

                // Step 1: Register a new user
                var registerResponse = await _fixture.HttpClient.PostAsJsonAsync(
                    "/api/auth/register", registerRequest);

                if (!registerResponse.IsSuccessStatusCode)
                {
                    var registerError = await registerResponse.Content.ReadAsStringAsync();
                    _output.WriteLine($"Registration failed: {registerResponse.StatusCode}");
                    _output.WriteLine($"Response: {registerError}");
                    Assert.Fail($"Registration failed for iteration {i + 1}: {registerResponse.StatusCode}");
                }

                var registerApiResponse = await registerResponse.Content
                    .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

                Assert.NotNull(registerApiResponse);
                Assert.True(registerApiResponse.Success,
                    $"Registration should succeed. Message: {registerApiResponse.Message}");
                Assert.NotNull(registerApiResponse.Data);
                Assert.NotNull(registerApiResponse.Data.Id);

                // Step 2: Login with the same credentials
                var loginRequest = new LoginRequest
                {
                    Username = registerRequest.Username,
                    Password = registerRequest.Password
                };

                var loginResponse = await _fixture.HttpClient.PostAsJsonAsync(
                    "/api/auth/login", loginRequest);

                var loginContent = await loginResponse.Content.ReadAsStringAsync();
                _output.WriteLine($"Login Status: {loginResponse.StatusCode}");
                _output.WriteLine($"Login Response: {loginContent}");

                // Verify status code is 200 OK
                Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

                // Verify response structure
                var loginApiResponse = await loginResponse.Content
                    .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

                Assert.NotNull(loginApiResponse);
                Assert.True(loginApiResponse.Success,
                    $"Login should succeed. Message: {loginApiResponse.Message}");
                Assert.NotNull(loginApiResponse.Data);

                // Verify access token is present
                Assert.NotNull(loginApiResponse.Data.Token);
                Assert.False(string.IsNullOrWhiteSpace(loginApiResponse.Data.Token),
                    "Access token should not be empty");

                // Verify refresh token is present
                Assert.NotNull(loginApiResponse.Data.RefreshToken);
                Assert.False(string.IsNullOrWhiteSpace(loginApiResponse.Data.RefreshToken),
                    "Refresh token should not be empty");

                // Verify access token is a valid JWT format
                Assert.True(JwtValidator.IsValidJwtFormat(loginApiResponse.Data.Token),
                    "Access token should be a valid JWT format");

                // Verify JWT contains necessary claims
                var validationResult = JwtValidator.ValidateTokenClaims(
                    loginApiResponse.Data.Token,
                    expectedUsername: registerRequest.Username);

                if (!validationResult.IsValid)
                {
                    _output.WriteLine("JWT validation errors:");
                    foreach (var error in validationResult.Errors)
                    {
                        _output.WriteLine($"  - {error}");
                    }
                }

                Assert.True(validationResult.IsValid,
                    $"JWT should contain necessary claims. Errors: {string.Join(", ", validationResult.Errors)}");

                // Verify specific claims
                Assert.NotNull(validationResult.UserId);
                Assert.Equal(registerRequest.Username, validationResult.Username);
                Assert.True(validationResult.ExpiresAt > DateTime.UtcNow,
                    "Token expiration time should be in the future");

                _output.WriteLine($"✓ Iteration {i + 1} passed");
                _output.WriteLine($"  User ID: {validationResult.UserId}");
                _output.WriteLine($"  Username: {validationResult.Username}");
                _output.WriteLine($"  Expires At: {validationResult.ExpiresAt:O}");

                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                _output.WriteLine($"✗ Iteration {i + 1} failed: {ex.Message}");
                throw;
            }
        }

        _output.WriteLine($"\n=== Test Summary ===");
        _output.WriteLine($"Total iterations: {iterations}");
        _output.WriteLine($"Successful: {successCount}");
        _output.WriteLine($"Failed: {failureCount}");
        _output.WriteLine($"Success rate: {(successCount * 100.0 / iterations):F2}%");
    }

    /// <summary>
    /// Feature: aspire-apphost-auth-tests, Property 5: 无效凭据登录失败
    /// **Validates: Requirements 5.4, 9.1, 9.2**
    /// 
    /// Property: For any invalid login credentials (non-existent username OR wrong password),
    /// sending a request to the login endpoint should return an error response (401 or similar
    /// status code), and the response should not contain an access token.
    /// </summary>
    [Fact]
    public async Task InvalidCredentials_ShouldFail_WithErrorResponse()
    {
        const int iterations = 100;
        var successCount = 0;
        var failureCount = 0;

        _output.WriteLine($"Starting property test: InvalidCredentials_ShouldFail_WithErrorResponse");
        _output.WriteLine($"Running {iterations} iterations...");

        var random = new Random();

        for (int i = 0; i < iterations; i++)
        {
            try
            {
                _output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");

                LoginRequest loginRequest;
                string scenario;

                // Randomly choose between two scenarios:
                // 1. Non-existent username (50% chance)
                // 2. Wrong password for an existing user (50% chance)
                if (random.Next(2) == 0)
                {
                    // Scenario 1: Non-existent username
                    scenario = "Non-existent username";
                    var fakeUsername = $"nonexistent_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
                    loginRequest = new LoginRequest
                    {
                        Username = fakeUsername,
                        Password = "SomePassword123"
                    };

                    _output.WriteLine($"Scenario: {scenario}");
                    _output.WriteLine($"Username: {loginRequest.Username}");
                }
                else
                {
                    // Scenario 2: Wrong password for existing user
                    scenario = "Wrong password";

                    // First, register a user
                    var registerRequest = TestDataGenerator.GenerateValidRegistration();
                    var registerResponse = await _fixture.HttpClient.PostAsJsonAsync(
                        "/api/auth/register", registerRequest);

                    if (!registerResponse.IsSuccessStatusCode)
                    {
                        var registerError = await registerResponse.Content.ReadAsStringAsync();
                        _output.WriteLine($"Registration failed: {registerResponse.StatusCode}");
                        _output.WriteLine($"Response: {registerError}");
                        Assert.Fail($"Registration failed for iteration {i + 1}: {registerResponse.StatusCode}");
                    }

                    // Now try to login with wrong password
                    loginRequest = new LoginRequest
                    {
                        Username = registerRequest.Username,
                        Password = "WrongPassword123!" // Different from the registered password
                    };

                    _output.WriteLine($"Scenario: {scenario}");
                    _output.WriteLine($"Username: {loginRequest.Username} (registered)");
                    _output.WriteLine($"Using wrong password");
                }

                // Attempt login with invalid credentials
                var loginResponse = await _fixture.HttpClient.PostAsJsonAsync(
                    "/api/auth/login", loginRequest);

                var loginContent = await loginResponse.Content.ReadAsStringAsync();
                _output.WriteLine($"Login Status: {loginResponse.StatusCode}");
                _output.WriteLine($"Login Response: {loginContent}");

                // Verify status code is an error (401 Unauthorized or similar)
                Assert.False(loginResponse.IsSuccessStatusCode,
                    $"Login with invalid credentials should fail. Status: {loginResponse.StatusCode}");

                // Typically should be 401 Unauthorized, but accept other error codes
                Assert.True(
                    loginResponse.StatusCode == HttpStatusCode.Unauthorized ||
                    loginResponse.StatusCode == HttpStatusCode.BadRequest ||
                    loginResponse.StatusCode == HttpStatusCode.Forbidden,
                    $"Expected error status code (401, 400, or 403), got {loginResponse.StatusCode}");

                // Verify response does not contain access token
                var loginApiResponse = await loginResponse.Content
                    .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

                if (loginApiResponse != null)
                {
                    // If we got a structured response, verify it indicates failure
                    Assert.False(loginApiResponse.Success,
                        "Response should indicate failure");

                    // Verify no token is present in the data
                    if (loginApiResponse.Data != null)
                    {
                        Assert.True(
                            string.IsNullOrWhiteSpace(loginApiResponse.Data.Token),
                            "Response should not contain an access token");
                    }

                    _output.WriteLine($"Error Code: {loginApiResponse.Code}");
                    _output.WriteLine($"Error Message: {loginApiResponse.Message}");
                }

                _output.WriteLine($"✓ Iteration {i + 1} passed ({scenario})");
                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                _output.WriteLine($"✗ Iteration {i + 1} failed: {ex.Message}");
                throw;
            }
        }

        _output.WriteLine($"\n=== Test Summary ===");
        _output.WriteLine($"Total iterations: {iterations}");
        _output.WriteLine($"Successful: {successCount}");
        _output.WriteLine($"Failed: {failureCount}");
        _output.WriteLine($"Success rate: {(successCount * 100.0 / iterations):F2}%");
    }
}
