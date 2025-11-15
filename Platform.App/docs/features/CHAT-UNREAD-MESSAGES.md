# 聊天未读消息显示逻辑和 API

## 📋 概述

本文档说明聊天页面未读消息的显示逻辑、API 调用和实时更新机制。

## 🔄 数据流程

### 1. API 端点

**获取会话列表**
- **端点**: `GET /chat/sessions`
- **服务**: `chatService.getSessions()`
- **位置**: `Platform.App/services/chat.ts:214`

```typescript
getSessions: async (params: SessionQueryParams = {}): Promise<SessionListResponse> => {
  const query = buildQueryString(params);
  const rawResponse = await apiService.get<ApiResponse<PaginatedSessionApiResponse>>(
    `${API_ENDPOINTS.chatSessions}${query}`
  );
  // ...
}
```

**响应数据结构**:
```typescript
interface ServerChatSession {
  id: string;
  participants: string[];
  unreadCounts?: Record<string, number>; // 每个用户的未读数量
  // ... 其他字段
}
```

### 2. 数据处理

**位置**: `Platform.App/contexts/ChatContext.tsx:100`

`normalizeSession` 函数将服务器返回的 `unreadCounts` 转换为当前用户的 `unreadCount`:

```typescript
const normalizeSession = useCallback(
  (session: ServerChatSession | ChatSession): ChatSession => {
    const unreadCounts = session.unreadCounts ?? {};
    const unreadCount = currentUserId ? unreadCounts[currentUserId] ?? 0 : 0;

    return {
      ...session,
      unreadCounts,
      unreadCount, // 针对当前用户计算后的未读数量
      updatedAt: session.updatedAt ?? session.lastMessageAt ?? session.createdAt,
    };
  },
  [currentUserId]
);
```

**关键点**:
- `unreadCounts` 是一个对象，键为用户ID，值为该用户的未读消息数量
- `unreadCount` 是当前用户的未读数量，从 `unreadCounts[currentUserId]` 中提取
- 如果用户ID不存在或未读数量为0，则 `unreadCount` 为 0

### 3. 显示逻辑

**位置**: `Platform.App/app/(tabs)/chat.tsx:53`

```typescript
const unreadBadge = session.unreadCount > 0;

// 在渲染中显示未读徽章
{unreadBadge && (
  <View style={[styles.unreadBadge, { backgroundColor: theme.colors.danger }]}>
    <ThemedText style={[styles.unreadText, { color: theme.colors.accentContrastText }]}>
      {session.unreadCount}
    </ThemedText>
  </View>
)}
```

**显示条件**:
- 当 `session.unreadCount > 0` 时显示红色未读徽章
- 徽章中显示具体的未读消息数量

### 4. 标记已读

**API 端点**: `POST /chat/messages/{sessionId}/read`

**位置**: `Platform.App/services/chat.ts:256`

```typescript
markSessionRead: async (sessionId: string, lastReadMessageId: string): Promise<void> => {
  await apiService.post<void>(
    `${API_ENDPOINTS.chatMessages}/${encodeURIComponent(sessionId)}/read`,
    { lastReadMessageId }
  );
}
```

**使用场景**:
- 用户打开聊天会话时，自动标记为已读
- 用户滚动到最新消息时，标记为已读

### 5. 实时更新

**SignalR 事件**: `ChatSessionRead`

**位置**: `Platform.App/contexts/ChatContext.tsx:330`

当其他用户标记会话为已读时，通过 SignalR 实时更新未读数量:

```typescript
connection.on('ChatSessionRead', (payload: ChatSessionReadPayload) => {
  const existing = sessionsRef.current[payload.sessionId];
  if (!existing) return;

  const unreadCounts = { ...(existing.unreadCounts ?? {}) };
  unreadCounts[payload.userId] = 0; // 将该用户的未读数量设为0

  const normalized = normalizeSession({ ...existing, unreadCounts });
  dispatch({ type: 'CHAT_SESSIONS_SUCCESS', payload: { sessions: [normalized] } });
});
```

**实时消息更新**:
- 当收到新消息时，SignalR 会推送 `ChatMessage` 事件
- 会话的 `unreadCounts` 会自动更新
- 前端通过 `normalizeSession` 重新计算 `unreadCount`

## 📊 数据模型

### ServerChatSession (服务器返回)

```typescript
interface ServerChatSession {
  id: string;
  participants: string[];
  unreadCounts?: Record<string, number>; // { "userId1": 5, "userId2": 3 }
  lastMessageAt?: string;
  // ... 其他字段
}
```

### ChatSession (前端使用)

```typescript
interface ChatSession extends ServerChatSession {
  unreadCount: number; // 当前用户的未读数量（从 unreadCounts 计算得出）
  lastMessage?: ChatMessage;
  // ... 其他字段
}
```

## 🔍 关键代码位置

| 功能 | 文件路径 | 行号 |
|------|---------|------|
| API 调用 | `services/chat.ts` | 214-231 |
| 数据转换 | `contexts/ChatContext.tsx` | 100-115 |
| 显示逻辑 | `app/(tabs)/chat.tsx` | 53, 142-146 |
| 标记已读 | `services/chat.ts` | 256-260 |
| 实时更新 | `contexts/ChatContext.tsx` | 330-347 |
| 类型定义 | `types/chat.ts` | 58-84 |

## 🐛 常见问题排查

### 1. 未读消息不显示

**检查项**:
- ✅ API 返回的 `unreadCounts` 是否包含当前用户ID
- ✅ `currentUserId` 是否正确（`user?.id ?? user?.username`）
- ✅ `normalizeSession` 是否正确计算 `unreadCount`
- ✅ 前端显示条件 `session.unreadCount > 0` 是否正确

**调试方法**:
```typescript
console.log('Session:', session);
console.log('UnreadCounts:', session.unreadCounts);
console.log('CurrentUserId:', currentUserId);
console.log('UnreadCount:', session.unreadCount);
```

### 2. 未读数量不更新

**检查项**:
- ✅ SignalR 连接是否正常
- ✅ `ChatSessionRead` 事件是否被正确监听
- ✅ `normalizeSession` 是否在更新时被调用
- ✅ Redux/Context 状态是否正确更新

### 3. 标记已读不生效

**检查项**:
- ✅ `markSessionRead` API 是否成功调用
- ✅ `lastReadMessageId` 参数是否正确
- ✅ 后端是否正确更新 `unreadCounts`
- ✅ 前端是否在标记后刷新会话列表

## 📝 最佳实践

1. **加载会话列表时**:
   - 使用 `loadSessions()` 获取最新数据
   - 确保 `normalizeSession` 正确转换数据

2. **打开会话时**:
   - 自动调用 `markSessionRead` 标记为已读
   - 更新本地状态，立即清除未读徽章

3. **实时更新**:
   - 监听 SignalR 事件，实时更新未读数量
   - 确保 `normalizeSession` 在更新时被调用

4. **性能优化**:
   - 使用 `useCallback` 缓存 `normalizeSession` 函数
   - 避免不必要的重新渲染

## 🔗 相关文档

- [聊天功能说明](./CHAT-AI-FEATURE.md)
- [SignalR 实时通信](./SIGNALR-REALTIME.md)
- [API 集成规范](../api-integration.mdc)

