# Aspire Admin Platform

基于 .NET Aspire 构建的现代化微服务管理平台，提供用户管理、API 网关、React 前端界面和移动端应用等功能。

## 🚀 项目概述

这是一个使用 .NET Aspire 框架构建的微服务架构项目，包含以下核心组件：

- **API 服务** - 提供用户管理、认证、通知等 REST API
- **管理后台** - React + Ant Design Pro 企业级前端界面
- **移动应用** - React Native + Expo 跨平台移动应用
- **API 网关** - 基于 YARP 的统一入口
- **数据库** - MongoDB 数据存储
- **API 文档** - Scalar API 文档界面

## 🏗️ 项目结构

```text
Platform/
├── Platform.AppHost/          # Aspire 应用主机
├── Platform.ApiService/       # API 服务
├── Platform.Admin/            # 管理后台 (React + Ant Design Pro)
├── Platform.App/              # 移动应用 (React Native + Expo)
└── Platform.ServiceDefaults/  # 共享服务配置
```

### 核心组件

#### Platform.AppHost
- 应用编排和配置中心
- 集成 MongoDB 和 Mongo Express
- 配置 YARP API 网关
- 集成 Scalar API 文档
- 管理前端和移动应用的构建与部署

#### Platform.ApiService
- 用户管理 REST API（CRUD、搜索、分页、批量操作）
- JWT 认证和授权系统
- 用户活动日志记录
- 通知管理 API
- 规则管理 API
- 标签管理 API
- MongoDB 数据访问
- OpenAPI 文档支持
- 健康检查端点

#### Platform.Admin
- React 19 + Ant Design Pro 企业级管理后台
- 基于 UmiJS 的前端应用框架
- 用户管理界面（列表、创建、编辑、删除）
- 个人中心（资料管理、密码修改）
- 多语言支持（中文、英文等）
- 响应式 Web 界面
- JWT Token 认证集成

#### Platform.App
- React Native + Expo 跨平台移动应用
- 支持 iOS、Android 和 Web 平台
- 基于 Expo Router 的路由系统
- 现代化 UI 设计
- 与后端 API 服务集成

#### Platform.ServiceDefaults
- 共享服务配置
- OpenTelemetry 集成
- 服务发现配置
- JWT 认证配置
- MongoDB 驱动配置

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

### 移动端技术
- **React Native** - 跨平台移动应用框架
- **Expo** - React Native 开发平台
- **Expo Router** - 基于文件系统的路由
- **TypeScript** - 类型安全的JavaScript

## 🚀 快速开始

### 前置要求

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (用于移动应用开发)

### 运行项目

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd aspire-admin
   ```

2. **安装前端依赖**
   ```bash
   # 安装管理后台依赖
   cd Platform.Admin
   npm install
   cd ..
   
   # 安装移动应用依赖
   cd Platform.App
   npm install
   cd ..
   ```

3. **启动应用**
   ```bash
   dotnet run --project Platform.AppHost
   ```

4. **访问应用**
   - **管理后台**: http://localhost:15001
   - **移动应用**: http://localhost:15002
   - **API 网关**: http://localhost:15000
   - **API 文档**: http://localhost:15000/scalar/v1
   - **Mongo Express**: http://localhost:15000/mongo-express

## 📡 API 接口

### 认证 API

所有 API 通过网关访问：`http://localhost:15000/api/apiservice/`

#### 用户登录
```http
POST /api/apiservice/api/login/account
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "autoLogin": true,
  "type": "account"
}
```

#### 获取当前用户信息
```http
GET /api/apiservice/api/currentUser
Authorization: Bearer {token}
```

#### 用户登出
```http
POST /api/apiservice/api/login/outLogin
Authorization: Bearer {token}
```

#### 用户注册
```http
POST /api/apiservice/api/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

### 用户管理 API

#### 获取用户列表（分页）
```http
POST /api/apiservice/api/users/list
Content-Type: application/json

{
  "page": 1,
  "pageSize": 10,
  "search": "张三",
  "role": "user",
  "isActive": true
}
```

#### 创建用户
```http
POST /api/apiservice/api/users/management
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "user",
  "isActive": true
}
```

#### 更新用户
```http
PUT /api/apiservice/api/users/{id}/update
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "updateduser",
  "email": "updated@example.com",
  "role": "admin",
  "isActive": true
}
```

#### 删除用户
```http
DELETE /api/apiservice/api/users/{id}
Authorization: Bearer {token}
```

#### 批量操作用户
```http
POST /api/apiservice/api/users/bulk-action
Authorization: Bearer {token}
Content-Type: application/json

