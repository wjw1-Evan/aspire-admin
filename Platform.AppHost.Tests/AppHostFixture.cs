using System.Net;
using System.Net.Http.Json;
using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using System.Net.Http.Headers;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests;

/// <summary>
/// Official Aspire testing fixture using DistributedApplicationTestingBuilder.
/// </summary>
public sealed class AppHostFixture : IAsyncLifetime
{
    private IDistributedApplicationTestingBuilder? _builder;
    private DistributedApplication? _app;
    private HttpClient? _httpClient;

    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(5);

    private readonly List<string> _trackedUserIds = new();
    private readonly List<string> _trackedWorkflowIds = new();
    private readonly List<string> _trackedDefinitionIds = new();
    private readonly object _lock = new();
    private ITestOutputHelper? _output;

    public CancellationTokenSource Cts { get; } = new(DefaultTimeout);
    public CancellationToken CancellationToken => Cts.Token;

    public void SetOutputHelper(ITestOutputHelper output) => _output = output;

    private void Log(string message) => _output?.WriteLine(message);

    public AppHostFixture() { }

    public HttpClient HttpClient => _httpClient
        ?? throw new InvalidOperationException("Fixture not initialized");

    public DistributedApplication App => _app
        ?? throw new InvalidOperationException("Fixture not initialized");

    public async Task InitializeAsync()
    {
        _builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>(
            args: [
                "--environment=Testing"
            ]);

        _builder.Services.ConfigureHttpClientDefaults(clientBuilder =>
        {
            clientBuilder.AddStandardResilienceHandler();
        });

        _app = await _builder.BuildAsync();
        await _app.StartAsync();

        _httpClient = _app.CreateHttpClient("apiservice");
        _httpClient.Timeout = DefaultTimeout;
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        await _app.ResourceNotifications.WaitForResourceHealthyAsync("apiservice", CancellationToken);
    }

    public async Task DisposeAsync()
    {
        _httpClient?.Dispose();

        // 清理测试数据
        await CleanupTestDataAsync();

        if (_app != null)
        {
            await _app.DisposeAsync();
        }
        Cts.Dispose();
    }

    private async Task CleanupTestDataAsync()
    {
        if (_app == null) return;

        try
        {
            var cleanupClient = _app.CreateHttpClient("apiservice");
            cleanupClient.Timeout = TimeSpan.FromSeconds(30);

            var adminLogin = new { Username = "admin", Password = "admin" };
            var loginResponse = await cleanupClient.PostAsJsonAsync("/api/auth/login", adminLogin);

            string? adminToken = null;
            if (loginResponse.IsSuccessStatusCode)
            {
                var loginJson = await loginResponse.Content.ReadAsStringAsync();
                if (loginJson.Contains("\"success\":true") || loginJson.Contains("\"success\": true"))
                {
                    var tokenStart = loginJson.IndexOf("\"token\":\"") + 9;
                    if (tokenStart > 8)
                    {
                        var tokenEnd = loginJson.IndexOf("\"", tokenStart);
                        if (tokenEnd > tokenStart)
                            adminToken = loginJson.Substring(tokenStart, tokenEnd - tokenStart);
                    }
                }
            }

            if (string.IsNullOrEmpty(adminToken))
            {
                Log("Warning: Failed to obtain admin token for cleanup, skipping test data cleanup");
                return;
            }

            cleanupClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

            foreach (var definitionId in TrackedDefinitionIds)
            {
                try { await cleanupClient.DeleteAsync($"/api/workflows/{definitionId}"); } catch { }
            }

            foreach (var workflowId in TrackedWorkflowIds)
            {
                try { await cleanupClient.DeleteAsync($"/api/workflows/instances/{workflowId}"); } catch { }
            }

            Log($"Cleanup completed: {TrackedUserIds.Count} users, {TrackedWorkflowIds.Count} workflows, {TrackedDefinitionIds.Count} definitions");
        }
        catch (Exception ex)
        {
            Log($"Warning: Test data cleanup failed: {ex.Message}");
        }
    }

    public void TrackUserId(string userId)
    {
        lock (_lock) { _trackedUserIds.Add(userId); }
    }

    public void TrackWorkflowId(string workflowId)
    {
        lock (_lock) { _trackedWorkflowIds.Add(workflowId); }
    }

    public void TrackDefinitionId(string definitionId)
    {
        lock (_lock) { _trackedDefinitionIds.Add(definitionId); }
    }

    public IReadOnlyList<string> TrackedUserIds
    {
        get { lock (_lock) { return _trackedUserIds.ToList(); } }
    }

    public IReadOnlyList<string> TrackedWorkflowIds
    {
        get { lock (_lock) { return _trackedWorkflowIds.ToList(); } }
    }

    public IReadOnlyList<string> TrackedDefinitionIds
    {
        get { lock (_lock) { return _trackedDefinitionIds.ToList(); } }
    }
}
