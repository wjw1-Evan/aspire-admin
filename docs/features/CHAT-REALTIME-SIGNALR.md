# SignalR 实时聊天集成说明

## 📋 概述

为提升聊天体验，本次迭代在后端新增 SignalR Hub，前端移动端（`Platform.App`）接入实时连接，实现消息、会话更新、已读状态等事件的即时推送，同时保留 REST 轮询作为降级方案。

## 🏗️ 后端改动

### 主要组件

- **`Hubs/ChatHub.cs`**：
  - 继承 `Hub`，要求持有者已授权。
  - 提供 `JoinSessionAsync` / `LeaveSessionAsync` / `SendMessageAsync` 方法。
  - Hub 常量：`ReceiveMessage`、`SessionUpdated`、`MessageDeleted`、`SessionRead`，用于前端订阅。
- **`Program.cs`**：
  - 调用 `builder.Services.AddSignalR()` 注册服务。
  - 通过 `app.MapHub<ChatHub>"/hubs/chat"` 暴露端点，并设置 `RequireAuthorization()`。
- **`ChatService`**：
  - 引入 `IHubContext<ChatHub>`，在消息发送、删除、已读后广播事件。
  - 新增 `ChatMessageRealtimePayload`、`ChatSessionRealtimePayload`、`ChatMessageDeletedPayload`、`ChatSessionReadPayload` 等推送模型。
  - 统一封装 `Notify*` 方法，避免广播失败导致主流程异常（日志记录后忽略）。

### 推送事件说明

| 事件 | 触发场景 | 负载 | 说明 |
| --- | --- | --- | --- |
| `ReceiveMessage` | 新消息写入 | `ChatMessageRealtimePayload` | 向会话组广播完整消息实体 |
| `SessionUpdated` | 消息、已读、删除等导致摘要变化 | `ChatSessionRealtimePayload` | 向参与者用户组广播最新会话摘要（含未读统计） |
| `MessageDeleted` | 发送者软删除消息 | `ChatMessageDeletedPayload` | 通知会话成员移除 / 标记消息 |
| `SessionRead` | 任一参与者更新已读 | `ChatSessionReadPayload` | 通知会话成员已读信息，客户端可据此更新 UI |

## 📱 移动端改动

### SignalR 连接管理

- 在 `ChatContext` 中创建 `HubConnection`，使用 `@microsoft/signalr`（自动重连、WebSocket 优先）。
- `connectionState` 暴露给 UI，`ConversationHeader` 根据状态展示“实时连接已建立 / 正在重新连接”等文案。
- 连接建立或断开时自动加入 / 离开当前会话组；重连后会再次调用 `JoinSessionAsync`。
- `activeSessionRef`、`sessionsRef` 等 `useRef` 保存最新上下文，避免事件处理函数重新绑定。
- 当连接处于 `Connected` 状态时停止 REST 轮询，降级时仍可依赖原有 `loadMessages` 定时器。

### 实时事件处理

- `ReceiveMessage` → 调用 reducer 追加消息。
- `SessionUpdated` → 归一化后更新本地 `ChatSession`，并按更新时间重新排序列表。
- `MessageDeleted` → 更新对应消息 `metadata`、回退到系统文案“消息已撤回”。
- `SessionRead` → 同步 `unreadCounts` 中的目标用户未读数量。
- `normalizeSession` 根据当前用户 ID 计算 `unreadCount`，确保前端显示一致。

### 发送逻辑

- 优先调用 `connection.invoke('SendMessageAsync')`；如 SignalR 不可用，则回退到原 `chatService.sendMessage` REST 接口。
- 文本消息发送后直接触发智能回复请求；附件发送仍走 REST 上传接口。

## ✅ 测试验证

1. 运行 `dotnet run --project Platform.AppHost`，确保后端、MongoDB、移动端均启动。
2. 使用两个账号在移动端登录同一会话，验证消息 / 会话列表实时刷新，无需手动下拉。
3. 切断网络或关闭后端后重连，观察 `ConversationHeader` 状态提示以及 REST 轮询是否自动恢复。
4. 删除消息、执行“标记已读”，确认其他端收到对应事件，未读数与摘要实时变化。

## 📚 相关文件

- `Platform.ApiService/Hubs/ChatHub.cs`
- `Platform.ApiService/Services/ChatService.cs`
- `Platform.ApiService/Models/ChatModels.cs`
- `Platform.App/contexts/ChatContext.tsx`
- `Platform.App/app/chat/[sessionId].tsx`
- `Platform.App/components/chat/ConversationHeader.tsx`
- `Platform.App/types/chat.ts`


