# App 端登录流程说明

## 📋 概述

本文档详细说明 App 端用户登录的完整流程，从用户点击"登录"按钮到显示登录结果的每一步。

## 🔄 完整登录流程

### 1. 用户操作阶段

```
用户输入用户名和密码
    ↓
点击"登录"按钮
    ↓
触发 handleLogin() 函数
```

**代码位置**: `Platform.App/app/auth/login.tsx:136`

### 2. 输入验证阶段

```typescript
// 检查必填字段
if (!username.trim() || !password.trim()) {
  showError('输入错误', '请输入用户名和密码');
  return; // 停止登录流程
}

// 检查验证码（如果需要）
if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
  showError('验证码错误', '请输入图形验证码');
  return; // 停止登录流程
}
```

### 3. API 调用阶段

#### 3.1 调用 AuthContext.login()

**代码位置**: `Platform.App/contexts/AuthContext.tsx:77`

```typescript
const login = useCallback(async (credentials: LoginRequest) => {
  await loginAction(credentials, dispatch);
}, []);
```

#### 3.2 执行 loginAction()

**代码位置**: `Platform.App/contexts/authActions.ts:29`

```typescript
export async function loginAction(
  credentials: LoginRequest,
  dispatch: Dispatch<AuthAction>
): Promise<void> {
  // 1. 设置加载状态
  dispatch({ type: 'AUTH_START' });
  
  // 2. 调用 authService.login() 发送登录请求
  const loginResponse = await authService.login(credentials);
  
  // 3. 获取用户信息
  const userResponse = await authService.getCurrentUser();
  
  // 4. 保存认证状态
  dispatch({
    type: 'AUTH_SUCCESS',
    payload: { user, token, refreshToken, tokenExpiresAt }
  });
}
```

#### 3.3 调用 authService.login()

**代码位置**: `Platform.App/services/auth.ts:45`

```typescript
async login(credentials: LoginRequest): Promise<ApiResponse<LoginData>> {
  // 发送 POST 请求到 /login/account
  const response = await apiService.post<ApiResponse<LoginData>>(
    '/login/account', 
    credentials,
    { timeout: 8000, retries: 0 }
  );
  
  // 检查响应是否成功
  if (!response.success) {
    // 提取错误信息
    const errorCode = response.errorCode || 'LOGIN_FAILED';
    const errorMessage = response.errorMessage || '登录失败';
    throw createLoginError(errorCode, errorMessage, response.data);
  }
  
  // 验证必要的数据
  if (!loginData?.token || !loginData.refreshToken) {
    throw createLoginError('LOGIN_FAILED', '登录失败：缺少必要的认证信息');
  }
  
  // 保存 token 到本地存储
  await tokenManager.setTokens(token, refreshToken, expiresAt);
  
  return { success: true, data: loginData };
}
```

#### 3.4 发送 HTTP 请求

**代码位置**: `Platform.App/services/api.ts:224`

```typescript
async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
  return this.requestWithRetry<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }, config);
}
```

