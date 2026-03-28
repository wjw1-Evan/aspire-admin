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
    protected string? CurrentCompanyId { get; private set; }

    protected BaseIntegrationTest(AppHostFixture fixture, ITestOutputHelper output)
    {
        Fixture = fixture;
        Output = output;
        TestClient = fixture.HttpClient;
    }

    /// <summary>
    /// Initializes authentication for the test.
    /// By default, each test gets a fresh new user for proper test isolation.
    /// Use forceNewUser=false only when you need to share user context within test class.
    /// </summary>
    protected virtual async Task InitializeAuthenticationAsync(bool forceNewUser = true)
    {
        var authResult = await CreateAndLoginNewUserAsync();
        
        CurrentUserId = authResult.UserId;
        TestClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authResult.Token);
        
        // 获取当前用户的公司ID
        var meResponse = await TestClient.GetAsync("/api/auth/current-user");
        if (meResponse.IsSuccessStatusCode)
        {
            var meJson = await meResponse.Content.ReadAsStringAsync();
            if (meJson.Contains("currentCompanyId"))
            {
                var doc = System.Text.Json.JsonDocument.Parse(meJson);
                if (doc.RootElement.TryGetProperty("data", out var data) && 
                    data.TryGetProperty("currentCompanyId", out var companyIdProp))
                {
                    CurrentCompanyId = companyIdProp.GetString();
                }
            }
        }
        else
        {
            Output.WriteLine($"Warning: Failed to get user info: {meResponse.StatusCode}");
        }
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
        
        if (!registerResponse.IsSuccessStatusCode)
        {
            var registerError = await registerResponse.Content.ReadAsStringAsync();
            Output.WriteLine($"[DEBUG] Register failed: {registerResponse.StatusCode}");
            Output.WriteLine($"[DEBUG] Register response: {registerError}");
        }
        
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var registerApiResponse = await registerResponse.Content.ReadAsJsonAsync<ApiResponse<RegisterResponseData>>();
        Assert.NotNull(registerApiResponse);
        
        Output.WriteLine($"[DEBUG] Register response: success={registerApiResponse.Success}, code={registerApiResponse.Code}, message={registerApiResponse.Message}");
        
        Assert.NotNull(registerApiResponse.Data);
        Assert.NotNull(registerApiResponse.Data.Id);
        Fixture.TrackUserId(registerApiResponse.Data.Id);

        // Debug: 直接使用明文密码登录
        Output.WriteLine($"[DEBUG] Login with password: {registration.Password}");
        var loginRequest = new LoginRequest { Username = registration.Username, Password = registration.Password };
        var loginResponse = await TestClient.PostAsJsonAsync("/api/auth/login", loginRequest);
        
        string loginErrorContent;
        try
        {
            loginErrorContent = await loginResponse.Content.ReadAsStringAsync();
        }
        catch
        {
            loginErrorContent = "(unable to read content)";
        }
        
        Output.WriteLine($"[DEBUG] Login response status: {loginResponse.StatusCode}");
        Output.WriteLine($"[DEBUG] Login response content: {loginErrorContent}");
        
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginApiResponse = await loginResponse.Content.ReadAsJsonAsync<ApiResponse<LoginResponseData>>();
        Assert.NotNull(loginApiResponse?.Data?.Token);
        Assert.NotNull(registerApiResponse.Data.Id);

        return (loginApiResponse.Data.Token, registerApiResponse.Data.Id);
    }
    
    /// <summary>
    /// 添加用户到当前用户的公司（用于测试多用户审批场景）
    /// </summary>
    protected async Task AddUserToCurrentCompanyAsync(string userId, string userToken)
    {
        if (string.IsNullOrEmpty(CurrentCompanyId))
        {
            Output.WriteLine("Warning: CurrentCompanyId is not set, skipping add user to company");
            return;
        }
        
        // 获取管理员的 token（第一个用户）
        var adminToken = TestClient.DefaultRequestHeaders.Authorization?.Parameter;
        if (string.IsNullOrEmpty(adminToken))
        {
            Output.WriteLine("Warning: Admin token not found, skipping add user to company");
            return;
        }
        
        // 使用第二个用户的身份提交加入申请
        var userClient = new System.Net.Http.HttpClient
        {
            BaseAddress = TestClient.BaseAddress,
            Timeout = AppHostFixture.DefaultTimeout
        };
        userClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        
        var joinRequest = new { CompanyId = CurrentCompanyId, Reason = "Test user for approval workflow" };
        var joinResponse = await userClient.PostAsJsonAsync("/api/company/join", joinRequest);
        
        if (!joinResponse.IsSuccessStatusCode && joinResponse.StatusCode != HttpStatusCode.BadRequest)
        {
            Output.WriteLine($"Warning: Failed to submit join request: {joinResponse.StatusCode}");
            // 继续执行，可能用户已经在公司中
        }
        
        // 获取待处理的加入申请
        var requestsResponse = await TestClient.GetAsync($"/api/company/join-requests?status=pending");
        if (requestsResponse.IsSuccessStatusCode)
        {
            var requestsData = await requestsResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Output.WriteLine($"Join requests: {System.Text.Json.JsonSerializer.Serialize(requestsData)}");
        }
        
        Output.WriteLine($"Note: User {userId} join request submitted (pending approval)");
    }
}
