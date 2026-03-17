namespace Platform.AppHost.Tests.Helpers;

/// <summary>
/// Helper methods for API testing, providing common validation and utility functions.
/// </summary>
/// <remarks>
/// Requirements: 8.4, 8.6
/// </remarks>
public static class ApiTestHelpers
{
    /// <summary>
    /// Validates the structure of a paged API response.
    /// </summary>
    /// <typeparam name="T">The type of items in the paged response.</typeparam>
    /// <param name="response">The API response containing paged data.</param>
    /// <param name="expectedCurrent">The expected current page number.</param>
    /// <param name="expectedPageSize">The expected page size.</param>
    /// <exception cref="ArgumentNullException">Thrown when response or response.Data is null.</exception>
    /// <exception cref="InvalidOperationException">Thrown when the response structure is invalid.</exception>
    /// <remarks>
    /// Validates: Requirements 8.4
    /// 
    /// This method verifies that:
    /// - The response contains a 'list' array (API uses 'list' instead of 'data')
    /// - The response contains 'page' and 'pageSize' fields matching expected values (API uses 'page' instead of 'current')
    /// - The response contains a 'total' field indicating total record count
    /// </remarks>
    public static void AssertPagedResponse<T>(
        Models.ApiResponse<object> response,
        int expectedCurrent,
        int expectedPageSize)
    {
        if (response == null)
            throw new ArgumentNullException(nameof(response));

        if (response.Data == null)
            throw new InvalidOperationException("Response data is null");

        // Parse the response data as a dynamic object to access paged structure
        var dataJson = System.Text.Json.JsonSerializer.Serialize(response.Data);
        var pagedData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(dataJson);

        // Verify 'list' array exists (API uses 'list' instead of 'data')
        if (!pagedData.TryGetProperty("list", out var dataArray))
            throw new InvalidOperationException("Response does not contain 'list' array");

        if (dataArray.ValueKind != System.Text.Json.JsonValueKind.Array)
            throw new InvalidOperationException("'list' property is not an array");

        // Verify 'page' field matches expected value (API uses 'page' instead of 'current')
        if (!pagedData.TryGetProperty("page", out var currentElement))
            throw new InvalidOperationException("Response does not contain 'page' field");

        var actualCurrent = currentElement.GetInt32();
        if (actualCurrent != expectedCurrent)
            throw new InvalidOperationException(
                $"Expected current page {expectedCurrent}, but got {actualCurrent}");

        // Verify 'pageSize' field matches expected value
        if (!pagedData.TryGetProperty("pageSize", out var pageSizeElement))
            throw new InvalidOperationException("Response does not contain 'pageSize' field");

        var actualPageSize = pageSizeElement.GetInt32();
        if (actualPageSize != expectedPageSize)
            throw new InvalidOperationException(
                $"Expected page size {expectedPageSize}, but got {actualPageSize}");

        // Verify 'total' field exists
        if (!pagedData.TryGetProperty("total", out var totalElement))
            throw new InvalidOperationException("Response does not contain 'total' field");

        if (totalElement.ValueKind != System.Text.Json.JsonValueKind.Number)
            throw new InvalidOperationException("'total' field is not a number");
    }

    /// <summary>
    /// Validates that an API response indicates success.
    /// </summary>
    /// <typeparam name="T">The type of the response data.</typeparam>
    /// <param name="response">The API response to validate.</param>
    /// <exception cref="ArgumentNullException">Thrown when response is null.</exception>
    /// <exception cref="InvalidOperationException">Thrown when the response indicates failure.</exception>
    /// <remarks>
    /// Validates: Requirements 8.4
    /// 
    /// This method verifies that:
    /// - The response.Success field is true
    /// - The response.Data field is not null
    /// </remarks>
    public static void AssertSuccessResponse<T>(Models.ApiResponse<T> response)
    {
        if (response == null)
            throw new ArgumentNullException(nameof(response));

        if (!response.Success)
            throw new InvalidOperationException(
                $"Expected successful response, but got failure. Code: {response.Code}, Message: {response.Message}");

        if (response.Data == null)
            throw new InvalidOperationException("Expected response data to be non-null for successful response");
    }

