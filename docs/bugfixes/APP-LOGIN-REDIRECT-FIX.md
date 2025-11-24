# App 用户登录跳转逻辑修复

## 问题描述

App 的用户登录跳转逻辑存在三个问题：
1. 登录成功后无法正确跳转到主页
2. 登录失败（用户名密码错误）时会跳转或刷新页面
3. 在 Web 平台上点击登录按钮后页面会刷新

## 问题分析

### 1. 路由注册问题

在 `Platform.App/app/_layout.tsx` 中，根据 `isAuthenticated` 状态条件渲染不同的路由：

```tsx
<Stack screenOptions={{ headerShown: false }}>
  {isAuthenticated ? (
    [
      <Stack.Screen key="(tabs)" name="(tabs)" />,
      <Stack.Screen key="profile" name="profile" />,
      <Stack.Screen key="about" name="about" />,
    ]
  ) : (
    <Stack.Screen name="auth" />
  )}
</Stack>
```

**问题**：
- 登录成功后，`isAuthenticated` 变为 `true`，但路由栈需要重新渲染
- Expo Router 无法正确处理这种动态的路由注册/注销
- 导致路由切换延迟或失败

### 2. 跳转逻辑优化

`RouteGuard` 中使用 `setTimeout` 延迟 150ms 执行跳转，可能导致用户体验不佳。

### 3. 登录失败时误跳转问题

在 `RouteGuard` 的 `requestAnimationFrame` 回调中，使用闭包捕获的 `isAuthenticated` 和 `loading` 值可能不是最新状态，导致登录失败时误跳转。

### 4. Web 平台页面刷新问题

在 Web 平台上，点击登录按钮或按 Enter 键时，可能会触发表单提交导致页面刷新。

## 解决方案

### 1. 修复路由注册

**修改文件**：`Platform.App/app/_layout.tsx`

**修改内容**：
- 移除条件渲染，注册所有路由
- 由 `RouteGuard` 控制访问权限和跳转

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="auth" />
  <Stack.Screen name="profile" />
  <Stack.Screen name="about" />
  <Stack.Screen name="chat" />
  <Stack.Screen name="people" />
</Stack>
```

### 2. 优化跳转逻辑

**修改文件**：`Platform.App/components/RouteGuard.tsx`

**修改内容**：
- 使用 `requestAnimationFrame` 替代 `setTimeout`
- 使用 `unauthorizedRedirect` 参数而不是硬编码路径
- 使用 `useRef` 存储最新状态，确保在回调中检查的是最新值

```tsx
// 使用 ref 存储最新的认证状态
const isAuthenticatedRef = useRef(isAuthenticated);
const loadingRef = useRef(loading);

// 更新 ref 值
useEffect(() => {
  isAuthenticatedRef.current = isAuthenticated;
  loadingRef.current = loading;
}, [isAuthenticated, loading]);

// 在跳转逻辑中使用 ref 值
if (isAuthenticated && !loading && publicRoutes.some(route => currentPath.startsWith(route))) {
  const frameId = requestAnimationFrame(() => {
    // 使用 ref 获取最新的状态值，确保检查的是最新状态
    // 如果登录失败，isAuthenticatedRef.current 会被设置为 false，所以不会跳转
    if (isAuthenticatedRef.current && !loadingRef.current) {
      router.replace(unauthorizedRedirect as any);
    }
  });
  
  return () => cancelAnimationFrame(frameId);
}
```

### 3. 修复 Web 平台页面刷新问题

**修改文件**：`Platform.App/app/auth/login.tsx`、`Platform.App/components/FormInput.tsx`

**修改内容**：
- 为登录按钮的 `onPress` 事件添加 `preventDefault` 处理，防止 Web 平台页面刷新
- 为 `FormInput` 组件添加 `onSubmitEditing` 支持，处理 Enter 键按下事件
- 在登录页面的输入框中添加 `onSubmitEditing` 处理，按 Enter 键时触发登录而不是表单提交

```tsx
// 登录按钮
<Pressable
  onPress={(e) => {
    // 在 Web 平台上阻止默认行为，防止页面刷新
    if (Platform.OS === 'web' && e) {
      e.preventDefault?.();
    }
    handleLogin();
  }}
  disabled={authLoading}
>
  {/* ... */}
</Pressable>

// 输入框
<FormInput
  onSubmitEditing={() => {
    // 在 Web 平台上，按 Enter 键时触发登录，而不是触发表单提交
    if (!authLoading && username.trim() && password.trim()) {
      handleLogin();
    }
  }}
  // ... 其他 props
/>
```

## 修复效果

1. **路由注册稳定**：所有路由始终注册，不会因为认证状态变化而动态注册/注销
2. **跳转更流畅**：使用 `requestAnimationFrame` 确保在下一个渲染周期执行跳转，减少延迟
3. **逻辑更清晰**：路由注册和访问控制分离，职责更明确
4. **登录失败不跳转**：使用 `useRef` 确保在回调中检查最新状态，登录失败时不会误跳转或刷新页面
5. **Web 平台不刷新**：阻止默认行为，防止点击登录按钮或按 Enter 键时页面刷新

## 测试验证

### 测试步骤

1. 启动 App
2. 在登录页面输入正确的用户名和密码
3. 点击登录按钮
4. 观察是否成功跳转到主页 `/(tabs)`

### 预期结果

- 登录成功后立即跳转到主页
- 无路由切换闪烁或延迟
- **登录失败时停留在登录页面，不跳转或刷新**
- 登录失败时显示错误提示信息

## 相关文件

- `Platform.App/app/_layout.tsx` - 根布局文件
- `Platform.App/components/RouteGuard.tsx` - 路由守卫组件
- `Platform.App/components/FormInput.tsx` - 表单输入组件
- `Platform.App/contexts/AuthContext.tsx` - 认证上下文
- `Platform.App/app/auth/login.tsx` - 登录页面

## 更新日期

2024-12-19

