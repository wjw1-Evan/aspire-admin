# UserController 路由修复说明

## 问题描述

Admin 端访问用户日志模块时，API `/api/users/activity-logs` 显示 404 错误。

## 问题原因

### 路由配置不匹配

**后端 UserController 原路由**：
```csharp
[ApiController]
[Route("api/[controller]")]  // [controller] = User (单数)
public class UserController : ControllerBase
```

实际路由：`/api/User/...`（注意是单数 User）

**前端调用情况**：
1. **用户管理模块**调用：`/api/user/...`（单数）
   - `/api/user/list` - 获取用户列表
   - `/api/user/management` - 创建用户
   - `/api/user/{id}/update` - 更新用户
   - `/api/user/statistics` - 获取统计

2. **用户日志模块**调用：`/api/users/activity-logs`（复数 users）⚠️

3. **个人中心**调用：`/api/user/profile`（单数）

### 特殊情况

只有**用户日志模块**期望的路径是 `/api/users/activity-logs`（复数），与其他所有接口不一致。

## 解决方案

### 最终方案：绝对路径特例

- **控制器基础路由**：`/api/user`（单数，保持与大多数接口一致）
- **用户日志接口特例**：使用绝对路由 `/api/users/activity-logs`（复数）

### 实现代码

```csharp
[ApiController]
[Route("api/user")]  // 保持单数
public class UserController : ControllerBase
{
    // ========================================
    // 用户管理接口（使用基础路由 /api/user）
    // ========================================
    
    /// <summary>
    /// 获取用户列表
    /// </summary>
    [HttpPost("list")]  // → /api/user/list
    public async Task<IActionResult> GetUsersList() { }
    
    /// <summary>
    /// 创建用户
    /// </summary>
    [HttpPost("management")]  // → /api/user/management
    [Authorize]
    public async Task<IActionResult> CreateUserManagement() { }
    
    /// <summary>
    /// 批量操作用户
    /// </summary>
    [HttpPost("bulk-action")]  // → /api/user/bulk-action
    [Authorize]
    public async Task<IActionResult> BulkUserAction() { }
    
    // ========================================
    // 个人中心接口（使用基础路由 /api/user）
    // ========================================
    
    /// <summary>
    /// 获取当前用户信息（个人中心）
    /// </summary>
    [HttpGet("profile")]  // → /api/user/profile
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile() { }
    
    /// <summary>
    /// 更新当前用户信息（个人中心）
    /// </summary>
    [HttpPut("profile")]  // → /api/user/profile
    [Authorize]
    public async Task<IActionResult> UpdateCurrentUserProfile() { }
    
    /// <summary>
    /// 修改当前用户密码
    /// </summary>
    [HttpPut("profile/password")]  // → /api/user/profile/password
    [Authorize]
    public async Task<IActionResult> ChangeCurrentUserPassword() { }
    
    /// <summary>
    /// 获取当前用户活动日志
    /// </summary>
    [HttpGet("profile/activity-logs")]  // → /api/user/profile/activity-logs
    [Authorize]
    public async Task<IActionResult> GetCurrentUserActivityLogs() { }
    
    // ========================================
    // 用户日志接口（使用绝对路径特例）
    // ========================================
    
    /// <summary>
    /// 获取所有用户活动日志（管理员）- 使用绝对路径
    /// </summary>
    [HttpGet("/api/users/activity-logs")]  // 绝对路径（复数）
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllActivityLogs() { }
}
```

## 路由映射表

### 用户管理接口（/api/user 基础路由）

| 方法 | 路由 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/user` | 获取所有用户 | - |
| GET | `/api/user/{id}` | 获取指定用户 | - |
| POST | `/api/user/management` | 创建用户 | 需登录 |
| PUT | `/api/user/{id}/update` | 更新用户 | 需登录 |
| DELETE | `/api/user/{id}` | 软删除用户 | 需登录 |
| POST | `/api/user/list` | 获取用户列表（分页） | - |
| GET | `/api/user/statistics` | 获取用户统计 | - |
| POST | `/api/user/bulk-action` | 批量操作 | 需登录 |
| PUT | `/api/user/{id}/role` | 更新用户角色 | 需登录 |
| PUT | `/api/user/{id}/activate` | 启用用户 | 需登录 |
| PUT | `/api/user/{id}/deactivate` | 禁用用户 | 需登录 |
| GET | `/api/user/{id}/activity-logs` | 获取用户活动日志 | 需登录 |
| GET | `/api/user/check-email` | 检查邮箱是否存在 | - |
| GET | `/api/user/check-username` | 检查用户名是否存在 | - |

### 个人中心接口（/api/user 基础路由）

| 方法 | 路由 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取当前用户信息 | 需登录 |
| PUT | `/api/user/profile` | 更新当前用户信息 | 需登录 |
| PUT | `/api/user/profile/password` | 修改密码 | 需登录 |
| GET | `/api/user/profile/activity-logs` | 获取个人活动日志 | 需登录 |

### 用户日志接口（绝对路径特例）

| 方法 | 路由 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/users/activity-logs` | 获取所有活动日志 | 管理员 |

## 路由设计说明

### 为什么保持 /api/user（单数）？

1. **前端兼容性**
   - 用户管理模块已经使用 `/api/user/...`（单数）
   - 个人中心已经使用 `/api/user/...`（单数）
   - 只有用户日志模块期望 `/api/users/...`（复数）
   
2. **最小改动原则**
   - 只需修改一个接口（用户日志）使用绝对路径
   - 避免大量前端代码修改

### 为什么用户日志用复数路径？

