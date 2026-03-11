using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using System.Net.Http.Headers;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// End-to-end integration tests for cross-module business workflows.
/// Tests verify complete business processes spanning multiple modules:
/// Form Definition, Knowledge Base, Workflow Definition, and Document Approval.
/// </summary>
/// <remarks>
/// Requirements: 5.2, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2
/// 
/// Note: These tests are currently deferred pending the implementation of
/// workflow integration API endpoints including:
/// - Document submission workflow trigger
/// - Form-workflow binding
/// - Approver assignment
/// - Document-workflow state synchronization
/// </remarks>
[Collection("AppHost Collection")]
public class EndToEndIntegrationTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;
    private HttpClient _httpClient = null!;
    private string _accessToken = string.Empty;

    public EndToEndIntegrationTests(AppHostFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    /// <summary>
    /// Initializes authentication for the test by registering a unique test user
    /// and obtaining an access token. This method should be called at the beginning
    /// of each test that requires authentication.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 5.2, 8.1, 8.2
    /// 
    /// This method:
    /// 1. Generates a unique test user using TestDataGenerator.GenerateValidRegistration()
    /// 2. Registers the user via POST /api/auth/register
    /// 3. Logs in via POST /api/auth/login
    /// 4. Stores the access token in _accessToken field
    /// 5. Sets the Authorization header on _httpClient
    /// </remarks>
    private async Task InitializeAuthenticationAsync()
    {
        // Create a new HTTP client for this test
        _httpClient = _fixture.HttpClient;

        // Generate unique test user credentials
        var registration = TestDataGenerator.GenerateValidRegistration();

        _output.WriteLine($"Registering test user: {registration.Username}");

        // Register the test user
        var registerResponse = await _httpClient.PostAsJsonAsync(
            "/api/auth/register",
            registration);

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var registerApiResponse = await registerResponse.Content
            .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

        Assert.NotNull(registerApiResponse);
        Assert.True(registerApiResponse.Success,
            $"Registration failed for user '{registration.Username}'. Message: {registerApiResponse.Message}");
        Assert.NotNull(registerApiResponse.Data);

        _output.WriteLine($"✓ User registered successfully - User ID: {registerApiResponse.Data.Id}");

        // Login to get access token
        var loginRequest = new LoginRequest
        {
            Username = registration.Username,
            Password = registration.Password
        };

        var loginResponse = await _httpClient.PostAsJsonAsync(
            "/api/auth/login",
            loginRequest);

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginApiResponse = await loginResponse.Content
            .ReadAsJsonAsync<ApiResponse<LoginResponseData>>();

        Assert.NotNull(loginApiResponse);
        Assert.True(loginApiResponse.Success,
            $"Login failed for user '{registration.Username}'. Message: {loginApiResponse.Message}");
        Assert.NotNull(loginApiResponse.Data);
        Assert.NotNull(loginApiResponse.Data.Token);

        // Store the access token
        _accessToken = loginApiResponse.Data.Token;

        _output.WriteLine($"✓ User logged in successfully - Access token obtained");

        // Set the Authorization header on the HTTP client
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _accessToken);

        _output.WriteLine($"✓ Authorization header set on HTTP client");
    }

    // TODO: Implement end-to-end integration tests once workflow integration endpoints are available
    // The following tests are deferred pending API implementation:
    //
    // 1. Complete Document Approval Workflow (Requirement 6.1)
    //    - Create form definition → Create workflow definition → Create document → Submit approval → Approve
    //
    // 2. Form-Workflow Integration (Requirement 6.2)
    //    - Create workflow with bound form definition
    //    - Start workflow instance and verify form definition is loaded
    //
    // 3. Approver Assignment (Requirement 6.3)
    //    - Submit document and verify workflow instance approver list
    //
    // 4. Document-Workflow State Synchronization (Requirement 6.4)
    //    - Execute approval action and verify document and workflow instance states sync
    //
    // 5. Knowledge Base-Workflow Integration (Requirement 6.5)
    //    - Create workflow with knowledge search node
    //    - Verify workflow instance executes knowledge base query
}
