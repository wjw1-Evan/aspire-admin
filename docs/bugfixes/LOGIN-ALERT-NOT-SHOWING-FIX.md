# 登录错误提示未显示问题修复

## 🐛 问题描述

用户在实际使用登录功能时，当 API 返回错误（如 `CAPTCHA_REQUIRED`、`LOGIN_FAILED`）时，Alert 提示未能正确弹出。

## 🔍 问题排查

### 1. 后端响应格式

后端 `AuthController.Login` 方法返回 `Ok(result)`，这意味着即使 `result.success = false`，HTTP 状态码也是 200。

**后端响应示例**：
```json
{
    "success": false,
    "errorCode": "CAPTCHA_REQUIRED",
    "errorMessage": "登录失败后需要输入验证码，请先获取验证码",
    "timestamp": "2025-11-15T06:43:51.254Z"
}
```

### 2. 前端错误处理流程

1. `apiService.post` 收到 HTTP 200 响应，调用 `parseSuccessResponse` 解析 JSON
2. `auth.ts` 检查 `response.success`，如果不成功会抛出错误
3. `login.tsx` 捕获错误，提取错误代码和消息
4. 调用 `Alert.alert` 显示提示

### 3. 可能的问题点

- 错误代码和消息可能没有正确传递
- Alert 可能在某些情况下没有正确显示
- setTimeout 可能导致 Alert 延迟或丢失

## ✅ 解决方案

### 1. 优化错误对象创建 (`Platform.App/services/auth.ts`)

**主要改动**：
- 添加详细的调试日志，记录响应和错误对象
- 确保错误代码和消息正确设置
- 保存完整的响应数据到 `error.response.data`

**关键代码**：
```typescript
console.log('[AuthService] 登录响应 - success:', response.success, 'errorCode:', response.errorCode, 'errorMessage:', response.errorMessage);

if (!response.success || !loginData?.token || !loginData.refreshToken) {
  const errorMessage = response.errorMessage || getErrorMessage(response.errorCode, '登录失败');
  const error = new Error(errorMessage) as any;
  
  // 确保 errorCode 正确设置
  if (response.errorCode) {
    error.errorCode = response.errorCode;
    error.code = response.errorCode;
  } else {
    error.errorCode = 'LOGIN_FAILED';
    error.code = 'LOGIN_FAILED';
  }
  
  // 保存完整的响应数据
  error.response = {
    status: 200,
    statusText: 'OK',
    data: {
      success: response.success,
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
      data: loginData,
    },
  };
  
  throw error;
}
```

### 2. 优化 Alert 显示逻辑 (`Platform.App/app/auth/login.tsx`)

**主要改动**：
- 移除 setTimeout，直接调用 Alert.alert
- 添加详细的调试日志，记录 Alert 的标题、消息和按钮
- 添加 try-catch 错误处理，确保 Alert 失败时不会崩溃
- 确保 Alert 参数不为空

**关键代码**：
```typescript
// 使用 Expo 原生 Alert 组件提示所有错误
const alertTitle = getAlertTitle(errorCode, authError.type);
const alertMessage = errorCode === 'CAPTCHA_REQUIRED'
  ? '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试'
  : (errorMessage || getDefaultErrorMessage(authError.type, errorCode));

console.log('[LoginScreen] ========== 准备显示 Alert ==========');
console.log('[LoginScreen] 错误代码:', errorCode);
console.log('[LoginScreen] Alert 标题:', alertTitle);
console.log('[LoginScreen] Alert 消息:', alertMessage);

// 直接显示 Alert，不使用 setTimeout
try {
  Alert.alert(
    alertTitle || '操作失败',
    alertMessage || '发生未知错误',
    alertButtons.length > 0 ? alertButtons : [{ text: '确定', style: 'default' }],
    { cancelable: true }
  );
} catch (alertError) {
  console.error('[LoginScreen] ❌ Alert 显示失败:', alertError);
}
```

## 🔍 调试步骤

### 1. 检查控制台日志

当登录失败时，应该看到以下日志：

```
[AuthService] 登录响应 - success: false, errorCode: CAPTCHA_REQUIRED, errorMessage: ...
[AuthService] 登录失败，创建错误对象:
[AuthService] - errorCode: CAPTCHA_REQUIRED, error.code: CAPTCHA_REQUIRED
[AuthService] - errorMessage: ...
[LoginScreen] 登录失败，错误对象: ...
[LoginScreen] 错误代码: CAPTCHA_REQUIRED, 错误消息: ...
[LoginScreen] ========== 准备显示 Alert ==========
[LoginScreen] Alert 标题: 需要验证码
[LoginScreen] Alert 消息: 登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试
[LoginScreen] 调用 Alert.alert...
[LoginScreen] ✅ Alert.alert 调用成功
```

### 2. 验证错误代码传递

检查以下字段是否都有值：
- `error.code` 或 `error.errorCode`
- `error.message` 或 `error.errorMessage`
- `error.response.data.errorCode`
- `error.response.data.errorMessage`

### 3. 验证 Alert 显示

- 检查是否有 `Alert.alert 调用成功` 的日志
- 如果没有，检查是否有 `Alert 显示失败` 的错误日志
- 在 React Native 中，Alert 应该在主线程上显示

## 🧪 测试场景

### 场景 1: 用户名密码错误

1. 输入错误的用户名或密码
2. 点击登录
3. **预期**：显示 Alert "登录失败" / "用户名或密码错误，请检查后重试"
4. **预期**：验证码组件自动显示

### 场景 2: CAPTCHA_REQUIRED 错误

1. 第一次登录失败（用户名密码错误）
2. 再次尝试登录（不输入验证码）
3. **预期**：显示 Alert "需要验证码" / "登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试"
4. **预期**：验证码组件显示

### 场景 3: 验证码错误

1. 输入错误的验证码
2. 点击登录
3. **预期**：显示 Alert "验证码错误" / "验证码错误，请重新输入验证码"
4. **预期**：显示重试按钮

## 📝 相关文件

- `Platform.App/app/auth/login.tsx` - 登录页面（Alert 显示逻辑）
- `Platform.App/services/auth.ts` - 认证服务（错误对象创建）
- `Platform.App/services/api.ts` - API 服务（响应解析）
- `Platform.ApiService/Controllers/AuthController.cs` - 认证控制器（响应格式）
- `Platform.ApiService/Services/AuthService.cs` - 认证服务（错误返回）

## 📅 更新日期

2024-12-19

