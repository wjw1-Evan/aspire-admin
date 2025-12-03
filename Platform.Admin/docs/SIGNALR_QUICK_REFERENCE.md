# SignalR 快速参考

## 🚀 快速开始

### 基础用法

```typescript
import { useSignalRConnection } from '@/hooks/useSignalRConnection';

function MyComponent() {
  const { isConnected, on, off, invoke } = useSignalRConnection({
    hubUrl: '/hubs/chat',
    autoConnect: true,
  });

  // 监听事件
  useEffect(() => {
    on('MessageReceived', (message) => {
      console.log('新消息:', message);
    });

    return () => off('MessageReceived');
  }, [on, off]);

  // 调用方法
  const sendMessage = async () => {
    await invoke('SendMessageAsync', { content: 'Hello' });
  };

  return <div>{isConnected ? '已连接' : '未连接'}</div>;
}
```

---

## 📚 API 参考

### useSignalRConnection Hook

```typescript
const {
  connection,      // HubConnection | null
  isConnected,     // boolean
  isConnecting,    // boolean
  connect,         // () => Promise<void>
  disconnect,      // () => Promise<void>
  on,              // <T>(name: string, handler: (...args: T[]) => void) => void
  off,             // (name: string) => void
  invoke,          // <T>(name: string, ...args: any[]) => Promise<T>
} = useSignalRConnection(options);
```

### 选项

```typescript
interface UseSignalRConnectionOptions {
  hubUrl: string;              // Hub URL
  onConnected?: () => void;    // 连接成功回调
  onDisconnected?: () => void; // 连接断开回调
  onError?: (error: Error) => void; // 错误回调
  autoConnect?: boolean;       // 自动连接（默认 true）
}
```

---

## 🎯 常用场景

### 场景 1: 实时消息

```typescript
const { isConnected, on, off } = useSignalRConnection({
  hubUrl: '/hubs/chat',
});

useEffect(() => {
  if (!isConnected) return;

  on('ReceiveMessage', (message) => {
    setMessages(prev => [...prev, message]);
  });

  return () => off('ReceiveMessage');
}, [isConnected, on, off]);
```

### 场景 2: 订阅数据更新

```typescript
const { isConnected, invoke, on, off } = useSignalRConnection({
  hubUrl: '/hubs/system-resource',
});

useEffect(() => {
  if (!isConnected) return;

  // 订阅更新
  invoke('SubscribeResourceUpdatesAsync', 5000);

  // 监听更新
  on('ResourceUpdated', (resources) => {
    setResources(resources);
  });

  return () => off('ResourceUpdated');
}, [isConnected, invoke, on, off]);
```

### 场景 3: 上报数据

```typescript
const { isConnected, invoke } = useSignalRConnection({
  hubUrl: '/hubs/location',
});

const reportLocation = async (position) => {
  if (!isConnected) return;

  try {
    await invoke('ReportLocationAsync', {
      latitude: position.lat,
      longitude: position.lng,
      accuracy: position.accuracy,
    });
  } catch (error) {
    console.error('上报失败:', error);
  }
};
```

### 场景 4: 加入/离开组

```typescript
const { isConnected, invoke } = useSignalRConnection({
  hubUrl: '/hubs/chat',
});

const joinSession = async (sessionId) => {
  if (!isConnected) return;
  await invoke('JoinSessionAsync', sessionId);
};

const leaveSession = async (sessionId) => {
  if (!isConnected) return;
  await invoke('LeaveSessionAsync', sessionId);
};
```

---

## 🔗 Hub 方法

### ChatHub

```typescript
// 客户端调用
await invoke('JoinSessionAsync', sessionId);
await invoke('LeaveSessionAsync', sessionId);
await invoke('SendMessageAsync', request);

// 服务器推送
on('ReceiveMessage', handler);
on('MessageDeleted', handler);
on('SessionUpdated', handler);
on('SessionRead', handler);
```

### SystemResourceHub

```typescript
// 客户端调用
await invoke('SubscribeResourceUpdatesAsync', interval);

// 服务器推送
on('ResourceUpdated', handler);
```

### LocationHub

```typescript
// 客户端调用
await invoke('ReportLocationAsync', locationData);

// 服务器推送
on('LocationUpdated', handler);
```

### NotificationHub

