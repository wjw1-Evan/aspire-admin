# 测试发现故障排查指南

## 🔍 问题：测试资源管理器显示"尚未在工作区中找到任何测试"

### 可能的原因

1. IDE 测试扩展未正确加载测试项目
2. 测试项目未被正确识别为测试项目
3. IDE 需要重新扫描工作区

### ✅ 解决方案

#### 方法 1: 重新加载窗口

1. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Reload Window" 或 "重新加载窗口"
3. 选择并执行命令
4. 等待 IDE 重新扫描项目

#### 方法 2: 手动触发测试发现

1. 打开测试资源管理器（Test Explorer）
2. 点击刷新按钮 🔄
3. 或右键点击测试资源管理器，选择 "Refresh" 或 "刷新"

#### 方法 3: 清理并重建

```bash
# 清理测试项目
dotnet clean Platform.AppHost.Tests

# 重新构建
dotnet build Platform.AppHost.Tests

# 运行测试以触发发现
dotnet test Platform.AppHost.Tests --list-tests
```

#### 方法 4: 验证测试项目配置

确保 `Platform.AppHost.Tests.csproj` 包含：

```xml
<IsTestProject>true</IsTestProject>
```

以及测试适配器包：

```xml
<PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
```

#### 方法 5: 检查解决方案文件

确保测试项目已添加到解决方案：

```bash
dotnet sln Platform.sln list
```

应该看到 `Platform.AppHost.Tests` 在列表中。

#### 方法 6: 使用命令行验证

```bash
# 列出所有测试
dotnet test Platform.AppHost.Tests --list-tests

# 应该输出：
# 以下测试可用:
#     Platform.AppHost.Tests.AppHostTests.Application_ShouldBuildSuccessfully
#     Platform.AppHost.Tests.AppHostTests.ApplicationServices_ShouldBeAvailable
```

如果命令行可以列出测试，说明测试项目配置正确，只是 IDE 需要刷新。

### 🔧 高级排查

#### 检查 IDE 日志

1. 打开输出面板 (`Cmd+Shift+U` 或 `Ctrl+Shift+U`)
2. 选择 "Test" 或 "测试" 输出通道
3. 查看是否有错误消息

#### 检查扩展版本

确保安装了最新版本的：
- C# Dev Kit 或 C# 扩展
- .NET Extension Pack
- Test Explorer 扩展（如果使用）

#### 重启 IDE

如果以上方法都不起作用，尝试：
1. 完全关闭 IDE
2. 重新打开工作区
3. 等待 IDE 完成索引和测试发现

### ✅ 验证测试是否正常工作

在终端运行：

```bash
# 运行所有测试
dotnet test Platform.AppHost.Tests

# 运行特定测试
dotnet test Platform.AppHost.Tests --filter "Application_ShouldBuildSuccessfully"
```

如果命令行测试可以正常运行，说明测试项目配置正确。

### 📝 当前测试项目状态

- ✅ 测试项目已添加到解决方案
- ✅ `IsTestProject` 设置为 `true`
- ✅ 包含 xUnit 测试框架
- ✅ 包含测试适配器（xunit.runner.visualstudio）
- ✅ 测试可以通过命令行正常运行
- ✅ `.vscode/settings.json` 已配置

### 💡 如果仍然无法发现测试

1. **检查文件路径**：确保测试文件在正确的位置
   ```
   Platform.AppHost.Tests/
   ├── AppHostTests.cs
   ├── DistributedApplicationFixture.cs
   └── Platform.AppHost.Tests.csproj
   ```

2. **检查命名空间**：确保测试类有正确的 `[Fact]` 属性

3. **检查项目引用**：确保所有依赖都正确引用

4. **查看 IDE 文档**：参考 IDE 官方文档中的测试发现部分

### 🎯 预期结果

成功配置后，测试资源管理器应该显示：

```
Platform.AppHost.Tests
  └── AppHostTests
      ├── Application_ShouldBuildSuccessfully ✅
      └── ApplicationServices_ShouldBeAvailable ✅
```

### 📚 相关资源

- [xUnit 文档](https://xunit.net/)
- [.NET 测试文档](https://learn.microsoft.com/dotnet/core/testing/)
- [Visual Studio Code 测试文档](https://code.visualstudio.com/docs/languages/dotnet#_test-explorer)


