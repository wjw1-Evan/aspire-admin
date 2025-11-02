using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Xunit;

namespace Platform.AppHost.Tests;

/// <summary>
/// DistributedApplication 测试夹具
/// 使用 .NET Aspire Testing 框架进行应用配置测试
/// </summary>
public class DistributedApplicationFixture : IAsyncLifetime
{
    private DistributedApplication? _application;

    public DistributedApplication Application => _application 
        ?? throw new InvalidOperationException("Application has not been initialized. Call InitializeAsync first.");

    /// <summary>
    /// 初始化测试应用
    /// </summary>
    public async Task InitializeAsync()
    {
        // 使用 DistributedApplicationTestingBuilder 创建测试应用
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.Platform_AppHost>();

        // 构建应用（不实际启动服务）
        _application = await appHost.BuildAsync();
    }

    /// <summary>
    /// 释放测试应用
    /// </summary>
    public async Task DisposeAsync()
    {
        if (_application != null)
        {
            await _application.DisposeAsync();
            _application = null;
        }
    }
}
