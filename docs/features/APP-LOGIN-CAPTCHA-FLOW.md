# App 端登录验证码流程优化

## 📋 概述

优化了 App 端用户登录验证流程，实现了当 API 返回用户名密码错误时，自动显示图形验证码并要求用户输入验证码的功能。

## 🎯 功能需求

用户输入用户名密码点击登录后提交到 API 端，如果 API 端返回用户名密码错误则：
1. 提示用户错误信息
2. 在登录界面显示验证码并要求输入验证码

**重要**：
- 当 API 返回 `CAPTCHA_REQUIRED` 错误时（表示之前登录失败，需要验证码），页面必须确保验证码组件正确显示并获取验证码
- 使用友好的 Alert 提示，明确告知用户需要在下方的验证码输入框中输入验证码

## 🔧 实现方案

### 1. 登录错误处理优化

**文件**: `Platform.App/app/auth/login.tsx`

**主要改动**:
- 当收到 `LOGIN_FAILED`、`CAPTCHA_INVALID` 或 `CAPTCHA_REQUIRED` 错误码时，立即显示验证码组件
- 清空之前的验证码答案，让用户重新输入
- **所有错误都使用 Expo 原生 Alert 组件提示**，提供更好的原生体验
- 移除了 `EnhancedErrorToast` 组件，统一使用原生 Alert
- 使用 `useEffect` 监听 `showCaptcha` 变化，确保验证码组件正确初始化并获取验证码

**关键代码**:

辅助函数（用于生成 Alert 的标题、消息和按钮）:
```typescript
// 获取 Alert 标题
function getAlertTitle(errorCode?: string, errorType?: AuthErrorType): string {
  if (errorCode === 'LOGIN_FAILED') return '登录失败';
  if (errorCode === 'CAPTCHA_REQUIRED') return '需要验证码';
  if (errorCode === 'CAPTCHA_INVALID') return '验证码错误';
  if (errorType === AuthErrorType.NETWORK_ERROR) return '网络连接异常';
  if (errorType === AuthErrorType.TOKEN_EXPIRED) return '登录已过期';
  return '操作失败';
}

// 获取默认错误消息
function getDefaultErrorMessage(errorType: AuthErrorType, errorCode?: string): string {
  // 优先根据错误代码返回消息
  if (errorCode === 'CAPTCHA_REQUIRED') {
    return '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试';
  }
  if (errorCode === 'CAPTCHA_INVALID') {
    return '验证码错误，请重新输入验证码';
  }
  
  // 根据错误类型返回默认消息
  switch (errorType) {
    case AuthErrorType.NETWORK_ERROR: return '网络连接失败，请检查网络设置';
    case AuthErrorType.TOKEN_EXPIRED: return '登录已过期，请重新登录';
    case AuthErrorType.LOGIN_FAILED: return '用户名或密码错误，请检查后重试';
    default: return '操作失败，请稍后重试';
  }
}

// 获取 Alert 按钮（可重试的错误会显示重试按钮）
function getAlertButtons(errorType: AuthErrorType, errorCode?: string, onRetry?: () => void) {
  const buttons = [];
  if (errorType === AuthErrorType.NETWORK_ERROR || errorCode === 'CAPTCHA_INVALID') {
    buttons.push({ text: '重试', style: 'default', onPress: onRetry });
  }
  buttons.push({ text: '确定', style: 'default' });
  return buttons;
}
```

监听验证码显示状态:
```typescript
// 监听 showCaptcha 的变化，确保验证码组件正确初始化
useEffect(() => {
  if (showCaptcha) {
    // 当验证码显示时，确保验证码组件能够正确获取验证码
    setTimeout(() => {
      if (captchaRef.current) {
        void captchaRef.current.refresh().catch(err => {
          console.error('[LoginScreen] 验证码刷新失败:', err);
        });
      }
    }, 200);
  }
}, [showCaptcha, captchaKey]);

// 当收到错误时，立即显示验证码
if (errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED') {
  const newKey = captchaKey + 1;
  setCaptchaKey(newKey);
  setShowCaptcha(true);
  // 清空之前的验证码答案，让用户重新输入
  setCaptchaAnswer('');
  setCaptchaId('');
}

// 使用 Expo 原生 Alert 组件提示所有错误
const alertTitle = getAlertTitle(errorCode, authError.type);
// 对于 CAPTCHA_REQUIRED，使用更友好的提示消息，明确告知用户需要输入验证码
const alertMessage = errorCode === 'CAPTCHA_REQUIRED'
  ? '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试'
  : (errorMessage || getDefaultErrorMessage(authError.type, errorCode));

// 根据错误类型决定按钮（可重试的错误会显示重试按钮）
const alertButtons = getAlertButtons(authError.type, errorCode, () => {
  handleLogin(); // 重试登录
});

Alert.alert(
  alertTitle,
  alertMessage,
  alertButtons,
  { cancelable: true }
);
```

