# 实时通信 SSE 规范

本规范结合 AGENTS.md 最高准则，统一后端实时通信实现方式。

## 1. SignalR 禁用，SSE 统一

- 后端**禁止**再向前端使用 SignalR 发送实时数据，全部改为 SSE（Server-Sent Events）。
- SSE 连接管理器接口为 `IChatSseConnectionManager`，所有推送、连接、断开等操作均通过该接口实现。
- SSE 响应需跳过统一响应中间件格式化（详见 03-中间件与响应.md）。

## 2. 连接管理接口

```csharp
public interface IChatSseConnectionManager
{
  Task AddConnectionAsync(string userId, string connectionId, CancellationToken cancellationToken = default);
  Task RemoveConnectionAsync(string connectionId);
  IReadOnlyList<string> GetConnections(string userId);
  bool HasConnection(string connectionId);
}
```

## 3. SSE 连接建立示例

```csharp
[HttpGet("sse")]
public async Task SseConnect()
{
  // SSE 连接通过 JWT token 验证用户身份
  var userId = await _tenantContext.GetCurrentUserIdAsync();
  var connectionId = Guid.NewGuid().ToString();
  await _connectionManager.AddConnectionAsync(userId, connectionId);
  Response.ContentType = "text/event-stream";
  return new EmptyResult();
}
```

## 4. 变更与维护建议

- 实时推送如需扩展，优先通过 IChatSseConnectionManager 扩展，禁止自定义推送通道。
- 发现实现与本规范或 AGENTS.md 不符时，优先以本规范为准，及时修订文档与代码。
使用 `IChatBroadcaster` 接口进行消息广播：

```csharp
public interface IChatBroadcaster
{
    // 发送消息
    Task SendMessageAsync(string userId, ChatMessage message);

    // 广播消息给多个用户
    Task BroadcastAsync(IEnumerable<string> userIds, ChatMessage message);

    // 发送会话更新
    Task SendSessionUpdateAsync(string userId, SessionUpdate update);

    // 发送消息删除事件
    Task SendMessageDeletedAsync(string userId, string messageId);

    // 发送已读状态同步
    Task SendReadStatusAsync(string userId, ReadStatus status);
}
```

---

## 事件类型

### 标准事件类型

| 事件类型 | 说明 | 数据结构 |
|----------|------|----------|
| `Connected` | 连接建立 | `{ connectionId, userId, timestamp }` |
| `Keepalive` | 心跳保活 | `{ timestamp }` |
| `Message` | 新消息 | `{ messageId, content, from, to, timestamp }` |
| `MessageChunk` | 流式消息块 | `{ messageId, chunk, isLast }` |
| `MessageComplete` | 消息完成 | `{ messageId, totalChunks }` |
| `MessageRead` | 消息已读 | `{ messageId, readBy, readAt }` |
| `SessionUpdate` | 会话更新 | `{ sessionId, type, data }` |
| `Error` | 错误通知 | `{ code, message }` |

### SSE 事件格式

```
event: Connected\ndata: {"connectionId":"xxx","userId":"yyy"}\n\n
event: Keepalive\ndata: {"timestamp":"2026-03-22T10:00:00Z"}\n\n
event: Message\ndata: {"messageId":"msg001","content":"Hello","from":"user1","to":"user2"}\n\n
```

---

## 心跳保活

### 配置

```csharp
// appsettings.json
{
  "Chat": {
    "Sse": {
      "KeepaliveIntervalSeconds": 30,
      "ConnectionTimeoutMinutes": 60
    }
  }
}
```

### 后台服务实现

```csharp
public class SseKeepaliveService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

                // 遍历所有连接，发送心跳
                foreach (var connection in _connectionManager.GetAllConnections())
                {
                    await _broadcaster.SendKeepaliveAsync(connection);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
```

---

## 错误处理与重连

### 客户端重连策略

```typescript
// 指数退避重连
const connect = () => {
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 1000;

  const eventSource = new EventSource('/api/chat/sse');

  eventSource.onerror = () => {
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount);
      setTimeout(() => {
        retryCount++;
        connect();
      }, delay);
    }
  };
};
```

### 服务端清理

```csharp
// 检测断开连接
context.RequestAborted.Register(async () =>
{
    await _connectionManager.RemoveConnectionAsync(connectionId);
    _logger.LogInformation("SSE 连接断开: {ConnectionId}", connectionId);
});
```

---

## 相关代码位置

| 组件 | 位置 |
|------|------|
| 连接管理器 | `Platform.ApiService/Services/ChatSseConnectionManager.cs` |
| 广播器 | `Platform.ApiService/Services/ChatBroadcaster.cs` |
| SSE 控制器 | `Platform.ApiService/Controllers/ChatSseController.cs` |
| 心跳服务 | `Platform.ApiService/BackgroundServices/SseKeepaliveService.cs` |
| 连接接口 | `Platform.ServiceDefaults/Services/IChatSseConnectionManager.cs` |
