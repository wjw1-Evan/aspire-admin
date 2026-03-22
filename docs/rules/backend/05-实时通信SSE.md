# 实时通信 SSE

## SSE 概述

SSE（Server-Sent Events）用于实现服务器向客户端的**单向实时推送**，替代 SignalR。

### 与 WebSocket 的区别
| 特性 | SSE | WebSocket |
|------|------|-----------|
| 方向 | 单向（服务端→客户端） | 双向 |
| 连接 | 基于 HTTP，自动重连 | 独立协议 |
| 兼容性 | 现代浏览器均支持 | 需要降级处理 |
| 实现复杂度 | 简单 | 复杂 |

---

## 连接管理

### IChatSseConnectionManager
使用 `IChatSseConnectionManager` 管理用户连接：

```csharp
public interface IChatSseConnectionManager
{
    // 添加连接
    Task AddConnectionAsync(string userId, string connectionId, CancellationToken cancellationToken = default);
    
    // 移除连接
    Task RemoveConnectionAsync(string connectionId);
    
    // 获取用户的所有连接
    IReadOnlyList<string> GetConnections(string userId);
    
    // 检查连接是否存在
    bool HasConnection(string connectionId);
}
```

### 连接建立
```csharp
[HttpGet("sse")]
public async Task SseConnect()
{
    // SSE 连接通过 JWT token 验证用户身份
    var userId = await _tenantContext.GetCurrentUserIdAsync();
    var connectionId = Guid.NewGuid().ToString();
    
    await _connectionManager.AddConnectionAsync(userId, connectionId);
    
    // 返回 SSE 流
    Response.ContentType = "text/event-stream";
    return new EmptyResult();
}
```

---

## 消息广播

### IChatBroadcaster
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
