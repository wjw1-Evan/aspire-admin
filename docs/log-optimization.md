# 日志优化说明

## 优化目标

减少 Platform.ApiService 中的无用日志输出，特别是以下几类频繁的日志：

1. 健康检查相关日志（每次健康检查都会输出）
2. HTTP 客户端请求日志（IoT 数据收集时频繁输出）
3. Polly 重试策略日志
4. IoT 数据收集和网关状态检查的详细日志

## 已优化的日志级别

### 系统组件日志级别调整为 Warning

- `Microsoft.AspNetCore.Hosting`: 减少请求开始/结束日志
- `Microsoft.AspNetCore.Routing`: 减少端点执行日志
- `Microsoft.AspNetCore.HealthChecks`: 减少健康检查日志
- `System.Net.Http.HttpClient`: 减少 HTTP 请求日志
- `System.Net.Http.HttpClient.IoTGatewayStatusChecker`: 减少网关状态检查的 HTTP 请求日志
- `System.Net.Http.HttpClient.SimpleHttpDataCollector`: 减少数据收集的 HTTP 请求日志
- `Polly`: 减少重试策略日志

### IoT 相关服务日志级别调整为 Warning

- `Platform.ApiService.Services.IoTDataCollector`: 减少数据收集详细日志
- `Platform.ApiService.Services.IoTGatewayStatusChecker`: 减少网关状态检查详细日志
- `Platform.ApiService.Services.IoTGatewayStatusCheckHostedService`: 减少后台服务日志
- `Platform.ApiService.Services.IoTDataCollectionHostedService`: 减少后台服务日志
- `Platform.ApiService.Services.HttpIoTDataFetchClient`: 减少 HTTP 数据拉取日志
- `Platform.ApiService.Services.SimpleHttpDataCollector`: 减少数据收集日志

## 保留的日志

- 业务逻辑相关的重要日志仍保持 Information 级别
- 错误和警告日志不受影响
- 用户操作相关的审计日志不受影响

## 配置文件

- `Platform.ApiService/appsettings.json`: 生产环境配置
- `Platform.ApiService/appsettings.Development.json`: 开发环境配置

## 效果

优化后，日志输出将显著减少，主要保留：
- 业务操作日志
- 错误和警告信息
- 重要的系统事件

定期的健康检查、IoT 数据收集、网关状态检查等操作将不再产生大量的 Information 级别日志。