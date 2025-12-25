# ApiService 日志测试指南

## 概述

本文档说明如何在 `dotnet watch` 模式下查看和测试 ApiService 的日志输出。

## 启动方式

1. **启动 AppHost**：
   ```bash
   cd Platform.AppHost
   dotnet watch
   ```

2. **观察日志输出**：
   - 在控制台中查看 ApiService 的启动日志
   - 日志会包含服务名称和时间戳
   - 支持彩色输出和结构化日志

## 日志测试端点

### 1. 基础日志测试
```bash
curl http://localhost:15000/apiservice/api/LogTest/test
```

这个端点会输出：
- 信息日志 📝
- 警告日志 ⚠️
- 错误日志 ❌
- 带作用域的日志 🔍

### 2. 结构化日志测试
```bash
curl http://localhost:15000/apiservice/api/LogTest/structured
```

这个端点会输出：
- 参数化日志
- 结构化对象日志
- 性能指标日志

## 日志配置说明

### 开发环境配置
- **日志级别**：Information
- **时间戳格式**：`[yyyy-MM-dd HH:mm:ss]`
- **包含作用域**：是
- **控制台输出**：启用

### 日志类别
- `Platform.ApiService`：Information
- `Platform.ApiService.Controllers`：Information
- `Platform.ApiService.Services`：Information
- `Platform.ApiService.Middleware`：Information

## 预期输出示例

```
[2024-12-25 10:30:15] info: Platform.ApiService.Program[0]
      🚀 Platform.ApiService 正在启动...

[2024-12-25 10:30:15] info: Platform.ApiService.Program[0]
      📝 环境: Development

[2024-12-25 10:30:16] info: Platform.ApiService.Program[0]
      ✅ Platform.ApiService 启动完成，准备接收请求

[2024-12-25 10:30:20] info: Platform.ApiService.Controllers.LogTestController[0]
      📝 这是一条信息日志 - 来自 ApiService

[2024-12-25 10:30:20] warn: Platform.ApiService.Controllers.LogTestController[0]
      ⚠️ 这是一条警告日志 - 来自 ApiService
```

## 故障排除

### 如果看不到日志
1. 检查 `appsettings.Development.json` 中的日志配置
2. 确认 `Platform.ServiceDefaults` 中的控制台日志配置
3. 验证 AppHost 中的环境变量设置

### 如果日志格式不正确
1. 检查时间戳格式配置
2. 确认作用域包含设置
3. 验证日志级别配置

## 性能考虑

- 开发环境启用了详细日志，生产环境会自动优化
- 结构化日志有助于调试但会增加输出量
- 可以通过调整日志级别来控制输出详细程度