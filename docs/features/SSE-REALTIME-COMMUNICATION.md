# SSE 实时通信指南

> 本文档说明平台基于 Server-Sent Events (SSE) 实现的实时通信机制。

## 📋 概述

平台使用 SSE（Server-Sent Events）实现实时消息推送，支持聊天消息、会话更新、已读状态等实时事件。相比 WebSocket，SSE 更简单、更轻量，适合单向推送场景。

## 🏗 架构组件

### 1. ChatSseConnectionManager

管理用户 SSE 连接，维护用户ID到连接的映射：

```csharp
public interface IChatSseConnectionManager
{
    Task RegisterUserConnectionAsync(string userId, string connectionId, HttpResponse response, CancellationToken cancellationToken);
    Task UnregisterConnectionAsync(string connectionId);
    Task<bool> SendToUserAsync(string userId, string eventType, object data, CancellationToken cancellationToken);
}
```

### 2. ChatBroadcaster

负责消息广播，向会话的所有参与者推送事件：

```csharp
public interface IChatBroadcaster
{
    Task BroadcastMessageAsync(string sessionId, ChatMessageRealtimePayload payload);
    Task BroadcastSessionUpdatedAsync(string sessionId, ChatSessionRealtimePayload payload);
    Task BroadcastMessageDeletedAsync(string sessionId, ChatMessageDeletedPayload payload);
    Task BroadcastSessionReadAsync(string sessionId, string userId, ChatSessionReadPayload payload);
    Task BroadcastMessageChunkAsync(string sessionId, string messageId, string delta);
    Task BroadcastMessageCompleteAsync(string sessionId, ChatMessage message);
}
```

### 3. ChatSseController

提供 SSE 连接端点：

```csharp
[HttpGet("sse")]
[Produces("text/event-stream")]
public async Task<IActionResult> StreamEvents([FromQuery] string? token, CancellationToken cancellationToken)
```

## 🔌 建立连接

### 后端端点

```
GET /api/chat/sse?token={jwt_token}
```

### 前端连接（管理后台）

```typescript
import { useSseConnection } from '@/hooks/useSseConnection';

const { isConnected, lastEvent } = useSseConnection({
  url: '/api/chat/sse',
  onMessage: (event) => {
    console.log('收到事件:', event.type, event.data);
  },
  onError: (error) => {
    console.error('SSE 连接错误:', error);
  }
});
```

### 移动端连接

```typescript
// 使用 EventSource API
const eventSource = new EventSource(`${apiBaseUrl}/api/chat/sse?token=${token}`);

eventSource.addEventListener('connected', (e) => {
  console.log('连接成功:', JSON.parse(e.data));
});

eventSource.addEventListener('Message', (e) => {
  const message = JSON.parse(e.data);
  // 处理新消息
});
```

## 📨 事件类型

### 1. 连接事件

**connected**：连接建立时发送

```json
{
  "connectionId": "guid",
  "userId": "user123"
}
```

**keepalive**：心跳事件（每30秒）

```json
null
```

### 2. 消息事件

**Message**：新消息推送

```json
{
  "sessionId": "session123",
  "message": {
    "id": "msg123",
    "sessionId": "session123",
    "senderId": "user456",
    "type": "Text",
    "content": "Hello",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "broadcastAtUtc": "2024-01-01T00:00:00Z"
}
```

**MessageChunk**：流式消息块（AI 回复）

