using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Xunit;

namespace Platform.AppHost.Tests;

public class UserRegistrationTests : IAsyncLifetime
{
    private DistributedApplication? _app;
    private HttpClient? _httpClient;

    public async Task InitializeAsync()
    {
        var builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>();
        builder.Configuration["DOTNET_ENVIRONMENT"] = "Testing";
        _app = await builder.BuildAsync();
        await _app.StartAsync();

        _httpClient = _app.CreateHttpClient("apiservice");

        await WaitForServiceReadyAsync(_httpClient);
    }

    public async Task DisposeAsync()
    {
        if (_app != null)
            await _app.DisposeAsync();
    }

    private static async Task WaitForServiceReadyAsync(HttpClient httpClient)
    {
        var maxRetries = 30;
        for (var i = 0; i < maxRetries; i++)
        {
            try
            {
                var response = await httpClient.GetAsync("/health");
                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
            }

            await Task.Delay(TimeSpan.FromSeconds(1));
        }
    }

    [Fact]
    public async Task RegisterUser_WithRandomUsername_ShouldSucceed()
    {
        var randomSuffix = Guid.NewGuid().ToString("N")[..8];
        var username = $"testuser_{randomSuffix}";

        var request = new
        {
            username,
            password = "admin123",
            email = $"test_{randomSuffix}@example.com"
        };

        JsonElement? responseData = null;
        HttpResponseMessage? response = null;

        for (var retry = 0; retry < 10; retry++)
        {
            response = await _httpClient!.PostAsJsonAsync("/api/auth/register", request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
                continue;
            }

            var apiResponse = JsonSerializer.Deserialize<JsonElement>(content);
            if (apiResponse.TryGetProperty("success", out var success) && success.GetBoolean())
            {
                responseData = apiResponse;
                break;
            }

            await Task.Delay(TimeSpan.FromSeconds(2));
        }

        Assert.NotNull(response);
        Assert.NotNull(responseData);
        Assert.True(response!.IsSuccessStatusCode, $"HTTP 请求失败，状态码: {response.StatusCode}");
        Assert.True(responseData!.Value.GetProperty("success").GetBoolean(), "注册业务逻辑应成功");

        var data = responseData.Value.GetProperty("data");
        Assert.Equal(username, data.GetProperty("username").GetString());
        Assert.False(string.IsNullOrEmpty(data.GetProperty("id").GetString()), "注册成功后应返回用户 ID");
    }
}
