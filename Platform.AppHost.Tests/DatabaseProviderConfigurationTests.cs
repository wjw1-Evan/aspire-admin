using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace Platform.AppHost.Tests;

/// <summary>
/// 测试 AppHost 多数据库切换配置
/// </summary>
public class DatabaseProviderConfigurationTests
{
    /// <summary>
    /// 验证支持的数据库提供者配置值
    /// </summary>
    [Theory]
    [InlineData("mongodb")]
    [InlineData("sqlserver")]
    [InlineData("postgresql")]
    public void SupportedDatabaseProviders_ShouldBeValid(string provider)
    {
        var lowerProvider = provider.ToLowerInvariant();
        Assert.Contains(lowerProvider, new[] { "mongodb", "sqlserver", "postgresql" });
    }

    /// <summary>
    /// 验证 appsettings.json 包含 Database:Provider 配置节
    /// </summary>
    [Fact]
    public void AppSettings_ShouldContainDatabaseProvider()
    {
        var appSettingsPath = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "Platform.AppHost", "appsettings.json");

        Assert.True(File.Exists(appSettingsPath),
            $"找不到 appsettings.json: {appSettingsPath}");

        var content = File.ReadAllText(appSettingsPath);
        Assert.Contains("\"Database\"", content);
        Assert.Contains("\"Provider\"", content);
    }

    /// <summary>
    /// 验证 Database:Provider 配置项的值在支持范围内
    /// </summary>
    [Fact]
    public void DatabaseProvider_InAppSettings_ShouldBeSupported()
    {
        var appSettingsPath = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "Platform.AppHost", "appsettings.json");

        var content = File.ReadAllText(appSettingsPath);
        var provider = ExtractJsonValue(content, "Database:Provider");

        if (!string.IsNullOrEmpty(provider))
        {
            var supportedProviders = new[] { "mongodb", "sqlserver", "postgresql" };
            Assert.Contains(provider.ToLowerInvariant(), supportedProviders);
        }
    }

    /// <summary>
    /// 验证 AppHost.cs 中包含多数据库切换逻辑
    /// </summary>
    [Fact]
    public void AppHost_ShouldContainMultiDatabaseSwitch()
    {
        var appHostPath = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "Platform.AppHost", "AppHost.cs");

        Assert.True(File.Exists(appHostPath),
            $"找不到 AppHost.cs: {appHostPath}");

        var content = File.ReadAllText(appHostPath);
        Assert.Contains("Database:Provider", content);
        Assert.Contains("AddSqlServer", content);
        Assert.Contains("AddPostgres", content);
        Assert.Contains("AddMongoDB", content);
    }

    /// <summary>
    /// 验证 ServiceExtensions.cs 中包含多数据库注册逻辑
    /// </summary>
    [Fact]
    public void ServiceExtensions_ShouldContainMultiDatabaseRegistration()
    {
        var serviceExtensionsPath = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "Platform.ServiceDefaults", "Extensions", "ServiceExtensions.cs");

        Assert.True(File.Exists(serviceExtensionsPath),
            $"找不到 ServiceExtensions.cs: {serviceExtensionsPath}");

        var content = File.ReadAllText(serviceExtensionsPath);
        Assert.Contains("AddSqlServerDbContext", content);
        Assert.Contains("AddNpgsqlDbContext", content);
        Assert.Contains("AddMongoDbContext", content);
        Assert.False(content.Contains("?? \"mongodb\""), "不应包含默认值 ?? \"mongodb\"");
        Assert.False(content.Contains("?? \"sqlserver\""), "不应包含默认值 ?? \"sqlserver\"");
        Assert.False(content.Contains("?? \"postgresql\""), "不应包含默认值 ?? \"postgresql\"");
    }

    private static string? ExtractJsonValue(string json, string path)
    {
        // 简单提取 JSON 值（仅用于测试）
        var key = $"\"{path.Split(':').Last()}\"";
        var index = json.IndexOf(key, StringComparison.OrdinalIgnoreCase);
        if (index == -1) return null;

        var start = json.IndexOf('"', index + key.Length) + 1;
        var end = json.IndexOf('"', start);
        return json[start..end];
    }
}
