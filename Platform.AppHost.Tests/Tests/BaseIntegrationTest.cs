using System.Net;
using System.Net.Http.Headers;
using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Base class for integration tests that provides common functionality like authentication and HTTP client management.
/// Follows official Aspire testing patterns.
/// See: https://aspire.dev/zh-cn/testing/overview/
/// </summary>
public abstract class BaseIntegrationTest : IClassFixture<AppHostFixture>
{
    protected readonly AppHostFixture Fixture;
    protected readonly ITestOutputHelper Output;
    protected System.Net.Http.HttpClient TestClient;
    protected string? CurrentUserId { get; private set; }

    // Per-class auth cache to avoid redundant registrations
    private static readonly Dictionary<Type, (string Token, string UserId)> AuthCache = new();
    private static readonly object CacheLock = new();

    protected BaseIntegrationTest(AppHostFixture fixture, ITestOutputHelper output)
    {
        Fixture = fixture;
        Output = output;
        TestClient = fixture.HttpClient;
    }

    /// <summary>
    /// Initializes authentication for the test. 
    /// If a token is already cached for the test class, it will be reused.
    /// </summary>
    protected virtual async Task InitializeAuthenticationAsync(bool forceNewUser = false)
    {
        string? token = null;
        string? userId = null;

        if (!forceNewUser)
        {
            lock (CacheLock)
            {
                if (AuthCache.TryGetValue(GetType(), out var auth))
                {
                    token = auth.Token;
                    userId = auth.UserId;
                }
            }
        }

        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(userId))
        {
            var authResult = await CreateAndLoginNewUserAsync();
            token = authResult.Token;
            userId = authResult.UserId;
            
            if (!forceNewUser)
            {
                lock (CacheLock)
                {
                    AuthCache[GetType()] = (token, userId);
                }
            }
        }

        CurrentUserId = userId;
        TestClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Creates a new authenticated HttpClient for tests that need different user context.
    /// Uses official Aspire pattern for proper HttpClient creation.
    /// See: https://aspire.dev/zh-cn/testing/write-your-first-test/
    /// </summary>
    protected async Task<(System.Net.Http.HttpClient Client, string UserId)> CreateAuthenticatedClientAsync()
    {
        var authResult = await CreateAndLoginNewUserAsync();
        
        var client = new System.Net.Http.HttpClient
        {
            BaseAddress = TestClient.BaseAddress,
            Timeout = AppHostFixture.DefaultTimeout
        };
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authResult.Token);
        
        return (client, authResult.UserId);
    }

    /// <summary>
    /// Creates a new user and logs in to obtain an access token and user ID.
    /// </summary>
    protected async Task<(string Token, string UserId)> CreateAndLoginNewUserAsync()
    {
        var registration = TestDataGenerator.GenerateValidRegistration();
        Output.WriteLine($"Registering test user: {registration.Username}");

        var registerResponse = await TestClient.PostAsJsonAsync("/api/auth/register", registration);
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var registerApiResponse = await registerResponse.Content.ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();
        Assert.NotNull(registerApiResponse);
        Assert.NotNull(registerApiResponse.Data);
        Assert.NotNull(registerApiResponse.Data.Id);
        Fixture.TrackUserId(registerApiResponse.Data.Id);

        var loginRequest = new LoginRequest { Username = registration.Username, Password = registration.Password };
        var loginResponse = await TestClient.PostAsJsonAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginApiResponse = await loginResponse.Content.ReadAsJsonAsync<ApiResponse<LoginResponseData>>();
        Assert.NotNull(loginApiResponse?.Data?.Token);
        Assert.NotNull(registerApiResponse.Data.Id);

        return (loginApiResponse.Data.Token, registerApiResponse.Data.Id);
    }
}
