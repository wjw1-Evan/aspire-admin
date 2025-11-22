# Platform.App 全局错误处理重构总结

## 📋 概述

本文档总结了 `Platform.App` 项目中全局错误处理的重构工作，确保所有 API 相关错误都通过全局错误处理机制统一显示，页面不再自行处理错误信息。

**重构原则**：
- ✅ **API 错误** → 全局错误处理（`AuthErrorHandler` + `AuthContext.reportError`）
- ✅ **客户端验证错误** → 本地 `Alert.alert`（表单验证、文件大小限制等）
- ✅ **本地操作错误** → 本地 `Alert.alert`（打开链接失败、读取文件失败等）
- ✅ **后台操作错误** → 仅记录日志，不触发全局错误通知（轮询、后台刷新等）

---

## 🎯 核心架构

### 1. 全局错误处理组件

#### `AuthErrorHandler.tsx`
- **位置**：`Platform.App/components/AuthErrorHandler.tsx`
- **功能**：监听全局错误状态，自动显示错误提示
- **特点**：
  - 在 `/auth` 路径下跳过错误显示（让页面自己处理）
  - 在 Web 端禁用 `Alert.alert`，避免浏览器阻塞
  - 支持错误重试和自动清除

#### `AuthContext.tsx`
- **位置**：`Platform.App/contexts/AuthContext.tsx`
- **功能**：管理全局错误状态和 `reportError` 方法
- **关键方法**：
  - `reportError(error: any)`: 报告错误到全局错误处理器
  - `clearError()`: 清除错误状态

#### `errorHandler.ts`
- **位置**：`Platform.App/services/errorHandler.ts`
- **功能**：统一错误处理和转换逻辑
- **核心函数**：
  - `handleError(error: any)`: 将原始错误转换为 `AuthError`
  - `handleHttpError(status: number, errorData?: any)`: 处理 HTTP 错误
  - `handleNetworkError(error: any)`: 处理网络错误

---

## ✅ 重构完成清单

### 1. Auth 页面

#### ✅ `app/auth/register.tsx`
- **状态**：✅ 已处理（需要本地错误处理）
- **原因**：`AuthErrorHandler` 在 `/auth` 路径下跳过错误显示，所以注册页面需要自己处理错误
- **处理方式**：
  - 保留 `Alert.alert` 用于 API 错误显示（符合预期）
  - 保留客户端验证错误（表单验证、密码匹配等）

#### ✅ `app/(tabs)/profile.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleSave`: 移除 API 错误处理，改为 `throw error` 让全局处理器捕获
  - `handleChangePassword`: 移除 API 错误处理，改为 `throw error` 让全局处理器捕获
  - `pickAvatarImage`: 保留本地文件操作错误（权限、文件大小、读取失败）的 `Alert.alert`

#### ✅ `app/profile/change-password.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleChangePassword`: 移除 API 错误处理，改为 `throw error` 让全局处理器捕获
  - 保留客户端验证错误（表单验证、密码匹配等）

---

### 2. 其他页面

#### ✅ `app/(tabs)/contacts.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleInitialLoad`: 使用 `reportError(error)` 处理 API 错误
  - `handleRefresh`: 使用 `reportError(error)` 处理 API 错误
  - `handleQuerySearch`: 使用 `reportError(error)` 处理 API 错误
  - `handleSendRequest`: 使用 `reportError(error)` 处理 API 错误
  - `handleApprove`: 使用 `reportError(error)` 处理 API 错误
  - `handleReject`: 使用 `reportError(error)` 处理 API 错误
  - `handleOpenChat`: 使用 `reportError(error)` 处理 API 错误
  - 保留客户端验证错误（空查询等）
  - 保留成功提示（好友请求已发送、已添加好友等）

#### ✅ `app/chat/[sessionId].tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleAttachmentSelected`: 使用 `reportError(error)` 处理 API 错误
  - `loadMessages` 和轮询逻辑：仅记录日志（`__DEV__` 模式），不触发全局错误通知
  - `handleResendMessage`: 仅记录日志，不触发全局错误通知（消息状态已更新为 'failed'）
  - 后台操作错误不触发全局错误通知，避免干扰用户体验

#### ✅ `app/people/nearby.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleRefresh`: 使用 `reportError(error)` 处理 API 错误

#### ✅ `app/people/recommend.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - 移除本地 `error` 状态和相关 UI（`ErrorBanner`、`retryButton`）
  - `loadSuggestions`: 使用 `reportError(err)` 处理 API 错误
  - 完全依赖全局错误处理机制

#### ✅ `app/(tabs)/chat.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `loadSessions()`: 仅记录日志（`__DEV__` 模式），不触发全局错误通知（后台数据加载）

#### ✅ `app/about/index.tsx`
- **状态**：✅ 已保留（本地操作错误）
- **原因**：`Alert.alert` 用于本地操作错误（打开链接失败），不是 API 错误

---

