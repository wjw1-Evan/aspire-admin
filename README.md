# Aspire Admin Platform

基于 .NET Aspire 构建的现代化多租户微服务管理平台，提供企业级用户管理、权限控制、通知系统、React 前端界面和移动端应用等功能。

## 🚀 项目概述

这是一个使用 .NET Aspire 框架构建的微服务架构项目，采用多租户 SaaS 模式，包含以下核心组件：

- **多租户 API 服务** - 提供企业级用户管理、认证、权限控制、通知等 REST API
- **管理后台** - React + Ant Design Pro 企业级前端界面
- **移动应用** - React Native + Expo 跨平台移动应用
- **API 网关** - 基于 YARP 的统一入口
- **多租户数据库** - MongoDB 数据存储，支持企业数据隔离
- **API 文档** - Scalar API 文档界面
- **帮助系统** - 内置系统帮助模块

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
- **多租户架构** - 基于 CompanyId 的企业数据隔离
- **企业自助注册** - 企业可自助注册，首个用户自动成为管理员
- **用户管理 API** - 支持 CRUD、搜索、分页、批量操作
- **统一权限控制** - 基于 [RequirePermission] 特性的声明式权限管理
- **JWT 认证系统** - 支持多企业切换的认证机制
- **用户活动日志** - 自动记录用户操作日志
- **通知管理 API** - 企业级通知系统
- **角色权限管理** - 企业独立管理角色和权限
- **菜单管理 API** - 动态菜单配置
- **标签管理 API** - 用户标签分类管理
- **MongoDB 数据访问** - 支持软删除和时间戳
- **OpenAPI 文档支持** - 完整的 API 文档
- **健康检查端点** - 服务状态监控

#### Platform.Admin
- **React 19 + Ant Design Pro** - 企业级管理后台
- **基于 UmiJS** - 企业级前端应用框架
- **多租户支持** - 企业注册、切换、管理功能
- **用户管理界面** - 列表、创建、编辑、删除、批量操作
- **权限管理** - 角色分配、权限配置、菜单管理
- **个人中心** - 资料管理、密码修改、企业切换
- **通知系统** - 企业通知、消息管理、未读提醒
- **帮助系统** - 内置系统帮助模块和使用指南
- **多语言支持** - 中文、英文等多语言界面
- **响应式设计** - 适配桌面、平板、手机等设备
- **JWT 认证集成** - 统一认证和权限控制

#### Platform.App
- **React Native + Expo** - 跨平台移动应用
- **多平台支持** - iOS、Android 和 Web 平台
- **基于 Expo Router** - 文件系统路由
- **现代化 UI 设计** - 企业级移动端界面
- **多租户支持** - 企业切换和用户管理
- **与后端 API 集成** - 统一的认证和权限控制

#### Platform.ServiceDefaults
- **共享服务配置** - 统一的服务配置管理
- **OpenTelemetry 集成** - 分布式追踪和监控
- **服务发现配置** - 微服务自动发现
- **JWT 认证配置** - 统一认证配置
- **MongoDB 驱动配置** - 数据库连接配置
- **多租户支持** - 企业数据隔离配置

## 🛠️ 技术栈

### 后端技术
- **.NET 9.0** - 最新 .NET 框架
- **.NET Aspire** - 微服务编排框架
- **MongoDB** - NoSQL 数据库，支持多租户数据隔离
- **YARP** - 反向代理和负载均衡
- **Scalar** - API 文档生成
- **OpenTelemetry** - 可观测性
- **JWT** - 多企业认证和授权
- **软删除** - 数据安全删除机制

### 前端技术
- **React 19** - 现代前端框架
- **Ant Design Pro** - 企业级UI组件库
- **UmiJS** - 企业级前端应用框架
- **TypeScript** - 类型安全的JavaScript
- **Biome** - 代码格式化和检查工具
- **多语言支持** - 国际化框架
- **帮助系统** - 内置用户指南

### 移动端技术
- **React Native** - 跨平台移动应用框架
- **Expo** - React Native 开发平台
- **Expo Router** - 基于文件系统的路由
- **TypeScript** - 类型安全的JavaScript
- **多租户支持** - 企业切换和管理

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
   - **Aspire Dashboard**: http://localhost:15003 （包含 Scalar API 文档）
   - **Mongo Express**: http://localhost:15000/mongo-express

## 📖 API 文档

### 查看 API 文档

详细的 API 文档通过 Scalar 提供，集成在 Aspire Dashboard 中：

**快速访问指南**: 查看 [HOW-TO-VIEW-API-DOCS.md](docs/features/HOW-TO-VIEW-API-DOCS.md)

简要步骤：
1. 访问 Aspire Dashboard: http://localhost:15003
2. 点击顶部 "Resources" 标签
3. 找到 "Scalar API Reference" 资源
4. 点击端点链接打开 API 文档

或直接查看 OpenAPI JSON: http://localhost:15000/apiservice/openapi/v1.json

## 🏢 多租户功能

