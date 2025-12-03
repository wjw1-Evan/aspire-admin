# MCP 服务部署和迁移指南

## 概述

本指南提供了 MCP 服务的部署、配置和迁移说明，帮助开发团队顺利升级到最新版本。

## 版本信息

| 项目 | 版本 |
|-----|------|
| MCP 协议版本 | 2024-11-05 |
| 服务版本 | 2.0.0 |
| .NET 版本 | 8.0+ |
| MongoDB 版本 | 4.0+ |

## 部署前检查

### 系统要求

- **操作系统**：Windows Server 2019+、Linux (Ubuntu 20.04+)、macOS 12+
- **.NET Runtime**：8.0 或更高版本
- **MongoDB**：4.0 或更高版本
- **内存**：最少 2GB
- **磁盘空间**：最少 1GB

### 依赖检查

```bash
# 检查 .NET 版本
dotnet --version

# 检查 MongoDB 连接
mongo --eval "db.adminCommand('ping')"

# 检查 JWT 配置
grep -r "JwtSettings" appsettings.json
```

## 部署步骤

### 步骤 1：备份现有数据

```bash
# 备份 MongoDB 数据
mongodump --out /backup/mongo_backup_$(date +%Y%m%d_%H%M%S)

# 备份应用配置
cp -r Platform.ApiService/appsettings.* /backup/config_backup_$(date +%Y%m%d_%H%M%S)
```

### 步骤 2：获取最新代码

```bash
# 拉取最新代码
git pull origin main

# 查看更新内容
git log --oneline -10
```

### 步骤 3：编译项目

```bash
# 清理旧的编译输出
dotnet clean Platform.ApiService.csproj

# 恢复依赖
dotnet restore Platform.ApiService.csproj

# 编译项目
dotnet build Platform.ApiService.csproj -c Release

# 发布项目（可选）
dotnet publish Platform.ApiService.csproj -c Release -o ./publish
```

### 步骤 4：配置应用

编辑 `appsettings.json`：

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Platform.ApiService.Services.McpService": "Information"
    }
  },
  "ConnectionStrings": {
    "MongoDB": "mongodb://localhost:27017/aspire_admin"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key",
    "Issuer": "your-issuer",
    "Audience": "your-audience",
    "ExpirationMinutes": 60
  }
}
```

### 步骤 5：启动应用

```bash
# 开发环境
dotnet run --project Platform.ApiService.csproj

# 生产环境
dotnet Platform.ApiService.dll --urls "http://0.0.0.0:5000"
```

### 步骤 6：验证部署

```bash
# 检查服务健康状态
curl http://localhost:5000/health

# 测试 MCP 初始化
curl -X POST http://localhost:5000/api/mcp/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"protocolVersion": "2024-11-05"}'

# 测试工具列表
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 迁移指南

### 从 v1.0.0 升级到 v2.0.0

#### 破坏性变更

1. **ListToolsAsync 方法签名变更**
   ```csharp
   // v1.0.0
   public Task<McpListToolsResponse> ListToolsAsync()
   
   // v2.0.0
   public async Task<McpListToolsResponse> ListToolsAsync()
   ```

2. **ListPromptsAsync 方法签名变更**
   ```csharp
   // v1.0.0
   public Task<McpListPromptsResponse> ListPromptsAsync()
   
   // v2.0.0
   public async Task<McpListPromptsResponse> ListPromptsAsync()
   ```

#### 迁移步骤

**步骤 1：更新调用代码**

如果有自定义代码调用这些方法，需要添加 `await`：

```csharp
// 旧代码
var response = _mcpService.ListToolsAsync().Result;

// 新代码
var response = await _mcpService.ListToolsAsync();
```

**步骤 2：更新依赖注入**

确保依赖注入配置包含新的依赖：

```csharp
// 在 Program.cs 中
services.AddScoped<IDatabaseOperationFactory<RuleListItem>>(sp =>
    sp.GetRequiredService<IDatabaseOperationFactory<RuleListItem>>());

services.AddScoped<ITenantContext>(sp =>
    sp.GetRequiredService<ITenantContext>());

services.AddScoped<IMcpService, McpService>();
```

**步骤 3：测试迁移**

```bash
# 运行单元测试
dotnet test Platform.ApiService.Tests.csproj

# 运行集成测试
dotnet test Platform.ApiService.IntegrationTests.csproj

# 手动测试
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**步骤 4：验证规则配置**

检查现有规则是否需要 MCP 配置：

```bash
# 查询所有规则
curl -X GET http://localhost:5000/api/rule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 为规则添加 MCP 配置（可选）
curl -X PUT http://localhost:5000/api/rule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": 1,
    "mcpConfig": {
      "enabled": true,
      "toolName": "my_tool",
      "toolDescription": "My custom tool",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    }
  }'
```

## 配置说明

### 缓存配置

编辑 `McpService.cs` 中的缓存时间：

```csharp
// 默认 5 分钟
private const int CacheDurationSeconds = 300;

// 改为 10 分钟
private const int CacheDurationSeconds = 600;

