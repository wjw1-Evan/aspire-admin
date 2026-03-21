using Aspire.Hosting.ApplicationModel;
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
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

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
    /// <see cref="https://aspire.dev/zh-cn/testing/accessing-resources/"/>
    [Fact]
    public async Task AllCriticalResources_ShouldBeHealthy()
    {
        _output.WriteLine("=== Resource Health Status ===");
        _output.WriteLine("");

        var app = _fixture.App;
        var criticalResources = new[] { "apiservice", "mongodb" };

        foreach (var resourceName in criticalResources)
        {
            _output.WriteLine($"Checking critical resource: {resourceName}");

            try
            {
                using var cts = new CancellationTokenSource(DefaultTimeout);
                await app.ResourceNotifications.WaitForResourceHealthyAsync(resourceName, cts.Token);
                _output.WriteLine($"✓ {resourceName} is Healthy");
            }
            catch (OperationCanceledException)
            {
                Assert.Fail($"Critical resource '{resourceName}' did not become healthy within {DefaultTimeout.TotalSeconds} seconds. " +
                           "This indicates an infrastructure issue. Check the Aspire dashboard and resource logs for details.");
            }
            catch (Exception ex)
            {
                Assert.Fail($"Failed to check health of critical resource '{resourceName}': {ex.Message}");
            }

            _output.WriteLine("");
        }

        _output.WriteLine("=== All Critical Resources Are Healthy ===");
    }
}
