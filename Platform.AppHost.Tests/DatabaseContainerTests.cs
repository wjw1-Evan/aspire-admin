using System;
using System.IO;
using System.Threading.Tasks;
using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Xunit;

namespace Platform.AppHost.Tests;

/// <summary>
/// 测试 AppHost 启动后数据库容器是否正常运行
/// 支持 PostgreSQL 和 MongoDB 两种数据库提供者
/// </summary>
public class DatabaseContainerTests : IAsyncLifetime
{
    private IDistributedApplicationTestingBuilder? _builder;
    private DistributedApplication? _app;

    public async Task InitializeAsync()
    {
        _builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>();
        _app = await _builder.BuildAsync();
        await _app.StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_app != null)
            await _app.DisposeAsync();
    }

    /// <summary>
    /// 验证 AppHost 能成功启动
    /// </summary>
    [Fact]
    public void AppHost_ShouldStart()
    {
        Assert.NotNull(_builder);
        Assert.NotNull(_app);
    }

    /// <summary>
    /// 验证 postgresql 资源在 AppHost 中配置（当前配置为 postgresql）
    /// </summary>
    [Fact]
    public void PostgresResource_ShouldExist()
    {
        Assert.NotNull(_builder);
        var environment = _builder.Configuration["DOTNET_ENVIRONMENT"] ?? "Development";
        var expectedName = $"postgres-{environment}";

        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == expectedName)
            {
                found = true;
                break;
            }
        }

        Assert.True(found, $"未找到数据库资源: {expectedName}");
    }

    /// <summary>
    /// 验证配置中包含数据库提供者设置
    /// </summary>
    [Fact]
    public void DatabaseProvider_ShouldBeConfigured()
    {
        Assert.NotNull(_builder);
        var provider = _builder.Configuration["Database:Provider"];
        Assert.False(string.IsNullOrEmpty(provider),
            "未找到 Database:Provider 配置，请检查 appsettings.json");
        Assert.Equal("postgresql", provider);
    }
}
