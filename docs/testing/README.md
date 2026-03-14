# 测试文档

本文件夹包含与项目测试相关的文档和指南。

## 文档列表

### 1. [测试优化指南](./TEST_OPTIMIZATION_GUIDE.md)
- **目的**: 说明如何优化测试运行速度，避免重复启动 AppHost 和 Docker 容器
- **适用场景**: 开发过程中运行测试、CI/CD 环境
- **主要内容**:
  - 保持 AppHost 运行的方法
  - 使用 Docker 命名卷持久化数据
  - 测试运行命令和性能优化建议

### 2. [条件节点路由修复总结](./CONDITION_NODE_ROUTING_FIX_SUMMARY.md)
- **目的**: 记录条件节点路由问题的修复过程和方案
- **适用场景**: 理解工作流条件节点的路由机制
- **主要内容**:
  - 问题描述和根本原因分析
  - 修复方案详解
  - 测试结果验证
  - 工作流路由流程图

## 快速开始

### 运行测试

```bash
# 运行所有测试
dotnet test Platform.AppHost.Tests

# 运行特定测试
dotnet test Platform.AppHost.Tests --filter "WorkflowConditionTests"

# 运行测试（不重新编译）
dotnet test Platform.AppHost.Tests --no-build
```

### 优化测试运行

参考 [测试优化指南](./TEST_OPTIMIZATION_GUIDE.md) 了解如何：
1. 保持 AppHost 运行以避免重复启动
2. 使用 Docker 命名卷持久化数据
3. 配置 xUnit 并行执行

## 测试架构

### 测试集合
- 所有测试都在 `AppHost Collection` 中
- 使用 `ICollectionFixture<AppHostFixture>` 共享 AppHost 实例
- xUnit 配置禁用并行执行，确保顺序执行

### 认证缓存
- 测试使用认证缓存机制避免重复注册用户
- 每个测试类缓存一个认证令牌

## 相关文件

- `Platform.AppHost.Tests/xunit.runner.json` - xUnit 配置
- `Platform.AppHost.Tests/AppHostFixture.cs` - AppHost 测试夹具
- `Platform.AppHost.Tests/AppHostCollection.cs` - 测试集合定义
- `Platform.AppHost.Tests/Tests/WorkflowConditionTests.cs` - 条件节点测试

## 故障排除

### 测试超时
- 增加 `AppHostFixture.DefaultTimeoutSeconds`
- 检查 Docker 资源是否充足

### 数据库连接失败
- 确保 MongoDB 容器正在运行
- 检查连接字符串配置

### 端口冲突
- 停止占用端口的其他应用
- 修改 AppHost 配置使用不同的端口

## 最近更新

- **2026-03-14**: 添加条件节点路由修复总结和测试优化指南