### 用户注册和登录
1. **用户自主注册** - 访问注册页面创建新账户
2. **自动创建企业** - 注册时系统自动为用户创建个人企业
3. **自动成为管理员** - 注册用户自动成为其企业的管理员
4. **企业切换** - 用户可以在多个企业间自由切换
5. **数据完全隔离** - 每个企业的数据完全独立，确保安全性

## 📡 API 接口

### 认证 API

所有 API 通过网关访问：`http://localhost:15000/apiservice/`

#### 用户注册（推荐）
```http
POST /apiservice/api/register
Content-Type: application/json

{
  "username": "yourname",
  "password": "YourPassword123",
  "email": "your@email.com"
}
```

**说明**：
- 系统会自动为您创建个人企业
- 您将自动成为该企业的管理员
- 企业名称："{username} 的企业"
- 自动创建28个默认权限、1个管理员角色、3个默认菜单

#### 用户登录
```http
POST /apiservice/api/login/account
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
GET /apiservice/api/currentUser
Authorization: Bearer {token}
```

#### 用户登出
```http
POST /apiservice/api/login/outLogin
Authorization: Bearer {token}
```

### 用户管理 API

#### 获取用户列表（分页）
```http
POST /apiservice/api/users/list
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
POST /apiservice/api/users/management
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
PUT /apiservice/api/users/{id}/update
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
DELETE /apiservice/api/users/{id}
Authorization: Bearer {token}
```

#### 批量操作用户
```http
POST /apiservice/api/users/bulk-action
Authorization: Bearer {token}
Content-Type: application/json

{
  "userIds": ["id1", "id2", "id3"],
  "action": "activate"
}
```

#### 获取用户统计信息
```http
GET /apiservice/api/users/statistics
```

### 企业管理 API

#### 获取企业信息
```http
GET /apiservice/api/company/info
Authorization: Bearer {token}
```

#### 更新企业信息
```http
PUT /apiservice/api/company/info
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新后的企业名称",
  "description": "企业描述",
  "industry": "IT行业"
}
```

#### 切换企业
```http
POST /apiservice/api/company/switch
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyId": "目标企业ID"
}
```

### 权限管理 API

#### 获取角色列表
```http
GET /apiservice/api/roles
Authorization: Bearer {token}
```

#### 创建角色
```http
POST /apiservice/api/roles
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新角色",
  "description": "角色描述",
  "permissions": ["user:read", "user:create"]
}
```

#### 获取菜单列表
```http
GET /apiservice/api/menus
Authorization: Bearer {token}
```

#### 获取通知列表
```http
GET /apiservice/api/notices
Authorization: Bearer {token}
```

### 个人中心 API

#### 获取个人资料
```http
GET /apiservice/api/users/profile
Authorization: Bearer {token}
```

#### 更新个人资料
```http
PUT /apiservice/api/users/profile
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
PUT /apiservice/api/users/profile/password
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
GET /apiservice/weatherforecast
```

## 🗄️ 数据模型

### 多租户模型

#### 企业模型
```csharp
public class Company : ISoftDeletable, IEntity, ITimestamped
{
    public string? Id { get; set; }           // MongoDB ObjectId
    public string Name { get; set; }          // 企业名称
    public string Code { get; set; }          // 企业代码（唯一）
    public string? Logo { get; set; }         // 企业Logo
    public string? Description { get; set; }  // 企业描述
    public string? Industry { get; set; }     // 行业
    public string? ContactName { get; set; }  // 联系人
    public string? ContactEmail { get; set; } // 联系邮箱
    public string? ContactPhone { get; set; } // 联系电话
    public bool IsActive { get; set; }        // 是否激活
    public int MaxUsers { get; set; }         // 最大用户数
    public DateTime? ExpiresAt { get; set; }  // 过期时间（可选）
    public bool IsDeleted { get; set; }       // 软删除标记
    public DateTime CreatedAt { get; set; }   // 创建时间
    public DateTime UpdatedAt { get; set; }   // 更新时间
}
```

