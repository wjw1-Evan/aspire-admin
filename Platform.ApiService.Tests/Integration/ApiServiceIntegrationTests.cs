using System;
using System.Linq;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using Platform.ApiService;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Moq;
using Xunit;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

namespace Platform.ApiService.Tests.Integration;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((ctx, configBuilder) =>
        {
            // 通过环境变量提供 Jwt 配置，确保 Program.cs 早期读取到值
            Environment.SetEnvironmentVariable("Jwt__SecretKey", "0123456789abcdef0123456789abcdef");
            Environment.SetEnvironmentVariable("Jwt__Issuer", "Platform.ApiService");
            Environment.SetEnvironmentVariable("Jwt__Audience", "Platform.Web");

            var dict = new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "0123456789abcdef0123456789abcdef",
                ["Jwt:Issuer"] = "Platform.ApiService",
                ["Jwt:Audience"] = "Platform.Web"
            };
            configBuilder.AddInMemoryCollection(dict);
        });

        builder.ConfigureServices(services =>
        {
            // 提供 IMongoClient/IMongoDatabase 的测试替身，避免 DI 验证失败
            var mongoClientDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IMongoClient));
            if (mongoClientDescriptor != null) services.Remove(mongoClientDescriptor);
            var mongoDbDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IMongoDatabase));
            if (mongoDbDescriptor != null) services.Remove(mongoDbDescriptor);

            var mongoClientMock = new Mock<IMongoClient>();
            var mongoDbMock = new Mock<IMongoDatabase>();
            services.AddSingleton<IMongoClient>(mongoClientMock.Object);
            services.AddSingleton<IMongoDatabase>(mongoDbMock.Object);

            // 替换 IStorageQuotaService 为 mock，避免依赖数据库
            var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IStorageQuotaService));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            var mock = new Mock<IStorageQuotaService>();
            mock.Setup(s => s.SetUserQuotaAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<int?>(), It.IsAny<bool?>()))
                .ReturnsAsync((string userId, long totalQuota, int? warningThreshold, bool? isEnabled) =>
                    new StorageQuota { UserId = userId, TotalQuota = totalQuota, WarningThreshold = warningThreshold ?? 80, IsEnabled = isEnabled ?? true });

            // 其他方法默认返回合理的占位数据，避免测试期间抛出异常
            mock.Setup(s => s.GetStorageUsageStatsAsync(It.IsAny<string?>()))
                .ReturnsAsync(new StorageUsageStats { TotalUsed = 1024L, TotalQuota = 2048L, TotalUsers = 1, AverageUsage = 1024L });
            mock.Setup(s => s.CheckStorageAvailabilityAsync(It.IsAny<string>(), It.IsAny<long>()))
                .ReturnsAsync(true);
            services.AddSingleton<IStorageQuotaService>(mock.Object);

            // 替换认证相关服务为 mock
            var authDesc = services.FirstOrDefault(d => d.ServiceType == typeof(IAuthService));
            if (authDesc != null) services.Remove(authDesc);
            var authMock = new Mock<IAuthService>();
            authMock.Setup(a => a.LogoutAsync()).ReturnsAsync(true);
            services.AddSingleton<IAuthService>(authMock.Object);

            var phoneDesc = services.FirstOrDefault(d => d.ServiceType == typeof(IPhoneValidationService));
            if (phoneDesc != null) services.Remove(phoneDesc);
            var phoneMock = new Mock<IPhoneValidationService>();
            phoneMock.Setup(p => p.ValidatePhone(It.IsAny<string?>()));
            phoneMock.Setup(p => p.ValidateCaptchaCode(It.IsAny<string?>()));
            services.AddSingleton<IPhoneValidationService>(phoneMock.Object);

            var captchaDesc = services.FirstOrDefault(d => d.ServiceType == typeof(ICaptchaService));
            if (captchaDesc != null) services.Remove(captchaDesc);
            var captchaMock = new Mock<ICaptchaService>();
            captchaMock.Setup(c => c.GenerateCaptchaAsync(It.IsAny<string>()))
                .ReturnsAsync((string phone) => new CaptchaResult { Code = "123456", ExpiresIn = 300 });
            captchaMock.Setup(c => c.ValidateCaptchaAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(true);
            services.AddSingleton<ICaptchaService>(captchaMock.Object);

            var imgCaptchaDesc = services.FirstOrDefault(d => d.ServiceType == typeof(IImageCaptchaService));
            if (imgCaptchaDesc != null) services.Remove(imgCaptchaDesc);
            var imgCaptchaMock = new Mock<IImageCaptchaService>();
            imgCaptchaMock.Setup(c => c.GenerateCaptchaAsync(It.IsAny<string>(), It.IsAny<string?>()))
                .ReturnsAsync(new CaptchaImageResult { CaptchaId = "abc123", ImageData = "iVBORw0KGgo", ExpiresIn = 300 });
            imgCaptchaMock.Setup(c => c.ValidateCaptchaAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(true);
            services.AddSingleton<IImageCaptchaService>(imgCaptchaMock.Object);

            // 统一通知服务 mock
            var uniDesc = services.FirstOrDefault(d => d.ServiceType == typeof(IUnifiedNotificationService));
            if (uniDesc != null) services.Remove(uniDesc);
            var uniMock = new Mock<IUnifiedNotificationService>();
            uniMock.Setup(u => u.GetUnreadCountAsync()).ReturnsAsync(7);
            services.AddSingleton<IUnifiedNotificationService>(uniMock.Object);
        });
    }
}

