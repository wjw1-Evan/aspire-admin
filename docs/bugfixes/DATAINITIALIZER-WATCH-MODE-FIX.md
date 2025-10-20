# DataInitializer dotnet watch 模式支持

## 📋 问题描述

在使用 `dotnet watch` 运行项目时，`Platform.DataInitializer` 微服务无法正常停止，而使用 `dotnet run` 时可以正常完成初始化后停止。

## 🔍 问题原因

- **dotnet run**: 一次性执行，完成后进程退出
- **dotnet watch**: 持续监控文件变化，会重启服务，导致 DataInitializer 不断重新执行初始化

## ✅ 解决方案

### 环境检测机制

通过检测 `DOTNET_WATCH` 环境变量来区分运行模式：

```csharp
// 检测运行模式
var isWatchMode = Environment.GetEnvironmentVariable("DOTNET_WATCH") == "1";

if (isWatchMode)
{
    // Watch 模式：保持服务运行，提供手动初始化端点
    logger.LogInformation("🔍 检测到 dotnet watch 模式，DataInitializer 将保持运行状态");
    logger.LogInformation("📝 可通过 POST /initialize 端点手动触发数据初始化");
    await app.RunAsync();
}
else
{
    // Run 模式：自动执行初始化后停止
    logger.LogInformation("🚀 DataInitializer 微服务启动（run 模式），开始执行数据初始化...");
    // ... 执行初始化逻辑
    return; // 停止服务
}
```

### 两种模式的行为

| 模式 | 行为 | 用途 |
|------|------|------|
| **dotnet run** | 自动执行初始化后停止 | 生产环境部署、独立运行 |
| **dotnet watch** | 保持运行，提供手动端点 | 开发环境调试、手动触发 |

## 🎯 使用方式

### 开发环境（dotnet watch）

```bash
# 通过 AppHost 启动（推荐）
dotnet watch --project Platform.AppHost

# 单独启动 DataInitializer（调试用）
dotnet watch --project Platform.DataInitializer
```

在 watch 模式下，可以通过以下方式手动触发初始化：

```bash
# 手动触发数据初始化
curl -X POST http://localhost:5000/initialize
```

### 生产环境（dotnet run）

```bash
# 通过 AppHost 启动
dotnet run --project Platform.AppHost

# 单独运行 DataInitializer（一次性任务）
dotnet run --project Platform.DataInitializer
```

## 🔧 技术实现

### 环境变量检测

- `DOTNET_WATCH=1`: 表示运行在 watch 模式
- 其他情况: 表示运行在普通 run 模式

### 服务端点

- `GET /health`: 健康检查
- `POST /initialize`: 手动触发数据初始化（仅在 watch 模式下使用）

### 日志输出

不同模式有不同的日志标识：

- Watch 模式: `🔍 检测到 dotnet watch 模式`
- Run 模式: `🚀 DataInitializer 微服务启动（run 模式）`

## ✅ 测试验证

### 测试结果

1. **dotnet run 模式**:
   - ✅ 检测到 run 模式
   - ✅ 自动执行初始化
   - ✅ 完成后自动停止

2. **dotnet watch 模式**:
   - ✅ 检测到 watch 模式
   - ✅ 保持服务运行
   - ✅ 提供手动初始化端点

## 📚 相关文档

- [数据初始化微服务架构](mdc:docs/features/DATA-INITIALIZER-MICROSERVICE.md)
- [项目结构指南](mdc:README.md)

## 🎯 总结

通过环境检测机制，DataInitializer 现在可以：

1. **智能适配** - 根据运行模式自动调整行为
2. **开发友好** - 在 watch 模式下保持运行，便于调试和手动触发
3. **生产就绪** - 在 run 模式下自动完成初始化后停止
4. **向后兼容** - 不影响现有的部署和运行方式

这个修复确保了 DataInitializer 在各种运行环境下都能正常工作！🚀
