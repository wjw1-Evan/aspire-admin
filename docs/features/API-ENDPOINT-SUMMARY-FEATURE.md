# API 文档系统

## 📋 概述

Platform API 采用 .NET 9 原生 OpenAPI + Scalar 文档系统，提供完整的接口文档和交互式测试功能。所有 API 接口都有详细的描述、示例请求/响应、状态码说明等。

## ✨ 实现内容

### 1. 项目配置更新

#### XML 文档生成启用
- 在 `Platform.ApiService.csproj` 中启用了 XML 文档生成
- 配置了 `<GenerateDocumentationFile>true</GenerateDocumentationFile>`
- 添加了 `<NoWarn>$(NoWarn);1591</NoWarn>` 抑制未文档化成员的警告

#### OpenAPI 配置优化
- 在 `Program.cs` 中优化了 OpenAPI 配置
- 添加了 API 文档的详细信息（标题、版本、描述、联系方式）
- 配置了 JWT 认证方案
- 添加了全局安全要求

### 2. 控制器文档完善

#### AuthController（认证控制器）
为所有认证相关接口添加了详细文档：

- **获取当前用户信息** (`GET /api/currentUser`)
  - 详细的权限说明
  - 完整的请求/响应示例
  - 状态码说明

- **用户登录** (`POST /api/login/account`)
  - 登录流程说明
  - 请求参数示例
  - 成功/失败响应示例

- **用户登出** (`POST /api/login/outLogin`)
  - 登出流程说明
  - 响应格式说明

- **获取验证码** (`GET /api/login/captcha`)
  - 验证码生成流程
  - 参数验证说明

- **验证验证码** (`POST /api/login/verify-captcha`)
  - 验证码验证流程
  - 测试环境说明

- **用户注册** (`POST /api/register`)
  - 注册流程说明
  - 自动创建企业说明

- **修改密码** (`POST /api/change-password`)
  - 密码修改流程
  - 安全验证说明

- **刷新令牌** (`POST /api/refresh-token`)
  - 令牌刷新机制
  - 会话延长说明

#### UserController（用户管理控制器）
为关键用户管理接口添加了详细文档：

- **获取用户信息** (`GET /api/user/{id}`)
  - 权限控制说明
  - 用户只能查看自己信息的限制

- **创建用户** (`POST /api/user/management`)
  - 管理员功能说明
  - 参数验证要求

- **更新用户** (`PUT /api/user/{id}`)
  - 基本信息更新说明
  - 角色管理分离说明

- **删除用户** (`DELETE /api/user/{id}`)
  - 软删除机制说明
  - 安全限制说明

#### CompanyController（企业管理控制器）
为企业管理接口添加了详细文档：

- **获取当前企业信息** (`GET /api/company/current`)
  - 企业信息获取流程
  - 响应数据结构说明

#### MenuController（菜单控制器）
为菜单相关接口添加了详细文档：

- **获取用户菜单** (`GET /api/menu/user`)
  - 权限过滤机制说明
  - 菜单树结构说明

#### NoticeController（通知控制器）
为通知管理接口添加了详细文档：

- **获取通知列表** (`GET /api/notices`)
  - 权限策略说明
  - 通知数据结构说明

## 🔧 技术细节

### XML 文档注释格式

所有接口都使用了标准的 XML 文档注释格式：

```csharp
/// <summary>
/// 接口简要描述
/// </summary>
/// <param name="paramName">参数描述</param>
/// <remarks>
/// 详细说明，包括：
/// - 功能描述
/// - 权限要求
/// - 使用场景
/// - 示例请求
/// - 示例响应
/// </remarks>
/// <returns>返回值描述</returns>
/// <response code="200">成功响应说明</response>
/// <response code="400">错误响应说明</response>
```

### 示例请求/响应格式

所有接口都包含了完整的示例：

```json
// 请求示例
{
  "username": "admin",
  "password": "admin123"
}

// 响应示例
{
  "success": true,
  "data": {
    "id": "user123",
    "username": "admin"
  }
}
```

### 状态码说明

为每个接口添加了详细的 HTTP 状态码说明：

- **200**: 操作成功
- **400**: 参数错误或业务逻辑错误
- **401**: 未授权，需要登录
- **403**: 权限不足
- **404**: 资源不存在
- **500**: 服务器内部错误

## 📚 Scalar 文档效果

### 1. 接口列表
- 每个接口都有清晰的标题和描述
- 显示请求方法和路径
- 显示权限要求

