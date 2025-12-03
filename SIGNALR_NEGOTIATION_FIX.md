# SignalR 协商失败问题诊断与解决方案

## 问题描述
```
FailedToNegotiateWithServerError: Failed to complete negotiation with the server: 
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 根本原因分析

### 问题症状
- SignalR 客户端在协商阶段收到 HTML 响应而不是 JSON
- 通常表现为 `<!DOCTYPE` 开头的 HTML 错误页面
- 这说明请求被拦截并返回了错误页面

### 可能的原因（按优先级）

1. **❌ JWT 认证失败**
   - Token 过期或无效
   - Token 格式错误
   - Token 未正确传递给 SignalR

2. **❌ CORS 预检失败**
   - OPTIONS 请求被拒绝
   - 跨域头配置不正确

3. **❌ 中间件拦截**
   - 异常处理中间件返回 HTML
   - 认证中间件返回 HTML 错误页面

4. **❌ 服务器返回 5xx 错误**
   - 返回 HTML 错误页面而不是 JSON

## 当前配置分析

### 服务器端 (Program.cs)

✅ **已正确配置：**
```csharp
// SignalR 已配置
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors = true;  // ✅ 开发环境启用详细错误
    }
}).AddJsonProtocol(options => { /* ... */ });

// CORS 已配置
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();  // ✅ 支持凭证
    });
});

// JWT 认证已配置
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(accessToken) &&
            (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/apiservice/hubs")))
        {
            context.Token = accessToken;  // ✅ 从 query string 读取 token
        }
        return Task.CompletedTask;
    }
};

// Hub 映射已配置
app.MapHub<NotificationHub>("/hubs/notification").RequireAuthorization();
```

### 客户端配置 (useSignalRConnection.ts)

✅ **已正确配置：**
```typescript
const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
        accessTokenFactory: () => token || '',  // ✅ 提供 token
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({ /* ... */ })
    .withHubProtocol(new signalR.JsonHubProtocol())
    .configureLogging(signalR.LogLevel.Information)
    .build();
