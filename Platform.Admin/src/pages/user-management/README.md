# 用户管理模块设计文档

## 概述

用户管理模块是一个完整的用户管理系统，提供了用户CRUD操作、角色管理、状态管理、批量操作、活动日志等功能。

## 功能特性

### 1. 用户基础管理
- ✅ 用户列表展示（分页、搜索、排序）
- ✅ 用户创建、编辑、删除
- ✅ 用户详情查看
- ✅ 用户名和邮箱唯一性验证

### 2. 角色权限管理
- ✅ 用户角色分配（管理员/普通用户）
- ✅ 角色权限控制
- ✅ 批量角色更新

### 3. 用户状态管理
- ✅ 用户启用/禁用状态切换
- ✅ 批量状态操作
- ✅ 状态统计展示

### 4. 批量操作
- ✅ 批量启用用户
- ✅ 批量禁用用户
- ✅ 批量删除用户

### 5. 活动日志
- ✅ 用户操作日志记录
- ✅ 登录/登出记录
- ✅ 资料修改记录
- ✅ 日志查看和统计

### 6. 数据统计
- ✅ 用户总数统计
- ✅ 活跃用户统计
- ✅ 管理员数量统计
- ✅ 新增用户统计（今日/本周/本月）

## 技术架构

### 后端架构

```
Platform.ApiService/
├── Controllers/
│   └── UserController.cs          # 用户管理API控制器
├── Services/
│   └── UserService.cs             # 用户业务逻辑服务
├── Models/
│   ├── User.cs                    # 用户相关数据模型
│   └── AuthModels.cs              # 认证相关模型
└── Program.cs                     # 服务注册
```

### 前端架构

```
Platform.Admin/src/pages/user-management/
├── index.tsx                      # 主页面组件
├── types.ts                       # TypeScript类型定义
├── components/
│   ├── UserForm.tsx               # 用户表单组件
│   └── UserDetail.tsx             # 用户详情组件
└── README.md                      # 文档说明
```

## API接口设计

### 用户管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/users/list` | 分页获取用户列表 |
| GET | `/api/users/{id}` | 根据ID获取用户 |
| POST | `/api/users/management` | 创建新用户 |
| PUT | `/api/users/{id}/update` | 更新用户信息 |
| DELETE | `/api/users/{id}` | 删除用户 |
| GET | `/api/users/statistics` | 获取用户统计信息 |
| POST | `/api/users/bulk-action` | 批量操作用户 |
| GET | `/api/users/{id}/activity-logs` | 获取用户活动日志 |

> **注意**: 所有API通过网关访问，格式为 `http://localhost:15000/apiservice/api/...`

### 数据模型

#### AppUser
```typescript
interface AppUser {
  id?: string;
  username: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}
```

#### UserListRequest
```typescript
interface UserListRequest {
  Page: number;
  PageSize: number;
  Search?: string;
  Role?: string;
  IsActive?: boolean;
  SortBy?: string;
  SortOrder?: string;
}
```

#### UserStatisticsResponse
```typescript
interface UserStatisticsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

## 页面功能说明

### 1. 用户列表页面
- **统计卡片**: 显示用户总数、活跃用户、管理员数量、本月新增用户
- **搜索功能**: 支持按用户名、邮箱搜索
- **过滤功能**: 支持按角色、状态过滤
- **排序功能**: 支持按创建时间、更新时间排序
- **批量操作**: 支持批量启用、禁用、删除用户
- **行内操作**: 支持查看详情、编辑、删除单个用户

### 2. 用户表单
- **创建用户**: 输入用户名、邮箱、密码、角色、状态
- **编辑用户**: 修改用户名、邮箱、角色、状态
- **表单验证**: 用户名唯一性、邮箱格式、密码强度验证

### 3. 用户详情
- **基本信息**: 显示用户的所有基本信息
- **活动日志**: 显示用户最近的操作记录
- **状态管理**: 可以快速切换用户状态

## 权限控制

- 用户管理页面需要菜单级权限（v6.0权限系统）
- 通过角色的 `MenuIds` 控制用户可见菜单
- 通过菜单的 `Permissions` 控制菜单内功能权限
- 具体权限配置请参考 [菜单级权限使用指南](../../../../docs/features/MENU-LEVEL-PERMISSION-GUIDE.md)

## 数据库设计

### users 集合
```javascript
{
  _id: ObjectId,
  username: String,        // 用户名
  passwordHash: String,    // 密码哈希
  email: String,           // 邮箱
  role: String,            // 角色 (user/admin)
  isActive: Boolean,       // 是否启用
  createdAt: Date,         // 创建时间
  updatedAt: Date,         // 更新时间
  lastLoginAt: Date        // 最后登录时间
}
```

### user_activity_logs 集合
```javascript
{
  _id: ObjectId,
  userId: String,          // 用户ID
  action: String,          // 操作类型
  description: String,     // 操作描述
  ipAddress: String,       // IP地址
  userAgent: String,       // 用户代理
  createdAt: Date          // 创建时间
}
```

## 部署说明

1. 确保MongoDB数据库已启动
2. 通过 `dotnet run --project Platform.AppHost` 启动整个应用
3. 管理后台会自动启动，访问 http://localhost:15001
4. 访问 `/user-management` 路径进入用户管理页面

> **注意**: 本项目使用 .NET Aspire 进行服务编排，所有服务通过 AppHost 统一管理

## 扩展功能建议

1. **用户导入导出**: 支持Excel文件导入导出用户数据
2. **用户分组**: 支持用户分组管理
3. **权限细化**: 更细粒度的权限控制
4. **审计日志**: 更详细的操作审计
5. **用户画像**: 用户行为分析和画像
6. **通知系统**: 用户状态变更通知
7. **API限流**: 防止恶意操作
8. **数据备份**: 定期数据备份机制