```typescript
// 服务器推送
on('NotificationCreated', handler);
on('NotificationRead', handler);
```

---

## ⚙️ 配置

### 连接 URL

```typescript
// 开发环境
const hubUrl = 'http://localhost:5000/hubs/chat';

// 生产环境
const hubUrl = `${getApiBaseUrl()}/hubs/chat`;
```

### 重连策略

```typescript
// 自动重连（指数退避）
// 1s → 2s → 4s → 8s → 16s → 30s → 30s...

// 自定义重连策略
const connection = new HubConnectionBuilder()
  .withAutomaticReconnect({
    nextRetryDelayInMilliseconds: (retryCount) => {
      return Math.min(1000 * Math.pow(2, retryCount), 30000);
    },
  })
  .build();
```

### 传输方式

```typescript
// 自动选择（WebSocket 优先，降级到 LongPolling）
.withUrl(hubUrl, {
  transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
})

// 仅 WebSocket
.withUrl(hubUrl, {
  transport: HttpTransportType.WebSockets,
})

// 仅 LongPolling
.withUrl(hubUrl, {
  transport: HttpTransportType.LongPolling,
})
```

---

## 🐛 调试

### 启用日志

```typescript
const { connection } = useSignalRConnection({
  hubUrl: '/hubs/chat',
});

// 在浏览器控制台查看日志
connection?.on('connected', () => {
  console.log('已连接');
});
```

### 监控连接状态

```typescript
const { isConnected, isConnecting } = useSignalRConnection({
  hubUrl: '/hubs/chat',
  onConnected: () => console.log('✅ 已连接'),
  onDisconnected: () => console.log('❌ 已断开'),
  onError: (error) => console.error('⚠️ 错误:', error),
});

// 在 UI 中显示状态
return (
  <div>
    {isConnecting && <span>连接中...</span>}
    {isConnected && <span>✅ 已连接</span>}
    {!isConnected && !isConnecting && <span>❌ 未连接</span>}
  </div>
);
```

### 监控消息

```typescript
on('ReceiveMessage', (message) => {
  console.log('📨 收到消息:', {
    id: message.id,
    content: message.content,
    timestamp: new Date(message.createdAt),
    latency: Date.now() - new Date(message.createdAt).getTime(),
  });
});
```

---

## ⚠️ 常见错误

### 错误 1: 连接失败

```
Error: Failed to connect to the server
```

**解决**:
```typescript
const { isConnected } = useSignalRConnection({
  hubUrl: '/hubs/chat',
  onError: (error) => {
    console.error('连接错误:', error.message);
    // 检查 URL 是否正确
    // 检查后端是否运行
    // 检查 CORS 配置
  },
});
```

### 错误 2: 认证失败

```
Error: Unauthorized
```

**解决**:
```typescript
// 确保 Token 有效
const token = tokenUtils.getToken();
if (!token) {
  console.error('Token 不存在');
  return;
}

const { isConnected } = useSignalRConnection({
  hubUrl: '/hubs/chat',
  // Hook 会自动传递 token
});
```

### 错误 3: 事件未触发

```typescript
// ❌ 错误：监听后立即取消
on('Event', handler);
off('Event');

// ✅ 正确：在 useEffect 中管理
useEffect(() => {
  on('Event', handler);
  return () => off('Event');
}, [on, off]);
```

### 错误 4: 内存泄漏

```typescript
// ❌ 错误：未清理监听
useEffect(() => {
  on('Event', handler);
  // 缺少清理函数
}, [on]);

// ✅ 正确：正确清理
useEffect(() => {
  on('Event', handler);
  return () => off('Event');
}, [on, off]);
```

---

## 📊 性能优化

### 1. 消息去重

```typescript
const messageIds = new Set<string>();

on('ReceiveMessage', (message) => {
  if (messageIds.has(message.id)) {
    return; // 跳过重复消息
  }
  messageIds.add(message.id);
  setMessages(prev => [...prev, message]);
});
```

### 2. 消息限制

```typescript
const MAX_MESSAGES = 1000;

on('ReceiveMessage', (message) => {
  setMessages(prev => {
    const updated = [...prev, message];
    if (updated.length > MAX_MESSAGES) {
      return updated.slice(-MAX_MESSAGES);
    }
    return updated;
  });
});
```

