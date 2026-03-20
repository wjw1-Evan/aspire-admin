using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;

namespace Platform.AppHost.Tests;

/// <summary>
/// Test fixture for managing the distributed application lifecycle during integration tests.
/// Uses singleton pattern to ensure only one instance of the application runs across all tests.
/// </summary>
public class AppHostFixture : IAsyncLifetime
{
    public const string TestJwtKey = "test-secret-key-for-integration-tests-minimum-32-characters-required";
    public const int DefaultTimeoutSeconds = 30;

    private static readonly SemaphoreSlim _initLock = new(1, 1);
    private static DistributedApplication? _sharedApp;
    private static HttpClient? _sharedHttpClient;
    private static bool _initialized;

    private readonly List<string> _createdUserIds = new();
    private readonly List<string> _createdWorkflowIds = new();
    private readonly List<string> _createdDocumentIds = new();
    private readonly List<string> _createdFormDefinitionIds = new();
    private readonly List<string> _createdKnowledgeBaseIds = new();

    /// <summary>
    /// Gets the configured HTTP client for making requests to the API service.
    /// </summary>
    public HttpClient HttpClient => _sharedHttpClient
        ?? throw new InvalidOperationException("Fixture not initialized. Ensure InitializeAsync has been called.");

    /// <summary>
    /// Gets the distributed application instance.
    /// </summary>
    public DistributedApplication App => _sharedApp
        ?? throw new InvalidOperationException("Fixture not initialized. Ensure InitializeAsync has been called.");

    /// <summary>
    /// Registers a user ID for cleanup after tests complete.
    /// </summary>
    public void TrackUserId(string userId)
    {
        lock (_createdUserIds)
        {
            _createdUserIds.Add(userId);
        }
    }

    /// <summary>
    /// Registers a workflow ID for cleanup after tests complete.
    /// </summary>
    public void TrackWorkflowId(string workflowId)
    {
        lock (_createdWorkflowIds)
        {
            _createdWorkflowIds.Add(workflowId);
        }
    }

    /// <summary>
    /// Registers a document ID for cleanup after tests complete.
    /// </summary>
    public void TrackDocumentId(string documentId)
    {
        lock (_createdDocumentIds)
        {
            _createdDocumentIds.Add(documentId);
        }
    }

    /// <summary>
    /// Registers a form definition ID for cleanup after tests complete.
    /// </summary>
    public void TrackFormDefinitionId(string formDefinitionId)
    {
        lock (_createdFormDefinitionIds)
        {
            _createdFormDefinitionIds.Add(formDefinitionId);
        }
    }

    /// <summary>
    /// Registers a knowledge base ID for cleanup after tests complete.
    /// </summary>
    public void TrackKnowledgeBaseId(string knowledgeBaseId)
    {
        lock (_createdKnowledgeBaseIds)
        {
            _createdKnowledgeBaseIds.Add(knowledgeBaseId);
        }
    }

    /// <summary>
    /// Initializes the distributed application. Uses singleton pattern to ensure
    /// only one instance is created even when multiple test classes access this fixture.
    /// </summary>
    public async Task InitializeAsync()
    {
        if (_initialized && _sharedApp != null && _sharedHttpClient != null)
        {
            return;
        }

        await _initLock.WaitAsync();
        try
        {
            if (_initialized && _sharedApp != null && _sharedHttpClient != null)
            {
                return;
            }

            // Create the distributed application builder from the AppHost project
            var appHost = await DistributedApplicationTestingBuilder
                .CreateAsync<Projects.Platform_AppHost>();

            // Configure test-specific settings
            appHost.Configuration["Jwt:SecretKey"] = TestJwtKey;
            appHost.Configuration["Smtp:Host"] = "";
            appHost.Configuration["ApiService:Replicas"] = "1";

            // Build and start the distributed application
            _sharedApp = await appHost.BuildAsync();
            await _sharedApp.StartAsync();

            // Wait for the API service to be ready
            var resourceNotificationService = _sharedApp.Services.GetRequiredService<ResourceNotificationService>();
            await resourceNotificationService
                .WaitForResourceAsync("apiservice", KnownResourceStates.Running)
                .WaitAsync(TimeSpan.FromSeconds(DefaultTimeoutSeconds));

            // Create HTTP client configured for the API service
            _sharedHttpClient = _sharedApp.CreateHttpClient("apiservice");
            _sharedHttpClient.Timeout = TimeSpan.FromSeconds(DefaultTimeoutSeconds);
            _sharedHttpClient.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));

            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    /// <summary>
    /// Cleans up resources when tests are complete.
    /// Only disposes the application if this is the last reference.
    /// </summary>
    public async Task DisposeAsync()
    {
        if (_initialized)
        {
            _sharedHttpClient?.Dispose();
            if (_sharedApp != null)
            {
                await _sharedApp.DisposeAsync();
                _sharedApp = null;
                _sharedHttpClient = null;
                _initialized = false;
            }
        }
    }
}
