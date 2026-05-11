# Draft: 测试与开发冲突解决方案

## 项目架构分析

### 开发模式
- **AppHost** (`dotnet run`) → 启动所有服务
- **YARP API Gateway**: 端口 15000
- **MongoDB**: Docker 容器，动态端口映射
- **Redis**: Docker 容器，动态端口映射 (当前: 54352→6379)
- **ApiService**: .NET 10 后端
- **Admin Frontend**: UmiJS 4 + React 19 (通过 Aspire 启动)
- **Aspire Dashboard**: OTLP/MCP/Resource Service 指定端口

### 测试模式
- **后端测试**: `Platform.AppHost.Tests` (xUnit + Aspire.Hosting.Testing)
  - 使用 `DistributedApplicationTestingBuilder.CreateAsync<T>()` 创建进程内 AppHost
  - 设置 `DOTNET_ENVIRONMENT = "Testing"`
  - 会启动完整的 Docker 容器 (MongoDB, Redis 等)
- **前端测试**: 有 3 个 `*.test.tsx` 文件，使用 `@testing-library/react` + Jest
  - 无 test 脚本在 package.json 中
  - UmiJS 通过 `@umijs/test` 提供内置测试运行器

## 发现的冲突点

### 1. Docker 容器冲突 (最关键)
- 开发环境已启动 MongoDB、Redis 等 Docker 容器
- 测试 AppHost 会尝试启动第二套 MongoDB、Redis 容器
- 容器名称冲突 (Docker 需要唯一名称)
- 主机端口绑定冲突

### 2. Aspire Dashboard 端口冲突
- 开发 launchSettings.json 中固定了 Dashboard 端口 (17064, 15038, 21142, 23035, 22166)
- 测试 AppHost 可能尝试使用相同的 Dashboard/基础设施端口

### 3. 数据库状态污染
- 测试写入的数据可能混入开发数据库
- AppHost 已通过不同 Environment 区分数据库名 (platform-db-development vs platform-db-testing)，此问题已部分解决

### 4. 前端测试基础设施缺失
- package.json 没有 test 命令
- @umijs/max 版本 (4.6.53) 的 max test 命令不存在
- 缺少 Jest/vitest 配置

## 用户确认中...