### 2. 验证码必填验证

**文件**: `Platform.App/app/auth/login.tsx`

**主要改动**:
- 添加验证码必填验证，当显示验证码时必须输入验证码才能登录

**关键代码**:
```typescript
// 如果显示了验证码，必须输入验证码
if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
  setError({
    type: AuthErrorType.LOGIN_FAILED,
    message: '请输入图形验证码',
    retryable: false,
  });
  setShowError(true);
  return;
}
```

### 3. 错误代码传递优化

**文件**: `Platform.App/services/auth.ts` 和 `Platform.App/app/auth/login.tsx`

**主要改动**:
- 确保错误代码和错误消息能正确传递到登录页面
- 从多个可能的字段中提取错误信息（`error.code`、`error.errorCode`、`error.response.data.errorCode`）
- 优化错误对象创建，确保 `errorCode` 和 `errorMessage` 都能正确传递

**关键代码** (`auth.ts`):
```typescript
if (!response.success || !loginData?.token || !loginData.refreshToken) {
  const errorMessage = response.errorMessage || getErrorMessage(response.errorCode, '登录失败');
  const error = new Error(errorMessage) as any;
  
  // 保存 errorCode，确保 errorHandler 可以访问
  if (response.errorCode) {
    error.errorCode = response.errorCode;
    error.code = response.errorCode;
  }
  
  // 保存完整的响应数据，以便后续处理
  error.response = {
    data: {
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
    },
  };
  
  throw error;
}
```

**关键代码** (`login.tsx`):
```typescript
// 从多个可能的字段中提取错误代码和消息
const errorCode = error?.code || error?.errorCode || error?.info?.errorCode || error?.response?.data?.errorCode;
const errorMessage = error?.message || error?.errorMessage || error?.response?.data?.errorMessage || '用户名或密码错误';

// 创建 AuthError 对象，确保 code 字段正确设置
authError = {
  type: AuthErrorType.LOGIN_FAILED,
  message: errorMessage,
  code: errorCode, // 确保错误代码被正确设置
  retryable: true,
};
```

## 🔄 登录流程

### 正常流程
1. 用户输入用户名和密码
2. 点击登录按钮
3. 提交到 API 端
4. 登录成功，跳转到主页

### 错误流程（用户名密码错误）
1. 用户输入用户名和密码
2. 点击登录按钮
3. 提交到 API 端
4. API 返回 `LOGIN_FAILED` 错误码
5. **前端显示错误提示**
6. **前端自动显示验证码组件**
7. 用户输入验证码
8. 再次点击登录按钮
9. 提交用户名、密码和验证码到 API 端
10. 登录成功或继续显示错误

## 📊 API 端错误码

API 端在登录失败时会返回以下错误码：

- `LOGIN_FAILED`: 用户名或密码错误
- `CAPTCHA_REQUIRED`: 需要输入验证码（失败后需要验证码）
- `CAPTCHA_INVALID`: 验证码错误

## 🎨 UI 交互

1. **初始状态**: 登录页面不显示验证码
2. **错误后**: 登录失败后自动显示验证码组件
3. **验证码组件**: 
   - 显示图形验证码图片
   - 提供输入框让用户输入验证码
   - 支持点击图片刷新验证码
4. **再次登录**: 用户输入验证码后可以再次尝试登录

## ✅ 验证清单

- [x] 当 API 返回 `LOGIN_FAILED` 时，自动显示验证码
- [x] 错误提示正确显示
- [x] 验证码组件正确显示和刷新
- [x] 验证码必填验证
- [x] 错误代码正确传递
- [x] 登录成功后清除验证码状态

## 📝 相关文件

- `Platform.App/app/auth/login.tsx` - 登录页面组件
- `Platform.App/services/auth.ts` - 认证服务
- `Platform.App/components/ImageCaptcha.tsx` - 图形验证码组件
- `Platform.App/services/errorHandler.ts` - 错误处理
- `Platform.ApiService/Services/AuthService.cs` - API 端认证服务

## 🔍 测试建议

1. **测试正常登录**: 输入正确的用户名和密码，应该能正常登录
2. **测试错误登录**: 输入错误的用户名或密码，应该显示错误提示和验证码
3. **测试验证码刷新**: 点击验证码图片，应该能刷新验证码
4. **测试验证码必填**: 显示验证码后不输入验证码直接登录，应该提示输入验证码
5. **测试验证码错误**: 输入错误的验证码，应该显示错误提示

## 📅 更新日期

2024-12-19