{
  "userIds": ["id1", "id2", "id3"],
  "action": "activate"
}
```

#### 获取用户统计信息
```http
GET /api/apiservice/api/users/statistics
```

### 个人中心 API

#### 获取个人资料
```http
GET /api/apiservice/api/users/profile
Authorization: Bearer {token}
```

#### 更新个人资料
```http
PUT /api/apiservice/api/users/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "myusername",
  "email": "myemail@example.com",
  "name": "我的姓名",
  "age": 25
}
```

#### 修改密码
```http
PUT /api/apiservice/api/users/profile/password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword",
  "confirmPassword": "newpassword"
}
```

### 其他 API

#### 获取天气预测
```http
GET /api/apiservice/weatherforecast
```

## 🗄️ 数据模型

### 用户模型
```csharp
public class AppUser
{
    public string? Id { get; set; }           // MongoDB ObjectId
    public string Username { get; set; }      // 用户名
    public string? Name { get; set; }         // 用户姓名
    public int? Age { get; set; }             // 年龄
    public string PasswordHash { get; set; }  // 密码哈希
    public string? Email { get; set; }        // 邮箱地址
    public string Role { get; set; }          // 用户角色 (admin/user)
    public bool IsActive { get; set; }        // 是否激活
    public DateTime CreatedAt { get; set; }   // 创建时间
    public DateTime UpdatedAt { get; set; }   // 更新时间
    public DateTime? LastLoginAt { get; set; } // 最后登录时间
}

public class CurrentUser
{
    public string? Id { get; set; }           // 用户ID
    public string? Name { get; set; }         // 用户姓名
    public string? Avatar { get; set; }       // 头像
    public string? UserId { get; set; }       // 用户ID
    public string? Email { get; set; }        // 邮箱
    public string? Signature { get; set; }    // 签名
    public string? Title { get; set; }        // 职位
    public string? Group { get; set; }        // 组织
    public List<UserTag>? Tags { get; set; }  // 标签
    public int NotifyCount { get; set; }      // 通知数量
    public int UnreadCount { get; set; }      // 未读数量
    public string? Country { get; set; }      // 国家
    public string? Access { get; set; }       // 权限
    public GeographicInfo? Geographic { get; set; } // 地理信息
    public string? Address { get; set; }      // 地址
    public string? Phone { get; set; }        // 电话
    public bool IsLogin { get; set; }         // 是否登录
    public DateTime CreatedAt { get; set; }   // 创建时间
    public DateTime UpdatedAt { get; set; }   // 更新时间
}

public class UserActivityLog
{
    public string? Id { get; set; }           // 日志ID
    public string UserId { get; set; }        // 用户ID
    public string Action { get; set; }        // 操作类型
    public string Description { get; set; }   // 操作描述
    public string? IpAddress { get; set; }    // IP地址
    public string? UserAgent { get; set; }    // 用户代理
    public DateTime CreatedAt { get; set; }   // 创建时间
}
```

### 认证模型
```csharp
public class LoginRequest
{
    public string? Username { get; set; }     // 用户名
    public string? Password { get; set; }     // 密码
    public bool AutoLogin { get; set; }       // 自动登录
    public string? Type { get; set; }         // 登录类型
}

public class RegisterRequest
{
    public string Username { get; set; }      // 用户名
    public string Password { get; set; }      // 密码
    public string? Email { get; set; }        // 邮箱
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; }   // 当前密码
    public string NewPassword { get; set; }       // 新密码
    public string ConfirmPassword { get; set; }   // 确认密码
}
```

## 🔧 配置说明

### 环境配置
- **开发环境**: `appsettings.Development.json`
- **生产环境**: `appsettings.json`

### 服务端口
- **API 网关**: 15000
- **管理后台**: 15001
- **移动应用**: 15002
- **API 服务**: 动态分配
- **MongoDB**: 27017
- **Mongo Express**: 8081

### 前端开发

#### 独立开发管理后台
```bash
cd Platform.Admin
npm run start:dev
```

#### 独立开发移动应用
```bash
cd Platform.App
npm start
```

#### 管理后台可用脚本
- `npm run start` - 启动开发服务器
- `npm run start:dev` - 启动开发服务器（开发环境）
- `npm run build` - 构建生产版本
- `npm run lint` - 代码检查和格式化
- `npm run test` - 运行测试

#### 移动应用可用脚本
- `npm start` - 启动开发服务器
- `npm run android` - 启动 Android 应用
- `npm run ios` - 启动 iOS 应用
- `npm run web` - 启动 Web 版本
- `npm run lint` - 代码检查

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

### 移动端技术文档
- [React Native 文档](https://reactnative.dev/)
- [Expo 文档](https://docs.expo.dev/)
- [Expo Router 文档](https://expo.github.io/router/)

## 🔐 默认账户

系统启动时会自动创建默认管理员账户：
- **用户名**: `admin`
- **密码**: `admin123`
- **角色**: `admin`

## 📱 功能特性

### 管理后台功能
- ✅ 用户认证（登录、注册、登出）
- ✅ 用户管理（CRUD、搜索、分页、批量操作）
- ✅ 个人中心（资料管理、密码修改）
- ✅ 用户活动日志
- ✅ 响应式设计
- ✅ 多语言支持
- ✅ JWT Token 认证

### 移动应用功能
- ✅ 跨平台支持（iOS、Android、Web）
- ✅ 现代化 UI 设计
- ✅ 基于文件系统的路由
- ✅ 与后端 API 集成

### 后端 API 功能
- ✅ JWT 认证和授权
- ✅ 用户管理 API
- ✅ 用户活动日志记录
- ✅ 通知管理 API
- ✅ 规则管理 API
- ✅ 标签管理 API
- ✅ MongoDB 数据存储
- ✅ OpenAPI 文档
- ✅ 健康检查

---

**注意**: 这是一个基于 .NET Aspire 的完整微服务项目，展示了现代微服务架构的最佳实践，包含完整的前后端和移动端应用。
