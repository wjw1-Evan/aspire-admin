using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using System.Net.Http.Headers;

namespace Platform.AppHost.Tests;

/// <summary>
/// Official Aspire testing fixture using DistributedApplicationTestingBuilder.
/// </summary>
public sealed class AppHostFixture : IAsyncLifetime
{
    private IDistributedApplicationTestingBuilder? _builder;
    private DistributedApplication? _app;
    private HttpClient? _httpClient;

    public const string TestJwtKey = "test-secret-key-for-integration-tests-minimum-32-characters-required";
    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(5);

    private readonly List<string> _trackedUserIds = new();
    private readonly List<string> _trackedWorkflowIds = new();
    private readonly List<string> _trackedDefinitionIds = new();
    private readonly object _lock = new();

    public CancellationTokenSource Cts { get; } = new(DefaultTimeout);
    public CancellationToken CancellationToken => Cts.Token;

    public AppHostFixture() { }

    public HttpClient HttpClient => _httpClient
        ?? throw new InvalidOperationException("Fixture not initialized");

    public DistributedApplication App => _app
        ?? throw new InvalidOperationException("Fixture not initialized");

    public async Task InitializeAsync()
    {
        _builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>(
            args: [
                "--environment=Testing",
                "Jwt:SecretKey=" + TestJwtKey
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
        if (_app != null)
        {
            await _app.DisposeAsync();
        }
        Cts.Dispose();
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
