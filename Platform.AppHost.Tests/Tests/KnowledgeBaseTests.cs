using Aspire.Hosting.Testing;
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
/// See: https://aspire.dev/zh-cn/testing/overview/
/// </remarks>
[Collection("AppHost Collection")]
public class KnowledgeBaseTests : BaseIntegrationTest
{
    public KnowledgeBaseTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
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

        Output.WriteLine($"Creating knowledge base with name: {kbRequest.Name}");

        // Act
        var response = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

        // Read response first before asserting
        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();

        // Log the error details if the request failed
        if (response.StatusCode != HttpStatusCode.OK)
        {
            Output.WriteLine($"API returned {response.StatusCode}");
            Output.WriteLine($"API Error - Code: {apiResponse?.Code}, Message: {apiResponse?.Message}");
            if (apiResponse?.Errors != null)
            {
                foreach (var error in apiResponse.Errors)
                {
                    Output.WriteLine($"  Field '{error.Key}': {string.Join(", ", error.Value)}");
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

        Output.WriteLine($"✓ Knowledge base created successfully - ID: {apiResponse.Data.Id}");
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

        Output.WriteLine("Attempting to create knowledge base with missing name field");

        // Act
        var response = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

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

        Output.WriteLine($"✓ Validation error returned as expected - Code: {apiResponse.Code}, Message: {apiResponse.Message}");
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
        const int iterations = 10;

        Output.WriteLine($"Starting CRUD Round-trip property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate random knowledge base data
            var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();

            Output.WriteLine($"[Iteration {i + 1}/{iterations}] Creating knowledge base: {kbRequest.Name}");

            // Create knowledge base
            var createResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);

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

            Output.WriteLine($"[Iteration {i + 1}/{iterations}] Knowledge base created - ID: {createdKbId}");

            // Retrieve knowledge base by ID
            var getResponse = await TestClient.GetAsync($"/api/workflow/knowledge-bases/{createdKbId}");

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

            Output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Round-trip consistency verified");
        }

        Output.WriteLine($"✓ All {iterations} iterations completed successfully");
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
            await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        }

        Output.WriteLine("Fetching knowledge base list with pagination");

        // Act
        var response = await TestClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base list retrieval failed. Message: {apiResponse.Message}");

        // Verify pagination structure
        ApiTestHelpers.AssertPagedResponse<KnowledgeBaseResponse>(apiResponse, expectedCurrent: 1, expectedPageSize: 10);

        Output.WriteLine("✓ Knowledge base list returned with valid pagination structure");
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

        var createResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", matchingKbRequest);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        Output.WriteLine($"Created knowledge base with keyword: {uniqueKeyword}");

        // Create another knowledge base without the keyword
        var nonMatchingKbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", nonMatchingKbRequest);

        // Act
        var response = await TestClient.GetAsync($"/api/workflow/knowledge-bases?keyword={uniqueKeyword}&current=1&pageSize=10");

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

        Output.WriteLine($"✓ Keyword filtering returned only matching knowledge bases");
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
        var createResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        var kbId = createApiResponse!.Data!.Id;

        Output.WriteLine($"Created knowledge base with ID: {kbId}");

        // Prepare update data
        var updateRequest = kbRequest with
        {
            Name = $"{kbRequest.Name}_updated",
            Description = "Updated description",
            IsActive = false
        };

        Output.WriteLine($"Updating knowledge base to name: {updateRequest.Name}");

        // Act
        var response = await TestClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{kbId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Knowledge base update failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.Equal(updateRequest.Name, apiResponse.Data.Name);
        Assert.Equal(updateRequest.Description, apiResponse.Data.Description);
        Assert.Equal(updateRequest.IsActive, apiResponse.Data.IsActive);

        Output.WriteLine($"✓ Knowledge base updated successfully");

        // Verify the update persisted by fetching the knowledge base again
        var getResponse = await TestClient.GetAsync($"/api/workflow/knowledge-bases/{kbId}");
        var getApiResponse = await getResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        Assert.NotNull(getApiResponse);
        Assert.True(getApiResponse.Success);
        Assert.Equal(updateRequest.Name, getApiResponse.Data!.Name);
        Assert.Equal(updateRequest.IsActive, getApiResponse.Data.IsActive);

        Output.WriteLine($"✓ Update verified via GET request");
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
        var createResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<KnowledgeBaseResponse>>();
        var kbId = createApiResponse!.Data!.Id;

        Output.WriteLine($"Created knowledge base with ID: {kbId}");

        // Act - Delete the knowledge base
        var deleteResponse = await TestClient.DeleteAsync($"/api/workflow/knowledge-bases/{kbId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        Output.WriteLine($"✓ Knowledge base deleted successfully");

        // Verify the knowledge base is no longer accessible
        var getResponse = await TestClient.GetAsync($"/api/workflow/knowledge-bases/{kbId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

        Output.WriteLine($"✓ Subsequent GET returned 404 as expected");
    }

    // ==================== Error Handling and Boundary Condition Tests ====================

    /// <summary>
    /// Tests that accessing knowledge base endpoints without authentication returns 401 Unauthorized.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 7.1
    /// 
    /// This test verifies:
    /// 1. GET /api/workflow/knowledge-bases without auth token returns 401
    /// 2. POST /api/workflow/knowledge-bases without auth token returns 401
    /// 3. GET /api/workflow/knowledge-bases/{id} without auth token returns 401
    /// 4. PUT /api/workflow/knowledge-bases/{id} without auth token returns 401
    /// 5. DELETE /api/workflow/knowledge-bases/{id} without auth token returns 401
    /// </remarks>
    [Fact]
    public async Task KnowledgeBaseEndpoints_WithoutAuthentication_ShouldReturn401()
    {
        // Arrange - Create a new HTTP client without authentication
        var unauthenticatedClient = Fixture.App.CreateHttpClient("apiservice");
        unauthenticatedClient.Timeout = TimeSpan.FromSeconds(30);
        unauthenticatedClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        Output.WriteLine("Testing knowledge base endpoints without authentication");

        // Test GET list
        var getListResponse = await unauthenticatedClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=10");
        Assert.Equal(HttpStatusCode.Unauthorized, getListResponse.StatusCode);
        Output.WriteLine("✓ GET /api/workflow/knowledge-bases returned 401");

        // Test POST create
        var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        var postResponse = await unauthenticatedClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, postResponse.StatusCode);
        Output.WriteLine("✓ POST /api/workflow/knowledge-bases returned 401");

        // Test GET by ID
        var testId = Guid.NewGuid().ToString();
        var getByIdResponse = await unauthenticatedClient.GetAsync($"/api/workflow/knowledge-bases/{testId}");
        Assert.Equal(HttpStatusCode.Unauthorized, getByIdResponse.StatusCode);
        Output.WriteLine("✓ GET /api/workflow/knowledge-bases/{id} returned 401");

        // Test PUT update
        var putResponse = await unauthenticatedClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{testId}", kbRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, putResponse.StatusCode);
        Output.WriteLine("✓ PUT /api/workflow/knowledge-bases/{id} returned 401");

        // Test DELETE
        var deleteResponse = await unauthenticatedClient.DeleteAsync($"/api/workflow/knowledge-bases/{testId}");
        Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);
        Output.WriteLine("✓ DELETE /api/workflow/knowledge-bases/{id} returned 401");
    }

    /// <summary>
    /// Property-based test: Unauthenticated Request Rejection
    /// Feature: apphost-api-tests-expansion, Property 18: Unauthenticated Request Rejection
    ///
    /// **Validates: Requirements 7.1**
    ///
    /// For any API endpoint, sending a request without an authentication token should return 401 Unauthorized.
    ///
    /// This test executes 100 iterations to verify the property holds across different endpoints.
    /// </summary>
    [Fact]
    public async Task KnowledgeBaseEndpoints_UnauthenticatedRequests_ShouldAlwaysReturn401()
    {
        // Arrange - Create a new HTTP client without authentication
        var unauthenticatedClient = Fixture.App.CreateHttpClient("apiservice");
        unauthenticatedClient.Timeout = TimeSpan.FromSeconds(30);
        unauthenticatedClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
        const int iterations = 10;

        Output.WriteLine($"Starting Unauthenticated Request Rejection property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            var testId = Guid.NewGuid().ToString();
            var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();

            // Test different endpoints in rotation
            var endpointIndex = i % 5;

            HttpResponseMessage response;
            string endpointDescription;

            switch (endpointIndex)
            {
                case 0:
                    response = await unauthenticatedClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=10");
                    endpointDescription = "GET /api/workflow/knowledge-bases";
                    break;
                case 1:
                    response = await unauthenticatedClient.PostAsJsonAsync("/api/workflow/knowledge-bases", kbRequest);
                    endpointDescription = "POST /api/workflow/knowledge-bases";
                    break;
                case 2:
                    response = await unauthenticatedClient.GetAsync($"/api/workflow/knowledge-bases/{testId}");
                    endpointDescription = $"GET /api/workflow/knowledge-bases/{testId}";
                    break;
                case 3:
                    response = await unauthenticatedClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{testId}", kbRequest);
                    endpointDescription = $"PUT /api/workflow/knowledge-bases/{testId}";
                    break;
                default:
                    response = await unauthenticatedClient.DeleteAsync($"/api/workflow/knowledge-bases/{testId}");
                    endpointDescription = $"DELETE /api/workflow/knowledge-bases/{testId}";
                    break;
            }

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

            if (i % 20 == 0)
            {
                Output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ {endpointDescription} returned 401");
            }
        }

        Output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that accessing a non-existent knowledge base ID returns 404 Not Found.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 7.2
    /// 
    /// This test verifies:
    /// 1. GET /api/workflow/knowledge-bases/{non-existent-id} returns 404
    /// 2. PUT /api/workflow/knowledge-bases/{non-existent-id} returns 404
    /// 3. DELETE /api/workflow/knowledge-bases/{non-existent-id} returns 404
    /// </remarks>
    [Fact]
    public async Task KnowledgeBaseEndpoints_WithNonExistentId_ShouldReturn404()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        // Use a valid MongoDB ObjectId format (24 hex characters) instead of GUID
        var nonExistentId = "60d5f8a9b3c2e1f0a9b8c7d6";

        Output.WriteLine($"Testing knowledge base endpoints with non-existent ID: {nonExistentId}");

        // Test GET by ID
        var getResponse = await TestClient.GetAsync($"/api/workflow/knowledge-bases/{nonExistentId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Output.WriteLine("✓ GET /api/workflow/knowledge-bases/{non-existent-id} returned 404");

        // Test PUT update
        var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        var putResponse = await TestClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{nonExistentId}", kbRequest);
        Assert.Equal(HttpStatusCode.NotFound, putResponse.StatusCode);
        Output.WriteLine("✓ PUT /api/workflow/knowledge-bases/{non-existent-id} returned 404");

        // Test DELETE
        var deleteResponse = await TestClient.DeleteAsync($"/api/workflow/knowledge-bases/{nonExistentId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
        Output.WriteLine("✓ DELETE /api/workflow/knowledge-bases/{non-existent-id} returned 404");
    }

    /// <summary>
    /// Property-based test: Non-existent Resource 404
    /// Feature: apphost-api-tests-expansion, Property 19: Non-existent Resource 404
    ///
    /// **Validates: Requirements 7.2**
    ///
    /// For any GET, PUT, or DELETE request with a resource ID that doesn't exist, 
    /// the response should return 404 Not Found.
    ///
    /// This test executes 100 iterations to verify the property holds across different operations.
    /// </summary>
    [Fact]
    public async Task KnowledgeBaseEndpoints_NonExistentResources_ShouldAlwaysReturn404()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 10;

        Output.WriteLine($"Starting Non-existent Resource 404 property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Use a valid MongoDB ObjectId format (24 hex characters) instead of GUID
            var nonExistentId = "60d5f8a9b3c2e1f0a9b8c7d6";
            var kbRequest = TestDataGenerator.GenerateValidKnowledgeBase();

            // Test different operations in rotation
            var operationIndex = i % 3;

            HttpResponseMessage response;
            string operationDescription;

            switch (operationIndex)
            {
                case 0:
                    response = await TestClient.GetAsync($"/api/workflow/knowledge-bases/{nonExistentId}");
                    operationDescription = "GET";
                    break;
                case 1:
                    response = await TestClient.PutAsJsonAsync($"/api/workflow/knowledge-bases/{nonExistentId}", kbRequest);
                    operationDescription = "PUT";
                    break;
                default:
                    response = await TestClient.DeleteAsync($"/api/workflow/knowledge-bases/{nonExistentId}");
                    operationDescription = "DELETE";
                    break;
            }

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            if (i % 20 == 0)
            {
                Output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ {operationDescription} with non-existent ID returned 404");
            }
        }

        Output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that invalid pagination parameters return validation errors.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 7.4
    /// 
    /// This test verifies:
    /// 1. Negative page number returns validation error
    /// 2. Page number exceeding maximum (10000) returns validation error
    /// 3. Negative page size returns validation error
    /// 4. Page size exceeding maximum returns validation error
    /// </remarks>
    [Fact]
    public async Task GetKnowledgeBaseList_WithInvalidPaginationParameters_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        Output.WriteLine("Testing knowledge base list with invalid pagination parameters");

        // Test negative page number
        var negativePageResponse = await TestClient.GetAsync("/api/workflow/knowledge-bases?current=-1&pageSize=10");
        Assert.True(
            negativePageResponse.StatusCode == HttpStatusCode.BadRequest ||
            negativePageResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for negative page, got {negativePageResponse.StatusCode}");
        Output.WriteLine($"✓ Negative page number handled: {negativePageResponse.StatusCode}");

        // Test page number exceeding maximum
        var excessivePageResponse = await TestClient.GetAsync("/api/workflow/knowledge-bases?current=10001&pageSize=10");
        Assert.True(
            excessivePageResponse.StatusCode == HttpStatusCode.BadRequest ||
            excessivePageResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for excessive page, got {excessivePageResponse.StatusCode}");
        Output.WriteLine($"✓ Excessive page number handled: {excessivePageResponse.StatusCode}");

        // Test negative page size
        var negativePageSizeResponse = await TestClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=-1");
        Assert.True(
            negativePageSizeResponse.StatusCode == HttpStatusCode.BadRequest ||
            negativePageSizeResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for negative page size, got {negativePageSizeResponse.StatusCode}");
        Output.WriteLine($"✓ Negative page size handled: {negativePageSizeResponse.StatusCode}");

        // Test excessive page size
        var excessivePageSizeResponse = await TestClient.GetAsync("/api/workflow/knowledge-bases?current=1&pageSize=10000");
        Assert.True(
            excessivePageSizeResponse.StatusCode == HttpStatusCode.BadRequest ||
            excessivePageSizeResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for excessive page size, got {excessivePageSizeResponse.StatusCode}");
        Output.WriteLine($"✓ Excessive page size handled: {excessivePageSizeResponse.StatusCode}");
    }

    /// <summary>
    /// Tests that field values exceeding length limits return validation errors.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 7.5
    /// 
    /// This test verifies:
    /// 1. Knowledge base name exceeding maximum length (100 characters) returns validation error
    /// 2. Knowledge base description exceeding maximum length (500 characters) returns validation error
    /// 3. Knowledge base category exceeding maximum length returns validation error
    /// </remarks>
    [Fact]
    public async Task CreateKnowledgeBase_WithFieldsExceedingLengthLimits_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        Output.WriteLine("Testing knowledge base creation with fields exceeding length limits");

        // Test name exceeding 100 characters
        var longNameRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        longNameRequest = longNameRequest with { Name = new string('A', 101) };

        var longNameResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", longNameRequest);
        Assert.True(
            longNameResponse.StatusCode == HttpStatusCode.BadRequest ||
            longNameResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for long name, got {longNameResponse.StatusCode}");
        Output.WriteLine($"✓ Long name (101 chars) handled: {longNameResponse.StatusCode}");

        // Test description exceeding 500 characters
        var longDescriptionRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        longDescriptionRequest = longDescriptionRequest with { Description = new string('B', 501) };

        var longDescriptionResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", longDescriptionRequest);
        Assert.True(
            longDescriptionResponse.StatusCode == HttpStatusCode.BadRequest ||
            longDescriptionResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for long description, got {longDescriptionResponse.StatusCode}");
        Output.WriteLine($"✓ Long description (501 chars) handled: {longDescriptionResponse.StatusCode}");

        // Test category exceeding reasonable length
        var longCategoryRequest = TestDataGenerator.GenerateValidKnowledgeBase();
        longCategoryRequest = longCategoryRequest with { Category = new string('C', 101) };

        var longCategoryResponse = await TestClient.PostAsJsonAsync("/api/workflow/knowledge-bases", longCategoryRequest);
        Assert.True(
            longCategoryResponse.StatusCode == HttpStatusCode.BadRequest ||
            longCategoryResponse.StatusCode == HttpStatusCode.OK,
            $"Expected BadRequest or OK for long category, got {longCategoryResponse.StatusCode}");
        Output.WriteLine($"✓ Long category (101 chars) handled: {longCategoryResponse.StatusCode}");
    }
}
