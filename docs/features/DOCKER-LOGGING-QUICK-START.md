# Docker 日志配置快速验证指南

## 🎯 概述

本指南帮助您快速验证 Docker 容器日志是否正确输出到控制台，方便 Cursor 调试。

## ⚡ 快速验证

### 1. 启动项目

```bash
# 在项目根目录执行
dotnet run --project Platform.AppHost
```

### 2. 观察日志输出

启动后，您应该在控制台看到以下类型的日志：

#### MongoDB 日志
```
mongo    | 2025-01-XX 10:XX:XX [INFO] MongoDB starting
mongo    | 2025-01-XX 10:XX:XX [DEBUG] Connection established
```

#### API 服务日志
```
apiservice | 2025-01-XX 10:XX:XX [DEBUG] Starting Platform.ApiService
apiservice | 2025-01-XX 10:XX:XX [INFO] HTTP server listening on port 5000
```

#### 前端应用日志
```
admin     | 2025-01-XX 10:XX:XX [DEBUG] Starting React development server
admin     | 2025-01-XX 10:XX:XX [INFO] Local: http://localhost:15001
```

#### YARP 网关日志
```
apigateway | 2025-01-XX 10:XX:XX [DEBUG] YARP configuration loaded
apigateway | 2025-01-XX 10:XX:XX [INFO] Gateway listening on port 15000
```

### 3. 验证日志级别

确认日志包含详细的调试信息：

- ✅ **Debug 级别日志** - 详细的调试信息
- ✅ **Info 级别日志** - 一般信息和状态更新
- ✅ **Warning 级别日志** - 警告信息
- ✅ **Error 级别日志** - 错误信息

## 🔍 故障排除

### 问题 1: 看不到详细日志

**现象**: 只能看到基本的启动信息，没有详细的调试日志

**解决方案**:
1. 确认环境变量设置正确
2. 重启 Docker 容器
3. 检查 `Platform.AppHost/AppHost.cs` 配置

### 问题 2: 日志格式混乱

**现象**: 日志输出格式不统一或难以阅读

**解决方案**:
1. 使用 Aspire Dashboard 查看结构化日志
2. 访问: http://localhost:15003
3. 点击服务资源查看 "Logs" 标签页

### 问题 3: 某些服务没有日志

**现象**: 部分服务的日志没有显示

**解决方案**:
1. 检查服务是否正常启动
2. 查看 Aspire Dashboard 中的服务状态
3. 确认日志配置是否正确应用

## 📊 日志配置验证清单

在启动项目后，检查以下内容：

- [ ] MongoDB 容器启动日志可见
- [ ] API 服务详细调试日志可见
- [ ] 前端应用构建和运行日志可见
- [ ] YARP 网关路由配置日志可见
- [ ] 所有服务日志都有时间戳
- [ ] 日志级别包含 Debug、Info、Warning、Error
- [ ] 可以通过 Aspire Dashboard 查看结构化日志

## 🎯 预期结果

成功配置后，您应该能够：

1. **实时监控** - 在 Cursor 控制台实时看到所有服务日志
2. **详细调试** - 看到完整的请求处理过程和错误信息
3. **统一格式** - 所有日志都有统一的格式和级别
4. **便于调试** - 快速定位问题和性能瓶颈

## 📚 相关文档

- [Docker 日志配置优化](optimization/DOCKER-LOGGING-CONFIGURATION.md) - 详细配置说明
- [如何查看 API 文档](HOW-TO-VIEW-API-DOCS.md) - API 文档访问指南
- [Aspire Dashboard 使用指南](README.md) - 服务监控面板使用

## ⚡ 快速命令

```bash
# 启动项目（推荐）
dotnet run --project Platform.AppHost

# 或使用测试脚本
./scripts/test-docker-logging.sh

# 查看 Aspire Dashboard
open http://localhost:15003
```

## 🎉 成功标志

当您看到类似以下的日志输出时，说明配置成功：

```
info: Platform.AppHost[0]
      Started hosting application

info: Aspire.Hosting.Dcp[0]
      Resource 'mongo' created successfully

info: Aspire.Hosting.Dcp[0]
      Resource 'apiservice' created successfully

info: Aspire.Hosting.Dcp[0]
      Resource 'admin' created successfully

debug: Platform.ApiService.Controllers.UserController[0]
      User list requested with parameters: Page=1, PageSize=10

info: Platform.ApiService.Services.UserService[0]
      Retrieved 15 users from database
```

现在您可以方便地在 Cursor 中调试和监控所有服务的运行状态！
