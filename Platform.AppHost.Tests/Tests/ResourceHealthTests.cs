using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Tests to verify that all required resources in the distributed application are healthy
/// before running integration tests. This ensures test failures are not caused by
/// infrastructure issues.
/// </summary>
/// <remarks>
/// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
/// </remarks>
[Collection("AppHost Collection")]
public class ResourceHealthTests : IClassFixture<AppHostFixture>
{
    private readonly AppHostFixture _fixture;
    private readonly ITestOutputHelper _output;

    public ResourceHealthTests(AppHostFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    /// <summary>
    /// Verifies that all critical resources (ApiService and MongoDB) are in a healthy state.
    /// This test logs the status of all resources and fails if any critical resource is not healthy.
    /// </summary>
    /// <remarks>
    /// Requirements:
    /// - 7.1: Verify ApiService health is "Running" or "Healthy"
    /// - 7.2: Verify MongoDB health is "Running" or "Healthy"
    /// - 7.3: Fast fail with descriptive error if any resource is unhealthy
    /// - 7.4: Dedicated test to verify all resources are healthy
    /// - 7.5: Log all resource states at test execution start
    /// </remarks>
    [Fact]
    public async Task AllCriticalResources_ShouldBeHealthy()
    {
        // Get the resource notification service to check resource states
        var resourceNotificationService = _fixture.App.Services
            .GetRequiredService<ResourceNotificationService>();

        _output.WriteLine("=== Resource Health Status ===");
        _output.WriteLine("");

        // Verify critical resources are healthy
        // The critical resources for authentication tests are:
        // - apiservice: The API service that exposes authentication endpoints
        // - mongodb: The MongoDB database that stores user data
        var criticalResources = new[] { "apiservice", "mongodb" };

        foreach (var resourceName in criticalResources)
        {
            _output.WriteLine($"Checking critical resource: {resourceName}");

            try
            {
                // Wait for the resource to be in "Running" state
                // This ensures the resource is available before tests execute
                await resourceNotificationService
                    .WaitForResourceAsync(resourceName, KnownResourceStates.Running)
                    .WaitAsync(TimeSpan.FromSeconds(10));

                _output.WriteLine($"✓ {resourceName} is Running");
            }
            catch (TimeoutException)
            {
                // If the resource doesn't reach Running state within timeout, fail the test
                Assert.Fail($"Critical resource '{resourceName}' is not in a healthy state (not Running). " +
                           $"This indicates an infrastructure issue. Check the Aspire dashboard and resource logs for details.");
            }
            catch (Exception ex)
            {
                // Catch any other exceptions and provide diagnostic information
                Assert.Fail($"Failed to check health of critical resource '{resourceName}': {ex.Message}");
            }

            _output.WriteLine("");
        }

        _output.WriteLine("=== All Critical Resources Are Healthy ===");
    }
}
