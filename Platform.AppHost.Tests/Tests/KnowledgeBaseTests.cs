using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using System.Net.Http.Headers;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Integration tests for Knowledge Base API endpoints.
/// Tests verify CRUD operations, pagination, filtering, and validation
/// for knowledge bases in the distributed application context.
/// </summary>
/// <remarks>
/// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.1, 5.2, 5.4, 8.1, 8.2
/// </remarks>
public class KnowledgeBaseTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;
    private HttpClient _httpClient = null!;
    private string _accessToken = string.Empty;

    public KnowledgeBaseTests(AppHostFixture fixture, ITestOutputHelper output)
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

    /// <summary>
    /// Tests that creating a knowledge base with valid data returns 200 OK and a generated ID.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.1, 2.6
    /// 
    /// This test verifies:
    /// 1. POST /api/knowledgebases with valid knowledge base data returns 200 OK
    /// 2. Response contains success=true
    /// 3. Response data contains a generated ID (non-empty string)
    /// 4. Response data contains the knowledge base name matching the request
    /// </remarks>
    [Fact]
    public async Task CreateKnowledgeBase_WithValidData_ShouldSucceed()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();

        _output.WriteLine($"Creating knowledge base with name: {kbRequest.Name}");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

        // Read response first before asserting
        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();

        // Log the error details if the request failed
        if (response.StatusCode != HttpStatusCode.OK)
        {
            _output.WriteLine($"API returned {response.StatusCode}");
            _output.WriteLine($"API Error - Code: {apiResponse?.Code}, Message: {apiResponse?.Message}");
            if (apiResponse?.Errors != null)
            {
                foreach (var error in apiResponse.Errors)
                {
                    _output.WriteLine($"  Field '{error.Key}': {string.Join(", ", error.Value)}");
                }
            }
        }

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base creation failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.NotEmpty(apiResponse.Data.Id);
        Assert.Equal(kbRequest.Name, apiResponse.Data.Name);

        _output.WriteLine($"✓ Knowledge base created successfully - ID: {apiResponse.Data.Id}");
    }

    /// <summary>
    /// Tests that creating a knowledge base without a required field (name) returns a validation error.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.6
    /// 
    /// This test verifies:
    /// 1. POST /api/knowledgebases with missing name field returns 400 Bad Request
    /// 2. Response contains success=false
    /// 3. Response contains a validation error code or message
    /// </remarks>
    [Fact]
    public async Task CreateKnowledgeBase_WithMissingRequiredField_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var kbRequest = new KnowledgeBaseRequest
        {
            Name = "", // Missing required field
            Description = "Test knowledge base without name",
            Category = "测试分类"
        };

        _output.WriteLine("Attempting to create knowledge base with missing name field");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.False(apiResponse.Success);

        // Verify that the response contains validation error information
        var hasValidationError =
            (apiResponse.Code != null && apiResponse.Code.Contains("VALIDATION", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Message != null && apiResponse.Message.Contains("name", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Errors != null && apiResponse.Errors.Count > 0);

        Assert.True(hasValidationError,
            $"Expected validation error for missing name field. Code: {apiResponse.Code}, Message: {apiResponse.Message}");

        _output.WriteLine($"✓ Validation error returned as expected - Code: {apiResponse.Code}, Message: {apiResponse.Message}");
    }

    /// <summary>
    /// Property-based test: CRUD Round-trip Consistency (Knowledge Bases)
    /// Feature: apphost-api-tests-expansion, Property 2: CRUD Round-trip Consistency (Knowledge Bases)
    ///
    /// **Validates: Requirements 2.1, 2.3**
    ///
    /// For any valid knowledge base with name and category, creating the knowledge base and then
    /// retrieving it by ID should return a knowledge base object with the same name, category, and description.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task KnowledgeBaseCrudRoundtrip_ShouldMaintainConsistency()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting CRUD Round-trip property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate random knowledge base data
            var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Creating knowledge base: {kbRequest.Name}");

            // Create knowledge base
            var createResponse = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

            // Read response
            var createApiResponse = await createResponse.Content
                .ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();

            // Assert creation succeeded
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
            Assert.NotNull(createApiResponse);
            Assert.True(createApiResponse.Success,
                $"[Iteration {i + 1}] Knowledge base creation failed. Message: {createApiResponse.Message}");
            Assert.NotNull(createApiResponse.Data);
            Assert.NotEmpty(createApiResponse.Data.Id);

            var createdKbId = createApiResponse.Data.Id;

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Knowledge base created - ID: {createdKbId}");

            // Retrieve knowledge base by ID
            var getResponse = await _httpClient.GetAsync($"/api/workflow/knowledge-bases/{createdKbId}");

            // Read response
            var getApiResponse = await getResponse.Content
                .ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();

            // Assert retrieval succeeded
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            Assert.NotNull(getApiResponse);
            Assert.True(getApiResponse.Success,
                $"[Iteration {i + 1}] Knowledge base retrieval failed. Message: {getApiResponse.Message}");
            Assert.NotNull(getApiResponse.Data);

            // Requirement 2.3: Verify data consistency between create and retrieve
            Assert.Equal(kbRequest.Name, getApiResponse.Data.Name);
            Assert.Equal(kbRequest.Category, getApiResponse.Data.Category);
            Assert.Equal(kbRequest.Description, getApiResponse.Data.Description);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Round-trip consistency verified");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that getting the knowledge base list returns paginated data with correct structure.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.2, 2.7
    /// 
    /// This test verifies:
    /// 1. GET /api/knowledgebases returns 200 OK
    /// 2. Response contains paginated data structure (list, page, pageSize, total)
    /// 3. Each knowledge base object contains required fields (Id, Name, Category)
    /// </remarks>
    [Fact]
    public async Task GetKnowledgeBaseList_ShouldReturnPagedData()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a few knowledge bases to ensure we have data
        for (int i = 0; i < 3; i++)
        {
            var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
            await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        }

        _output.WriteLine("Fetching knowledge base list with pagination");

        // Act
        var response = await _httpClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base list retrieval failed. Message: {apiResponse.Message}");

        // Verify pagination structure
        ApiTestHelpers.AssertPagedResponse<KnowledgeBaseResponse>(apiResponse, expectedCurrent: 1, expectedPageSize: 10);

        _output.WriteLine("✓ Knowledge base list returned with valid pagination structure");
    }

    /// <summary>
    /// Tests that getting the knowledge base list with keyword filtering returns only matching knowledge bases.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.2, 2.7
    /// 
    /// This test verifies:
    /// 1. GET /api/knowledgebases?keyword={keyword} returns 200 OK
    /// 2. Response contains only knowledge bases with names or descriptions matching the keyword
    /// 3. Knowledge bases without matching names/descriptions are excluded
    /// </remarks>
    [Fact]
    public async Task GetKnowledgeBaseList_WithKeywordFilter_ShouldReturnMatchingKnowledgeBases()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a knowledge base with a unique keyword in the name
        var uniqueKeyword = $"unique_{Guid.NewGuid().ToString("N")[..8]}";
        var matchingKbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        matchingKbRequest = matchingKbRequest with { Name = $"{uniqueKeyword}_kb" };

        var createResponse = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", matchingKbRequest);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        _output.WriteLine($"Created knowledge base with keyword: {uniqueKeyword}");

        // Create another knowledge base without the keyword
        var nonMatchingKbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", nonMatchingKbRequest);

        // Act
        var response = await _httpClient.GetAsync($"/api/workflow/knowledge-bases?keyword={uniqueKeyword}&current=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base list retrieval with keyword failed. Message: {apiResponse.Message}");

        // Parse the data array to verify filtering
        var dataJson = System.Text.Json.JsonSerializer.Serialize(apiResponse.Data);
        var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);
        var dataArray = pagedData.GetProperty("list");

        // Verify that all returned knowledge bases contain the keyword
        foreach (var item in dataArray.EnumerateArray())
        {
            var name = item.GetProperty("name").GetString();
            Assert.Contains(uniqueKeyword, name, StringComparison.OrdinalIgnoreCase);
        }

        _output.WriteLine($"✓ Keyword filtering returned only matching knowledge bases");
    }

    /// <summary>
    /// Tests that updating a knowledge base with valid data returns 200 OK and reflects the changes.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.4, 2.8
    /// 
    /// This test verifies:
    /// 1. PUT /api/knowledgebases/{id} with valid update data returns 200 OK
    /// 2. Response contains the updated knowledge base data
    /// 3. Subsequent GET request returns the updated data
    /// 4. IsActive status can be updated correctly
    /// </remarks>
    [Fact]
    public async Task UpdateKnowledgeBase_WithValidData_ShouldSucceed()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a knowledge base first
        var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        var createResponse = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        var kbId = createApiResponse!.Data!.Id;

        _output.WriteLine($"Created knowledge base with ID: {kbId}");

        // Prepare update data
        var updateRequest = kbRequest with
        {
            Name = $"{kbRequest.Name}_updated",
            Description = "Updated description",
            IsActive = false
        };

        _output.WriteLine($"Updating knowledge base to name: {updateRequest.Name}");

        // Act
        var response = await _httpClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{kbId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base update failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.Equal(updateRequest.Name, apiResponse.Data.Name);
        Assert.Equal(updateRequest.Description, apiResponse.Data.Description);
        Assert.Equal(updateRequest.IsActive, apiResponse.Data.IsActive);

        _output.WriteLine($"✓ Knowledge base updated successfully");

        // Verify the update persisted by fetching the knowledge base again
        var getResponse = await _httpClient.GetAsync($"/api/workflow/knowledge-bases/{kbId}");
        var getApiResponse = await getResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        Assert.NotNull(getApiResponse);
        Assert.True(getApiResponse.Success);
        Assert.Equal(updateRequest.Name, getApiResponse.Data!.Name);
        Assert.Equal(updateRequest.IsActive, getApiResponse.Data.IsActive);

        _output.WriteLine($"✓ Update verified via GET request");
    }

    /// <summary>
    /// Tests that deleting a knowledge base returns 200 OK and subsequent GET returns 404.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 2.5
    /// 
    /// This test verifies:
    /// 1. DELETE /api/knowledgebases/{id} returns 200 OK
    /// 2. Subsequent GET /api/knowledgebases/{id} returns 404 Not Found
    /// </remarks>
    [Fact]
    public async Task DeleteKnowledgeBase_ShouldSucceedAndReturn404OnGet()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a knowledge base first
        var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        var createResponse = await _httpClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        var kbId = createApiResponse!.Data!.Id;

        _output.WriteLine($"Created knowledge base with ID: {kbId}");

        // Act - Delete the knowledge base
        var deleteResponse = await _httpClient.DeleteAsync($"/api/workflow/knowledge-bases/{kbId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        _output.WriteLine($"✓ Knowledge base deleted successfully");

        // Verify the knowledge base is no longer accessible
        var getResponse = await _httpClient.GetAsync($"/api/workflow/knowledge-bases/{kbId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

        _output.WriteLine($"✓ Subsequent GET returned 404 as expected");
    }
}
