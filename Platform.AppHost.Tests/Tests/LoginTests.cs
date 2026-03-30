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
/// See: https://aspire.dev/zh-cn/testing/overview/
/// </remarks>
[Collection("AppHost Collection")]
public class LoginTests : BaseIntegrationTest
{
    public LoginTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
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
        const int iterations = 10;
        var successCount = 0;
        var failureCount = 0;

        Output.WriteLine($"Starting property test: ValidLogin_ShouldSucceed_WithCompleteTokenResponse");
        Output.WriteLine($"Running {iterations} iterations...");

        for (int i = 0; i < iterations; i++)
        {
            try
            {
                // Generate unique registration data
                var registerRequest = TestDataGenerator.GenerateValidRegistration();

                Output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");
                Output.WriteLine($"Username: {registerRequest.Username}");

                // Step 1: Register a new user
                var registerResponse = await TestClient.PostAsJsonAsync(
                    "/api/auth/register", registerRequest);

                if (!registerResponse.IsSuccessStatusCode)
                {
                    var registerError = await registerResponse.Content.ReadAsStringAsync();
                    Output.WriteLine($"Registration failed: {registerResponse.StatusCode}");
                    Output.WriteLine($"Response: {registerError}");
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

                var loginResponse = await TestClient.PostAsJsonAsync(
                    "/api/auth/login", loginRequest);

                var loginContent = await loginResponse.Content.ReadAsStringAsync();
                Output.WriteLine($"Login Status: {loginResponse.StatusCode}");
                Output.WriteLine($"Login Response: {loginContent}");

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
                    Output.WriteLine("JWT validation errors:");
                    foreach (var error in validationResult.Errors)
                    {
                        Output.WriteLine($"  - {error}");
                    }
                }

                Assert.True(validationResult.IsValid,
                    $"JWT should contain necessary claims. Errors: {string.Join(", ", validationResult.Errors)}");

                // Verify specific claims
                Assert.NotNull(validationResult.UserId);
                Assert.Equal(registerRequest.Username, validationResult.Username);
                Assert.True(validationResult.ExpiresAt > DateTime.UtcNow,
                    "Token expiration time should be in the future");

                Output.WriteLine($"✓ Iteration {i + 1} passed");
                Output.WriteLine($"  User ID: {validationResult.UserId}");
                Output.WriteLine($"  Username: {validationResult.Username}");
                Output.WriteLine($"  Expires At: {validationResult.ExpiresAt:O}");

                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                Output.WriteLine($"✗ Iteration {i + 1} failed: {ex.Message}");
                throw;
            }
        }

        Output.WriteLine($"\n=== Test Summary ===");
        Output.WriteLine($"Total iterations: {iterations}");
        Output.WriteLine($"Successful: {successCount}");
        Output.WriteLine($"Failed: {failureCount}");
        Output.WriteLine($"Success rate: {(successCount * 100.0 / iterations):F2}%");
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
        const int iterations = 10;
        var successCount = 0;
        var failureCount = 0;

        Output.WriteLine($"Starting property test: InvalidCredentials_ShouldFail_WithErrorResponse");
        Output.WriteLine($"Running {iterations} iterations...");

        var random = new Random();

        for (int i = 0; i < iterations; i++)
        {
            try
            {
                Output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");

                LoginRequest loginRequest;
                string scenario;

                // Randomly choose between two scenarios:
                // 1. Non-existent username (50% chance)
                // 2. Wrong password for an existing user (50% chance)
                if (random.Next(2) == 0)
                {
                    // Scenario 1: Non-existent username
                    scenario = "Non-existent username";
                    var fakeUsername = $"nonexistent_{Guid.NewGuid():N}";
                    loginRequest = new LoginRequest
                    {
                        Username = fakeUsername,
                        Password = "SomePassword123"
                    };

                    Output.WriteLine($"Scenario: {scenario}");
                    Output.WriteLine($"Username: {loginRequest.Username}");
                }
                else
                {
                    // Scenario 2: Wrong password for existing user
                    scenario = "Wrong password";

                    // First, register a user
                    var registerRequest = TestDataGenerator.GenerateValidRegistration();
                    var registerResponse = await TestClient.PostAsJsonAsync(
                        "/api/auth/register", registerRequest);

                    if (!registerResponse.IsSuccessStatusCode)
                    {
                        var registerError = await registerResponse.Content.ReadAsStringAsync();
                        Output.WriteLine($"Registration failed: {registerResponse.StatusCode}");
                        Output.WriteLine($"Response: {registerError}");
                        Assert.Fail($"Registration failed for iteration {i + 1}: {registerResponse.StatusCode}");
                    }

                    // Now try to login with wrong password
                    loginRequest = new LoginRequest
                    {
                        Username = registerRequest.Username,
                        Password = "WrongPassword123!" // Different from the registered password
                    };

                    Output.WriteLine($"Scenario: {scenario}");
                    Output.WriteLine($"Username: {loginRequest.Username} (registered)");
                    Output.WriteLine($"Using wrong password");
                }

                // Attempt login with invalid credentials
                var loginResponse = await TestClient.PostAsJsonAsync(
                    "/api/auth/login", loginRequest);

                var loginContent = await loginResponse.Content.ReadAsStringAsync();
                Output.WriteLine($"Login Status: {loginResponse.StatusCode}");
                Output.WriteLine($"Login Response: {loginContent}");

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

                    Output.WriteLine($"Error Code: {loginApiResponse.Code}");
                    Output.WriteLine($"Error Message: {loginApiResponse.Message}");
                }

                Output.WriteLine($"✓ Iteration {i + 1} passed ({scenario})");
                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                Output.WriteLine($"✗ Iteration {i + 1} failed: {ex.Message}");
                throw;
            }
        }

        Output.WriteLine($"\n=== Test Summary ===");
        Output.WriteLine($"Total iterations: {iterations}");
        Output.WriteLine($"Successful: {successCount}");
        Output.WriteLine($"Failed: {failureCount}");
        Output.WriteLine($"Success rate: {(successCount * 100.0 / iterations):F2}%");
    }
}