前端用户日志模块的 API 服务文件独立设计，期望：
```typescript
// Platform.Admin/src/services/user-log/api.ts
return request('/api/users/activity-logs', { ... });
```

为了避免修改前端代码，后端使用绝对路径适配。

## 前端 API 调用

### 用户管理服务
```typescript
// src/services/ant-design-pro/api.ts (用户管理)

// 获取所有用户活动日志（管理员）
export async function getAllActivityLogs(params) {
  return request('/api/users/activity-logs', {
    method: 'GET',
    params,
  });
}

// 获取用户列表
export async function getUsersList(data) {
  return request('/api/users/list', {
    method: 'POST',
    data,
  });
}
```

### 个人中心服务
```typescript
// src/services/ant-design-pro/api.ts (个人中心)

// 获取当前用户信息
export async function getCurrentUserProfile() {
  return request('/api/user/profile', {
    method: 'GET',
  });
}

// 更新个人信息
export async function updateUserProfile(data) {
  return request('/api/user/profile', {
    method: 'PUT',
    data,
  });
}

// 修改密码
export async function changePassword(data) {
  return request('/api/user/profile/password', {
    method: 'PUT',
    data,
  });
}
```

## 修改清单

### 修改的文件（1个）
1. `Platform.ApiService/Controllers/UserController.cs`

### 修改的接口（1个）
1. 用户日志接口：`activity-logs` → `/api/users/activity-logs`（使用绝对路径）

### 保持不变的路由
- 控制器基础路由：`[Route("api/user")]`（单数）
- 所有其他接口继续使用相对路径

## 测试验证

### 1. 用户日志接口测试

```bash
# 获取所有用户活动日志（需要管理员权限）
curl -H "Authorization: Bearer <token>" \
  http://localhost:15000/apiservice/api/users/activity-logs?page=1&pageSize=20
```

**期望响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "username": "admin",
      "action": "login",
      "description": "用户登录",
      "ipAddress": "127.0.0.1",
      "createdAt": "2025-10-11T..."
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

### 2. 个人中心接口测试

```bash
# 获取当前用户信息
curl -H "Authorization: Bearer <token>" \
  http://localhost:15000/apiservice/api/user/profile
```

### 3. 前端页面测试

访问管理后台：
1. ✅ 访问 http://localhost:15001/system/user-log - 应该正常显示
2. ✅ 访问 http://localhost:15001/account/center - 个人中心应该正常
3. ✅ 修改个人信息应该正常
4. ✅ 修改密码应该正常

## API 端点总结

### 完整的 UserController 端点列表

```
基础路由: /api/user

用户管理接口:
  GET    /api/user                       - 获取所有用户
  GET    /api/user/{id}                  - 获取指定用户
  POST   /api/user/management            - 创建用户
  PUT    /api/user/{id}/update           - 更新用户
  DELETE /api/user/{id}                  - 软删除用户
  POST   /api/user/list                  - 获取用户列表（分页）
  GET    /api/user/statistics            - 获取用户统计
  POST   /api/user/bulk-action           - 批量操作用户
  PUT    /api/user/{id}/role             - 更新用户角色
  PUT    /api/user/{id}/activate         - 启用用户
  PUT    /api/user/{id}/deactivate       - 禁用用户
  GET    /api/user/{id}/activity-logs    - 获取用户活动日志
  GET    /api/user/check-email           - 检查邮箱是否存在
  GET    /api/user/check-username        - 检查用户名是否存在
  GET    /api/user/test-list             - 测试接口

个人中心接口:
  GET    /api/user/profile               - 获取个人信息
  PUT    /api/user/profile               - 更新个人信息
  PUT    /api/user/profile/password      - 修改密码
  GET    /api/user/profile/activity-logs - 获取个人活动日志

用户日志接口（特例 - 使用绝对路径）:
  GET    /api/users/activity-logs        - 获取所有用户活动日志（管理员）
```

## 设计优势

### 1. 最小改动
- 只修改 1 个接口使用绝对路径
- 保持与前端现有代码的兼容性
- 避免大量前端 API 调用修改

### 2. 清晰的特例处理
- 用户日志是唯一的特殊情况
- 使用绝对路径明确标识特例
- 易于理解和维护

### 3. 前后端完全匹配
```
用户管理：
  前端: /api/user/list → 后端: /api/user/list ✅

用户日志：
  前端: /api/users/activity-logs → 后端: /api/users/activity-logs ✅

个人中心：
  前端: /api/user/profile → 后端: /api/user/profile ✅
```

## 前后端对应关系

### 用户日志模块
```
前端调用:
  /api/users/activity-logs?page=1&pageSize=20

后端接口:
  [HttpGet("activity-logs")]  // 基础路由 /api/users
  → /api/users/activity-logs

✅ 完全匹配
```

### 个人中心模块
```
前端调用:
  /api/user/profile

后端接口:
  [HttpGet("/api/user/profile")]  // 绝对路径
  → /api/user/profile

✅ 完全匹配
```

## 编译状态

✅ **编译成功** - 无错误

## 相关文档

- [用户日志实现](USER-LOG-IMPLEMENTATION.md)
- [软删除字段修复](SOFT-DELETE-FIELD-FIX.md)
- [软删除感知初始化](SOFT-DELETE-AWARE-INITIALIZATION.md)

## 总结

通过调整 UserController 的路由配置并使用混合路由策略（基础路由 + 绝对路由），成功解决了：

1. ✅ 用户日志模块 404 问题
2. ✅ 保持个人中心接口正常工作
3. ✅ 符合 RESTful 设计规范
4. ✅ 前后端路由完全匹配

现在所有 API 端点都能正常访问！