// 改为 1 分钟
private const int CacheDurationSeconds = 60;
```

### 日志配置

编辑 `appsettings.json` 中的日志级别：

```json
{
  "Logging": {
    "LogLevel": {
      "Platform.ApiService.Services.McpService": "Debug"  // 调试模式
    }
  }
}
```

### 规则加载配置

编辑 `McpService.cs` 中的规则加载限制：

```csharp
// 默认加载 1000 条规则
var rules = await _ruleFactory.FindAsync(filter, limit: 1000);

// 改为 500 条
var rules = await _ruleFactory.FindAsync(filter, limit: 500);
```

## 故障排除

### 问题 1：应用启动失败

**错误信息：**
```
System.InvalidOperationException: Unable to resolve service for type 'IDatabaseOperationFactory`1[RuleListItem]'
```

**解决方案：**
确保依赖注入配置正确：
```csharp
services.AddScoped<IDatabaseOperationFactory<RuleListItem>>(sp =>
    sp.GetRequiredService<IDatabaseOperationFactory<RuleListItem>>());
```

### 问题 2：MCP 工具列表为空

**原因：**
- 规则配置未启用
- 缓存未过期
- 规则被软删除

**解决方案：**
```bash
# 检查规则配置
curl -X GET http://localhost:5000/api/rule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data[] | select(.mcpConfig.enabled == true)'

# 重启应用清除缓存
systemctl restart aspire-api-service
```

### 问题 3：性能下降

**原因：**
- 规则数量过多
- 缓存时间过短
- 数据库查询缓慢

**解决方案：**
```bash
# 增加缓存时间
# 编辑 McpService.cs，将 CacheDurationSeconds 改为 600

# 检查数据库性能
mongo --eval "db.ruleListItems.count()"

# 查看日志
tail -f logs/application.log | grep "McpService"
```

### 问题 4：权限错误

**错误信息：**
```
401 Unauthorized
```

**解决方案：**
```bash
# 检查 JWT 令牌
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# 使用返回的令牌
curl -X POST http://localhost:5000/api/mcp/tools/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 性能优化

### 1. 启用缓存

缓存已默认启用，可以通过日志验证：

```bash
# 查看缓存命中日志
grep "使用缓存的 MCP 工具列表" logs/application.log | wc -l
```

### 2. 优化规则查询

```csharp
// 添加索引
db.ruleListItems.createIndex({ "mcpConfig.enabled": 1, "isDeleted": 1 })
```

### 3. 监控性能

```bash
# 监控 API 响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/mcp/tools/list

# 监控内存使用
dotnet-counters monitor -n aspire-api-service
```

## 回滚计划

### 快速回滚

如果新版本出现严重问题，可以快速回滚：

```bash
# 停止应用
systemctl stop aspire-api-service

# 恢复旧版本代码
git checkout v1.0.0

# 重新编译
dotnet build Platform.ApiService.csproj -c Release

# 启动应用
systemctl start aspire-api-service
```

### 数据恢复

如果需要恢复数据：

```bash
# 恢复 MongoDB 数据
mongorestore /backup/mongo_backup_YYYYMMDD_HHMMSS

# 恢复应用配置
cp -r /backup/config_backup_YYYYMMDD_HHMMSS/* Platform.ApiService/
```

## 监控和维护

### 日常监控

```bash
# 监控应用状态
systemctl status aspire-api-service

# 查看日志
journalctl -u aspire-api-service -f

# 监控性能
top -p $(pgrep -f "dotnet Platform.ApiService.dll")
```

### 定期维护

**每周：**
- 检查日志中的错误
- 验证缓存命中率
- 检查数据库性能

**每月：**
- 备份数据库
- 清理旧日志
- 更新依赖包

**每季度：**
- 性能基准测试
- 安全审计
- 容量规划

## 升级检查清单

- [ ] 备份数据库
- [ ] 备份应用配置
- [ ] 获取最新代码
- [ ] 编译项目
- [ ] 配置应用
- [ ] 启动应用
- [ ] 验证部署
- [ ] 测试 MCP 功能
- [ ] 检查日志
- [ ] 监控性能
- [ ] 通知用户
- [ ] 记录部署日志

## 常见问题

### Q1：升级会导致停机吗？
**A：** 取决于部署方式。可以使用蓝绿部署或滚动部署来实现零停机升级。

### Q2：如何回滚到旧版本？
**A：** 参考"回滚计划"部分。

### Q3：新版本与旧版本兼容吗？
**A：** 大部分兼容，但 ListToolsAsync 和 ListPromptsAsync 方法签名已改为异步。

### Q4：需要迁移数据吗？
**A：** 不需要。现有数据可以直接使用。

### Q5：如何验证升级成功？
**A：** 运行部署验证步骤中的测试命令。

## 技术支持

如有问题，请联系开发团队：
- 邮箱：dev-team@example.com
- 文档：https://docs.example.com/mcp
- 问题跟踪：https://github.com/example/aspire-admin/issues

## 相关文档

- [MCP 服务使用指南](./MCP-SERVICE-GUIDE.md)
- [MCP 服务完善指南](./MCP-SERVICE-IMPROVEMENTS.md)
- [MCP 快速参考](./MCP-QUICK-REFERENCE.md)
- [MCP 实现检查清单](./MCP-IMPLEMENTATION-CHECKLIST.md)

---

**部署指南版本：** 1.0.0  
**最后更新：** 2024-12-03  
**维护者：** 开发团队

