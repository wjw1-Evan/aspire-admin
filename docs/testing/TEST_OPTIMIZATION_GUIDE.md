# 测试优化指南

## 问题
运行测试时，每次都会启动新的 Docker 容器和 Aspire 应用实例，导致测试速度较慢。

## 解决方案

### 方案 1：保持 AppHost 运行（推荐用于开发）

在开发过程中，可以保持 AppHost 运行，然后在另一个终端中运行测试。

**步骤：**

1. 在终端 1 中启动 Aspire：
```bash
aspire run
```

2. 在终端 2 中运行测试：
```bash
dotnet test Platform.AppHost.Tests --no-build
```

**优点：**
- 避免重复启动 Docker 容器
- 测试运行速度快
- 可以查看实时日志

**缺点：**
- 需要手动管理两个终端
- 需要确保 AppHost 保持运行

### 方案 2：使用 Docker 命名卷（推荐用于 CI/CD）

配置 Docker 使用命名卷来持久化数据，减少初始化时间。

**步骤：**

1. 修改 `Platform.AppHost/AppHost.cs`，为 MongoDB 和 Redis 使用命名卷：

```csharp
// MongoDB 使用命名卷
var mongo = builder
    .AddMongoDB("mongo")
    .WithDataVolume("mongo-data");  // 使用命名卷

// Redis 使用命名卷
var redis = builder
    .AddRedis("redis")
    .WithDataVolume("redis-data");  // 使用命名卷
```

2. 创建命名卷：
```bash
docker volume create mongo-data
docker volume create redis-data
```

**优点：**
- 数据持久化
- 减少初始化时间
- 适合 CI/CD 环境

**缺点：**
- 需要手动管理卷
- 可能需要清理旧数据

### 方案 3：使用测试容器（TestContainers）

使用 TestContainers 库来管理测试容器的生命周期。

**优点：**
- 自动管理容器
- 每个测试都有干净的环境
- 支持多种数据库

**缺点：**
- 需要额外的依赖
- 测试速度可能较慢

## 当前配置

项目已经配置为：
- ✅ 所有测试在同一个 Collection 中（`AppHost Collection`）
- ✅ xUnit 禁用并行执行（`parallelizeAssembly: false`）
- ✅ 测试顺序执行，共享同一个 AppHost 实例
- ✅ 认证缓存机制（避免重复注册用户）

## 测试运行命令

### 运行所有测试
```bash
dotnet test Platform.AppHost.Tests
```

### 运行特定测试
```bash
dotnet test Platform.AppHost.Tests --filter "ConditionBranching_AmountGreaterThan1000"
```

### 运行测试并显示详细输出
```bash
dotnet test Platform.AppHost.Tests -v normal
```

### 运行测试（不重新编译）
```bash
dotnet test Platform.AppHost.Tests --no-build
```

## 性能优化建议

1. **使用 `--no-build` 标志**：如果代码没有改变，避免重新编译
2. **运行特定测试**：使用 `--filter` 只运行需要的测试
3. **保持 AppHost 运行**：在开发过程中，保持 AppHost 运行以避免重复启动
4. **清理 Docker 资源**：定期清理未使用的容器和卷
   ```bash
   docker system prune -a
   ```

## 故障排除

### 问题：测试超时
**解决方案：**
- 增加 `AppHostFixture.DefaultTimeoutSeconds`
- 检查 Docker 资源是否充足
- 检查网络连接

### 问题：数据库连接失败
**解决方案：**
- 确保 MongoDB 容器正在运行
- 检查连接字符串
- 查看 Docker 日志：`docker logs <container-id>`

### 问题：端口冲突
**解决方案：**
- 停止占用端口的其他应用
- 修改 AppHost 配置使用不同的端口
