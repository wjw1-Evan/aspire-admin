# 消息已读状态后端 API 升级说明

## 升级概述

后端 API 已升级以支持消息已读状态的持久化和查询。现在后端会在返回消息时自动计算并包含已读状态信息。

## 升级内容

### 1. ChatSession 模型扩展

在 `ChatSession` 模型中添加了 `LastReadMessageIds` 字段：

```csharp
/// <summary>
/// 每位参与者的最后已读消息标识
/// </summary>
[BsonElement("lastReadMessageIds")]
public Dictionary<string, string> LastReadMessageIds { get; set; } = new();
```

**作用**：
- 存储每个参与者在会话中最后读取的消息ID
- 用于计算哪些消息已被对方读取
- 支持刷新后正确显示已读状态

### 2. MarkSessionReadAsync 方法升级

在标记会话已读时，同时更新 `LastReadMessageIds`：

```csharp
var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();
lastReadMessageIds[currentUserId] = lastMessageId;

var update = _sessionFactory.CreateUpdateBuilder()
    .Set(session => session.UnreadCounts, unreadCounts)
    .Set(session => session.LastReadMessageIds, lastReadMessageIds)
    .SetCurrentTimestamp();
```

**作用**：
- 记录每个用户的最后已读消息ID
- 为后续的已读状态计算提供数据基础

### 3. GetMessagesAsync 方法升级

在返回消息时，自动计算并添加已读状态到消息的 `metadata` 中：

```csharp
// 计算每条消息的已读状态并添加到 metadata
var currentUserId = _sessionFactory.GetRequiredUserId();
var lastReadMessageIds = session.LastReadMessageIds ?? new Dictionary<string, string>();

foreach (var message in messages)
{
    // 只处理当前用户发送的消息
    if (message.SenderId == currentUserId)
    {
        // 检查每个参与者的已读状态
        var readStatuses = new Dictionary<string, bool>();
        var messageTimestamp = message.CreatedAt;
        
        foreach (var participant in session.Participants)
        {
            // 跳过发送者自己
            if (participant == currentUserId)
            {
                continue;
            }
            
            // 检查该参与者是否已读此消息
            if (lastReadMessageIds.TryGetValue(participant, out var lastReadId))
            {
                var lastReadMessage = await _messageFactory.GetByIdAsync(lastReadId);
                if (lastReadMessage != null)
                {
                    // 如果消息时间戳小于等于最后已读消息的时间戳，则已读
                    readStatuses[participant] = messageTimestamp <= lastReadMessage.CreatedAt;
                }
            }
        }
        
        // 将已读状态添加到消息的 metadata 中
        message.Metadata["readStatuses"] = readStatuses;
        
        // 计算是否所有参与者都已读
        var allRead = readStatuses.Count > 0 && readStatuses.Values.All(r => r);
        if (allRead)
        {
            message.Metadata["isRead"] = true;
        }
    }
}
```

**作用**：
- 自动计算每条消息的已读状态
- 将已读状态信息添加到消息的 `metadata` 中
- 前端可以直接从 `metadata.isRead` 判断是否已读

### 4. 前端消息标准化升级

前端在 `normalizeMessage` 函数中从 `metadata` 读取已读状态：

```typescript
const normalizeMessage = (message: ChatMessage): ChatMessage => {
  // 从 metadata 中读取已读状态
  const isRead = message.metadata?.['isRead'] === true;
  const status = message.status ?? (isRead ? 'read' : 'sent');

  return {
    ...message,
    status,
    clientMessageId: message.clientMessageId ?? metadataClientMessageId,
  };
};
```

**作用**：
- 从后端返回的 `metadata.isRead` 中读取已读状态
- 自动设置消息状态为 `'read'`（如果已读）
- 支持刷新后正确显示已读状态

## 工作流程

### 1. 标记已读

1. 用户打开聊天页面或滚动到消息位置
2. 前端调用 `markSessionRead` API
3. 后端更新 `LastReadMessageIds[currentUserId] = lastMessageId`
4. 后端通过 SignalR 发送 `SessionRead` 事件

### 2. 查询消息

1. 前端调用 `GetMessages` API
2. 后端查询消息列表
3. 后端根据 `LastReadMessageIds` 计算每条消息的已读状态
4. 后端将已读状态添加到消息的 `metadata` 中
5. 前端从 `metadata.isRead` 读取已读状态并设置消息状态

### 3. 实时更新

1. 对方读取消息时，后端发送 `SessionRead` 事件
2. 前端收到事件后，更新消息状态为已读
3. UI 自动更新显示"对方已读"

## Metadata 字段说明

### `readStatuses`

类型：`Dictionary<string, bool>`

说明：每个参与者的已读状态映射

示例：
```json
{
  "readStatuses": {
    "user1": true,
    "user2": false
  }
}
```

### `isRead`

类型：`bool`

说明：是否所有参与者都已读（用于前端快速判断）

示例：
```json
{
  "isRead": true
}
```

## 优势

1. **持久化**：
   - 已读状态存储在数据库中
   - 刷新页面后能正确显示已读状态

2. **实时性**：
   - 通过 SignalR 实时推送已读状态
   - 无需轮询即可获得最新状态

3. **性能优化**：
   - 只在查询消息时计算已读状态
   - 使用时间戳比较，避免复杂的查询

4. **扩展性**：
   - 支持群聊场景（多个参与者）
   - 可以轻松扩展为显示具体哪些人已读

## 数据库迁移

**注意**：现有会话的 `LastReadMessageIds` 字段为空字典，这意味着：

- 旧消息的已读状态可能不准确（因为缺少历史数据）
- 新消息的已读状态会正确显示
- 可以通过重新标记已读来更新状态

**可选迁移方案**：
- 如果会话有 `UnreadCounts` 为 0，可以设置 `LastReadMessageIds` 为 `LastMessageId`
- 但这需要额外的迁移脚本

## 相关代码

- `Platform.ApiService/Models/ChatModels.cs` - ChatSession 模型扩展
- `Platform.ApiService/Services/ChatService.cs` - GetMessagesAsync 和 MarkSessionReadAsync 方法升级
- `Platform.App/contexts/chatReducer.ts` - normalizeMessage 函数升级

## 升级日期

2025-01-27