**实际请求**:
- **URL**: `{baseURL}/login/account`
- **Method**: `POST`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}` (如果有)
- **Body**: 
  ```json
  {
    "username": "用户输入的用户名",
    "password": "用户输入的密码",
    "autoLogin": true,
    "type": "account",
    "captchaId": "验证码ID（如果需要）",
    "captchaAnswer": "验证码答案（如果需要）"
  }
  ```

### 4. API 响应处理阶段

#### 4.1 成功响应格式

```json
{
  "success": true,
  "data": {
    "token": "JWT访问令牌",
    "refreshToken": "刷新令牌",
    "expiresAt": "2024-01-01T00:00:00Z",
    "type": "account",
    "currentAuthority": "admin"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "traceId": "xxx"
}
```

**处理流程**:
1. ✅ `authService.login()` 检查 `response.success === true`
2. ✅ 验证 `token` 和 `refreshToken` 存在
3. ✅ 保存 token 到本地存储
4. ✅ 返回成功响应

#### 4.2 失败响应格式

```json
{
  "success": false,
  "errorCode": "LOGIN_FAILED",
  "errorMessage": "用户名或密码错误，请检查后重试",
  "data": null
}
```

**处理流程**:
1. ❌ `authService.login()` 检查 `response.success === false`
2. ❌ 提取 `errorCode` 和 `errorMessage`
3. ❌ 抛出 `createLoginError()` 错误对象

### 5. 错误处理阶段

#### 5.1 错误捕获

**代码位置**: `Platform.App/app/auth/login.tsx:226`

```typescript
.catch((error: any) => {
  // 错误被捕获
  handleLoginError(error);
})
```

#### 5.2 错误处理函数

**代码位置**: `Platform.App/app/auth/login.tsx:146`

```typescript
const handleLoginError = useCallback((error: any) => {
  // 1. 提取错误代码和消息
  let errorCode = error.code || error.errorCode;
  let errorMessage = error.message;
  
  // 2. 检查是否需要显示验证码
  if (errorCode && CAPTCHA_ERROR_CODES.includes(errorCode)) {
    enableCaptcha();
  }
  
  // 3. 获取友好的错误消息
  const errorInfo = ERROR_MESSAGES[errorCode] || {
    title: '登录失败',
    message: errorMessage,
  };
  
  // 4. 显示错误提示（Toast + Banner）
  showError(errorInfo.title, errorInfo.message);
}, [enableCaptcha, showError]);
```

#### 5.3 错误提示显示

**双重提示机制**:

1. **ErrorToast** (顶部浮动提示)
   - 位置: 页面顶部，z-index: 9999
   - 自动隐藏: 5秒后自动消失
   - 样式: 红色边框，错误图标

2. **ErrorMessageBanner** (内联错误消息)
   - 位置: 表单顶部
   - 手动关闭: 用户点击 ✕ 按钮关闭
   - 样式: 红色背景，错误文本

### 6. 成功处理阶段

#### 6.1 成功回调

**代码位置**: `Platform.App/app/auth/login.tsx:219`

```typescript
.then(() => {
  // 登录成功
  clearError(); // 清除之前的错误
  showSuccess('登录成功，正在跳转...'); // 显示成功提示
})
```

#### 6.2 成功提示显示

**Toast 成功提示**:
- 位置: 页面顶部，z-index: 9999
- 自动隐藏: 3秒后自动消失
- 样式: 绿色边框，成功图标

#### 6.3 自动跳转

登录成功后，`RouteGuard` 会检测到 `isAuthenticated: true`，自动跳转到主页。

**代码位置**: `Platform.App/app/_layout.tsx`

## 📊 流程图

```
用户点击登录
    ↓
输入验证（用户名、密码、验证码）
    ↓
调用 login() → loginAction() → authService.login()
    ↓
发送 POST /login/account 请求
    ↓
等待 API 响应
    ↓
    ├─→ 成功响应 (success: true)
    │       ↓
    │   验证 token 和 refreshToken
    │       ↓
    │   保存 token 到本地存储
    │       ↓
    │   获取用户信息
    │       ↓
    │   更新认证状态 (AUTH_SUCCESS)
    │       ↓
    │   显示成功提示 ✅
    │       ↓
    │   自动跳转到主页
    │
    └─→ 失败响应 (success: false)
            ↓
        提取错误代码和消息
            ↓
        检查是否需要验证码
            ↓
        显示错误提示 ❌
            ↓
        用户看到错误信息
```

## 🔍 API 响应判断逻辑

### 判断标准

1. **HTTP 状态码检查**
   - `200`: 继续处理响应体
   - `401/403`: 认证错误，直接抛出
   - `其他`: HTTP 错误，抛出错误

2. **响应体 success 字段检查**
   - `success: true`: 登录成功
   - `success: false`: 登录失败，提取 `errorCode` 和 `errorMessage`

3. **数据验证**
   - 检查 `token` 和 `refreshToken` 是否存在
   - 验证数据格式是否正确

## 🎯 关键代码位置

| 功能 | 文件路径 | 行号 |
|------|---------|------|
| 登录按钮处理 | `Platform.App/app/auth/login.tsx` | 136-232 |
| AuthContext login | `Platform.App/contexts/AuthContext.tsx` | 77-79 |
| 登录 Action | `Platform.App/contexts/authActions.ts` | 29-85 |
| 认证服务 | `Platform.App/services/auth.ts` | 45-73 |
| API 服务 | `Platform.App/services/api.ts` | 224-229 |
| 错误处理 | `Platform.App/app/auth/login.tsx` | 146-185 |
| 成功提示 | `Platform.App/app/auth/login.tsx` | 219-225 |

## ✅ 测试要点

1. **成功登录**
   - ✅ 输入正确的用户名和密码
   - ✅ 点击登录按钮
   - ✅ 看到"登录成功，正在跳转..."提示
   - ✅ 自动跳转到主页

2. **失败登录**
   - ✅ 输入错误的用户名或密码
   - ✅ 点击登录按钮
   - ✅ 看到错误提示（Toast + Banner）
   - ✅ 错误消息清晰明确

3. **验证码流程**
   - ✅ 登录失败后显示验证码
   - ✅ 输入验证码后重试登录
   - ✅ 验证码错误时显示错误提示

4. **网络错误**
   - ✅ 断网情况下点击登录
   - ✅ 看到网络错误提示
   - ✅ 提示可重试

## 📝 注意事项

1. **Token 保存**: 登录成功后，token 会自动保存到本地存储
2. **自动跳转**: 登录成功后，`RouteGuard` 会自动检测并跳转
3. **错误提示**: 使用双重提示机制，确保用户能看到错误信息
4. **验证码**: 登录失败后可能需要输入验证码
5. **超时处理**: 登录请求有 30 秒超时保护

## 🔗 相关文档

- [认证系统架构说明](../Platform.App/docs/AUTH-ARCHITECTURE.md)
- [API 集成规范](../../.cursor/rules/api-integration.mdc)
- [错误处理规范](../../.cursor/rules/error-handling.mdc)