### 用户模型
```csharp
public class AppUser : ISoftDeletable, IEntity, ITimestamped
{
    public string? Id { get; set; }           // MongoDB ObjectId
    public string Username { get; set; }      // 用户名
    public string? Name { get; set; }         // 用户姓名
    public int? Age { get; set; }             // 年龄
    public string PasswordHash { get; set; }  // 密码哈希
    public string? Email { get; set; }        // 邮箱地址
    public string Role { get; set; }          // 用户角色 (admin/user)
    public bool IsActive { get; set; }        // 是否激活
    public string CompanyId { get; set; }     // 所属企业ID（多租户）
    public DateTime? LastLoginAt { get; set; } // 最后登录时间
    public bool IsDeleted { get; set; }       // 软删除标记
    public DateTime CreatedAt { get; set; }   // 创建时间
    public DateTime UpdatedAt { get; set; }   // 更新时间
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

## 📱 功能特性

### 多租户功能 ⭐ **v3.1 新增**
- ✅ **用户自主注册** - 用户注册时自动创建个人企业
- ✅ **自动成为管理员** - 注册用户自动成为其企业的管理员
- ✅ **数据完全隔离** - 基于 CompanyId 的企业数据隔离
- ✅ **企业切换** - 用户可在多个企业间自由切换
- ✅ **企业配额管理** - 支持企业用户数量限制
- ✅ **零配置启动** - 无需预配置，用户注册即可使用

### 管理后台功能
- ✅ **用户认证** - 登录、注册、登出、企业切换
- ✅ **用户管理** - CRUD、搜索、分页、批量操作
- ✅ **权限管理** - 角色分配、权限配置、菜单管理
- ✅ **企业管理** - 企业信息、用户配额、过期设置
- ✅ **通知系统** - 企业通知、消息管理、未读提醒
- ✅ **帮助系统** - 内置系统帮助模块和使用指南
- ✅ **个人中心** - 资料管理、密码修改、企业切换
- ✅ **用户活动日志** - 自动记录用户操作
- ✅ **响应式设计** - 适配多种设备
- ✅ **多语言支持** - 中文、英文等
- ✅ **JWT Token 认证** - 统一认证和权限控制

### 移动应用功能
- ✅ **跨平台支持** - iOS、Android、Web
- ✅ **多租户支持** - 企业切换和管理
- ✅ **现代化 UI 设计** - 企业级移动端界面
- ✅ **基于文件系统的路由** - Expo Router
- ✅ **与后端 API 集成** - 统一认证和权限控制

### 后端 API 功能
- ✅ **多租户架构** - 企业数据隔离和管理
- ✅ **统一权限控制** - 基于 [RequirePermission] 特性的声明式权限管理
- ✅ **JWT 认证和授权** - 支持多企业切换
- ✅ **用户管理 API** - 完整的用户 CRUD 操作
- ✅ **企业管理 API** - 企业注册、切换、管理
- ✅ **权限管理 API** - 角色、菜单、权限管理
- ✅ **通知管理 API** - 企业级通知系统
- ✅ **用户活动日志** - 自动记录和查询
- ✅ **软删除机制** - 数据安全删除
- ✅ **MongoDB 数据存储** - 支持多租户和软删除
- ✅ **OpenAPI 文档** - 完整的 API 文档
- ✅ **健康检查** - 服务状态监控

## 🎯 版本历史

### v3.1.1 - 数据隔离优化（最新）
- ✅ **移除全局数据初始化** - 修复多租户数据隔离漏洞
- ✅ **禁止孤儿数据** - 所有数据必须归属于特定企业
- ✅ **用户注册优化** - 自动创建完整的企业环境
- ✅ **零配置启动** - 不再需要预配置默认用户

### v5.0 - 后端架构优化
- ✅ **代码重构** - 减少 50% 重复代码，提高代码复用性
- ✅ **统一错误处理** - 50+ 个错误消息统一管理
- ✅ **基础组件** - BaseService、BaseRepository、ValidationExtensions
- ✅ **软删除机制** - 数据安全删除，支持恢复
- ✅ **时间戳管理** - ITimestamped 接口统一时间管理

### v3.1 - 多企业隶属架构
- ✅ **多租户系统** - 用户自主注册，数据完全隔离
- ✅ **企业切换** - 用户可在多个企业间自由切换
- ✅ **权限系统** - 企业级独立权限管理
- ✅ **自动企业创建** - 注册时自动创建个人企业

### v2.0 - 功能完善
- ✅ **通知系统** - 企业级通知管理
- ✅ **帮助系统** - 内置用户指南
- ✅ **权限控制** - 统一权限管理
- ✅ **用户日志** - 活动日志记录

## 📚 相关文档

### 快速开始
- [v3.1 快速开始指南](docs/features/QUICK-START-V3.1.md) - 5分钟快速上手多租户系统
- [多租户系统说明](docs/features/MULTI-TENANT-SYSTEM.md) - 完整的多租户架构文档

### 开发指南
- [移除全局数据初始化](docs/reports/REMOVE-GLOBAL-DATA-INITIALIZATION.md) - v3.1.1 数据隔离优化 ⭐ **最新**
- [v5.0 优化完成报告](docs/reports/V5-OPTIMIZATION-COMPLETE.md) - 后端架构优化详情
- [菜单级权限使用指南](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md) - v6.0 菜单级权限系统使用指南
- [帮助系统功能](docs/features/HELP-MODULE-FEATURE.md) - 内置帮助模块说明

### 技术文档
- [文档总索引](docs/INDEX.md) - 完整的项目文档导航
- [API 端点汇总](docs/features/API-ENDPOINTS-SUMMARY.md) - 所有 API 接口列表

### Cursor Rules
- [Cursor Rules 使用指南](.cursor/rules/README.md) - AI 编程规范
- [多租户开发规范](.cursor/rules/multi-tenant-data-isolation.mdc) - 数据隔离最佳实践
- [用户注册流程规范](.cursor/rules/user-registration-flow.mdc) - 注册流程开发指南

---

**注意**: 这是一个基于 .NET Aspire 的完整多租户微服务项目，展示了现代微服务架构和 SaaS 应用的最佳实践，包含完整的前后端和移动端应用。