### 3. 组件

#### ✅ `components/chat/RoleDefinitionModal.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - `handleSave`: 移除 `Alert.alert`，改为使用 `reportError(error)` 处理 API 错误
  - `loadRoleDefinition`: 保留仅记录日志的处理方式（后台加载操作）

#### ✅ `components/chat/MessageComposer.tsx`
- **状态**：✅ 已完成（合理架构）
- **处理方式**：捕获错误后重新抛出，让调用者（`chat/[sessionId].tsx`）处理

#### ✅ `components/ImageCaptcha.tsx`
- **状态**：✅ 已保留（组件级错误）
- **原因**：验证码获取失败是组件级别的 UI 交互错误，保留本地 `Alert.alert` 处理

---

### 4. Contexts 和 Actions

#### ✅ `contexts/AuthContext.tsx`
- **状态**：✅ 已完成
- **修改内容**：
  - 添加 `reportError: (error: any) => void` 方法
  - `updateProfile` 和 `changePassword` 直接调用 actions，依赖 actions 的全局错误处理

#### ✅ `contexts/authActions.ts`
- **状态**：✅ 已完成
- **修改内容**：
  - `updateProfileAction`: 捕获错误，调用 `handleError`，但不自动 dispatch（由 `reportError` 负责）
  - `changePasswordAction`: 捕获错误，调用 `handleError`，但不自动 dispatch（由 `reportError` 负责）
  - `createErrorHandler`: 不再自动 dispatch `AUTH_FAILURE`，只返回 `AuthError` 对象

---

### 5. Hooks 和 Services

#### ✅ `hooks/useFriends.ts`
- **状态**：✅ 已完成（合理架构）
- **处理方式**：
  - Hooks 不捕获错误，让调用者处理
  - `loadRequests` 使用 `Promise.allSettled` 允许部分失败，只记录警告
  - 调用者（`contacts.tsx`）使用 `reportError` 处理错误

#### ✅ `services/friends.ts` 和 `services/chat.ts`
- **状态**：✅ 已完成（合理架构）
- **处理方式**：
  - Services 抛出错误，让调用者处理
  - 使用 `ensureApiSuccess` 统一检查 API 响应
  - 错误传播到调用者，由调用者决定如何处理

---

## 📊 错误处理分类

### ✅ API 错误（全局处理）

| 场景 | 处理方式 | 示例 |
|------|---------|------|
| 登录/注册失败 | `throw error` → `AuthContext` → `AuthErrorHandler` | `app/auth/register.tsx` |
| 更新用户信息失败 | `throw error` → `AuthContext` → `AuthErrorHandler` | `app/(tabs)/profile.tsx` |
| 修改密码失败 | `throw error` → `AuthContext` → `AuthErrorHandler` | `app/profile/change-password.tsx` |
| 好友操作失败 | `reportError(error)` → `AuthErrorHandler` | `app/(tabs)/contacts.tsx` |
| 发送消息失败 | `reportError(error)` → `AuthErrorHandler` | `app/chat/[sessionId].tsx` |
| 搜索用户失败 | `reportError(error)` → `AuthErrorHandler` | `app/people/nearby.tsx` |
| AI 推荐失败 | `reportError(error)` → `AuthErrorHandler` | `app/people/recommend.tsx` |

### ✅ 客户端验证错误（本地处理）

| 场景 | 处理方式 | 示例 |
|------|---------|------|
| 表单验证失败 | `Alert.alert` | `app/auth/register.tsx`（用户名长度、密码匹配） |
| 文件大小限制 | `Alert.alert` | `app/(tabs)/profile.tsx`（头像文件大小） |
| 文件类型限制 | `Alert.alert` | `app/(tabs)/profile.tsx`（头像文件类型） |

### ✅ 本地操作错误（本地处理）

| 场景 | 处理方式 | 示例 |
|------|---------|------|
| 打开链接失败 | `Alert.alert` | `app/about/index.tsx` |
| 读取文件失败 | `Alert.alert` | `app/(tabs)/profile.tsx`（读取图片失败） |
| 权限请求失败 | `Alert.alert` | `app/(tabs)/profile.tsx`（相册权限） |

### ✅ 后台操作错误（仅记录日志）

| 场景 | 处理方式 | 示例 |
|------|---------|------|
| 消息轮询失败 | `console.error`（`__DEV__` 模式） | `app/chat/[sessionId].tsx` |
| 会话刷新失败 | `console.error`（`__DEV__` 模式） | `app/chat/[sessionId].tsx` |
| 消息重发失败 | `console.error`（`__DEV__` 模式） | `app/chat/[sessionId].tsx` |
| 会话列表加载失败 | `console.error`（`__DEV__` 模式） | `app/(tabs)/chat.tsx` |

---

## 🔧 配置验证

### ✅ 全局错误处理配置