public class ApiServiceIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    public ApiServiceIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    private static string CreateJwtToken(string userId = "U-001", string username = "tester", string role = "admin")
    {
        var key = new SymmetricSecurityKey(System.Text.Encoding.ASCII.GetBytes("0123456789abcdef0123456789abcdef"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new Claim("userId", userId),
            new Claim("username", username),
            new Claim("role", role)
        };
        var token = new JwtSecurityToken(
            issuer: "Platform.ApiService",
            audience: "Platform.Web",
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task LogTest_Test_Should_Return_Standard_ApiResponse()
    {
        var resp = await _client.GetAsync("/api/logtest/test");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("日志测试完成", data.GetProperty("message").GetString());
        Assert.Equal("Platform.ApiService", data.GetProperty("service").GetString());
    }

    [Fact]
    public async Task Quota_Add_Should_Be_Wrapped_By_ResponseFormattingMiddleware()
    {
        var resp = await _client.PostAsync("/api/quota/add?userId=U1&amount=2048", content: null);
        resp.EnsureSuccessStatusCode();
        Assert.Equal("application/json; charset=utf-8", resp.Content.Headers.ContentType!.ToString());

        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        // 顶层应为统一响应结构
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("U1", data.GetProperty("userId").GetString());
        Assert.Equal(2048, data.GetProperty("totalQuota").GetInt64());
        // 时间戳字段存在
        Assert.True(root.TryGetProperty("timestamp", out _));
    }

    [Fact]
    public async Task Maintenance_Health_Should_Return_Standard_ApiResponse()
    {
        var resp = await _client.GetAsync("/api/maintenance/health");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("healthy", data.GetProperty("status").GetString());
        Assert.True(root.TryGetProperty("timestamp", out _));
    }

    [Fact]
    public async Task Maintenance_FixUserCompanyRecords_Without_Token_Should_Return_401_Json()
    {
        var resp = await _client.PostAsync("/api/maintenance/fix-user-company-records", content: null);
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.Equal("UNAUTHORIZED", root.GetProperty("error").GetString());
        var message = root.GetProperty("message").GetString();
        Assert.Contains("未提供有效的认证令牌", message);
    }

    [Fact]
    public async Task Auth_Captcha_Should_Return_Code()
    {
        var resp = await _client.GetAsync("/api/auth/captcha?phone=13800138000");
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");
        Assert.Equal("123456", data.GetProperty("captcha").GetString());
        Assert.Equal(300, data.GetProperty("expiresIn").GetInt32());
    }

    [Fact]
    public async Task Auth_VerifyCaptcha_Should_Return_ValidTrue()
    {
        var content = JsonContent.Create(new { phone = "13800138000", code = "123456" });
        var resp = await _client.PostAsync("/api/auth/verify-captcha", content);
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.True(root.GetProperty("data").GetProperty("valid").GetBoolean());
    }

    [Fact]
    public async Task Auth_CurrentUser_Without_Token_Should_Return_401_Json()
    {
        var resp = await _client.GetAsync("/api/auth/current-user");
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Auth_Logout_Without_Token_Should_Return_401_Json()
    {
        var resp = await _client.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task UnifiedNotification_UnreadCount_Without_Token_Should_Return_401_Json()
    {
        var resp = await _client.GetAsync("/api/unified-notification/unread-count");
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task StorageQuota_List_Invalid_PageSize_Without_Token_Should_Return_401()
    {
        var resp = await _client.GetAsync("/api/storage-quota/list?page=1&pageSize=1000");
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
        Assert.Equal("utf-8", resp.Content.Headers.ContentType!.CharSet);
    }

    [Fact]
    public async Task StorageQuota_CheckAvailability_Without_Token_Should_Return_401()
    {
        var resp = await _client.GetAsync("/api/storage-quota/user/U1/check-availability?requiredSize=1024");
        Assert.Equal(401, (int)resp.StatusCode);
        Assert.Equal("application/json", resp.Content.Headers.ContentType!.MediaType);
        Assert.Equal("utf-8", resp.Content.Headers.ContentType!.CharSet);
    }
}