### 3. 批量更新

```typescript
let pendingMessages: ChatMessage[] = [];
let updateTimer: NodeJS.Timeout | null = null;

on('ReceiveMessage', (message) => {
  pendingMessages.push(message);

  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    setMessages(prev => [...prev, ...pendingMessages]);
    pendingMessages = [];
  }, 100); // 100ms 批量更新
});
```

### 4. 虚拟滚动

```typescript
import { List } from 'react-virtualized';

<List
  width={400}
  height={600}
  rowCount={messages.length}
  rowHeight={50}
  rowRenderer={({ index, key, style }) => (
    <div key={key} style={style}>
      {messages[index].content}
    </div>
  )}
/>
```

---

## 🔐 安全建议

### 1. 验证消息来源

```typescript
on('ReceiveMessage', (message) => {
  // 验证消息来自授权用户
  if (!isAuthorizedUser(message.senderId)) {
    console.warn('未授权的消息:', message);
    return;
  }
  setMessages(prev => [...prev, message]);
});
```

### 2. 验证数据完整性

```typescript
on('ReceiveMessage', (message) => {
  // 验证必要字段
  if (!message.id || !message.content || !message.senderId) {
    console.error('消息数据不完整:', message);
    return;
  }
  setMessages(prev => [...prev, message]);
});
```

### 3. 限制消息大小

```typescript
const MAX_MESSAGE_SIZE = 10000; // 10KB

on('ReceiveMessage', (message) => {
  if (JSON.stringify(message).length > MAX_MESSAGE_SIZE) {
    console.error('消息过大:', message);
    return;
  }
  setMessages(prev => [...prev, message]);
});
```

---

## 📈 监控和分析

### 连接指标

```typescript
const connectionMetrics = {
  connectTime: 0,
  reconnectCount: 0,
  lastError: null,
};

const { isConnected } = useSignalRConnection({
  hubUrl: '/hubs/chat',
  onConnected: () => {
    connectionMetrics.connectTime = Date.now();
    console.log('连接耗时:', Date.now() - connectionMetrics.connectTime, 'ms');
  },
  onError: (error) => {
    connectionMetrics.reconnectCount++;
    connectionMetrics.lastError = error.message;
  },
});
```

### 消息指标

```typescript
const messageMetrics = {
  received: 0,
  sent: 0,
  errors: 0,
  avgLatency: 0,
};

on('ReceiveMessage', (message) => {
  messageMetrics.received++;
  const latency = Date.now() - new Date(message.createdAt).getTime();
  messageMetrics.avgLatency = 
    (messageMetrics.avgLatency + latency) / 2;
});
```

---

## 🎓 最佳实践

### ✅ 推荐做法

1. **使用 Hook 管理连接**
   ```typescript
   const { isConnected, on, off } = useSignalRConnection({...});
   ```

2. **在 useEffect 中监听事件**
   ```typescript
   useEffect(() => {
     on('Event', handler);
     return () => off('Event');
   }, [on, off]);
   ```

3. **检查连接状态**
   ```typescript
   if (!isConnected) return;
   await invoke('Method');
   ```

4. **处理错误**
   ```typescript
   try {
     await invoke('Method');
   } catch (error) {
     console.error('调用失败:', error);
   }
   ```

### ❌ 避免做法

1. **不要在渲染中创建连接**
   ```typescript
   // ❌ 错误
   const connection = new HubConnectionBuilder().build();
   ```

2. **不要忘记清理监听**
   ```typescript
   // ❌ 错误
   useEffect(() => {
     on('Event', handler);
   }, [on]);
   ```

3. **不要阻塞主线程**
   ```typescript
   // ❌ 错误
   const result = await invoke('HeavyOperation');
   // 长时间处理
   ```

4. **不要重复连接**
   ```typescript
   // ❌ 错误
   connect();
   connect();
   connect();
   ```

---

## 📞 获取帮助

- 📖 [完整迁移指南](./SIGNALR_MIGRATION_GUIDE.md)
- 📝 [实现总结](./SIGNALR_IMPLEMENTATION_SUMMARY.md)
- 🔗 [SignalR 官方文档](https://learn.microsoft.com/en-us/aspnet/core/signalr/)

---

**快速参考 v1.0** | 最后更新: 2025-12-02

