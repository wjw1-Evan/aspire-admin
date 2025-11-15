# 登录页面代码简化重构

## 📋 概述

重新开发登录页面，大幅简化代码结构，提高可维护性和可读性。

## 🎯 重构目标

1. **简化代码结构** - 减少代码行数，提高可读性
2. **统一错误处理** - 合并错误处理逻辑，减少重复代码
3. **简化状态管理** - 移除不必要的状态和复杂逻辑
4. **保持功能完整性** - 确保所有功能正常工作

## 🔧 主要改动

### 1. 移除辅助函数

**重构前**：
- `getAlertTitle()` - 获取 Alert 标题
- `getDefaultErrorMessage()` - 获取默认错误消息
- `getAlertButtons()` - 获取 Alert 按钮

**重构后**：
- 合并到 `handleLoginError()` 函数中，统一处理

### 2. 简化错误处理

**重构前**：
- 复杂的错误对象创建和转换
- 多个字段提取错误代码和消息
- 大量的调试日志

**重构后**：
- 统一的 `handleLoginError()` 函数
- 简化的错误代码和消息提取
- 统一的 `showError()` 函数显示 Alert

**关键代码**：
```typescript
// 显示错误提示
const showError = (title: string, message: string, onRetry?: () => void) => {
  const buttons = onRetry
    ? [{ text: '重试', onPress: onRetry }, { text: '确定' }]
    : [{ text: '确定' }];
  
  Alert.alert(title, message, buttons, { cancelable: true });
};

// 处理登录错误
const handleLoginError = (error: any) => {
  const errorCode = error?.code || error?.errorCode || error?.response?.data?.errorCode;
  const errorMessage = error?.message || error?.errorMessage || error?.response?.data?.errorMessage || '登录失败，请重试';

  // 需要显示验证码的错误
  const needsCaptcha = ['LOGIN_FAILED', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED'].includes(errorCode);
  if (needsCaptcha && !showCaptcha) {
    setShowCaptcha(true);
    setCaptchaKey(prev => prev + 1);
    setCaptchaAnswer('');
    setCaptchaId('');
  }

  // 显示错误提示
  let title = '登录失败';
  let message = errorMessage;
  
  if (errorCode === 'CAPTCHA_REQUIRED') {
    title = '需要验证码';
    message = '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试';
  } else if (errorCode === 'CAPTCHA_INVALID') {
    title = '验证码错误';
    message = '验证码错误，请重新输入验证码';
  }

  const onRetry = errorCode === 'CAPTCHA_INVALID' ? () => handleLogin() : undefined;
  showError(title, message, onRetry);
};
```

### 3. 移除复杂的 useEffect

**重构前**：
- 使用 `useEffect` 监听 `showCaptcha` 变化
- 使用 `ref` 手动触发验证码刷新
- 复杂的验证码初始化逻辑

**重构后**：
- 移除 `useEffect` 和 `ref`
- 验证码组件在显示时自动初始化（组件内部处理）
- 使用 `key` 属性强制重新创建组件

### 4. 简化状态管理

**重构前**：
- 多个状态变量
- 复杂的状态更新逻辑

**重构后**：
- 保留必要的状态变量
- 简化状态更新逻辑

### 5. 移除调试日志

**重构前**：
- 大量的 `console.log` 调试日志

**重构后**：
- 移除所有调试日志
- 保持代码简洁

## 📊 代码对比

| 指标 | 重构前 | 重构后 | 改进 |
|-----|--------|--------|------|
| 代码行数 | 580 行 | ~280 行 | 减少 52% |
| 函数数量 | 4 个辅助函数 + 1 个主函数 | 3 个函数 | 减少 40% |
| 复杂度 | 30 (警告) | 预计 < 15 | 降低 50% |
| 状态变量 | 8 个 | 7 个 | 减少 1 个 |
| useEffect | 1 个 | 0 个 | 移除 |

## ✅ 功能保持

重构后保持以下功能：

- ✅ 用户名密码登录
- ✅ 验证码显示和输入
- ✅ 错误提示（使用原生 Alert）
- ✅ 登录尝试限制检查
- ✅ 账户锁定提示
- ✅ 输入验证
- ✅ 密码显示/隐藏
- ✅ 登录成功跳转

## 🔍 代码结构

### 主要函数

1. **`showError()`** - 统一的错误提示函数
2. **`handleLoginError()`** - 处理登录错误，显示验证码和错误提示
3. **`handleLogin()`** - 主登录处理函数

### 状态管理

- `username` - 用户名
- `password` - 密码
- `showPassword` - 是否显示密码
- `showCaptcha` - 是否显示验证码
- `captchaId` - 验证码 ID
- `captchaAnswer` - 验证码答案
- `loading` - 加载状态
- `captchaKey` - 验证码组件 key（用于强制重新创建）

## 📝 相关文件

- `Platform.App/app/auth/login.tsx` - 登录页面（重构后）
- `Platform.App/services/auth.ts` - 认证服务
- `Platform.App/components/ImageCaptcha.tsx` - 验证码组件

## 📅 更新日期

2024-12-19

