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
public class AuthenticationFlowTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;

    public AuthenticationFlowTests(AppHostFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
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
        const int iterations = 100;
        var httpClient = _fixture.HttpClient;

        _output.WriteLine($"Starting registration-login roundtrip property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            // Generate unique registration data for this iteration
            var registrationRequest = TestDataGenerator.GenerateValidRegistration();

            _output.WriteLine($"Iteration {i + 1}/{iterations}: Testing user '{registrationRequest.Username}'");

            // Step 1: Register the user
            var registerResponse = await httpClient.PostAsJsonAsync(
                "/api/auth/register",
                registrationRequest);

            // Verify registration succeeded
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

            _output.WriteLine($"  ✓ Registration successful - User ID: {registerApiResponse.Data.Id}");

            // Step 2: Login with the same credentials
            var loginRequest = new LoginRequest
            {
                Username = registrationRequest.Username,
                Password = registrationRequest.Password
            };

            var loginResponse = await httpClient.PostAsJsonAsync(
                "/api/auth/login",
                loginRequest);

            // Verify login succeeded
            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

            var loginApiResponse = await loginResponse.Content
                .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

            Assert.NotNull(loginApiResponse);
            Assert.True(loginApiResponse.Success,
                $"Login failed for user '{registrationRequest.Username}'. Message: {loginApiResponse.Message}");
            Assert.NotNull(loginApiResponse.Data);

            // Verify access token is present and valid
            Assert.NotNull(loginApiResponse.Data.Token);
            Assert.NotEmpty(loginApiResponse.Data.Token);

            // Verify token is a valid JWT format
            Assert.True(JwtValidator.IsValidJwtFormat(loginApiResponse.Data.Token),
                $"Token is not a valid JWT format for user '{registrationRequest.Username}'");

            // Verify token contains required claims with correct values
            var tokenValidation = JwtValidator.ValidateTokenClaims(
                loginApiResponse.Data.Token,
                expectedUserId: registerApiResponse.Data.Id,
                expectedUsername: registrationRequest.Username);

            Assert.True(tokenValidation.IsValid,
                $"Token validation failed for user '{registrationRequest.Username}'. Errors: {string.Join(", ", tokenValidation.Errors)}");

            _output.WriteLine($"  ✓ Login successful - Token valid with correct claims");

            // Verify refresh token is present
            Assert.NotNull(loginApiResponse.Data.RefreshToken);
            Assert.NotEmpty(loginApiResponse.Data.RefreshToken);

            _output.WriteLine($"  ✓ Refresh token present");
        }

        _output.WriteLine($"✓ All {iterations} registration-login roundtrip iterations completed successfully");
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
        const int iterations = 100;
        var httpClient = _fixture.HttpClient;

        _output.WriteLine($"Starting authentication token access property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            // Generate unique registration data for this iteration
            var registrationRequest = TestDataGenerator.GenerateValidRegistration();

            _output.WriteLine($"Iteration {i + 1}/{iterations}: Testing user '{registrationRequest.Username}'");

            // Step 1: Register the user
            var registerResponse = await httpClient.PostAsJsonAsync(
                "/api/auth/register",
                registrationRequest);

            Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

            var registerApiResponse = await registerResponse.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            Assert.NotNull(registerApiResponse);
            Assert.True(registerApiResponse.Success);
            Assert.NotNull(registerApiResponse.Data);
            Assert.NotNull(registerApiResponse.Data.Id);

            _output.WriteLine($"  ✓ Registration successful - User ID: {registerApiResponse.Data.Id}");

            // Step 2: Login to get access token
            var loginRequest = new LoginRequest
            {
                Username = registrationRequest.Username,
                Password = registrationRequest.Password
            };

            var loginResponse = await httpClient.PostAsJsonAsync(
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

            _output.WriteLine($"  ✓ Login successful - Access token obtained");

            // Step 3: Access protected endpoint WITH valid token
            using var authenticatedClient = new HttpClient
            {
                BaseAddress = httpClient.BaseAddress,
                Timeout = httpClient.Timeout
            };
            authenticatedClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

            var authenticatedResponse = await authenticatedClient.GetAsync("/api/auth/current-user");

            // Verify authenticated access succeeds
            Assert.Equal(HttpStatusCode.OK, authenticatedResponse.StatusCode);

            var currentUserApiResponse = await authenticatedResponse.Content
                .ReadAsJsonAsync<ApiResponse<CurrentUserResponseData>>();

            Assert.NotNull(currentUserApiResponse);
            Assert.True(currentUserApiResponse.Success,
                $"Authenticated request failed for user '{registrationRequest.Username}'. Message: {currentUserApiResponse.Message}");
            Assert.NotNull(currentUserApiResponse.Data);
            Assert.Equal(registerApiResponse.Data.Id, currentUserApiResponse.Data.Id);
            Assert.Equal(registrationRequest.Username, currentUserApiResponse.Data.Username);

            _output.WriteLine($"  ✓ Protected endpoint access with valid token: 200 OK");

            // Step 4: Access protected endpoint WITHOUT token
            var unauthenticatedResponse = await httpClient.GetAsync("/api/auth/current-user");

            // Verify unauthenticated access fails
            Assert.Equal(HttpStatusCode.Unauthorized, unauthenticatedResponse.StatusCode);

            _output.WriteLine($"  ✓ Protected endpoint access without token: 401 Unauthorized");

            // Step 5: Access protected endpoint WITH invalid token
            using var invalidTokenClient = new HttpClient
            {
                BaseAddress = httpClient.BaseAddress,
                Timeout = httpClient.Timeout
            };
            invalidTokenClient.DefaultRequestHeaders.Add("Authorization", "Bearer invalid-token-12345");

            var invalidTokenResponse = await invalidTokenClient.GetAsync("/api/auth/current-user");

            // Verify invalid token access fails
            Assert.Equal(HttpStatusCode.Unauthorized, invalidTokenResponse.StatusCode);

            _output.WriteLine($"  ✓ Protected endpoint access with invalid token: 401 Unauthorized");
        }

        _output.WriteLine($"✓ All {iterations} authentication token access iterations completed successfully");
    }
}
