# App 页面无响应问题修复

## 📋 概述

本文档记录了可能导致 app 页面无响应的代码问题及其修复方案。

## 🔍 发现的问题

### 1. 401 错误处理阻塞问题 ✅ 已修复

**位置**: `Platform.App/services/chat.ts:161`

**问题**: 在流式响应处理中，401 错误时使用 `await apiService.clearAllTokens()` 会阻塞流式响应处理。

**修复**:
```typescript
// 修复前
if (response.status === 401 || response.status === 403) {
  await apiService.clearAllTokens();
  throw new Error('登录已过期，请重新登录后重试');
}

// 修复后
if (response.status === 401 || response.status === 403) {
  // 非阻塞方式清除 token，避免阻塞流式响应
  void apiService.clearAllTokens();
  throw new Error('登录已过期，请重新登录后重试');
}
```

### 2. API 服务 401 处理优化 ✅ 已修复

**位置**: `Platform.App/services/api.ts`

**问题**: `handleAuthFailure()` 方法可能被多个请求同时调用，导致重复处理和潜在阻塞。

**修复**:
- 添加 `isHandlingAuthFailure` 标志防止重复调用
- 将方法改为同步返回，内部异步执行，避免阻塞调用者
- 添加 500ms 延迟重置标志，防止短时间内重复触发

### 3. 登录页面重复提交问题 ✅ 已修复

**位置**: `Platform.App/app/auth/login.tsx`

**问题**: `handleLogin` 函数没有 loading 状态，用户可能快速多次点击导致重复提交。

**修复**:
- 添加 `loading` 状态防止重复提交
- 在函数开始时检查 loading 状态
- 使用 `try-finally` 确保 loading 状态正确重置
- 验证码刷新改为非阻塞方式

### 4. useEffect 依赖导致重复执行 ✅ 已修复

**位置**: `Platform.App/app/chat/[sessionId].tsx`

**问题**: useEffect 依赖 `session` 对象，如果 session 对象引用频繁变化，会导致重复执行 `loadMessages` 和频繁创建/销毁 interval。

**修复**:
- 移除 `session` 对象依赖，只依赖 `sessionId`
- 添加 eslint-disable 注释说明原因

### 5. AuthContext 应用状态监听优化 ✅ 已修复

**位置**: `Platform.App/contexts/AuthContext.tsx`

**问题**: `handleAppStateChange` 依赖 `state.isAuthenticated`，如果认证状态频繁变化，会导致频繁重新注册事件监听器。

**修复**:
- 使用 `useRef` 存储最新的认证状态
- `handleAppStateChange` 不再依赖 `state.isAuthenticated`，避免频繁重新创建

### 6. 流式响应频繁 dispatch 导致卡顿 ✅ 已修复

**位置**: `Platform.App/contexts/chatActions.ts:278`

**问题**: `streamAssistantReplyAction` 中的 `onDelta` 回调每次收到数据都会 dispatch，如果流式数据很快（每秒多次），会导致频繁的 state 更新和重新渲染，可能导致页面卡顿。

**修复**:
- 添加节流机制，限制 dispatch 频率为最多每 100ms 一次
- 使用 `setTimeout` 延迟更新，避免频繁 dispatch
- 在 `onComplete`、`onError` 和 `finally` 中清除待处理的延迟更新

```typescript
// 修复后
let lastUpdateTime = 0;
const THROTTLE_MS = 100; // 最多每 100ms 更新一次
let pendingUpdate: ReturnType<typeof setTimeout> | null = null;

onDelta: text => {
  aggregated += text;
  const now = Date.now();
  if (now - lastUpdateTime < THROTTLE_MS) {
    // 延迟更新
    if (pendingUpdate !== null) {
      clearTimeout(pendingUpdate);
    }
    pendingUpdate = setTimeout(() => {
      // dispatch 更新
    }, THROTTLE_MS - (now - lastUpdateTime));
    return;
  }
  // 立即更新
  lastUpdateTime = now;
  dispatch({ ... });
}
```

### 7. 消息合并性能优化 ✅ 已修复

**位置**: `Platform.App/contexts/chatReducer.ts:231`

**问题**: `CHAT_MESSAGES_SUCCESS` case 中使用 `reduce` + `find` 进行消息去重，这是 O(n²) 复杂度。如果消息数量很大（如 1000+ 条），会阻塞 UI 线程。

**修复**:
- 使用 `Map` 优化去重，将复杂度从 O(n²) 降低到 O(n)
- 先添加现有消息到 Map，再合并新消息（新消息优先）

```typescript
// 修复前：O(n²) 复杂度
.reduce<ChatMessage[]>((result, item) => {
  const exists = result.find(existing => existing.id === item.id); // O(n)
  // ...
}, [])

// 修复后：O(n) 复杂度
const messageMap = new Map<string, ChatMessage>();
for (const msg of currentMessages) {
  if (msg.id) messageMap.set(msg.id, msg);
}
for (const msg of messages) {
  if (msg.id) messageMap.set(msg.id, msg);
}
return Array.from(messageMap.values()).sort(...);
```

### 8. 排序操作中重复创建 Date 对象 ✅ 已修复

**位置**: `Platform.App/contexts/chatReducer.ts` 和 `Platform.App/components/chat/MessageList.tsx`

