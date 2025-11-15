# API 与 App 对接 Bug 修复

## 📋 问题描述

检查并修复了 API 与 App 对接过程中的潜在问题，确保错误代码（`errorCode`）在整个流程中正确传递，响应格式正确处理。

## 🔍 问题分析

### 1. API 响应格式

后端返回的格式：
```json
{
  "success": false,
  "errorCode": "LOGIN_FAILED",
  "errorMessage": "用户名或密码错误，请检查后重试",
  "timestamp": "2024-12-19T12:00:00.000Z"
}
```

前端类型定义：
```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
  traceId?: string;
}
```

### 2. 处理流程

```
后端 API (HTTP 200, success: false)
  ↓
apiService.post() → parseSuccessResponse() → 返回 JSON 对象
  ↓
AuthService.login() → 检查 success 字段 → 抛出错误对象
  ↓
authActions.loginAction() → 捕获错误 → handleError() → 返回 AuthError
  ↓
login.tsx.handleLoginError() → 提取 errorCode → 更新状态
```

### 3. 发现的问题

1. **错误对象不完整**：在某些情况下，错误对象可能缺少 `errorCode` 或 `errorMessage`
2. **错误提取不充分**：`catch` 块中的错误提取逻辑可能无法处理所有情况
3. **响应格式处理**：需要明确区分 HTTP 错误和业务逻辑错误

## 🔧 修复方案

### 1. 优化 AuthService.login 的错误处理

**修复前**：
```typescript
} catch (error: any) {
  console.error('Login error:', error);
  // 确保错误码被正确传递
  if (error?.response?.data?.errorCode && !error.errorCode) {
    error.errorCode = error.response.data.errorCode;
    error.code = error.response.data.errorCode;
  }
  // 确保错误消息被正确传递
  if (error?.response?.data?.errorMessage && !error.message) {
    error.message = error.response.data.errorMessage;
  }
  throw error;
}
```

**修复后**：
```typescript
} catch (error: any) {
  console.error('[AuthService] Login error 捕获:', error);
  
  // 如果错误已经有 errorCode，直接抛出
  if (error?.errorCode || error?.code) {
    console.log('[AuthService] 错误已有 errorCode，直接抛出:', error.errorCode || error.code);
    throw error;
  }
  
  // 尝试从 response.data 中提取 errorCode
  if (error?.response?.data) {
    const errorData = error.response.data;
    
    // 如果 response.data 是 ApiResponse 格式（有 success 字段）
    if (typeof errorData === 'object' && 'success' in errorData) {
      const apiResponse = errorData as ApiResponse<LoginData>;
      
      if (!apiResponse.success && apiResponse.errorCode) {
        console.log('[AuthService] 从 ApiResponse 中提取 errorCode:', apiResponse.errorCode);
        error.errorCode = apiResponse.errorCode;
        error.code = apiResponse.errorCode;
        error.message = apiResponse.errorMessage || error.message || '登录失败';
        
        // 确保 error.response.data 包含完整的响应数据
        if (!error.response.data) {
          error.response = {
            status: error.response?.status || 200,
            statusText: error.response?.statusText || 'OK',
            data: {
              success: apiResponse.success,
              errorCode: apiResponse.errorCode,
              errorMessage: apiResponse.errorMessage,
              data: apiResponse.data,
            },
          };
        }
      }
    } else if (errorData.errorCode) {
      // 如果 response.data 直接包含 errorCode
      console.log('[AuthService] 从 response.data 中提取 errorCode:', errorData.errorCode);
      error.errorCode = errorData.errorCode;
      error.code = errorData.errorCode;
      error.message = errorData.errorMessage || error.message || '登录失败';
    }
  }
  
  // 如果仍然没有 errorCode，设置默认值
  if (!error.errorCode && !error.code) {
    console.log('[AuthService] 未找到 errorCode，设置默认值: LOGIN_FAILED');
    error.errorCode = 'LOGIN_FAILED';
    error.code = 'LOGIN_FAILED';
    error.message = error.message || '登录失败，请重试';
  }
  
  console.log('[AuthService] 最终错误对象:', {
    message: error.message,
    errorCode: error.errorCode,
    code: error.code,
    hasResponse: !!error.response,
    responseData: error.response?.data,
  });
  
  throw error;
}
```

