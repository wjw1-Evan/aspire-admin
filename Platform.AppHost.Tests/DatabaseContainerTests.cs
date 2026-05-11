using Aspire.Hosting;
using Xunit;

namespace Platform.AppHost.Tests;

[Collection("AspireApp")]
public class DatabaseContainerTests
{
    private readonly AppHostFixture _fixture;

    public DatabaseContainerTests(AppHostFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public void AppHost_ShouldStart()
    {
        Assert.NotNull(_fixture.Builder);
        Assert.NotNull(_fixture.App);
    }

    [Fact]
    public void MongoResource_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "mongo")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到数据库资源: mongo");
    }

    [Fact]
    public void RedisResource_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "redis")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 Redis 资源");
    }

    [Fact]
    public void ApiService_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "apiservice")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 apiservice 资源");
    }

    [Fact]
    public void DataInitializer_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "datainitializer")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 datainitializer 资源");
    }

    [Fact]
    public void OpenAI_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "openai")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 openai 资源");
    }

    [Fact]
    public void YarpGateway_ShouldExist()
    {
        bool found = false;
        foreach (var resource in _fixture.Builder.Resources)
        {
            if (resource.Name == "apigateway")
            {
                found = true;
                break;
            }
        }

        Assert.True(found, "未找到 apigateway 资源");
    }
}