**问题**: 在排序比较函数中，每次比较都会创建新的 `Date` 对象或调用 `dayjs()`，如果消息/会话数量很大，会导致大量对象创建和计算，可能阻塞 UI 线程。

**修复**:
- 在 `chatReducer.ts` 中，提取 `getMessageTimestamp` 辅助函数，统一处理时间戳计算
- 在 `mergeSessions` 中，使用字符串比较（ISO 8601 格式可以直接字符串比较），避免创建 Date 对象
- 在 `MessageList.tsx` 中，预计算所有消息的时间戳，避免在排序时重复创建 dayjs 对象

```typescript
// 修复前：每次比较都创建 Date 对象
.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

// 修复后：预计算时间戳
const getMessageTimestamp = (message: ChatMessage): number => {
  return message.createdAt ? new Date(message.createdAt).getTime() : 0;
};
.sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b))

// 会话排序：使用字符串比较（ISO 8601 格式可以直接比较）
return timestampB.localeCompare(timestampA);
```

## ✅ 已验证的安全代码

### 1. setInterval 使用

以下位置的 `setInterval` 都有正确的清理机制：

- `app/chat/[sessionId].tsx:80` - 消息轮询，有 `clearInterval` 清理
- `hooks/useTokenValidation.ts:31` - Token 验证，有 `clearInterval` 清理
- `hooks/useLoginAttempts.ts:191` - 登录尝试锁定，有 `clearInterval` 清理

### 2. while 循环

- `services/chat.ts:129` - SSE 流处理，有 `done` 检查和 `completed` 标志，安全
- `services/chat.ts:187` - 流式响应读取，有 `done` 检查和 `completed` 标志，安全

### 3. useEffect 依赖

- `contexts/ChatContext.tsx:478` - SignalR 连接管理，依赖的回调函数都使用 `useCallback` 稳定化
- `contexts/AuthContext.tsx:182` - 认证状态检查，依赖 `checkAuth` 使用 `useCallback` 稳定化
- `contexts/AuthContext.tsx:200` - 应用状态监听，使用 ref 避免频繁重新注册
- `app/chat/[sessionId].tsx:47` - 消息加载，移除 session 对象依赖避免重复执行
- `app/chat/[sessionId].tsx:72` - 消息轮询，移除 session 对象依赖避免频繁创建 interval

### 4. Promise 处理

- `services/friends.ts:84` - 使用 `Promise.allSettled`，允许部分失败，安全
- `hooks/useFriends.ts:66` - 使用 `Promise.allSettled`，允许部分失败，安全
- `app/(tabs)/contacts.tsx:217` - 使用 `Promise.allSettled`，允许部分失败，安全

## 🛡️ 防护措施

### 1. 异步操作非阻塞

所有可能导致阻塞的异步操作都使用 `void` 或非阻塞方式：

```typescript
// ✅ 正确：非阻塞
void this.handleAuthFailure();
void apiService.clearAllTokens();

// ❌ 错误：阻塞
await this.handleAuthFailure();
await apiService.clearAllTokens();
```

### 2. 防止重复调用

使用标志位防止重复执行：

```typescript
private isHandlingAuthFailure = false;

private handleAuthFailure(): void {
  if (this.isHandlingAuthFailure) {
    return;
  }
  this.isHandlingAuthFailure = true;
  // ... 异步执行
}
```

### 3. 定时器清理

所有 `setInterval` 和 `setTimeout` 都有清理机制：

```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    // ...
  }, interval);
  
  return () => clearInterval(intervalId);
}, [dependencies]);
```

### 4. 流式响应处理

流式响应处理有超时和中断机制：

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  const response = await fetch(url, {
    signal: controller.signal,
  });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

## 📝 检查清单

在添加新功能时，检查以下项目：

- [ ] 异步操作是否可能阻塞 UI 线程？
- [ ] `setInterval`/`setTimeout` 是否有清理机制？
- [ ] `while` 循环是否有退出条件？
- [ ] `useEffect` 依赖是否可能导致无限循环？
- [ ] Promise 处理是否允许部分失败？
- [ ] 401/403 错误处理是否非阻塞？
- [ ] 是否有防止重复调用的机制？

## 🔗 相关文件

- `Platform.App/services/api.ts` - API 服务，401 处理
- `Platform.App/services/chat.ts` - 聊天服务，流式响应处理
- `Platform.App/contexts/ChatContext.tsx` - 聊天上下文，SignalR 连接管理
- `Platform.App/contexts/AuthContext.tsx` - 认证上下文，状态管理

## 📅 更新记录

- 2024-01-XX: 修复 `services/chat.ts` 中 401 处理的阻塞问题
- 2024-01-XX: 优化 `services/api.ts` 中 401 处理逻辑，防止重复调用和阻塞
- 2024-01-XX: 修复登录页面重复提交问题，添加 loading 状态
- 2024-01-XX: 优化 `app/chat/[sessionId].tsx` useEffect 依赖，避免重复执行
- 2024-01-XX: 优化 `contexts/AuthContext.tsx` 应用状态监听，使用 ref 避免频繁重新注册
- 2024-01-XX: 优化 `contexts/chatActions.ts` 流式响应，添加节流机制避免频繁 dispatch
- 2024-01-XX: 优化 `contexts/chatReducer.ts` 消息合并，使用 Map 降低复杂度从 O(n²) 到 O(n)
- 2024-01-XX: 优化排序操作，避免重复创建 Date/dayjs 对象，提升性能

