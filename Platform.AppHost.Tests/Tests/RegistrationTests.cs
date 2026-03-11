using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using Xunit;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Integration tests for the user registration API endpoint.
/// Tests verify that the registration endpoint behaves correctly in the distributed application context,
/// including validation, duplicate detection, and successful user creation.
/// </summary>
/// <remarks>
/// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
/// </remarks>
[Collection("AppHost Collection")]
public class RegistrationTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;

    public RegistrationTests(AppHostFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    /// <summary>
    /// Property 1: Valid registration succeeds and returns complete response.
    /// Validates: Requirements 4.1, 4.2
    /// 
    /// This property-based test verifies that for ANY valid registration request
    /// (username 3-20 characters, password at least 6 characters, valid email format),
    /// the registration endpoint returns 200 OK status code and the response contains
    /// the created user's ID and username fields.
    /// </summary>
    /// <remarks>
    /// Feature: aspire-apphost-auth-tests, Property 1: 有效注册成功并返回完整响应
    /// </remarks>
    [Fact]
    public async Task ValidRegistration_ShouldSucceed_WithCompleteResponse()
    {
        const int iterations = 10;
        _output.WriteLine($"Running property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            // Generate random valid registration data
            var request = TestDataGenerator.GenerateValidRegistration();

            _output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");
            _output.WriteLine($"Request: Username={request.Username}, Email={request.Email}");

            // Send registration request
            var response = await _fixture.HttpClient.PostAsJsonAsync(
                "/api/auth/register", request);

            // Log response details
            var responseBody = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Response Status: {response.StatusCode}");
            _output.WriteLine($"Response Body: {responseBody}");

            // Verify status code
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

            // Verify response structure
            var apiResponse = await response.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            Assert.NotNull(apiResponse);
            Assert.True(apiResponse.Success,
                $"Expected Success=true but got Success={apiResponse.Success}. Message: {apiResponse.Message}");
            Assert.NotNull(apiResponse.Data);
            Assert.NotNull(apiResponse.Data.Id);
            Assert.NotEmpty(apiResponse.Data.Id);
            Assert.Equal(request.Username, apiResponse.Data.Username);

            _output.WriteLine($"✓ Iteration {i + 1} passed: User created with ID={apiResponse.Data.Id}");
        }

        _output.WriteLine($"\n✓ All {iterations} iterations passed successfully");
    }

    /// <summary>
    /// Property 2: Duplicate username registration fails.
    /// Validates: Requirements 4.3
    /// 
    /// This property-based test verifies that for ANY registered username,
    /// attempting to register again with the same username should return an error response
    /// (non-2xx status code) and should not create a duplicate user account.
    /// </summary>
    /// <remarks>
    /// Feature: aspire-apphost-auth-tests, Property 2: 重复用户名注册失败
    /// </remarks>
    [Fact]
    public async Task DuplicateUsername_ShouldFail_WithErrorResponse()
    {
        const int iterations = 10;
        _output.WriteLine($"Running property test with {iterations} iterations");

        for (int i = 0; i < iterations; i++)
        {
            // Generate random valid registration data
            var request = TestDataGenerator.GenerateValidRegistration();

            _output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");
            _output.WriteLine($"Request: Username={request.Username}, Email={request.Email}");

            // First registration - should succeed
            var firstResponse = await _fixture.HttpClient.PostAsJsonAsync(
                "/api/auth/register", request);

            var firstResponseBody = await firstResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"First Registration Status: {firstResponse.StatusCode}");
            _output.WriteLine($"First Registration Body: {firstResponseBody}");

            // Verify first registration succeeded
            Assert.Equal(System.Net.HttpStatusCode.OK, firstResponse.StatusCode);

            // Second registration with same username but different email - should fail
            var duplicateRequest = request with
            {
                Email = $"different_{request.Email}"
            };

            _output.WriteLine($"Attempting duplicate registration with same username: {duplicateRequest.Username}");

            var secondResponse = await _fixture.HttpClient.PostAsJsonAsync(
                "/api/auth/register", duplicateRequest);

            var secondResponseBody = await secondResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Second Registration Status: {secondResponse.StatusCode}");
            _output.WriteLine($"Second Registration Body: {secondResponseBody}");

            // Verify second registration failed (non-2xx status code)
            Assert.False(secondResponse.IsSuccessStatusCode,
                $"Expected duplicate username registration to fail, but got status code {secondResponse.StatusCode}");

            // Optionally verify the response contains error information
            var apiResponse = await secondResponse.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            if (apiResponse != null)
            {
                Assert.False(apiResponse.Success,
                    "Expected Success=false for duplicate username registration");
                _output.WriteLine($"Error Message: {apiResponse.Message}");
            }

            _output.WriteLine($"✓ Iteration {i + 1} passed: Duplicate username correctly rejected");
        }

        _output.WriteLine($"\n✓ All {iterations} iterations passed successfully");
    }

    /// <summary>
    /// Property 3: Invalid registration data is rejected.
    /// Validates: Requirements 4.4
    /// 
    /// This property-based test verifies that for ANY registration request that does not meet
    /// validation rules (empty username, short username, short password, invalid email format),
    /// the registration endpoint returns a validation error response and the response contains
    /// error information describing why the validation failed.
    /// </summary>
    /// <remarks>
    /// Feature: aspire-apphost-auth-tests, Property 3: 无效注册数据被拒绝
    /// </remarks>
    [Fact]
    public async Task InvalidRegistration_ShouldFail_WithValidationError()
    {
        const int iterations = 10;
        _output.WriteLine($"Running property test with {iterations} iterations");

        // Test each type of validation error across iterations
        var validationTypes = Enum.GetValues<InvalidationType>();
        var iterationsPerType = iterations / validationTypes.Length;

        for (int i = 0; i < iterations; i++)
        {
            // Cycle through different validation error types
            var validationType = validationTypes[i % validationTypes.Length];
            var request = TestDataGenerator.GenerateInvalidRegistration(validationType);

            _output.WriteLine($"\n--- Iteration {i + 1}/{iterations} ---");
            _output.WriteLine($"Validation Type: {validationType}");
            _output.WriteLine($"Request: Username='{request.Username}', Password='{request.Password}', Email='{request.Email}'");

            // Send registration request with invalid data
            var response = await _fixture.HttpClient.PostAsJsonAsync(
                "/api/auth/register", request);

            // Log response details
            var responseBody = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Response Status: {response.StatusCode}");
            _output.WriteLine($"Response Body: {responseBody}");

            // Verify that the request failed (non-2xx status code)
            Assert.False(response.IsSuccessStatusCode,
                $"Expected invalid registration to fail for {validationType}, but got status code {response.StatusCode}");

            // Verify the response contains error information
            var apiResponse = await response.Content
                .ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();

            Assert.NotNull(apiResponse);
            Assert.False(apiResponse.Success,
                $"Expected Success=false for invalid registration ({validationType})");

            // Verify that the response contains a descriptive error message
            Assert.False(string.IsNullOrWhiteSpace(apiResponse.Message),
                $"Expected descriptive error message for {validationType}, but got empty or null message");

            _output.WriteLine($"Error Code: {apiResponse.Code}");
            _output.WriteLine($"Error Message: {apiResponse.Message}");

            // Optionally check for field-specific errors
            if (apiResponse.Errors != null && apiResponse.Errors.Count > 0)
            {
                _output.WriteLine("Field-specific errors:");
                foreach (var error in apiResponse.Errors)
                {
                    _output.WriteLine($"  {error.Key}: {string.Join(", ", error.Value)}");
                }
            }

            _output.WriteLine($"✓ Iteration {i + 1} passed: Invalid registration correctly rejected for {validationType}");
        }

        _output.WriteLine($"\n✓ All {iterations} iterations passed successfully");
        _output.WriteLine($"Tested {validationTypes.Length} different validation error types");
    }

}