```

## 诊断步骤

### 1️⃣ 检查浏览器控制台
打开浏览器开发者工具 (F12) → Network 标签，查找：
- 协商请求：`GET /hubs/notification/negotiate?...`
- 查看响应状态码和内容

### 2️⃣ 检查 Token 状态
```typescript
// 在 useSignalRConnection.ts 中添加调试日志
const token = tokenUtils.getToken();
console.log('Token 存在:', !!token);
console.log('Token 长度:', token?.length);
console.log('Token 前缀:', token?.substring(0, 20) + '...');
```

### 3️⃣ 检查服务器日志
查看 dotnet watch 输出中是否有错误信息

## 解决方案

### 方案 A：改进错误处理和日志（推荐）

**修改 `useSignalRConnection.ts`：**

```typescript
function createConnection(hubUrl: string): signalR.HubConnection {
  const token = tokenUtils.getToken();

  console.log('[SignalR] 创建连接:', {
    hubUrl,
    hasToken: !!token,
    tokenLength: token?.length,
  });

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => {
        const currentToken = tokenUtils.getToken();
        console.log('[SignalR] accessTokenFactory 被调用，token 长度:', currentToken?.length);
        return currentToken || '';
      },
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryCount) => {
        if (retryCount === 0) return 1000;
        if (retryCount === 1) return 2000;
        if (retryCount === 2) return 4000;
        if (retryCount === 3) return 8000;
        if (retryCount === 4) return 16000;
        return 30000;
      },
    })
    .withHubProtocol(new signalR.JsonHubProtocol())
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // 添加连接状态变化的日志
  connection.onreconnecting((error) => {
    console.log('[SignalR] 重新连接中...', error);
  });

  connection.onreconnected(() => {
    console.log('[SignalR] 重新连接成功');
  });

  connection.onclose((error) => {
    console.log('[SignalR] 连接关闭', error);
  });

  return connection;
}
```

### 方案 B：改进服务器端错误处理

**修改 `Program.cs` 的 JWT 事件处理：**

```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        var path = context.HttpContext.Request.Path;

        if (!string.IsNullOrEmpty(accessToken) &&
            (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/apiservice/hubs")))
        {
            context.Token = accessToken;
            System.Diagnostics.Debug.WriteLine($"[SignalR Auth] Token 已从 query string 读取，长度: {accessToken.Length}");
        }

        return Task.CompletedTask;
    },
    OnAuthenticationFailed = context =>
    {
        var path = context.HttpContext.Request.Path;
        if (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/apiservice/hubs"))
        {
            System.Diagnostics.Debug.WriteLine($"[SignalR Auth] 认证失败: {context.Exception?.Message}");
        }
        return Task.CompletedTask;
    },
    OnChallenge = context =>
    {
        var path = context.HttpContext.Request.Path;
        if (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/apiservice/hubs"))
        {
            System.Diagnostics.Debug.WriteLine($"[SignalR Auth] 挑战: {context.Challenge}");
        }
        context.HandleResponse();
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        
        var response = System.Text.Json.JsonSerializer.Serialize(new
        {
            error = "UNAUTHORIZED",
            message = "未提供有效的认证令牌",
            traceId = context.HttpContext.TraceIdentifier
        });
        
        return context.Response.WriteAsync(response);
    }
};
```

### 方案 C：检查 Token 有效性

**在登录后立即验证 Token：**

```typescript
// 在 login 或 auth 相关代码中
const token = tokenUtils.getToken();
if (token) {
  try {
    // 解析 JWT（不验证签名，仅检查格式）
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Token 格式无效');
      return;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    
    console.log('[Auth] Token 信息:', {
      expiresAt: expiresAt.toISOString(),
      isExpired: now > expiresAt,
      timeToExpire: Math.round((expiresAt.getTime() - now.getTime()) / 1000) + 's'
    });
  } catch (error) {
    console.error('Token 解析失败:', error);
  }
}
```

### 方案 D：添加协商请求拦截器

**创建 `src/utils/signalrDebug.ts`：**

```typescript
/**
 * SignalR 调试工具 - 拦截协商请求
 */

export function enableSignalRDebug() {
  // 拦截 fetch 请求
  const originalFetch = window.fetch;
  
  window.fetch = function(...args: any[]) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    
    if (url && url.includes('/negotiate')) {
      console.log('[SignalR Negotiate] 请求:', {
        url,
        method: config?.method || 'GET',
        headers: config?.headers,
      });
      
      return originalFetch.apply(this, args).then((response) => {
        console.log('[SignalR Negotiate] 响应:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
        });
        
        // 克隆响应以便读取内容
        const clonedResponse = response.clone();
        clonedResponse.text().then((text) => {
          if (!text.startsWith('{')) {
            console.error('[SignalR Negotiate] ❌ 响应不是 JSON:', text.substring(0, 200));
          } else {
            console.log('[SignalR Negotiate] ✅ 响应是有效的 JSON');
          }
        });
        
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
}
```

**在应用初始化时调用：**

```typescript
// 在 main.tsx 或 app.tsx 中
import { enableSignalRDebug } from '@/utils/signalrDebug';

if (process.env.NODE_ENV === 'development') {
  enableSignalRDebug();
}
```

## 快速检查清单

- [ ] **Token 是否存在？** 检查 `tokenUtils.getToken()` 是否返回非空值
- [ ] **Token 是否过期？** 检查 JWT 的 `exp` 字段
- [ ] **服务器是否运行？** 检查 `dotnet watch` 是否显示 "Build succeeded"
- [ ] **Hub 路由是否正确？** 检查 `Program.cs` 中的 `MapHub` 配置
- [ ] **CORS 源是否匹配？** 检查客户端 URL 是否在 `AllowedOrigins` 中
- [ ] **浏览器控制台是否有错误？** 打开 F12 查看 Network 和 Console 标签

## 常见错误及解决

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `<!DOCTYPE html>` | 返回 HTML 错误页面 | 检查认证和 CORS |
| `401 Unauthorized` | Token 无效或过期 | 重新登录获取新 Token |
| `403 Forbidden` | 权限不足 | 检查用户角色和权限 |
| `CORS error` | 跨域请求被拒绝 | 检查 CORS 配置 |
| `WebSocket upgrade failed` | WebSocket 不支持 | 使用 LongPolling 作为备选 |

## 推荐的完整解决步骤

1. **启用调试日志**
   - 在客户端启用 `enableSignalRDebug()`
   - 在服务器启用详细错误消息

2. **检查 Token**
   - 验证 Token 是否存在和有效
   - 检查 Token 是否过期

3. **检查网络请求**
   - 打开浏览器 DevTools
   - 查看 `/negotiate` 请求的响应

4. **查看服务器日志**
   - 检查 `dotnet watch` 输出
   - 查找认证相关的错误

5. **测试连接**
   - 使用简单的测试页面验证 SignalR 连接
   - 逐步增加复杂度

## 参考资源

- [ASP.NET Core SignalR 认证](https://docs.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz)
- [SignalR JavaScript 客户端](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [SignalR 故障排除](https://docs.microsoft.com/en-us/aspnet/core/signalr/troubleshoot)