    /// <summary>
    /// Validates that an API response indicates an error with the expected error code.
    /// </summary>
    /// <typeparam name="T">The type of the response data.</typeparam>
    /// <param name="response">The API response to validate.</param>
    /// <param name="expectedCode">The expected error code (e.g., "VALIDATION_ERROR", "UNAUTHORIZED").</param>
    /// <exception cref="ArgumentNullException">Thrown when response is null.</exception>
    /// <exception cref="InvalidOperationException">Thrown when the response indicates success or has wrong error code.</exception>
    /// <remarks>
    /// Validates: Requirements 8.4
    /// 
    /// This method verifies that:
    /// - The response.Success field is false
    /// - The response.Code field matches the expected error code
    /// </remarks>
    public static void AssertErrorResponse<T>(
        Models.ApiResponse<T> response,
        string expectedCode)
    {
        if (response == null)
            throw new ArgumentNullException(nameof(response));

        if (response.Success)
            throw new InvalidOperationException("Expected error response, but got success");

        if (string.IsNullOrEmpty(response.Code))
            throw new InvalidOperationException("Expected error code to be present in error response");

        if (!response.Code.Contains(expectedCode, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"Expected error code to contain '{expectedCode}', but got '{response.Code}'");
    }

    /// <summary>
    /// Polls an async operation until a condition is met or max attempts are reached.
    /// </summary>
    /// <typeparam name="T">The type of the operation result.</typeparam>
    /// <param name="operation">The async operation to execute repeatedly.</param>
    /// <param name="condition">The condition that must be satisfied for the operation to complete.</param>
    /// <param name="maxAttempts">Maximum number of attempts before timing out (default: 10).</param>
    /// <param name="delayMilliseconds">Delay between attempts in milliseconds (default: 500ms).</param>
    /// <returns>The result of the operation when the condition is met.</returns>
    /// <exception cref="ArgumentNullException">Thrown when operation or condition is null.</exception>
    /// <exception cref="TimeoutException">Thrown when max attempts are reached without condition being met.</exception>
    public static async Task<T> WaitForConditionAsync<T>(
        Func<Task<T>> operation,
        Func<T, bool> condition,
        int maxAttempts = 10,
        int delayMilliseconds = 500)
    {
        if (operation == null)
            throw new ArgumentNullException(nameof(operation));

        if (condition == null)
            throw new ArgumentNullException(nameof(condition));

        if (maxAttempts <= 0)
            throw new ArgumentException("Max attempts must be greater than 0", nameof(maxAttempts));

        if (delayMilliseconds < 0)
            throw new ArgumentException("Delay must be non-negative", nameof(delayMilliseconds));

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var result = await operation();

            if (condition(result))
            {
                return result;
            }

            if (attempt < maxAttempts)
            {
                await Task.Delay(delayMilliseconds);
            }
        }

        throw new TimeoutException(
            $"Condition was not met after {maxAttempts} attempts (total wait time: {maxAttempts * delayMilliseconds}ms)");
    }

    /// <summary>
    /// Waits for a workflow instance to reach a specific status.
    /// </summary>
    public static async Task<Models.WorkflowInstanceResponse> WaitForWorkflowInstanceStatus(
        Func<Task<Models.ApiResponse<Models.WorkflowInstanceResponse>>> getOperation,
        string expectedStatus,
        int maxAttempts = 20,
        int delayMilliseconds = 1000)
    {
        var response = await WaitForConditionAsync(
            operation: getOperation,
            condition: resp => resp.Success && 
                               string.Equals(resp.Data?.Status, expectedStatus, StringComparison.OrdinalIgnoreCase),
            maxAttempts: maxAttempts,
            delayMilliseconds: delayMilliseconds
        );
        return response.Data!;
    }
}