### 2. 接口详情
- 完整的参数说明
- 详细的请求/响应示例
- 状态码说明
- 权限要求说明

### 3. 交互式测试
- 可以直接在文档中测试接口
- 自动填充示例数据
- 显示真实的响应结果

## 📋 完整 API 端点列表

### 企业管理 API（v3.0 新增）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/company/register` | 匿名 | 企业注册 |
| GET | `/api/company/current` | 登录 | 获取当前企业信息 |
| PUT | `/api/company/current` | 登录 | 更新企业信息 |
| GET | `/api/company/statistics` | 登录 | 获取企业统计 |
| GET | `/api/company/check-code` | 匿名 | 检查代码可用性 |

### 认证授权 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/login/account` | 匿名 | 用户登录 |
| POST | `/api/login/outLogin` | 登录 | 用户登出 |
| GET | `/api/currentUser` | 登录 | 获取当前用户 |
| POST | `/api/refresh-token` | 匿名 | 刷新令牌 |
| POST | `/api/register` | 匿名 | 用户注册 |
| POST | `/api/change-password` | 登录 | 修改密码 |
| GET | `/api/login/captcha` | 匿名 | 获取验证码 |
| POST | `/api/login/verify-captcha` | 匿名 | 验证验证码 |

### 用户管理 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/user/list` | - | 获取用户列表（分页） |
| GET | `/api/user/{id}` | 条件 | 根据ID获取用户 |
| POST | `/api/user/management` | user:create | 创建用户 |
| PUT | `/api/user/{id}` | user:update | 更新用户 |
| DELETE | `/api/user/{id}` | user:delete | 删除用户 |
| GET | `/api/user/statistics` | user:read | 获取用户统计 |
| POST | `/api/user/bulk-action` | 条件 | 批量操作用户 |
| GET | `/api/user/check-username` | - | 检查用户名存在 |
| GET | `/api/user/check-email` | - | 检查邮箱存在 |
| PUT | `/api/user/{id}/activate` | - | 启用用户 |
| PUT | `/api/user/{id}/deactivate` | - | 禁用用户 |
| GET | `/api/user/{id}/permissions` | - | 获取用户权限 |
| POST | `/api/user/{id}/custom-permissions` | - | 分配自定义权限 |
| GET | `/api/user/my-permissions` | - | 获取当前用户权限 |
| GET | `/api/user/profile` | - | 获取当前用户信息 |
| PUT | `/api/user/profile` | - | 更新当前用户信息 |
| PUT | `/api/user/profile/password` | - | 修改当前用户密码 |
| GET | `/api/user/profile/activity-logs` | - | 获取当前用户活动日志 |
| GET | `/api/user/{id}/activity-logs` | - | 获取用户活动日志 |
| GET | `/api/users/activity-logs` | activity-log:read | 获取所有活动日志 |

### 角色管理 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/role` | role:read | 获取所有角色 |
| GET | `/api/role/with-stats` | role:read | 获取角色（带统计） |
| GET | `/api/role/{id}` | role:read | 根据ID获取角色 |
| POST | `/api/role` | role:create | 创建角色 |
| PUT | `/api/role/{id}` | role:update | 更新角色 |
| DELETE | `/api/role/{id}` | role:delete | 删除角色 |
| POST | `/api/role/{id}/menus` | role:update | 分配菜单到角色 |
| POST | `/api/role/{id}/permissions` | role:update | 分配权限到角色 |

### 菜单管理 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/menu` | menu:read | 获取所有菜单 |
| GET | `/api/menu/tree` | menu:read | 获取菜单树 |
| GET | `/api/menu/current-user` | - | 获取当前用户菜单 |
| GET | `/api/menu/{id}` | menu:read | 根据ID获取菜单 |
| POST | `/api/menu` | menu:create | 创建菜单 |
| PUT | `/api/menu/{id}` | menu:update | 更新菜单 |
| DELETE | `/api/menu/{id}` | menu:delete | 删除菜单 |
| POST | `/api/menu/reorder` | menu:update | 菜单排序 |

### 通知管理 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/notices` | - | 获取通知列表 |
| GET | `/api/notices/{id}` | - | 根据ID获取通知 |
| POST | `/api/notices` | notice:create | 创建通知 |
| PUT | `/api/notices/{id}` | notice:update | 更新通知 |
| DELETE | `/api/notices/{id}` | notice:delete | 删除通知 |
| PUT | `/api/notices/{id}/read` | - | 标记通知为已读 |
| PUT | `/api/notices/{id}/unread` | - | 标记通知为未读 |
| PUT | `/api/notices/read-all` | - | 全部标记为已读 |

