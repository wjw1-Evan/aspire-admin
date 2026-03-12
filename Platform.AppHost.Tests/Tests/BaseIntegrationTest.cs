using System.Net;
using System.Net.Http.Headers;
using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Base class for integration tests that provides common functionality like authentication and HTTP client management.
/// </summary>
public abstract class BaseIntegrationTest : IClassFixture<AppHostFixture>
{
    protected readonly AppHostFixture Fixture;
    protected readonly ITestOutputHelper Output;
    protected System.Net.Http.HttpClient TestClient;
    
    // Per-class token cache to avoid redundant registrations
    private static readonly Dictionary<Type, string> TokenCache = new();
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

        if (!forceNewUser)
        {
            lock (CacheLock)
            {
                TokenCache.TryGetValue(GetType(), out token);
            }
        }

        if (string.IsNullOrEmpty(token))
        {
            token = await CreateAndLoginNewUserAsync();
            
            if (!forceNewUser)
            {
                lock (CacheLock)
                {
                    TokenCache[GetType()] = token;
                }
            }
        }

        TestClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Creates a new user and logs in to obtain an access token.
    /// </summary>
    protected async Task<string> CreateAndLoginNewUserAsync()
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

        return loginApiResponse.Data.Token;
    }
}
