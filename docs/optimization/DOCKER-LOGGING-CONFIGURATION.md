# Docker 日志配置优化

## 📋 概述

为了让 Docker 容器中的日志能够在 Cursor 调试时方便查看，我们为所有服务配置了详细的日志输出设置。

## ✨ 配置内容

### 1. MongoDB 容器日志配置

```csharp
var mongo = builder.AddMongoDB("mongo").WithMongoExpress(config=>{ 
    config.WithLifetime(ContainerLifetime.Persistent);
    // 配置 MongoExpress 日志输出到控制台
    config.WithEnvironment("DEBUG", "true");
})
.WithLifetime(ContainerLifetime.Persistent).WithDataVolume()
// 配置 MongoDB 日志输出到控制台
.WithEnvironment("MONGODB_LOG_LEVEL", "2") // 2 = Info level
.WithEnvironment("MONGODB_VERBOSE", "true")
```

**配置说明：**
- `MONGODB_LOG_LEVEL: "2"` - 设置 MongoDB 日志级别为 Info（2）
- `MONGODB_VERBOSE: "true"` - 启用详细日志输出
- `DEBUG: "true"` - 启用 MongoExpress 调试日志

### 2. .NET API 服务日志配置

```csharp
["apiservice"] = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", DevelopmentEnvironment) // 启用开发环境日志
    .WithEnvironment("Logging__LogLevel__Default", DebugLogLevel) // 设置默认日志级别为 Debug
    .WithEnvironment("Logging__LogLevel__Microsoft.AspNetCore", InformationLogLevel) // ASP.NET Core 日志级别
    .WithEnvironment("Logging__LogLevel__Platform.ApiService", DebugLogLevel) // 项目特定日志级别
```

**配置说明：**
- `ASPNETCORE_ENVIRONMENT: "Development"` - 启用开发环境模式
- `Logging__LogLevel__Default: "Debug"` - 默认日志级别为 Debug
- `Logging__LogLevel__Microsoft.AspNetCore: "Information"` - ASP.NET Core 框架日志级别
- `Logging__LogLevel__Platform.ApiService: "Debug"` - 项目特定命名空间日志级别

### 3. YARP 网关日志配置

```csharp
var yarp = builder.AddYarp("apigateway")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", DevelopmentEnvironment)
   用Environment("Logging__LogLevel__Default", DebugLogLevel)
    .WithEnvironment("Logging__LogLevel__Yarp", DebugLogLevel) // YARP 详细日志
    .WithEnvironment("Logging__LogLevel__Microsoft.AspNetCore", InformationLogLevel)
```

**配置说明：**
- `Logging__LogLevel__Yarp: "Debug"` - 启用 YARP 的详细调试日志

### 5. 前端应用日志配置

```csharp
services.Add("admin", builder.AddNpmApp("admin", "../Platform.Admin")
    .WithEnvironment("NODE_ENV", "development") // 启用开发模式日志
    .WithEnvironment("DEBUG", "*") // 启用详细调试日志
);

services.Add("app", builder.AddNpmApp("app", "../Platform.App")
    .WithEnvironment("NODE_ENV", "development") // 启用开发模式日志
    .WithEnvironment("DEBUG", "*") // 启用详细调试日志
);
```

**配置说明：**
- `NODE_ENV: "development"` - 启用 Node.js 开发模式
- `DEBUG: "*"` - 启用所有调试模块的详细日志

## 🔧 日志级别说明

### .NET 日志级别

| 级别 | 数值 | 说明 |
|------|------|------|
| Trace | 0 | 最详细的日志，包含所有信息 |
| Debug | 1 | 调试信息，开发时有用 |
| Information | 2 | 一般信息，记录应用程序流程 |
| Warning | 3 | 警告信息，可能的问题 |
| Error | 4 | 错误信息，但不影响应用运行 |
| Critical | 5 | 严重错误，可能影响应用运行 |

### MongoDB 日志级别

| 级别 | 数值 | 说明 |
|------|------|------|
| Off | 0 | 关闭日志 |
| Fatal | 1 | 致命错误 |
| Error | 2 | 错误信息 |
| Warning | 3 | 警告信息 |
| Info | 4 | 一般信息 |
| Debug | 5 | 调试信息 |

## 📊 查看日志的方法

### 1. 通过 Aspire Dashboard 查看

1. 启动项目：`dotnet run --project Platform.AppHost`
2. 打开 Aspire Dashboard：http://localhost:15003
3. 点击任意服务资源
4. 查看 "Logs" 标签页

### 2. 通过 Docker 命令查看

```bash
# 查看所有容器日志
docker logs -f $(docker ps -q)

# 查看特定容器日志
docker logs -f <container_name>

# 查看 MongoDB 日志
docker logs -f mongo

# 查看 API 服务日志
docker logs -f apiservice
```

### 3. 通过 Cursor 终端查看

在 Cursor 中运行 `dotnet run --project Platform.AppHost` 时，所有服务的日志都会输出到控制台。

## 🎯 调试优势

### 1. 实时日志监控

- 所有服务的日志都实时输出到控制台
- 可以同时看到多个服务的日志信息
- 便于快速定位问题

### 2. 详细调试信息

- API 服务的详细请求/响应日志
- YARP 网关的路由转发日志
- MongoDB 的数据库操作日志
- 前端应用的构建和运行日志

### 3. 统一日志格式

- 所有服务使用统一的日志格式
- 包含时间戳、服务名称、日志级别等信息
- 便于日志分析和问题排查

## ⚠️ 注意事项

### 1. 性能影响

- Debug 级别的日志会产生大量输出
- 在生产环境中应该调整为 Information 或 Warning 级别
- 可以通过环境变量动态调整日志级别

### 2. 存储空间

- 详细的日志会占用更多磁盘空间
- 建议配置日志轮转和清理策略
- 在开发环境中可以忽略此问题

### 3. 敏感信息

- Debug 日志可能包含敏感信息（如密码、token 等）
- 确保不在日志中输出敏感数据
- 在生产环境中要特别注意

## 🔄 动态调整日志级别

### 通过环境变量调整

```bash
# 调整为生产环境日志级别
export Logging__LogLevel__Default=Information
export Logging__LogLevel__Platform.ApiService=Warning

# 重新启动服务
dotnet run --project Platform.AppHost
```

### 通过配置文件调整

在 `appsettings.json` 中配置：

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Platform.ApiService": "Warning",
    }
  }
}
```

## 📚 相关文档

- [Aspire 日志配置文档](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/logging)
- [.NET 日志级别说明](https://docs.microsoft.com/en-us/dotnet/core/extensions/logging#log-levels)
- [MongoDB 日志配置](https://docs.mongodb.com/manual/reference/log-messages/)

## 🎯 总结

通过配置详细的 Docker 日志输出，我们实现了：

1. **统一日志管理** - 所有服务的日志都输出到控制台
2. **详细调试信息** - 开发时可以查看完整的请求处理过程
3. **实时监控** - 通过 Aspire Dashboard 或控制台实时查看日志
4. **灵活配置** - 可以通过环境变量动态调整日志级别

这些配置大大提升了在 Cursor 中调试和开发时的便利性，让开发者能够快速定位和解决问题。
