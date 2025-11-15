# CAPTCHA_REQUIRED 错误时验证码组件未显示问题修复

## 📋 问题描述

当 API 返回 `CAPTCHA_REQUIRED` 错误时，登录页面应该显示验证码组件，但实际未显示。

## 🔍 问题分析

### 1. 错误代码提取问题

在 `login.tsx` 的 `handleLoginError` 函数中，错误代码的提取可能不完整。`AuthContext` 的 `loginAction` 会调用 `handleError` 处理错误，返回的 `AuthError` 对象有 `code` 字段，但原始错误对象可能有 `errorCode` 或 `response.data.errorCode`。

### 2. 错误类型映射缺失

`errorHandler.ts` 中的 `getErrorType` 函数没有为 `CAPTCHA_REQUIRED` 和 `CAPTCHA_INVALID` 错误代码返回正确的错误类型，导致这些错误被归类为 `UNKNOWN_ERROR`。

### 3. 错误代码提取不完整

`handleError` 函数只检查 `error?.errorCode`，没有检查 `error?.code`，可能导致错误代码丢失。

## 🔧 修复方案

### 1. 更新 `errorHandler.ts`

#### 添加错误类型映射

```typescript
export function getErrorType(errorCode?: string): AuthErrorType {
  const errorTypeMap: Record<string, AuthErrorType> = {
    // ... 其他错误类型
    CAPTCHA_REQUIRED: AuthErrorType.LOGIN_FAILED, // 需要验证码，属于登录失败
    CAPTCHA_INVALID: AuthErrorType.LOGIN_FAILED, // 验证码错误，属于登录失败
  };
  // ...
}
```

#### 改进错误代码提取

```typescript
export function handleError(error: any): AuthError {
  // 提取错误代码（尝试多个可能的字段）
  const errorCode = error?.code || error?.errorCode || error?.response?.data?.errorCode;
  
  // ... 处理逻辑
}
```

### 2. 更新 `authActions.ts`

#### 修复错误代码丢失问题

在 `loginAction` 中，当 `loginResponse.success` 为 false 时，代码会抛出一个新的 `Error` 对象，但没有保留 `errorCode`。修复后：

```typescript
if (!loginResponse.success || !loginResponse.data) {
  // 保留 errorCode，确保错误处理能正确识别错误类型
  const error = new Error(loginResponse.errorMessage || '登录失败') as any;
  if (loginResponse.errorCode) {
    error.errorCode = loginResponse.errorCode;
    error.code = loginResponse.errorCode;
  }
  throw error;
}
```

### 3. 更新 `login.tsx`

#### 改进错误代码提取和错误提示

```typescript
const handleLoginError = (error: any) => {
  // 提取错误代码，尝试多个可能的字段
  const errorCode = error?.code || error?.errorCode || error?.response?.data?.errorCode;
  
  // 提取错误消息，优先使用后端返回的消息
  const errorMessage = 
    error?.response?.data?.errorMessage || 
    error?.errorMessage || 
    error?.message || 
    '登录失败，请重试';
  
  // 需要显示验证码的错误
  const needsCaptcha = errorCode && ['LOGIN_FAILED', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED'].includes(errorCode);
  
  if (needsCaptcha) {
    setShowCaptcha(true);
    setCaptchaKey(prev => prev + 1);
    setCaptchaAnswer('');
    setCaptchaId('');
  }
  
  // 根据错误代码显示不同的提示
  let title: string;
  let message: string;
  
  if (errorCode === 'CAPTCHA_REQUIRED') {
    title = '需要验证码';
    message = '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试';
  } else if (errorCode === 'CAPTCHA_INVALID') {
    title = '验证码错误';
    message = '验证码错误，请重新输入验证码';
  } else if (errorCode === 'LOGIN_FAILED') {
    title = '登录失败';
    message = errorMessage || '用户名或密码错误，请检查后重试';
  } else {
    title = '登录失败';
    message = errorMessage;
  }
  
  showError(title, message, onRetry);
};
```

## ✅ 修复效果

1. **错误代码正确提取** - 从多个可能的字段中提取错误代码，确保 `CAPTCHA_REQUIRED` 能被正确识别
2. **错误类型正确映射** - `CAPTCHA_REQUIRED` 和 `CAPTCHA_INVALID` 被正确映射到 `LOGIN_FAILED` 类型
3. **验证码正确显示** - 当 API 返回 `CAPTCHA_REQUIRED` 错误时，验证码组件会正确显示

## 🧪 测试验证

### 测试步骤

1. 使用错误的用户名密码登录
2. 等待 API 返回 `CAPTCHA_REQUIRED` 错误
3. 检查控制台日志，确认 `errorCode` 被正确提取
4. 检查页面，确认验证码组件已显示

### 预期结果

- ✅ 控制台显示 `errorCode: 'CAPTCHA_REQUIRED'`
- ✅ 控制台显示 `needsCaptcha: true`
- ✅ 页面显示验证码组件
- ✅ 显示 "需要验证码" 的 Alert 提示

## 📝 相关文件

- `Platform.App/app/auth/login.tsx` - 登录页面
- `Platform.App/services/errorHandler.ts` - 错误处理器
- `Platform.App/services/auth.ts` - 认证服务
- `Platform.App/contexts/authActions.ts` - 认证 Actions（修复了错误代码丢失问题）

## 📅 更新日期

2024-12-19