### 权限管理 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/permission` | permission:read | 获取所有权限 |
| GET | `/api/permission/grouped` | permission:read | 获取权限（按资源分组） |
| GET | `/api/permission/{id}` | permission:read | 根据ID获取权限 |
| POST | `/api/permission` | permission:create | 创建权限 |
| PUT | `/api/permission/{id}` | permission:update | 更新权限 |
| DELETE | `/api/permission/{id}` | permission:delete | 删除权限 |
| POST | `/api/permission/check` | - | 检查权限 |

### 标签和规则 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/tags` | - | 获取标签列表 |
| POST | `/api/tags` | - | 创建标签 |
| PUT | `/api/tags/{id}` | - | 更新标签 |
| DELETE | `/api/tags/{id}` | - | 删除标签 |
| GET | `/api/rule` | - | 获取规则列表 |
| POST | `/api/rule` | - | 创建规则 |
| PUT | `/api/rule/{id}` | - | 更新规则 |
| DELETE | `/api/rule/{id}` | - | 删除规则 |

## 🔍 API 分类汇总

| 类别 | 端点数量 | 说明 |
|------|---------|------|
| 企业管理 | 5 | v3.0 新增 |
| 认证授权 | 8 | 登录、注册、token |
| 用户管理 | 19 | CRUD + 批量操作 |
| 角色管理 | 8 | CRUD + 菜单分配 |
| 菜单管理 | 8 | CRUD + 树形结构 |
| 通知管理 | 8 | CRUD + 已读未读 |
| 权限管理 | 7 | CRUD + 检查 |
| 标签管理 | 4 | CRUD |
| 规则管理 | 4 | CRUD |
| **总计** | **71+** | 完整的 REST API |

## 🎯 使用指南

### 查看 API 文档

1. 启动项目：
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. 访问 Scalar 文档：
   ```
   http://localhost:15000/scalar/v1
   ```

3. 浏览接口：
   - 左侧导航显示所有控制器
   - 点击接口查看详细信息
   - 使用 "Try it out" 功能测试接口

### 认证设置

在 Scalar 文档中设置认证：

1. 点击右上角的 "Authorize" 按钮
2. 在 "Bearer" 字段中输入 JWT token
3. 点击 "Authorize" 完成认证
4. 现在可以测试需要认证的接口

## 🔍 维护说明

### 添加新接口文档

当添加新的 API 接口时，请遵循以下格式：

```csharp
/// <summary>
/// 接口简要描述
/// </summary>
/// <param name="paramName">参数描述</param>
/// <remarks>
/// 详细说明，包括：
/// - 功能描述
/// - 权限要求
/// - 使用场景
/// - 示例请求
/// - 示例响应
/// </remarks>
/// <returns>返回值描述</returns>
/// <response code="200">成功响应说明</response>
/// <response code="400">错误响应说明</response>
[HttpMethod("path")]
public async Task<IActionResult> MethodName(ParameterType parameter)
{
    // 实现代码
}
```

### 更新现有文档

当修改现有接口时：

1. 更新 `<summary>` 标签中的简要描述
2. 更新 `<remarks>` 标签中的详细说明
3. 更新示例请求/响应
4. 更新状态码说明
5. 确保权限要求说明准确

## 📈 效果展示

### 改进前
- 接口只有简单的名称
- 缺少详细的参数说明
- 没有示例请求/响应
- 状态码说明不完整

### 改进后
- 每个接口都有详细的描述
- 完整的参数和返回值说明
- 丰富的示例请求/响应
- 详细的状态码和错误说明
- 权限要求清晰明确
- 支持交互式测试

## 🎯 核心价值

1. **提升开发效率** - 开发者可以快速理解接口用法
2. **减少沟通成本** - 详细的文档减少前后端沟通
3. **降低集成难度** - 完整的示例让集成更简单
4. **提高代码质量** - 文档化过程促进代码审查
5. **改善用户体验** - 交互式文档提供更好的体验

## 📚 相关文档

- [Scalar API 文档](http://localhost:15000/scalar/v1)
- [OpenAPI 规范](https://swagger.io/specification/)
- [XML 文档注释](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/xmldoc/)

## 🎯 总结

通过添加详细的 EndpointSummary 功能，Platform API 现在拥有了完整的接口文档，大大提升了 API 的可读性和可用性。开发者可以通过 Scalar 文档快速了解和使用所有接口，显著改善了开发体验。
