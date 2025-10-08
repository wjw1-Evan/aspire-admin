# 统一 API 对接标准

## 📋 概述

本文档定义了 Admin、API、App 三端的统一 API 对接标准，确保简洁通用、类型安全、错误处理一致。

## 🎯 核心原则

1. **统一响应格式** - 所有接口使用相同的响应结构
2. **类型安全** - 前后端类型定义完全匹配
3. **错误处理统一** - 标准化的错误代码和消息
4. **简洁通用** - 最小化配置，最大化复用

## 📡 统一响应格式

### 标准响应结构

```typescript
interface UnifiedApiResponse<T = any> {
  success: boolean;        // 操作是否成功
  data?: T;               // 响应数据
  errorCode?: string;     // 错误代码
  errorMessage?: string;  // 错误消息
  timestamp: string;      // 响应时间戳 (ISO 8601)
  traceId?: string;       // 请求追踪ID
}
```

### 成功响应示例

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "用户名称"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "traceId": "req-123456"
}
```

### 错误响应示例

```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "errorMessage": "用户名不能为空",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "traceId": "req-123456"
}
```

## 🔐 认证标准

### Token 格式
- **访问令牌**: `Bearer <jwt_token>`
- **刷新令牌**: 存储在本地，用于自动刷新访问令牌

### 认证流程
1. 登录获取 `token` 和 `refreshToken`
2. 请求时自动添加 `Authorization: Bearer <token>`
3. 401 错误时自动尝试刷新令牌
4. 刷新失败时清除令牌并跳转登录

## 📝 标准错误代码

| 错误代码 | 说明 | HTTP 状态码 |
|---------|------|------------|
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `UNAUTHORIZED` | 未授权访问 | 401 |
| `FORBIDDEN` | 权限不足 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `LOGIN_FAILED` | 登录失败 | 400 |
| `TOKEN_EXPIRED` | 令牌过期 | 401 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 | 500 |

## 🔄 标准接口列表

### 认证接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 登录 | POST | `/api/login/account` | 用户登录 |
| 登出 | POST | `/api/login/outLogin` | 用户登出 |
| 获取当前用户 | GET | `/api/currentUser` | 获取当前用户信息 |
| 注册 | POST | `/api/register` | 用户注册 |
| 修改密码 | POST | `/api/change-password` | 修改密码 |
| 刷新令牌 | POST | `/api/refresh-token` | 刷新访问令牌 |

### 用户管理接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取用户列表 | POST | `/api/user/list` | 分页获取用户列表 |
| 创建用户 | POST | `/api/user/management` | 创建新用户 |
| 更新用户 | PUT | `/api/user/{id}/update` | 更新用户信息 |
| 删除用户 | DELETE | `/api/user/{id}` | 删除用户 |
| 获取用户详情 | GET | `/api/user/{id}` | 获取用户详情 |

## 🛠️ 实现指南

### 后端实现

```csharp
// 使用统一响应格式
public class UnifiedApiResponse<T>
{
    public bool success { get; set; }
    public T? data { get; set; }
    public string? errorCode { get; set; }
    public string? errorMessage { get; set; }
    public string timestamp { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    public string? traceId { get; set; }
    
    // 静态工厂方法
    public static UnifiedApiResponse<T> SuccessResult(T data, string? traceId = null);
    public static UnifiedApiResponse<T> ErrorResult(string errorCode, string errorMessage, string? traceId = null);
    public static UnifiedApiResponse<T> ValidationErrorResult(string errorMessage, string? traceId = null);
    public static UnifiedApiResponse<T> UnauthorizedResult(string errorMessage = "未授权访问", string? traceId = null);
    public static UnifiedApiResponse<T> NotFoundResult(string errorMessage = "资源未找到", string? traceId = null);
    public static UnifiedApiResponse<T> ServerErrorResult(string errorMessage = "服务器内部错误", string? traceId = null);
}

// 控制器使用示例
[HttpPost("login/account")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    var result = await _authService.LoginAsync(request);
    return Ok(result);
}
```

### 前端实现

```typescript
// 统一类型定义
interface UnifiedApiResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  traceId?: string;
}

// API 服务基类
class BaseApiService {
  protected async request<T>(url: string, options?: RequestInit): Promise<UnifiedApiResponse<T>> {
    // 统一的请求处理逻辑
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
        ...options?.headers,
      },
      ...options,
    });
    
    return response.json();
  }
  
  protected getAuthHeader(): string {
    const token = this.getToken();
    return token ? `Bearer ${token}` : '';
  }
}
```

## 🔧 配置要求

### 开发环境
- **Admin**: `http://localhost:8000` → 代理到 `http://localhost:15000`
- **API**: `http://localhost:15000` (Aspire 网关)
- **App**: `http://localhost:15002` → 直连 `http://localhost:15000`

### 生产环境
- 所有端都指向统一的 API 网关地址
- 启用 HTTPS
- 配置正确的 CORS 策略

## ✅ 验收标准

1. **响应格式统一** - 所有接口返回相同格式
2. **类型安全** - 前后端类型定义完全匹配
3. **错误处理一致** - 统一的错误代码和消息
4. **认证流程统一** - 相同的 token 处理逻辑
5. **代码复用** - 最小化重复代码

## 📚 相关文档

- [认证系统架构说明](Platform.App/AUTH-ARCHITECTURE.md)
- [认证系统统一总结](Platform.App/AUTH-SYNC-SUMMARY.md)
- [认证系统使用指南](Platform.App/README-AUTH.md)
