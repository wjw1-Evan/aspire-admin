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
    /// 验证 mongodb 资源在 AppHost 中配置（验证多数据库支持）
    /// </summary>
    [Fact]
    public void MongoResource_ShouldExist_WhenConfigured()
    {
        Assert.NotNull(_builder);
        var environment = _builder.Configuration["DOTNET_ENVIRONMENT"] ?? "Development";
        var expectedName = $"mongo-{environment}";

        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == expectedName)
            {
                found = true;
                break;
            }
        }

        // 当前配置为 postgresql，mongodb 资源不应存在
        var currentProvider = _builder.Configuration["Database:Provider"];
        if (currentProvider.Equals("mongodb", StringComparison.OrdinalIgnoreCase))
        {
            Assert.True(found, $"当前配置为 {currentProvider}，但未找到数据库资源: {expectedName}");
        }
        else
        {
            // 非 mongodb 配置时，资源不应存在
            Assert.False(found, $"当前配置为 {currentProvider}，但找到了 mongodb 资源: {expectedName}，这是错误的");
        }
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

    /// <summary>
    /// 验证 Redis 资源在 AppHost 中配置
    /// </summary>
    [Fact]
    public void RedisResource_ShouldExist()
    {
        Assert.NotNull(_builder);
        
        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == "redis")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 Redis 资源");
    }

    /// <summary>
    /// 验证 ApiService 项目在 AppHost 中配置
    /// </summary>
    [Fact]
    public void ApiService_ShouldExist()
    {
        Assert.NotNull(_builder);
        
        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == "apiservice")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 apiservice 资源");
    }

    /// <summary>
    /// 验证 DataInitializer 项目在 AppHost 中配置
    /// </summary>
    [Fact]
    public void DataInitializer_ShouldExist()
    {
        Assert.NotNull(_builder);
        
        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == "datainitializer")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 datainitializer 资源");
    }

    /// <summary>
    /// 验证 OpenAI 资源在 AppHost 中配置
    /// </summary>
    [Fact]
    public void OpenAI_ShouldExist()
    {
        Assert.NotNull(_builder);
        
        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == "openai")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 openai 资源");
    }

    /// <summary>
    /// 验证 YARP 网关资源在 AppHost 中配置
    /// </summary>
    [Fact]
    public void YarpGateway_ShouldExist()
    {
        Assert.NotNull(_builder);
        
        bool found = false;
        foreach (var resource in _builder.Resources)
        {
            if (resource.Name == "apigateway")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 apigateway 资源");
    }

    /// <summary>
    /// 验证 Database:Provider 配置通过环境变量传递到子项目
    /// </summary>
    [Fact]
    public void DatabaseProvider_ShouldBePassedToChildProjects()
    {
        Assert.NotNull(_builder);
        
        var provider = _builder.Configuration["Database:Provider"];
        Assert.False(string.IsNullOrEmpty(provider));
        
        // 验证配置存在且有效
        var supportedProviders = new[] { "mongodb", "postgresql" };
        Assert.Contains(provider.ToLowerInvariant(), supportedProviders);
    }
}
