using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;

namespace Platform.AppHost.Tests;

/// <summary>
/// Test fixture for managing the distributed application lifecycle during integration tests.
/// Implements IAsyncLifetime to ensure proper setup and teardown of the Aspire application.
/// </summary>
public class AppHostFixture : IAsyncLifetime
{
    public const string TestJwtKey = "test-secret-key-for-integration-tests-minimum-32-characters-required";
    public const int DefaultTimeoutSeconds = 30;

    private DistributedApplication? _app;
    private HttpClient? _httpClient;
    private readonly List<string> _createdUserIds = new();
    private readonly List<string> _createdWorkflowIds = new();
    private readonly List<string> _createdDocumentIds = new();
    private readonly List<string> _createdFormDefinitionIds = new();
    private readonly List<string> _createdKnowledgeBaseIds = new();

    /// <summary>
    /// Gets the configured HTTP client for making requests to the API service.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown if the fixture has not been initialized.</exception>
    public HttpClient HttpClient => _httpClient
        ?? throw new InvalidOperationException("Fixture not initialized. Ensure InitializeAsync has been called.");

    /// <summary>
    /// Gets the distributed application instance.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown if the fixture has not been initialized.</exception>
    public DistributedApplication App => _app
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
    /// Initializes the distributed application and prepares the test environment.
    /// This method:
    /// 1. Creates the DistributedApplication from the AppHost
    /// 2. Configures test-specific settings (JWT key, disable SMTP)
    /// 3. Starts the application
    /// 4. Waits for the API service to be ready
    /// 5. Creates and configures an HTTP client for testing
    /// </summary>
    public async Task InitializeAsync()
    {
        // Create the distributed application builder from the AppHost project
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.Platform_AppHost>();

        // Configure test-specific settings
        // JWT secret key for token generation/validation in tests
        appHost.Configuration["Jwt:SecretKey"] = TestJwtKey;

        // Disable SMTP to prevent email sending during tests
        appHost.Configuration["Smtp:Host"] = "";

        // Build and start the distributed application
        _app = await appHost.BuildAsync();
        await _app.StartAsync();

        // Wait for the API service to be ready
        // The resource name "apiservice" matches the name defined in AppHost.cs
        var resourceNotificationService = _app.Services.GetRequiredService<ResourceNotificationService>();
        await resourceNotificationService
            .WaitForResourceAsync("apiservice", KnownResourceStates.Running)
            .WaitAsync(TimeSpan.FromSeconds(60));

        // Create HTTP client configured for the API service
        _httpClient = _app.CreateHttpClient("apiservice");

        // Configure HTTP client settings
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>
    /// Cleans up resources when tests are complete.
    /// Disposes the HTTP client and stops the distributed application.
    /// </summary>
    public async Task DisposeAsync()
    {
        _httpClient?.Dispose();

        if (_app != null)
        {
            await _app.DisposeAsync();
        }
    }
}
