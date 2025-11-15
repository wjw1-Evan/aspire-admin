# 消息已读状态功能说明

## 功能概述

在聊天消息中增加了"对方已读"状态，当对方读取消息后，发送方可以看到消息已被对方读取。

## 功能特性

1. **消息状态扩展**：
   - 原有状态：`'sending'`（发送中）、`'sent'`（已发送）、`'failed'`（发送失败）
   - 新增状态：`'read'`（对方已读）

2. **已读状态显示**：
   - 发送的消息显示状态：发送中 → 已发送 → 对方已读
   - 在消息气泡下方显示状态文本和时间

3. **自动更新机制**：
   - 当对方读取消息时，通过 SignalR 的 `SessionRead` 事件通知
   - 自动更新所有小于等于 `lastMessageId` 的消息状态为已读

## 实现方式

### 1. 类型定义扩展

扩展了 `ChatMessageStatus` 类型：

```typescript
export type ChatMessageStatus = 'sending' | 'sent' | 'read' | 'failed';
```

### 2. Reducer 逻辑

添加了 `CHAT_MARK_MESSAGES_READ` action：

```typescript
case 'CHAT_MARK_MESSAGES_READ': {
  const { sessionId, lastMessageId, userId } = action.payload;
  // 找到 lastMessageId 对应的消息
  // 更新所有时间戳小于等于该消息的消息状态为 'read'
  // 只更新指定用户发送的消息
}
```

### 3. SessionRead 事件处理

在 `handleSessionRead` 中处理已读事件：

```typescript
const handleSessionRead = useCallback((payload: ChatSessionReadPayload) => {
  // 更新会话未读计数
  // 如果对方读取了我的消息，更新消息状态为已读
  if (payload.userId !== currentUserId) {
    dispatch({
      type: 'CHAT_MARK_MESSAGES_READ',
      payload: {
        sessionId: payload.sessionId,
        lastMessageId: payload.lastMessageId,
        userId: currentUserId,
      },
    });
  }
}, [currentUserId]);
```

### 4. UI 显示

在 `MessageList` 组件中显示已读状态：

```typescript
{item.status === 'read' ? (
  <ThemedText style={[styles.statusText, { color: statusTextColor }]}>对方已读</ThemedText>
) : (
  <ThemedText style={[styles.statusText, { color: statusTextColor }]}>已发送</ThemedText>
)}
```

## 工作流程

1. **发送消息**：
   - 消息状态初始为 `'sending'`
   - 发送成功后更新为 `'sent'`

2. **对方读取消息**：
   - 对方打开聊天页面或滚动到消息位置
   - 后端自动调用 `markSessionRead` API
   - 后端通过 SignalR 发送 `SessionRead` 事件

3. **更新已读状态**：
   - 前端收到 `SessionRead` 事件
   - 检查是否是对方读取的消息（`payload.userId !== currentUserId`）
   - 更新所有小于等于 `lastMessageId` 的消息状态为 `'read'`

4. **显示已读状态**：
   - 消息气泡下方显示"对方已读"文本
   - 状态文本颜色与时间文本一致

## 已读判断逻辑

1. **时间戳比较**：
   - 找到 `lastMessageId` 对应的消息
   - 获取该消息的时间戳
   - 更新所有时间戳小于等于该消息的消息状态为已读

2. **消息过滤**：
   - 只更新当前用户发送的消息（`message.senderId === userId`）
   - 跳过发送中或失败的消息（`status !== 'sending' && status !== 'failed'`）

3. **批量更新**：
   - 一次更新所有符合条件的消息
   - 避免逐个更新导致的性能问题

## 状态显示规则

| 状态 | 显示文本 | 说明 |
|------|---------|------|
| `sending` | 加载动画 | 消息正在发送中 |
| `sent` | "已发送" | 消息已成功发送 |
| `read` | "对方已读" | 对方已读取消息 |
| `failed` | 错误图标 | 消息发送失败，可重试 |

## 注意事项

1. **只显示发送的消息状态**：
   - 只有自己发送的消息才显示状态
   - 接收的消息不显示已读状态（因为是自己读取的）

2. **批量更新**：
   - 当对方读取到某条消息时，所有更早的消息也会被标记为已读
   - 这是符合聊天应用常见行为的（读取到某条消息意味着也读取了之前的消息）

3. **实时更新**：
   - 通过 SignalR 实时推送已读状态
   - 不需要轮询或手动刷新

4. **状态持久化**：
   - 消息状态存储在内存中
   - 刷新页面后需要重新加载消息状态（后端可能需要在消息中返回已读状态）

## 未来扩展

可以扩展的功能：

1. **已读回执详情**：
   - 显示具体哪些人已读（群聊场景）
   - 显示已读时间

2. **已读状态持久化**：
   - 后端在消息中返回已读状态
   - 刷新页面后能正确显示已读状态

3. **已读状态图标**：
   - 使用图标代替文字（如双勾图标）
   - 更直观的视觉反馈

4. **部分已读**：
   - 群聊中显示部分成员已读
   - 显示已读人数和总人数

## 相关代码

- `Platform.App/types/chat.ts` - 消息状态类型定义
- `Platform.App/contexts/chatReducer.ts` - 消息状态更新逻辑
- `Platform.App/contexts/ChatContext.tsx` - SessionRead 事件处理
- `Platform.App/components/chat/MessageList.tsx` - 消息状态显示

## 创建日期

2025-01-27

