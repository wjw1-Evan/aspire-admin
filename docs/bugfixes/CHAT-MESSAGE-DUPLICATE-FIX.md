# 聊天消息重复显示修复

## 问题描述

在聊天页面发送消息时，对话中的气泡会重复显示两次。

**问题 URL**: `http://localhost:15002/chat/6918133db73ea440aff3fe19`

## 问题原因

消息发送流程中，存在以下问题：

1. **本地消息和服务器消息的 id 不匹配**：
   - 本地消息的 `id` 是临时生成的 `local-xxx`
   - 服务器返回的消息 `id` 是 MongoDB ObjectId
   - 通过 `id` 无法正确匹配和替换本地消息

2. **消息去重逻辑不完善**：
   - `appendMessage` 和 `replaceMessage` 函数在匹配本地消息时，只检查了 `localId` 和 `id`
   - 没有检查 `clientMessageId` 字段，导致服务器返回的消息无法正确替换本地消息

3. **批量加载消息时去重不完整**：
   - `CHAT_MESSAGES_SUCCESS` 在合并消息时，只通过 `id` 去重
   - 没有处理通过 `clientMessageId` 匹配的本地消息，导致本地消息和服务器消息同时存在

## 解决方案

### 1. 改进 `appendMessage` 函数

增加了通过 `clientMessageId` 匹配本地消息的逻辑：

```typescript
// 如果有 clientMessageId，尝试替换本地消息
if (targetLocalId) {
  let replaced = false;
  const next = existing.map(item => {
    // 匹配条件：localId 或 id 等于 targetLocalId，或者 clientMessageId 匹配
    const itemClientMessageId = item.clientMessageId ?? item.metadata?.['clientMessageId'];
    if (
      item.localId === targetLocalId ||
      item.id === targetLocalId ||
      itemClientMessageId === targetLocalId
    ) {
      replaced = true;
      return {
        ...item,
        ...normalized,
        id: normalized.id,
        localId: undefined,
        isLocal: false,
        status: normalized.status ?? 'sent',
      };
    }
    return item;
  });
  // ...
}
```

### 2. 改进 `replaceMessage` 函数

增加了通过 `clientMessageId` 匹配本地消息的逻辑，并在替换前先检查是否已存在相同的消息：

```typescript
// 先检查是否已存在相同的消息（通过 id）
const hasExistingById = existing.some(item => item.id === normalized.id);
if (hasExistingById) {
  // 如果已存在，直接更新
  return existing
    .map(item => (item.id === normalized.id ? { ...item, ...normalized } : item))
    .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}

// 尝试替换本地消息（通过 localId、id 或 clientMessageId 匹配）
let replaced = false;
const next = existing.map(item => {
  const itemClientMessageId = item.clientMessageId ?? item.metadata?.['clientMessageId'];
  if (
    item.id === targetLocalId ||
    item.localId === targetLocalId ||
    itemClientMessageId === targetLocalId
  ) {
    replaced = true;
    // ...
  }
  return item;
});
```

### 3. 改进 `CHAT_MESSAGES_SUCCESS` 的去重逻辑

增加了通过 `clientMessageId` 匹配和移除本地消息的逻辑：

```typescript
// 使用 clientMessageId 建立索引，用于匹配和移除本地消息
const clientMessageIdToLocalId = new Map<string, string>();

// 先添加现有消息（包括本地消息）
for (const msg of currentMessages) {
  if (msg.id) {
    messageMap.set(msg.id, msg);
  }
  
  // 建立 clientMessageId 到 localId 的映射（用于匹配本地消息）
  const clientMsgId = msg.clientMessageId ?? msg.metadata?.['clientMessageId'];
  if (clientMsgId && !msg.id && msg.localId) {
    clientMessageIdToLocalId.set(clientMsgId, msg.localId);
  }
}

// 合并新消息时，标记要移除的本地消息
const localIdsToRemove = new Set<string>();
for (const msg of messages) {
  const normalized = normalizeMessage(msg);
  const clientMsgId = normalized.clientMessageId ?? normalized.metadata?.['clientMessageId'];
  if (clientMsgId && normalized.id) {
    const localId = clientMessageIdToLocalId.get(clientMsgId);
    if (localId) {
      localIdsToRemove.add(localId);
    }
  }
  // ...
}

// 移除被替换的本地消息
if (localIdsToRemove.size > 0) {
  for (const [id, msg] of messageMap.entries()) {
    if (msg.localId && localIdsToRemove.has(msg.localId)) {
      messageMap.delete(id);
    }
  }
}
```

## 修复文件

- `Platform.App/contexts/chatReducer.ts` - 改进了消息去重逻辑

## 测试验证

1. **发送消息测试**：
   - 在聊天页面发送一条消息
   - 验证消息只显示一次，不会重复

2. **SignalR 消息接收测试**：
   - 发送消息后，等待服务器通过 SignalR 返回消息
   - 验证本地消息被正确替换为服务器消息，不会重复显示

3. **批量加载消息测试**：
   - 在有本地消息的情况下，刷新或加载更多消息
   - 验证本地消息被正确替换为服务器消息，不会重复显示

## 相关代码

- `Platform.App/contexts/ChatContext.tsx` - 消息发送逻辑
- `Platform.App/contexts/chatActions.ts` - 消息接收逻辑
- `Platform.App/contexts/chatReducer.ts` - 消息状态管理
- `Platform.ApiService/Hubs/ChatHub.cs` - SignalR Hub 处理
- `Platform.ApiService/Services/ChatService.cs` - 消息服务

## 修复日期

2025-01-27

