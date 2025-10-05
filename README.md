# Aspire Admin Platform

基于 .NET Aspire 构建的现代化微服务管理平台，提供用户管理、API 网关和 React 前端界面等功能。

## 🚀 项目概述

这是一个使用 .NET Aspire 框架构建的微服务架构项目，包含以下核心组件：

- **API 服务** - 提供用户管理 REST API
- **Web 应用** - React + Ant Design Pro 前端界面
- **API 网关** - 基于 YARP 的统一入口
- **数据库** - MongoDB 数据存储
- **API 文档** - Scalar API 文档界面

## 🏗️ 项目结构

```text
Platform/
├── Platform.AppHost/          # Aspire 应用主机
├── Platform.ApiService/       # API 服务
├── Platform.Web/             # Web 应用
└── Platform.ServiceDefaults/  # 共享服务配置
```

### 核心组件

#### Platform.AppHost
- 应用编排和配置中心
- 集成 MongoDB 和 Mongo Express
- 配置 YARP API 网关
- 集成 Scalar API 文档

#### Platform.ApiService
- 用户管理 REST API
- MongoDB 数据访问
- OpenAPI 文档支持
- 健康检查端点

#### Platform.Web
- React + Ant Design Pro 应用
- 基于 UmiJS 的企业级前端框架
- 多语言支持（中文、英文等）
- 响应式 Web 界面
- 与 API 服务集成

#### Platform.ServiceDefaults
- 共享服务配置
- OpenTelemetry 集成
- 服务发现配置

## 🛠️ 技术栈

### 后端技术
- **.NET 9.0** - 最新 .NET 框架
- **.NET Aspire** - 微服务编排框架
- **MongoDB** - NoSQL 数据库
- **YARP** - 反向代理和负载均衡
- **Scalar** - API 文档生成
- **OpenTelemetry** - 可观测性

### 前端技术
- **React 19** - 现代前端框架
- **Ant Design Pro** - 企业级UI组件库
- **UmiJS** - 企业级前端应用框架
- **TypeScript** - 类型安全的JavaScript
- **Biome** - 代码格式化和检查工具

## 🚀 快速开始

### 前置要求

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 运行项目

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd aspire-admin
   ```

2. **安装前端依赖**
   ```bash
   cd Platform.Web
   npm install
   cd ..
   ```

3. **启动应用**
   ```bash
   dotnet run --project Platform.AppHost
   ```

4. **访问应用**
   - **Web 应用**: http://localhost:15000
   - **API 文档**: http://localhost:15000/scalar/v1
   - **Mongo Express**: http://localhost:15000/mongo-express

## 📡 API 接口

### 用户管理 API

所有 API 通过网关访问：`http://localhost:15000/api/apiservice/`

#### 获取所有用户
```http
GET /api/apiservice/api/users
```

#### 获取单个用户
```http
GET /api/apiservice/api/users/{id}
```

#### 创建用户
```http
POST /api/apiservice/api/users
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 25
}
```

#### 更新用户
```http
PUT /api/apiservice/api/users/{id}
Content-Type: application/json

{
  "name": "李四",
  "email": "lisi@example.com",
  "age": 30
}
```

#### 删除用户
```http
DELETE /api/apiservice/api/users/{id}
```

#### 搜索用户
```http
GET /api/apiservice/api/users/search/{name}
```

### 天气预测 API

#### 获取天气预测
```http
GET /api/apiservice/weatherforecast
```

## 🗄️ 数据模型

### User 模型
```csharp
public class User
{
    public string? Id { get; set; }           // MongoDB ObjectId
    public string Name { get; set; }          // 用户姓名
    public string Email { get; set; }         // 邮箱地址
    public int Age { get; set; }              // 年龄
    public DateTime CreatedAt { get; set; }   // 创建时间
    public DateTime UpdatedAt { get; set; }   // 更新时间
}

public class CreateUserRequest
{
    public string Name { get; set; }          // 用户姓名
    public string Email { get; set; }         // 邮箱地址
    public int Age { get; set; }              // 年龄
}

public class UpdateUserRequest
{
    public string? Name { get; set; }         // 用户姓名（可选）
    public string? Email { get; set; }        // 邮箱地址（可选）
    public int? Age { get; set; }             // 年龄（可选）
}
```

## 🔧 配置说明

### 环境配置
- **开发环境**: `appsettings.Development.json`
- **生产环境**: `appsettings.json`

### 服务端口
- **API 网关**: 15000
- **API 服务**: 动态分配
- **Web 应用**: 动态分配
- **MongoDB**: 27017
- **Mongo Express**: 8081

### 前端开发

#### 独立开发前端
```bash
cd Platform.Web
npm run start:dev
```

#### 可用脚本
- `npm run start` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run lint` - 代码检查和格式化
- `npm run test` - 运行测试

## 🐳 Docker 支持

项目使用 Aspire 自动管理 Docker 容器：

- **MongoDB**: 持久化数据存储
- **Mongo Express**: 数据库管理界面

## 📊 监控和可观测性

- **健康检查**: `/health` 端点
- **OpenTelemetry**: 分布式追踪
- **服务发现**: 自动服务注册
- **日志聚合**: 统一日志管理

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 技术文档

### 后端技术文档
- [.NET Aspire 文档](https://learn.microsoft.com/dotnet/aspire/)
- [MongoDB 驱动文档](https://mongodb.github.io/mongo-csharp-driver/)
- [YARP 文档](https://microsoft.github.io/reverse-proxy/)

### 前端技术文档
- [React 文档](https://react.dev/)
- [Ant Design Pro 文档](https://pro.ant.design/)
- [UmiJS 文档](https://umijs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)

---

**注意**: 这是一个基于 .NET Aspire 的示例项目，展示了现代微服务架构的最佳实践。
