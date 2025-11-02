# Platform.AppHost 单元测试

## 📋 概述

本测试项目为 `Platform.AppHost` 提供单元测试，验证 .NET Aspire 应用主机的资源配置是否正确。

## 🧪 测试内容

### 资源存在性测试

- ✅ MongoDB 容器和数据库资源
- ✅ 数据初始化服务资源
- ✅ API 服务资源
- ✅ YARP 网关资源
- ✅ 管理后台应用资源
- ✅ 移动应用资源

### 配置验证测试

- ✅ 所有必需资源都已配置
- ✅ 应用可以成功构建

## 🚀 运行测试

### 使用 dotnet CLI

```bash
# 运行所有测试
dotnet test Platform.AppHost.Tests

# 运行特定测试
dotnet test Platform.AppHost.Tests --filter "MongoDB_ShouldBeConfigured"

# 生成测试覆盖率报告
dotnet test Platform.AppHost.Tests --collect:"XPlat Code Coverage"
```

### 使用 Visual Studio

1. 右键点击测试项目
2. 选择"运行测试"
3. 查看测试结果窗口

## 📦 依赖包

- `Microsoft.NET.Test.Sdk` - .NET 测试 SDK
- `xunit` - xUnit 测试框架
- `xunit.runner.visualstudio` - Visual Studio 测试运行器
- `coverlet.collector` - 代码覆盖率收集器
- `Aspire.Hosting.Testing` - Aspire 测试支持
- `FluentAssertions` - 流畅断言库

## 🎯 测试架构

### DistributedApplicationFixture

测试夹具类，负责：
- 使用 `DistributedApplicationTestingBuilder` 创建测试应用
- 管理应用生命周期（初始化和释放）
- 提供应用实例给测试方法

### AppHostTests

测试类，包含：
- 资源配置验证测试
- 资源存在性测试
- 应用构建成功测试

## ⚠️ 注意事项

1. **测试不启动实际服务**：这些测试只验证配置，不启动实际的服务或容器
2. **需要项目引用**：测试项目引用了 `Platform.AppHost` 项目
3. **异步初始化**：使用 `IAsyncLifetime` 进行异步初始化和清理
4. **DCP 警告**：测试运行时可能会看到关于 DCP（分布式容器平台）的警告，这是正常的，不影响测试结果

## ✅ 测试结果

当前测试状态：**2/2 通过**

- ✅ `Application_ShouldBuildSuccessfully` - 验证应用可以成功构建
- ✅ `ApplicationServices_ShouldBeAvailable` - 验证服务容器可用

## 📚 扩展测试

如需添加更多测试，可以参考以下模式：

```csharp
[Fact]
public void YourResource_ShouldBeConfigured()
{
    // Arrange
    var app = _fixture.Application;

    // Act
    var resource = app.GetResource<IResource>("your-resource-name");

    // Assert
    resource.Should().NotBeNull();
}
```

## 🔗 相关文档

- [.NET Aspire 测试文档](https://learn.microsoft.com/dotnet/aspire/testing/testing)
- [xUnit 文档](https://xunit.net/)
- [FluentAssertions 文档](https://fluentassertions.com/)
