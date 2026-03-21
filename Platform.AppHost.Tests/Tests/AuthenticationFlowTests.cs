using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// End-to-end integration tests for the complete authentication flow.
/// Tests verify that the registration-then-login workflow functions correctly
/// in the distributed application context, including token generation and
/// protected endpoint access.
/// </summary>
/// <remarks>
/// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
/// </remarks>
[Collection("AppHost Collection")]
public class AuthenticationFlowTests : BaseIntegrationTest
{
    public AuthenticationFlowTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
    }

    /// <summary>
    /// Property-based test: Registration-Login Roundtrip Should Succeed
    /// Feature: aspire-apphost-auth-tests, Property 6: 注册-登录往返成功
    /// 
    /// Validates: Requirements 6.1, 6.2, 6.4, 6.5, 9.1, 9.2, 9.4
    /// 
    /// For any valid user registration data, completing registration followed by
    /// immediate login with the same credentials should succeed, return a valid
    /// access token, and the login response user information should match the
    /// registration data (username, email).
    /// </summary>
    [Fact]
    public async Task RegistrationLoginRoundtrip_ShouldSucceed()
    {
        const int iterations = 10;

        Output.WriteLine($"Starting registration-login roundtrip property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            var registrationRequest = TestDataGenerator.GenerateValidRegistration();

            Output.WriteLine($"Iteration {i + 1}/{iterations}: Testing user '{registrationRequest.Username}'");

            var registerResponse = await TestClient.PostAsJsonAsync(
                "/api/auth/register",
                registrationRequest);

            Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

            var registerApiResponse = await registerResponse.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            Assert.NotNull(registerApiResponse);
            Assert.True(registerApiResponse.Success,
                $"Registration failed for user '{registrationRequest.Username}'. Message: {registerApiResponse.Message}");
            Assert.NotNull(registerApiResponse.Data);
            Assert.NotNull(registerApiResponse.Data.Id);
            Assert.Equal(registrationRequest.Username, registerApiResponse.Data.Username);
            Assert.Equal(registrationRequest.Email, registerApiResponse.Data.Email);

            Output.WriteLine($"  ✓ Registration successful - User ID: {registerApiResponse.Data.Id}");

            var loginRequest = new LoginRequest
            {
                Username = registrationRequest.Username,
                Password = registrationRequest.Password
            };

            var loginResponse = await TestClient.PostAsJsonAsync(
                "/api/auth/login",
                loginRequest);

            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

            var loginApiResponse = await loginResponse.Content
                .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

            Assert.NotNull(loginApiResponse);
            Assert.True(loginApiResponse.Success,
                $"Login failed for user '{registrationRequest.Username}'. Message: {loginApiResponse.Message}");
            Assert.NotNull(loginApiResponse.Data);

            Assert.NotNull(loginApiResponse.Data.Token);
            Assert.NotEmpty(loginApiResponse.Data.Token);

            Assert.True(JwtValidator.IsValidJwtFormat(loginApiResponse.Data.Token),
                $"Token is not a valid JWT format for user '{registrationRequest.Username}'");

            var tokenValidation = JwtValidator.ValidateTokenClaims(
                loginApiResponse.Data.Token,
                expectedUserId: registerApiResponse.Data.Id,
                expectedUsername: registrationRequest.Username);

            Assert.True(tokenValidation.IsValid,
                $"Token validation failed for user '{registrationRequest.Username}'. Errors: {string.Join(", ", tokenValidation.Errors)}");

            Output.WriteLine($"  ✓ Login successful - Token valid with correct claims");

            Assert.NotNull(loginApiResponse.Data.RefreshToken);
            Assert.NotEmpty(loginApiResponse.Data.RefreshToken);

            Output.WriteLine($"  ✓ Refresh token present");
        }

        Output.WriteLine($"✓ All {iterations} registration-login roundtrip iterations completed successfully");
    }

    /// <summary>
    /// Property-based test: Authentication Token Should Grant Protected Endpoint Access
    /// Feature: aspire-apphost-auth-tests, Property 7: 身份验证令牌授予受保护端点访问权限
    /// 
    /// Validates: Requirements 6.3, 9.1, 9.2, 9.4
    /// 
    /// For any valid access token obtained through login, using that token as a Bearer
    /// token to access protected endpoints (like /api/auth/current-user) should succeed
    /// and return 200 OK with user information, while accessing without a token or with
    /// an invalid token should return 401 Unauthorized.
    /// </summary>
    [Fact]
    public async Task AuthenticationToken_ShouldGrantProtectedEndpointAccess()
    {
        const int iterations = 10;

        Output.WriteLine($"Starting authentication token access property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            var registrationRequest = TestDataGenerator.GenerateValidRegistration();

            Output.WriteLine($"Iteration {i + 1}/{iterations}: Testing user '{registrationRequest.Username}'");

            var registerResponse = await TestClient.PostAsJsonAsync(
                "/api/auth/register",
                registrationRequest);

            Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

            var registerApiResponse = await registerResponse.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            Assert.NotNull(registerApiResponse);
            Assert.True(registerApiResponse.Success);
            Assert.NotNull(registerApiResponse.Data);
            Assert.NotNull(registerApiResponse.Data.Id);

            Output.WriteLine($"  ✓ Registration successful - User ID: {registerApiResponse.Data.Id}");

            var loginRequest = new LoginRequest
            {
                Username = registrationRequest.Username,
                Password = registrationRequest.Password
            };

            var loginResponse = await TestClient.PostAsJsonAsync(
                "/api/auth/login",
                loginRequest);

            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

            var loginApiResponse = await loginResponse.Content
                .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

            Assert.NotNull(loginApiResponse);
            Assert.True(loginApiResponse.Success);
            Assert.NotNull(loginApiResponse.Data);
            Assert.NotNull(loginApiResponse.Data.Token);

            var accessToken = loginApiResponse.Data.Token;

            Output.WriteLine($"  ✓ Login successful - Access token obtained");

            using var authenticatedClient = new System.Net.Http.HttpClient
            {
                BaseAddress = Fixture.HttpClient.BaseAddress
            };
            authenticatedClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var authenticatedResponse = await authenticatedClient.GetAsync("/api/auth/current-user");

            Assert.Equal(HttpStatusCode.OK, authenticatedResponse.StatusCode);

            var currentUserApiResponse = await authenticatedResponse.Content
                .ReadAsJsonAsync<ApiResponse<CurrentUserResponseData>>();

            Assert.NotNull(currentUserApiResponse);
            Assert.True(currentUserApiResponse.Success,
                $"Authenticated request failed for user '{registrationRequest.Username}'. Message: {currentUserApiResponse.Message}");
            Assert.NotNull(currentUserApiResponse.Data);
            Assert.Equal(registerApiResponse.Data.Id, currentUserApiResponse.Data.Id);
            Assert.Equal(registrationRequest.Username, currentUserApiResponse.Data.Username);

            Output.WriteLine($"  ✓ Protected endpoint access with valid token: 200 OK");

            TestClient.DefaultRequestHeaders.Authorization = null;
            var unauthenticatedResponse = await TestClient.GetAsync("/api/auth/current-user");

            Assert.Equal(HttpStatusCode.Unauthorized, unauthenticatedResponse.StatusCode);

            Output.WriteLine($"  ✓ Protected endpoint access without token: 401 Unauthorized");

            using var invalidTokenClient = new System.Net.Http.HttpClient
            {
                BaseAddress = Fixture.HttpClient.BaseAddress
            };
            invalidTokenClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "invalid-token-12345");

            var invalidTokenResponse = await invalidTokenClient.GetAsync("/api/auth/current-user");

            Assert.Equal(HttpStatusCode.Unauthorized, invalidTokenResponse.StatusCode);

            Output.WriteLine($"  ✓ Protected endpoint access with invalid token: 401 Unauthorized");
        }

        Output.WriteLine($"✓ All {iterations} authentication token access iterations completed successfully");
    }
}
