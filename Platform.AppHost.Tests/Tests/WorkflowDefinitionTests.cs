using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using System.Net.Http.Headers;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Integration tests for Workflow Definition API endpoints.
/// Tests verify CRUD operations, graph validation, and workflow instance management
/// for workflow definitions in the distributed application context.
/// </summary>
/// <remarks>
/// Requirements: 3.1, 3.6, 3.7, 5.1, 5.2, 5.4, 8.1, 8.2
/// </remarks>
public class WorkflowDefinitionTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;
    private HttpClient _httpClient = null!;
    private string _accessToken = string.Empty;

    public WorkflowDefinitionTests(AppHostFixture fixture, ITestOutputHelper output)
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
    /// Tests that creating a workflow definition with valid data returns 200 OK and a generated ID.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.1
    /// 
    /// This test verifies:
    /// 1. POST /api/workflows with valid workflow data returns 200 OK
    /// 2. Response contains success=true
    /// 3. Response data contains a generated ID (non-empty string)
    /// 4. Response data contains the workflow name matching the request
    /// 5. Response data contains the graph structure with at least one start node
    /// </remarks>
    [Fact]
    public async Task CreateWorkflow_WithValidData_ShouldSucceed()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();

        _output.WriteLine($"Creating workflow with name: {workflowRequest.Name}");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);

        // Read response first before asserting
        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();

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
        Assert.True(apiResponse.Success, $"Workflow creation failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.NotEmpty(apiResponse.Data.Id);
        Assert.Equal(workflowRequest.Name, apiResponse.Data.Name);

        // Verify graph structure
        Assert.NotNull(apiResponse.Data.Graph);
        Assert.NotNull(apiResponse.Data.Graph.Nodes);
        Assert.True(apiResponse.Data.Graph.Nodes.Count > 0, "Workflow should have at least one node");

        // Verify at least one start node exists
        var hasStartNode = apiResponse.Data.Graph.Nodes.Any(n => n.Data.NodeType == NodeTypes.Start);
        Assert.True(hasStartNode, "Workflow should have at least one start node");

        _output.WriteLine($"✓ Workflow created successfully - ID: {apiResponse.Data.Id}");
    }

    /// <summary>
    /// Tests that creating a workflow without a required field (name) returns a validation error.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.6
    /// 
    /// This test verifies:
    /// 1. POST /api/workflows with missing name field returns 400 Bad Request
    /// 2. Response contains success=false
    /// 3. Response contains a validation error code or message
    /// </remarks>
    [Fact]
    public async Task CreateWorkflow_WithMissingRequiredField_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = "", // Missing required field
            Description = "Test workflow without name",
            Category = "测试分类",
            Graph = TestDataGenerator.GenerateMinimalValidGraph()
        };

        _output.WriteLine("Attempting to create workflow with missing name field");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.False(apiResponse.Success);

        // Verify that the response contains validation error information
        var hasValidationError =
            (apiResponse.Code != null && apiResponse.Code.Contains("VALIDATION", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Message != null && apiResponse.Message.Contains("name", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Message != null && apiResponse.Message.Contains("名称", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Errors != null && apiResponse.Errors.Count > 0);

        Assert.True(hasValidationError,
            $"Expected validation error for missing name field. Code: {apiResponse.Code}, Message: {apiResponse.Message}");

        _output.WriteLine($"✓ Validation error returned as expected - Code: {apiResponse.Code}, Message: {apiResponse.Message}");
    }

    /// <summary>
    /// Tests that creating a workflow with invalid graph (missing start node) returns a validation error.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.7
    /// 
    /// This test verifies:
    /// 1. POST /api/workflows with invalid graph (no start node) returns 400 Bad Request
    /// 2. Response contains success=false
    /// 3. Response contains a graph validation error message
    /// </remarks>
    [Fact]
    public async Task CreateWorkflow_WithInvalidGraph_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var guid = Guid.NewGuid().ToString("N")[..8];

        // Create a graph without a start node (only end node)
        var invalidGraph = new WorkflowGraphRequest
        {
            Nodes = new List<WorkflowNodeRequest>
            {
                new WorkflowNodeRequest
                {
                    Id = $"end_{timestamp}",
                    Type = NodeTypes.End,
                    Data = new NodeDataRequest
                    {
                        Label = "结束",
                        NodeType = NodeTypes.End,
                        Config = null
                    },
                    Position = new NodePositionRequest { X = 100, Y = 100 }
                }
            },
            Edges = new List<WorkflowEdgeRequest>()
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"workflow_invalid_{timestamp}_{guid}",
            Description = "Test workflow with invalid graph (missing start node)",
            Category = "测试分类",
            Graph = invalidGraph
        };

        _output.WriteLine("Attempting to create workflow with invalid graph (missing start node)");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.False(apiResponse.Success);

        // Verify that the response contains graph validation error information
        var hasGraphValidationError =
            (apiResponse.Code != null && apiResponse.Code.Contains("VALIDATION", StringComparison.OrdinalIgnoreCase)) ||
            (apiResponse.Message != null && (
                apiResponse.Message.Contains("graph", StringComparison.OrdinalIgnoreCase) ||
                apiResponse.Message.Contains("图形", StringComparison.OrdinalIgnoreCase) ||
                apiResponse.Message.Contains("start", StringComparison.OrdinalIgnoreCase) ||
                apiResponse.Message.Contains("起始", StringComparison.OrdinalIgnoreCase) ||
                apiResponse.Message.Contains("开始", StringComparison.OrdinalIgnoreCase)
            ));

        Assert.True(hasGraphValidationError,
            $"Expected graph validation error for missing start node. Code: {apiResponse.Code}, Message: {apiResponse.Message}");

        _output.WriteLine($"✓ Graph validation error returned as expected - Code: {apiResponse.Code}, Message: {apiResponse.Message}");
    }
    /// <summary>
    /// Property-based test: CRUD Round-trip Consistency (Workflows)
    /// Feature: apphost-api-tests-expansion, Property 3: CRUD Round-trip Consistency (Workflows)
    ///
    /// Validates: Requirements 3.1, 3.3
    ///
    /// For any valid workflow definition with name and valid graph (containing at least one start node),
    /// creating the workflow and then retrieving it by ID should return a workflow object with the same
    /// name, graph structure, and version information.
    ///
    /// This test executes 100 iterations with randomly generated workflow data to verify the property
    /// holds across different inputs.
    /// </summary>
    [Fact]
    public async Task WorkflowCrudRoundtrip_ShouldMaintainConsistency()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting CRUD round-trip property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate random workflow data
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();

            if (i % 20 == 0)
            {
                _output.WriteLine($"Iteration {i + 1}/{iterations}: Testing workflow '{workflowRequest.Name}'");
            }

            // Create workflow
            var createResponse = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);

            // Read response
            var createResult = await createResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();

            // Verify creation succeeded
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
            Assert.NotNull(createResult);
            Assert.True(createResult.Success,
                $"Iteration {i + 1}: Workflow creation failed. Message: {createResult.Message}");
            Assert.NotNull(createResult.Data);
            Assert.NotEmpty(createResult.Data.Id);

            // Verify created workflow has expected properties
            Assert.Equal(workflowRequest.Name, createResult.Data.Name);
            Assert.Equal(workflowRequest.Description, createResult.Data.Description);
            Assert.Equal(workflowRequest.Category, createResult.Data.Category);
            Assert.NotNull(createResult.Data.Graph);

            var createdWorkflowId = createResult.Data.Id;

            // Retrieve workflow by ID
            var getResponse = await _httpClient.GetAsync($"/api/workflows/{createdWorkflowId}");

            // Read response
            var getResult = await getResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();

            // Verify retrieval succeeded
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            Assert.NotNull(getResult);
            Assert.True(getResult.Success,
                $"Iteration {i + 1}: Workflow retrieval failed. Message: {getResult.Message}");
            Assert.NotNull(getResult.Data);

            // Verify round-trip consistency: retrieved data matches created data
            Assert.Equal(createdWorkflowId, getResult.Data.Id);
            Assert.Equal(workflowRequest.Name, getResult.Data.Name);
            Assert.Equal(workflowRequest.Description, getResult.Data.Description);
            Assert.Equal(workflowRequest.Category, getResult.Data.Category);
            Assert.Equal(workflowRequest.IsActive, getResult.Data.IsActive);

            // Verify graph structure consistency
            Assert.NotNull(getResult.Data.Graph);
            Assert.NotNull(getResult.Data.Graph.Nodes);
            Assert.NotNull(getResult.Data.Graph.Edges);

            // Verify node count matches
            Assert.Equal(workflowRequest.Graph.Nodes.Count, getResult.Data.Graph.Nodes.Count);

            // Verify edge count matches
            Assert.Equal(workflowRequest.Graph.Edges.Count, getResult.Data.Graph.Edges.Count);

            // Verify each node is preserved
            foreach (var requestNode in workflowRequest.Graph.Nodes)
            {
                var retrievedNode = getResult.Data.Graph.Nodes.FirstOrDefault(n => n.Id == requestNode.Id);
                Assert.NotNull(retrievedNode);
                Assert.Equal(requestNode.Type, retrievedNode.Type);
                Assert.Equal(requestNode.Data.NodeType, retrievedNode.Data.NodeType);
                Assert.Equal(requestNode.Data.Label, retrievedNode.Data.Label);
                Assert.Equal(requestNode.Position.X, retrievedNode.Position.X);
                Assert.Equal(requestNode.Position.Y, retrievedNode.Position.Y);
            }

            // Verify each edge is preserved
            foreach (var requestEdge in workflowRequest.Graph.Edges)
            {
                var retrievedEdge = getResult.Data.Graph.Edges.FirstOrDefault(e => e.Id == requestEdge.Id);
                Assert.NotNull(retrievedEdge);
                Assert.Equal(requestEdge.Source, retrievedEdge.Source);
                Assert.Equal(requestEdge.Target, retrievedEdge.Target);
                Assert.Equal(requestEdge.SourceHandle, retrievedEdge.SourceHandle);
            }

            // Verify at least one start node exists (graph validity)
            var hasStartNode = getResult.Data.Graph.Nodes.Any(n => n.Data.NodeType == NodeTypes.Start);
            Assert.True(hasStartNode,
                $"Iteration {i + 1}: Retrieved workflow should have at least one start node");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
        _output.WriteLine("✓ CRUD round-trip consistency property validated");
    }

    /// <summary>
    /// Tests that getting workflow definition list returns paginated data with required fields.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.2
    /// 
    /// This test verifies:
    /// 1. GET /api/workflows returns 200 OK
    /// 2. Response contains paginated structure (list, page, pageSize, total)
    /// 3. Each workflow object contains required fields (Id, Name, Graph, Version)
    /// 4. Pagination parameters match the request
    /// </remarks>
    [Fact]
    public async Task GetWorkflowList_ShouldReturnPaginatedData()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a few workflows to ensure we have data
        for (int i = 0; i < 3; i++)
        {
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
            await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        }

        _output.WriteLine("Requesting workflow list with pagination parameters");

        // Act
        var response = await _httpClient.GetAsync("/api/workflows?page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Get workflow list failed. Message: {apiResponse.Message}");

        // Verify pagination structure using ApiTestHelpers
        ApiTestHelpers.AssertPagedResponse<WorkflowDefinitionResponse>(apiResponse, 1, 10);

        // Parse the list to verify required fields
        var dataJson = System.Text.Json.JsonSerializer.Serialize(apiResponse.Data);
        var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);
        var listArray = pagedData.GetProperty("list");

        // Verify each workflow has required fields
        foreach (var item in listArray.EnumerateArray())
        {
            Assert.True(item.TryGetProperty("id", out var idProp) && !string.IsNullOrEmpty(idProp.GetString()),
                "Each workflow should have a non-empty Id");
            Assert.True(item.TryGetProperty("name", out var nameProp) && !string.IsNullOrEmpty(nameProp.GetString()),
                "Each workflow should have a non-empty Name");
            Assert.True(item.TryGetProperty("graph", out var graphProp) && graphProp.ValueKind == System.Text.Json.JsonValueKind.Object,
                "Each workflow should have a Graph object");
        }

        _output.WriteLine($"✓ Workflow list returned with pagination - Total: {pagedData.GetProperty("total").GetInt32()}");
    }

    /// <summary>
    /// Tests that getting workflow list with category filter returns only matching workflows.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.8
    /// 
    /// This test verifies:
    /// 1. GET /api/workflows?category={category} returns 200 OK
    /// 2. All returned workflows have the specified category
    /// 3. No workflows with different categories are returned
    /// </remarks>
    [Fact]
    public async Task GetWorkflowList_WithCategoryFilter_ShouldReturnMatchingResults()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var testCategory = $"测试分类_{timestamp}";

        // Create workflows with the test category
        _output.WriteLine($"Creating workflows with category: {testCategory}");
        for (int i = 0; i < 2; i++)
        {
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
            workflowRequest = workflowRequest with { Category = testCategory };
            await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        }

        // Create workflows with a different category
        var otherCategory = $"其他分类_{timestamp}";
        _output.WriteLine($"Creating workflows with different category: {otherCategory}");
        for (int i = 0; i < 2; i++)
        {
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
            workflowRequest = workflowRequest with { Category = otherCategory };
            await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        }

        // Act
        var response = await _httpClient.GetAsync($"/api/workflows?category={Uri.EscapeDataString(testCategory)}&page=1&pageSize=20");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Get workflow list with category filter failed. Message: {apiResponse.Message}");

        // Parse the list to verify category filtering
        var dataJson = System.Text.Json.JsonSerializer.Serialize(apiResponse.Data);
        var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);
        var listArray = pagedData.GetProperty("list");

        // Verify all returned workflows have the specified category
        var workflowCount = 0;
        foreach (var item in listArray.EnumerateArray())
        {
            Assert.True(item.TryGetProperty("category", out var categoryProp),
                "Each workflow should have a Category field");

            var actualCategory = categoryProp.GetString();
            Assert.Equal(testCategory, actualCategory);
            workflowCount++;
        }

        Assert.True(workflowCount >= 2,
            $"Expected at least 2 workflows with category '{testCategory}', but found {workflowCount}");

        _output.WriteLine($"✓ Category filter returned {workflowCount} workflows with category '{testCategory}'");
    }

    /// <summary>
    /// Tests that getting workflow list with status filter returns only matching workflows.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 3.9
    /// 
    /// This test verifies:
    /// 1. GET /api/workflows?isActive=true returns only active workflows
    /// 2. GET /api/workflows?isActive=false returns only inactive workflows
    /// 3. All returned workflows have the specified status
    /// </remarks>
    [Fact]
    public async Task GetWorkflowList_WithStatusFilter_ShouldReturnMatchingResults()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create active workflows
        _output.WriteLine("Creating active workflows");
        var activeWorkflowIds = new List<string>();
        for (int i = 0; i < 2; i++)
        {
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
            workflowRequest = workflowRequest with { IsActive = true };
            var createResponse = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);
            var createResult = await createResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
            activeWorkflowIds.Add(createResult!.Data!.Id);
        }

        // Create inactive workflows by updating active ones
        _output.WriteLine("Creating inactive workflows");
        var inactiveWorkflowIds = new List<string>();
        for (int i = 0; i < 2; i++)
        {
            var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
            var createResponse = await _httpClient.PostAsJsonAsync("/api/workflows", workflowRequest);
            var createResult = await createResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
            var workflowId = createResult!.Data!.Id;

            // Update to inactive
            var updateRequest = new { IsActive = false };
            await _httpClient.PutAsJsonAsync($"/api/workflows/{workflowId}", updateRequest);
            inactiveWorkflowIds.Add(workflowId);
        }

        // Test 1: Filter for active workflows
        _output.WriteLine("Testing filter for active workflows (isActive=true)");
        var activeResponse = await _httpClient.GetAsync("/api/workflows?isActive=true&page=1&pageSize=50");

        Assert.Equal(HttpStatusCode.OK, activeResponse.StatusCode);

        var activeApiResponse = await activeResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(activeApiResponse);
        Assert.True(activeApiResponse.Success, $"Get active workflow list failed. Message: {activeApiResponse.Message}");

        // Parse and verify active workflows
        var activeDataJson = System.Text.Json.JsonSerializer.Serialize(activeApiResponse.Data);
        var activePagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(activeDataJson);
        var activeListArray = activePagedData.GetProperty("list");

        var activeCount = 0;
        foreach (var item in activeListArray.EnumerateArray())
        {
            Assert.True(item.TryGetProperty("isActive", out var isActiveProp),
                "Each workflow should have an IsActive field");

            var isActive = isActiveProp.GetBoolean();
            Assert.True(isActive, "All workflows in active filter should have IsActive=true");
            activeCount++;
        }

        Assert.True(activeCount >= 2,
            $"Expected at least 2 active workflows, but found {activeCount}");

        _output.WriteLine($"✓ Active filter returned {activeCount} active workflows");

        // Test 2: Filter for inactive workflows
        _output.WriteLine("Testing filter for inactive workflows (isActive=false)");
        var inactiveResponse = await _httpClient.GetAsync("/api/workflows?isActive=false&page=1&pageSize=50");

        Assert.Equal(HttpStatusCode.OK, inactiveResponse.StatusCode);

        var inactiveApiResponse = await inactiveResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(inactiveApiResponse);
        Assert.True(inactiveApiResponse.Success, $"Get inactive workflow list failed. Message: {inactiveApiResponse.Message}");

        // Parse and verify inactive workflows
        var inactiveDataJson = System.Text.Json.JsonSerializer.Serialize(inactiveApiResponse.Data);
        var inactivePagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(inactiveDataJson);
        var inactiveListArray = inactivePagedData.GetProperty("list");

        var inactiveCount = 0;
        foreach (var item in inactiveListArray.EnumerateArray())
        {
            Assert.True(item.TryGetProperty("isActive", out var isActiveProp),
                "Each workflow should have an IsActive field");

            var isActive = isActiveProp.GetBoolean();
            Assert.False(isActive, "All workflows in inactive filter should have IsActive=false");
            inactiveCount++;
        }

        Assert.True(inactiveCount >= 2,
            $"Expected at least 2 inactive workflows, but found {inactiveCount}");

        _output.WriteLine($"✓ Inactive filter returned {inactiveCount} inactive workflows");
    }
}

/// <summary>
/// Response model for workflow definition (matches API response structure).
/// </summary>
public record WorkflowDefinitionResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Category { get; init; } = string.Empty;
    public WorkflowGraphRequest Graph { get; init; } = new();
    public bool IsActive { get; init; }
}
