using Aspire.Hosting;
using FluentAssertions;
using Xunit;

namespace Platform.AppHost.Tests;

/// <summary>
/// AppHost 资源配置测试
/// 验证应用主机的资源配置和构建是否正确
/// </summary>
public class AppHostTests : IClassFixture<DistributedApplicationFixture>
{
    private readonly DistributedApplicationFixture _fixture;

    public AppHostTests(DistributedApplicationFixture fixture)
    {
        _fixture = fixture;
    }

    /// <summary>
    /// 测试应用可以成功构建
    /// 这是最重要的测试，验证 AppHost 配置没有语法错误或配置错误
    /// </summary>
    [Fact]
    public void Application_ShouldBuildSuccessfully()
    {
        // Arrange & Act
        var app = _fixture.Application;

        // Assert
        app.Should().NotBeNull("应用应该能够成功构建");
        app.Services.Should().NotBeNull("应用服务容器应该可用");
    }

    /// <summary>
    /// 测试应用服务容器可以正确创建
    /// </summary>
    [Fact]
    public void ApplicationServices_ShouldBeAvailable()
    {
        // Arrange
        var app = _fixture.Application;

        // Act
        var services = app.Services;

        // Assert
        services.Should().NotBeNull("服务容器应该可用");
    }
}