```52:84:Platform.App/app/_layout.tsx
    <AuthErrorHandler>
      <RouteGuard
        protectedRoutes={['/(tabs)', '/profile', '/about/index', '/modal']}
        publicRoutes={['/auth']}
        redirectTo="/auth"
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
          <View style={[styles.routerContainer, { backgroundColor }]}>
            <LocationSyncManager enabled={isAuthenticated} />
            <AlertHost />
            {/* 网络状态指示器 */}
            <NetworkStatusIndicator />
            
            {/* 路由栈 */}
            <Stack screenOptions={{ headerShown: false }}>
              {isAuthenticated ? (
                [
                  <Stack.Screen key="(tabs)" name="(tabs)" />,
                  <Stack.Screen key="modal" name="modal" options={{ presentation: 'modal' }} />,
                  <Stack.Screen key="profile" name="profile" />,
                  <Stack.Screen key="about" name="about/index" />
                ]
              ) : (
                <Stack.Screen name="auth" />
              )}
            </Stack>
            
            {/* 状态栏 */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </View>
        </SafeAreaView>
      </RouteGuard>
    </AuthErrorHandler>
```

### ✅ AuthErrorHandler 配置

```34:38:Platform.App/components/AuthErrorHandler.tsx
    // 如果在登录页面，不显示原生 Alert，让页面自己的错误处理组件处理
    if (shouldSkipErrorUi) {
      console.log('AuthErrorHandler: Skipping error display on auth page, pathname:', pathname);
      return;
    }
```

---

## 🎯 核心原则

1. **API 错误必须全局处理**：
   - 所有 API 调用失败都应该通过 `reportError(error)` 或 `throw error` 报告到全局错误处理器
   - 页面不应该使用 `Alert.alert` 显示 API 错误（除了 `/auth` 路径）

2. **客户端验证错误可以本地处理**：
   - 表单验证、文件大小限制、文件类型限制等客户端错误可以使用 `Alert.alert` 本地显示

3. **本地操作错误可以本地处理**：
   - 打开链接失败、读取文件失败、权限请求失败等本地操作错误可以使用 `Alert.alert` 本地显示

4. **后台操作错误仅记录日志**：
   - 轮询、后台刷新等后台操作失败只记录日志，不触发全局错误通知

5. **Auth 页面需要特殊处理**：
   - `AuthErrorHandler` 在 `/auth` 路径下跳过错误显示
   - 所以注册/登录页面需要自己处理错误（使用 `Alert.alert`）

---

## ✅ 验证清单

### 全局错误处理配置
- [x] `AuthErrorHandler` 已正确包裹在 `_layout.tsx` 中
- [x] `AuthProvider` 已正确包裹在根布局中
- [x] `AuthErrorHandler` 在 `/auth` 路径下跳过错误显示
- [x] `reportError` 方法已正确实现

### 页面错误处理
- [x] 所有 API 错误都已通过 `reportError` 或 `throw error` 处理
- [x] 客户端验证错误保留本地 `Alert.alert`
- [x] 本地操作错误保留本地 `Alert.alert`
- [x] 后台操作错误仅记录日志

### Hooks 和 Services
- [x] Services 抛出错误，让调用者处理
- [x] Hooks 不捕获错误（除了 `Promise.allSettled` 的情况）
- [x] 调用者使用 `reportError` 处理错误

---

## 📝 注意事项

1. **Auth 页面的特殊处理**：
   - `AuthErrorHandler` 在 `/auth` 路径下跳过错误显示
   - 所以注册/登录页面需要自己处理错误（使用 `Alert.alert`）
   - 这是合理的，因为 auth 页面有特殊的 UI 需求（如显示验证码）

2. **后台操作的错误处理**：
   - 消息轮询、会话刷新等后台操作失败只记录日志，不触发全局错误通知
   - 避免干扰用户体验

3. **Promise.allSettled 的使用**：
   - 当需要允许部分请求失败时，使用 `Promise.allSettled`
   - 检查是否所有请求都失败，如果是则 `reportError`

4. **成功提示的保留**：
   - 成功提示（如"好友请求已发送"）可以保留，因为这不是错误
   - 使用 `Alert.alert` 显示成功提示是合理的

---

## 🎉 总结

所有 API 相关错误都已通过全局错误处理机制统一显示，页面不再自行处理错误信息。客户端验证错误、本地操作错误和后台操作错误都按照合理的方式处理。

**重构完成日期**：2024-12-XX  
**最后更新**：2024-12-XX（修复 `RoleDefinitionModal` 组件）  
**状态**：✅ 已完成

---

## 📚 相关文档

- [Admin 端全局错误处理重构总结](../optimization/ADMIN-ERROR-HANDLING-REFACTORING-PROGRESS.md)
- [Admin 端全局错误处理最终审查](../optimization/ADMIN-ERROR-HANDLING-FINAL-REVIEW.md)
- [Admin 端 API 错误处理分析](../optimization/ADMIN-API-ERROR-HANDLING-ANALYSIS.md)