```json
{
  "sessionId": "session123",
  "messageId": "msg123",
  "delta": "这是",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**MessageComplete**：流式消息完成

```json
{
  "sessionId": "session123",
  "message": {
    "id": "msg123",
    "content": "完整的AI回复内容"
  },
  "broadcastAtUtc": "2024-01-01T00:00:00Z"
}
```

**MessageDeleted**：消息删除

```json
{
  "sessionId": "session123",
  "messageId": "msg123",
  "deletedBy": "user456",
  "deletedAtUtc": "2024-01-01T00:00:00Z"
}
```

### 3. 会话事件

**SessionUpdated**：会话更新

```json
{
  "sessionId": "session123",
  "session": {
    "id": "session123",
    "title": "新标题",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "broadcastAtUtc": "2024-01-01T00:00:00Z"
}
```

**SessionRead**：会话已读状态

```json
{
  "sessionId": "session123",
  "userId": "user456",
  "readAtUtc": "2024-01-01T00:00:00Z",
  "broadcastAtUtc": "2024-01-01T00:00:00Z"
}
```

## 💬 流式 AI 回复

### 发送消息并流式接收

**端点**：
```
POST /api/chat/messages?stream=true
```

**请求**：
```json
{
  "sessionId": "session123",
  "type": "Text",
  "content": "你好",
  "stream": true
}
```

**响应**：SSE 流

```
event: UserMessage
data: {"message": {"id": "msg1", "content": "你好"}}

event: AssistantMessageStart
data: {"sessionId": "session123", "message": {"id": "msg2"}}

event: AssistantMessageChunk
data: {"sessionId": "session123", "messageId": "msg2", "delta": "你"}

event: AssistantMessageChunk
data: {"sessionId": "session123", "messageId": "msg2", "delta": "好"}

event: AssistantMessageComplete
data: {"message": {"id": "msg2", "content": "你好"}}
```

### 前端处理流式响应

```typescript
export async function sendMessageWithStreaming(
  messageRequest: SendMessageRequest,
  callbacks: {
    onUserMessage?: (message: ChatMessage) => void;
    onAssistantStart?: (message: ChatMessage) => void;
    onAssistantChunk?: (sessionId: string, messageId: string, delta: string) => void;
    onAssistantComplete?: (message: ChatMessage) => void;
    onError?: (error: string) => void;
  }
): Promise<void> {
  const response = await fetch('/api/chat/messages?stream=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(messageRequest),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.substring(7);
        // 处理事件...
      }
    }
  }
}
```

## 🔄 自动重连

### 前端实现

```typescript
function useSseConnection(options: UseSseConnectionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const es = new EventSource(`${options.url}?token=${token}`);
    
    es.addEventListener('connected', () => {
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      
      // 指数退避重连
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    setEventSource(es);
  }, [options.url]);

  useEffect(() => {
    connect();
    return () => {
      eventSource?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isConnected, eventSource };
}
```

## 🛡 安全考虑

### 1. 认证

- SSE 连接通过 JWT token 认证
- Token 可以通过查询参数或 Authorization header 传递
- 连接建立时验证 token，无效则拒绝连接

### 2. 权限控制

- 用户只能接收自己相关的消息
- 会话参与者验证在服务层完成
- 广播时只向会话参与者推送

### 3. 连接管理

- 每个用户可以有多个连接（多设备支持）
- 连接断开时自动清理
- 心跳机制检测连接状态

## 📊 性能优化

### 1. 连接池管理

- 限制每个用户的最大连接数
- 定期清理无效连接
- 使用连接ID跟踪连接

### 2. 消息批处理

- 短时间内多条消息可以合并推送
- 减少网络往返次数

### 3. 心跳优化

- 心跳间隔：30秒
- 超时检测：60秒无响应视为断开

## 🔍 故障排查

### 问题：连接无法建立

**可能原因**：
- Token 无效或过期
- 网络问题
- 服务器未启动

**解决方法**：
- 检查 token 有效性
- 检查网络连接
- 查看服务器日志

### 问题：消息未收到

**可能原因**：
- 连接已断开
- 用户不在会话参与者列表中
- 事件类型不匹配

**解决方法**：
- 检查连接状态
- 确认用户权限
- 检查事件监听器

### 问题：流式响应中断

**可能原因**：
- 网络不稳定
- 服务器超时
- AI 服务异常

**解决方法**：
- 实现重试机制
- 增加超时时间
- 检查 AI 服务状态

## 📚 相关文档

- [后端核心与中间件规范](BACKEND-RULES.md)
- [统一 API 响应与控制器规范](API-RESPONSE-RULES.md)