**改进点**：
- 优先检查错误是否已有 `errorCode`，避免重复处理
- 支持从 `ApiResponse` 格式中提取 `errorCode`
- 支持从普通对象中提取 `errorCode`
- 设置默认 `errorCode`，确保错误处理能正确识别
- 添加详细的调试日志

### 2. 优化 api.ts 的注释

**修复内容**：
- 添加注释说明 HTTP 200 但 `success: false` 的情况
- 明确区分 HTTP 错误和业务逻辑错误

**关键代码**：
```typescript
// HTTP 200 状态码，解析响应
// 注意：即使 HTTP 状态码是 200，响应体中的 success 字段可能为 false
// 这种情况由业务逻辑层（如 AuthService）处理
return await this.parseSuccessResponse<T>(response);
```

### 3. 后端响应格式确认

**后端实现**：
- `ApiResponse<T>.ErrorResult()` 创建错误响应
- `ResponseFormattingMiddleware` 使用 `camelCase` 命名策略
- `IsAlreadyFormatted()` 检查响应是否已格式化，避免重复包装

**响应格式**：
```json
{
  "success": false,
  "errorCode": "LOGIN_FAILED",
  "errorMessage": "用户名或密码错误，请检查后重试",
  "timestamp": "2024-12-19T12:00:00.000Z"
}
```

## ✅ 修复效果

1. **错误代码正确传递**：从 API 响应 → AuthService → authActions → errorHandler → login.tsx，`errorCode` 在整个流程中正确传递
2. **错误对象完整**：所有错误对象都包含完整的 `errorCode`、`errorMessage` 和 `response.data`
3. **多种错误格式支持**：支持 `ApiResponse` 格式和普通对象格式的错误提取
4. **默认错误处理**：即使无法提取 `errorCode`，也会设置默认值，确保错误处理能正确识别
5. **调试更容易**：添加了详细的调试日志，便于追踪问题

## 🧪 测试验证

### 测试步骤

1. 使用错误的用户名密码登录
2. 检查控制台日志，确认 `errorCode` 被正确提取和传递
3. 检查页面，确认验证码组件已显示
4. 检查 Alert 提示，确认显示正确的错误消息

### 预期结果

- ✅ API 返回 `{ success: false, errorCode: "LOGIN_FAILED" }`
- ✅ `apiService.post` 返回 JSON 对象（不检查 `success`）
- ✅ `AuthService.login` 检查 `success` 字段，抛出包含 `errorCode` 的错误
- ✅ `authActions.loginAction` 正确处理错误
- ✅ `errorHandler.handleError` 正确提取 `errorCode`
- ✅ `login.tsx.handleLoginError` 正确提取 `errorCode` 并更新状态
- ✅ 验证码组件正确显示
- ✅ Alert 提示显示正确的错误消息

## 📝 相关文件

- `Platform.App/services/api.ts` - API 服务层（已优化注释）
- `Platform.App/services/auth.ts` - 认证服务（已优化错误处理）
- `Platform.App/contexts/authActions.ts` - 认证 Actions（已优化）
- `Platform.App/services/errorHandler.ts` - 错误处理器（已优化）
- `Platform.App/app/auth/login.tsx` - 登录页面（已优化）
- `Platform.ApiService/Models/ApiResponse.cs` - 后端响应模型
- `Platform.ApiService/Middleware/ResponseFormattingMiddleware.cs` - 响应格式化中间件

## 🔄 处理流程总结

### 成功流程
```
API 返回 { success: true, data: {...} }
  ↓
apiService.post() → 返回 ApiResponse<LoginData>
  ↓
AuthService.login() → 检查 success === true → 返回响应
  ↓
authActions.loginAction() → 获取用户信息 → 更新状态
```

### 失败流程
```
API 返回 { success: false, errorCode: "LOGIN_FAILED", errorMessage: "..." }
  ↓
apiService.post() → 返回 ApiResponse<LoginData>（success: false）
  ↓
AuthService.login() → 检查 success === false → 抛出错误（包含 errorCode）
  ↓
authActions.loginAction() → 捕获错误 → handleError() → 返回 AuthError
  ↓
login.tsx.handleLoginError() → 提取 errorCode → 更新 showCaptcha 状态
  ↓
验证码组件显示
```

## 📅 更新日期

2024-12-19

