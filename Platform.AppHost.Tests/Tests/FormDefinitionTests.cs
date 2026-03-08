using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using System.Net.Http.Headers;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Integration tests for Form Definition API endpoints.
/// Tests verify CRUD operations, pagination, filtering, and validation
/// for form definitions in the distributed application context.
/// </summary>
/// <remarks>
/// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.1, 5.2, 5.4, 7.1, 7.2, 7.4, 7.5, 8.1, 8.2
/// </remarks>
public class FormDefinitionTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;
    private HttpClient _httpClient = null!;
    private string _accessToken = string.Empty;

    public FormDefinitionTests(AppHostFixture fixture, ITestOutputHelper output)
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
    /// Tests that creating a form with valid data returns 200 OK and a generated ID.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.1, 1.6
    /// 
    /// This test verifies:
    /// 1. POST /api/forms with valid form data returns 200 OK
    /// 2. Response contains success=true
    /// 3. Response data contains a generated ID (non-empty string)
    /// 4. Response data contains the form name matching the request
    /// 5. Response data contains an auto-generated Key field (non-empty)
    /// </remarks>
    [Fact]
    public async Task CreateForm_WithValidData_ShouldSucceed()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var formRequest = TestDataGenerator.GenerateValidFormDefinition();

        _output.WriteLine($"Creating form with name: {formRequest.Name}");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);

        // Read response first before asserting
        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();

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
        Assert.True(apiResponse.Success, $"Form creation failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.NotEmpty(apiResponse.Data.Id);
        Assert.Equal(formRequest.Name, apiResponse.Data.Name);
        Assert.NotEmpty(apiResponse.Data.Key); // Requirement 1.7: Key auto-generated

        _output.WriteLine($"✓ Form created successfully - ID: {apiResponse.Data.Id}, Key: {apiResponse.Data.Key}");
    }

    /// <summary>
    /// Tests that creating a form without a required field (name) returns a validation error.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.6
    /// 
    /// This test verifies:
    /// 1. POST /api/forms with missing name field returns 400 Bad Request
    /// 2. Response contains success=false
    /// 3. Response contains a validation error code or message
    /// </remarks>
    [Fact]
    public async Task CreateForm_WithMissingRequiredField_ShouldReturnValidationError()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        var formRequest = new FormDefinitionRequest
        {
            Name = "", // Missing required field
            Description = "Test form without name",
            Fields = new List<FormFieldRequest>()
        };

        _output.WriteLine("Attempting to create form with missing name field");

        // Act
        var response = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);

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
    /// Property-based test: CRUD Round-trip Consistency (Forms)
    /// Feature: apphost-api-tests-expansion, Property 1: CRUD Round-trip Consistency (Forms)
    ///
    /// **Validates: Requirements 1.1, 1.3, 1.7**
    ///
    /// For any valid form definition with name and fields, creating the form and then
    /// retrieving it by ID should return a form object with the same name, fields, and
    /// an auto-generated Key field.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task FormCrudRoundtrip_ShouldMaintainConsistency()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting CRUD Round-trip property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate random form data
            var formRequest = TestDataGenerator.GenerateValidFormDefinition();

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Creating form: {formRequest.Name}");

            // Create form
            var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);

            // Read response
            var createApiResponse = await createResponse.Content
                .ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();

            // Assert creation succeeded
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
            Assert.NotNull(createApiResponse);
            Assert.True(createApiResponse.Success,
                $"[Iteration {i + 1}] Form creation failed. Message: {createApiResponse.Message}");
            Assert.NotNull(createApiResponse.Data);
            Assert.NotEmpty(createApiResponse.Data.Id);

            // Requirement 1.7: Verify Key field is auto-generated
            Assert.NotEmpty(createApiResponse.Data.Key);

            var createdFormId = createApiResponse.Data.Id;

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Form created - ID: {createdFormId}, Key: {createApiResponse.Data.Key}");

            // Retrieve form by ID
            var getResponse = await _httpClient.GetAsync($"/api/forms/{createdFormId}");

            // Read response
            var getApiResponse = await getResponse.Content
                .ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();

            // Assert retrieval succeeded
            Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
            Assert.NotNull(getApiResponse);
            Assert.True(getApiResponse.Success,
                $"[Iteration {i + 1}] Form retrieval failed. Message: {getApiResponse.Message}");
            Assert.NotNull(getApiResponse.Data);

            // Requirement 1.3: Verify data consistency between create and retrieve
            Assert.Equal(formRequest.Name, getApiResponse.Data.Name);
            Assert.Equal(createApiResponse.Data.Key, getApiResponse.Data.Key);
            Assert.Equal(formRequest.Fields.Count, getApiResponse.Data.Fields.Count);

            // Verify each field matches
            for (int j = 0; j < formRequest.Fields.Count; j++)
            {
                var requestField = formRequest.Fields[j];
                var responseField = getApiResponse.Data.Fields[j];

                Assert.Equal(requestField.Label, responseField.Label);
                // API returns field types in lowercase, so compare case-insensitively
                Assert.Equal(requestField.Type, responseField.Type, StringComparer.OrdinalIgnoreCase);
                Assert.Equal(requestField.Required, responseField.Required);
                Assert.Equal(requestField.DataKey, responseField.DataKey);
            }

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Round-trip consistency verified");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that getting the form list returns paginated data with correct structure.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.2, 1.8
    /// 
    /// This test verifies:
    /// 1. GET /api/forms returns 200 OK
    /// 2. Response contains paginated data structure (list, page, pageSize, total)
    /// 3. Each form object contains required fields (Id, Name, Fields)
    /// </remarks>
    [Fact]
    public async Task GetFormList_ShouldReturnPagedData()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a few forms to ensure we have data
        for (int i = 0; i < 3; i++)
        {
            var formRequest = TestDataGenerator.GenerateValidFormDefinition();
            await _httpClient.PostAsJsonAsync("/api/forms", formRequest);
        }

        _output.WriteLine("Fetching form list with pagination");

        // Act
        var response = await _httpClient.GetAsync("/api/forms?current=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Form list retrieval failed. Message: {apiResponse.Message}");

        // Verify pagination structure
        ApiTestHelpers.AssertPagedResponse<FormDefinitionResponse>(apiResponse, expectedCurrent: 1, expectedPageSize: 10);

        _output.WriteLine("✓ Form list returned with valid pagination structure");
    }

    /// <summary>
    /// Tests that getting the form list with keyword filtering returns only matching forms.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.2, 1.8
    /// 
    /// This test verifies:
    /// 1. GET /api/forms?keyword={keyword} returns 200 OK
    /// 2. Response contains only forms with names matching the keyword
    /// 3. Forms without matching names are excluded
    /// </remarks>
    [Fact]
    public async Task GetFormList_WithKeywordFilter_ShouldReturnMatchingForms()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a form with a unique keyword in the name
        var uniqueKeyword = $"unique_{Guid.NewGuid().ToString("N")[..8]}";
        var matchingFormRequest = TestDataGenerator.GenerateValidFormDefinition();
        matchingFormRequest = matchingFormRequest with { Name = $"{uniqueKeyword}_form" };

        var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", matchingFormRequest);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        _output.WriteLine($"Created form with keyword: {uniqueKeyword}");

        // Create another form without the keyword
        var nonMatchingFormRequest = TestDataGenerator.GenerateValidFormDefinition();
        await _httpClient.PostAsJsonAsync("/api/forms", nonMatchingFormRequest);

        // Act
        var response = await _httpClient.GetAsync($"/api/forms?keyword={uniqueKeyword}&current=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Form list retrieval with keyword failed. Message: {apiResponse.Message}");

        // Parse the data array to verify filtering
        var dataJson = System.Text.Json.JsonSerializer.Serialize(apiResponse.Data);
        var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);
        var dataArray = pagedData.GetProperty("list");

        // Verify that all returned forms contain the keyword
        foreach (var item in dataArray.EnumerateArray())
        {
            var name = item.GetProperty("name").GetString();
            Assert.Contains(uniqueKeyword, name, StringComparison.OrdinalIgnoreCase);
        }

        _output.WriteLine($"✓ Keyword filtering returned only matching forms");
    }

    /// <summary>
    /// Property-based test: Pagination Structure Consistency
    /// Feature: apphost-api-tests-expansion, Property 5: Pagination Structure Consistency
    ///
    /// **Validates: Requirements 1.2, 1.8, 5.5**
    ///
    /// For any paginated list endpoint with valid pagination parameters (current, pageSize),
    /// the response should contain a data array, total count, and the pagination parameters
    /// should match the request.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task FormPagination_ShouldMaintainStructureConsistency()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting Pagination Structure property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate random pagination parameters
            var random = new Random();
            var current = random.Next(1, 5);
            var pageSize = random.Next(5, 20);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Testing pagination - current: {current}, pageSize: {pageSize}");

            // Fetch form list with pagination
            var response = await _httpClient.GetAsync($"/api/forms?current={current}&pageSize={pageSize}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Assert.NotNull(apiResponse);
            Assert.True(apiResponse.Success,
                $"[Iteration {i + 1}] Form list retrieval failed. Message: {apiResponse.Message}");

            // Verify pagination structure
            ApiTestHelpers.AssertPagedResponse<FormDefinitionResponse>(apiResponse, expectedCurrent: current, expectedPageSize: pageSize);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Pagination structure verified");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Property-based test: Keyword Filtering Accuracy
    /// Feature: apphost-api-tests-expansion, Property 8: Keyword Filtering Accuracy
    ///
    /// **Validates: Requirements 1.2, 1.8**
    ///
    /// For any keyword search on list endpoints, all returned results should have the keyword
    /// present in their name or description fields, and no results should be returned that
    /// don't match the keyword.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task FormKeywordFiltering_ShouldReturnOnlyMatchingResults()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting Keyword Filtering property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Generate a unique keyword
            var keyword = $"kw{i}_{Guid.NewGuid().ToString("N")[..6]}";

            // Create a form with the keyword in the name
            var matchingFormRequest = TestDataGenerator.GenerateValidFormDefinition();
            matchingFormRequest = matchingFormRequest with { Name = $"{keyword}_testform" };

            var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", matchingFormRequest);
            Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Created form with keyword: {keyword}");

            // Search for forms with the keyword
            var response = await _httpClient.GetAsync($"/api/forms?keyword={keyword}&current=1&pageSize=10");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Assert.NotNull(apiResponse);
            Assert.True(apiResponse.Success,
                $"[Iteration {i + 1}] Form list retrieval with keyword failed. Message: {apiResponse.Message}");

            // Parse the data array to verify filtering
            var dataJson = System.Text.Json.JsonSerializer.Serialize(apiResponse.Data);
            var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);
            var dataArray = pagedData.GetProperty("list");

            // Verify that all returned forms contain the keyword
            var matchCount = 0;
            foreach (var item in dataArray.EnumerateArray())
            {
                var name = item.GetProperty("name").GetString() ?? "";
                Assert.Contains(keyword, name, StringComparison.OrdinalIgnoreCase);
                matchCount++;
            }

            // Verify that at least one form was returned (the one we just created)
            Assert.True(matchCount > 0, $"[Iteration {i + 1}] Expected at least one matching form, but got {matchCount}");

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Keyword filtering accuracy verified - {matchCount} matching forms");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that updating a form with valid data returns 200 OK and reflects the changes.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.4
    /// 
    /// This test verifies:
    /// 1. PUT /api/forms/{id} with valid update data returns 200 OK
    /// 2. Response contains the updated form data
    /// 3. Subsequent GET request returns the updated data
    /// </remarks>
    [Fact]
    public async Task UpdateForm_WithValidData_ShouldSucceed()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a form first
        var formRequest = TestDataGenerator.GenerateValidFormDefinition();
        var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        var formId = createApiResponse!.Data!.Id;

        _output.WriteLine($"Created form with ID: {formId}");

        // Prepare update data
        var updateRequest = formRequest with
        {
            Name = $"{formRequest.Name}_updated",
            Description = "Updated description"
        };

        _output.WriteLine($"Updating form to name: {updateRequest.Name}");

        // Act
        var response = await _httpClient.PutAsJsonAsync($"/api/forms/{formId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var apiResponse = await response.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success, $"Form update failed. Message: {apiResponse.Message}");
        Assert.NotNull(apiResponse.Data);
        Assert.Equal(updateRequest.Name, apiResponse.Data.Name);
        Assert.Equal(updateRequest.Description, apiResponse.Data.Description);

        _output.WriteLine($"✓ Form updated successfully");

        // Verify the update persisted by fetching the form again
        var getResponse = await _httpClient.GetAsync($"/api/forms/{formId}");
        var getApiResponse = await getResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(getApiResponse);
        Assert.True(getApiResponse.Success);
        Assert.Equal(updateRequest.Name, getApiResponse.Data!.Name);

        _output.WriteLine($"✓ Update verified via GET request");
    }

    /// <summary>
    /// Property-based test: Update Reflection
    /// Feature: apphost-api-tests-expansion, Property 6: Update Reflection
    ///
    /// **Validates: Requirements 1.4**
    ///
    /// For any existing resource and valid update data, updating the resource should result
    /// in the updated fields being reflected in subsequent GET requests while unchanged
    /// fields remain the same.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task FormUpdate_ShouldReflectChanges()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting Update Reflection property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Create a form
            var formRequest = TestDataGenerator.GenerateValidFormDefinition();
            var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);
            var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
            var formId = createApiResponse!.Data!.Id;
            var originalKey = createApiResponse.Data.Key;

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Created form with ID: {formId}");

            // Update the form
            var updateRequest = formRequest with
            {
                Name = $"{formRequest.Name}_updated_{i}",
                Description = $"Updated description {i}"
            };

            var updateResponse = await _httpClient.PutAsJsonAsync($"/api/forms/{formId}", updateRequest);
            Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

            var updateApiResponse = await updateResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
            Assert.NotNull(updateApiResponse);
            Assert.True(updateApiResponse.Success,
                $"[Iteration {i + 1}] Form update failed. Message: {updateApiResponse.Message}");

            // Verify the update via GET request
            var getResponse = await _httpClient.GetAsync($"/api/forms/{formId}");
            var getApiResponse = await getResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
            Assert.NotNull(getApiResponse);
            Assert.True(getApiResponse.Success);

            // Verify updated fields
            Assert.Equal(updateRequest.Name, getApiResponse.Data!.Name);
            Assert.Equal(updateRequest.Description, getApiResponse.Data.Description);

            // Verify unchanged fields (Key should remain the same)
            Assert.Equal(originalKey, getApiResponse.Data.Key);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Update reflection verified");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

    /// <summary>
    /// Tests that deleting a form returns 200 OK and subsequent GET returns 404.
    /// </summary>
    /// <remarks>
    /// Validates: Requirements 1.5
    /// 
    /// This test verifies:
    /// 1. DELETE /api/forms/{id} returns 200 OK
    /// 2. Subsequent GET /api/forms/{id} returns 404 Not Found
    /// </remarks>
    [Fact]
    public async Task DeleteForm_ShouldSucceedAndReturn404OnGet()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // Create a form first
        var formRequest = TestDataGenerator.GenerateValidFormDefinition();
        var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);
        var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        var formId = createApiResponse!.Data!.Id;

        _output.WriteLine($"Created form with ID: {formId}");

        // Act - Delete the form
        var deleteResponse = await _httpClient.DeleteAsync($"/api/forms/{formId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        _output.WriteLine($"✓ Form deleted successfully");

        // Verify the form is no longer accessible
        var getResponse = await _httpClient.GetAsync($"/api/forms/{formId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

        _output.WriteLine($"✓ Subsequent GET returned 404 as expected");
    }

    /// <summary>
    /// Property-based test: Delete Then 404
    /// Feature: apphost-api-tests-expansion, Property 7: Delete Then 404
    ///
    /// **Validates: Requirements 1.5, 7.7**
    ///
    /// For any existing resource, deleting the resource should return 200 OK, and subsequent
    /// GET requests for that resource ID should return 404 Not Found.
    ///
    /// This test executes 100 iterations to verify the property holds across many inputs.
    /// </summary>
    [Fact]
    public async Task FormDelete_ShouldReturn404OnSubsequentGet()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        const int iterations = 100;

        _output.WriteLine($"Starting Delete Then 404 property test with {iterations} iterations");

        // Act & Assert
        for (int i = 0; i < iterations; i++)
        {
            // Create a form
            var formRequest = TestDataGenerator.GenerateValidFormDefinition();
            var createResponse = await _httpClient.PostAsJsonAsync("/api/forms", formRequest);
            var createApiResponse = await createResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
            var formId = createApiResponse!.Data!.Id;

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Created form with ID: {formId}");

            // Delete the form
            var deleteResponse = await _httpClient.DeleteAsync($"/api/forms/{formId}");
            Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] Form deleted");

            // Verify 404 on subsequent GET
            var getResponse = await _httpClient.GetAsync($"/api/forms/{formId}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

            _output.WriteLine($"[Iteration {i + 1}/{iterations}] ✓ Delete then 404 verified");
        }

        _output.WriteLine($"✓ All {iterations} iterations completed successfully");
    }

}
