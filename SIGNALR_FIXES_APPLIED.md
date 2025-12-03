# SignalR 协商失败 - 已应用的修复

## 📝 问题总结

客户端在连接 SignalR Hub 时收到以下错误：
```
FailedToNegotiateWithServerError: Failed to complete negotiation with the server: 
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

这表示服务器返回了 HTML 错误页面而不是预期的 JSON 协商响应。

---

## ✅ 已应用的修复

### 1. 改进客户端错误日志（useSignalRConnection.ts）

**修改内容：**
- 添加详细的调试日志，显示 Token 信息
- 记录连接状态变化（重新连接、连接关闭等）
- 改进错误消息，包含更多诊断信息

**文件：** `Platform.Admin/src/hooks/useSignalRConnection.ts`

**关键改进：**
```typescript
// 1. 创建连接时记录 Token 信息
console.log('[SignalR] 创建连接:', {
  hubUrl,
  hasToken: !!token,
  tokenLength: token?.length,
});

// 2. accessTokenFactory 被调用时记录
accessTokenFactory: () => {
  const currentToken = tokenUtils.getToken();
  console.log('[SignalR] accessTokenFactory 被调用，token 长度:', currentToken?.length);
  return currentToken || '';
}

// 3. 连接状态变化时记录
connection.onreconnecting((error) => {
  console.warn('[SignalR] 重新连接中...', error?.message);
});

connection.onreconnected(() => {
  console.log('[SignalR] ✅ 重新连接成功');
});

connection.onclose((error) => {
  console.warn('[SignalR] 连接关闭', error?.message);
});

// 4. 连接失败时记录详细信息
catch (error) {
  console.error('[SignalR] ❌ 连接失败:', {
    message: err.message,
    stack: err.stack,
    hubUrl,
    hasToken: !!tokenUtils.getToken(),
  });
}
```

---

### 2. 创建 SignalR 调试工具库（signalrDebug.ts）

**文件：** `Platform.Admin/src/utils/signalrDebug.ts`

**功能：**

#### a) JWT Token 解析和验证
```typescript
// 检查 Token 有效性
checkTokenValidity()
// 返回: { status, message, token: { payload, expiresAt, isExpired, ... } }

// 解析 JWT Token
parseJWT(token)
// 返回: { payload, expiresAt, isExpired, timeToExpire, isValid }
```

#### b) 协商请求拦截
```typescript
// 拦截所有 /negotiate 请求并记录详细信息
enableSignalRNegotiateDebug()
// 显示请求头、响应状态、响应内容
```

#### c) 完整诊断
```typescript
// 打印完整的诊断信息
printSignalRDiagnostics()
// 显示: Token 状态、浏览器信息、SignalR 配置
```

#### d) 协商请求测试
```typescript
// 手动测试协商请求
testSignalRNegotiate(hubUrl)
// 返回: { success, data/error, response }
```

#### e) 一键启用所有调试
```typescript
// 启用所有调试功能并暴露工具到全局
enableAllSignalRDebug()
// 在浏览器控制台可使用: __signalrDebug.*
```

---

## 🚀 使用方法

### 在应用中启用调试

**修改 `main.tsx` 或 `app.tsx`：**

```typescript
import { enableAllSignalRDebug } from '@/utils/signalrDebug';

// 在应用启动时调用（开发环境）
if (process.env.NODE_ENV === 'development') {
  enableAllSignalRDebug();
}
```

### 在浏览器控制台进行诊断

```javascript
// 1. 查看完整诊断信息
__signalrDebug.printSignalRDiagnostics()

// 2. 检查 Token 有效性
__signalrDebug.checkTokenValidity()

// 3. 解析 Token 查看详细信息
__signalrDebug.parseJWT(token)

// 4. 测试协商请求
__signalrDebug.testSignalRNegotiate('http://localhost:15001/hubs/notification')
```

---

## 🔍 诊断流程

### 快速诊断（5 分钟）

1. **启用调试**
   ```javascript
   enableAllSignalRDebug()
   ```

2. **检查 Token**
   ```javascript
   __signalrDebug.checkTokenValidity()
   ```
   - 如果 Token 不存在 → 重新登录
   - 如果 Token 已过期 → 刷新 Token
   - 如果 Token 有效 → 继续

3. **测试协商**
   ```javascript
   __signalrDebug.testSignalRNegotiate('http://localhost:15001/hubs/notification')
   ```
   - 如果返回 JSON → 问题已解决
   - 如果返回 HTML → 检查认证
   - 如果返回 401 → 检查 Token 传递

4. **查看浏览器 DevTools**
   - Network 标签：查看 `/negotiate` 请求
   - Console 标签：查看 SignalR 日志

---

## 📊 常见问题及解决方案

### 问题 1: Token 不存在

**症状：**
```
checkTokenValidity() 返回 { status: '❌', message: 'Token 不存在' }
```

**原因：** 用户未登录或 Token 未正确保存

**解决方案：**
1. 确保用户已登录
2. 检查 `tokenUtils.getToken()` 实现
3. 检查浏览器本地存储/会话存储

---

### 问题 2: Token 已过期

**症状：**
```
checkTokenValidity() 返回 { status: '❌', message: 'Token 已过期' }
```

**原因：** JWT Token 的 `exp` 时间已过

**解决方案：**
1. 实现 Token 刷新机制
2. 在 Token 过期前自动刷新
3. 或要求用户重新登录

---

### 问题 3: 协商返回 HTML

**症状：**
```
testSignalRNegotiate() 返回 HTML 响应
浏览器控制台显示: "❌ 响应是 HTML（不是 JSON）"
```

**原因：** 
- 认证失败
- 服务器返回错误页面
- CORS 被拒绝

**解决方案：**
1. 检查 Token 是否正确传递
2. 查看服务器日志
3. 检查 CORS 配置

---

### 问题 4: 协商返回 401

**症状：**
```
testSignalRNegotiate() 返回 { status: 401, statusText: 'Unauthorized' }
```

**原因：** 
- Token 无效
- Token 格式错误
- 服务器 JWT 配置问题

**解决方案：**
1. 验证 Token 格式（应该是 `xxx.yyy.zzz`）
2. 检查 Token 签名是否匹配
3. 检查服务器的 JWT 密钥配置

---

### 问题 5: 协商返回 403

**症状：**
```
浏览器控制台 CORS 错误
testSignalRNegotiate() 返回 { status: 403 }
```

**原因：** CORS 被拒绝

**解决方案：**
1. 检查 `Program.cs` 中的 `AllowedOrigins`
2. 确保客户端 URL 在列表中
3. 确保 `AllowCredentials()` 已启用
4. 重启服务器

---

## 🛠️ 服务器端配置检查

### 检查 SignalR 配置

**文件：** `Platform.ApiService/Program.cs`

✅ **应该包含：**
```csharp
// 1. SignalR 服务注册
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors = true;
    }
}).AddJsonProtocol(options => { /* ... */ });

// 2. CORS 配置
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();  // ✅ 必须启用
    });
});

// 3. JWT 认证配置
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(accessToken) &&
            path.StartsWithSegments("/hubs"))
        {
            context.Token = accessToken;  // ✅ 从 query string 读取
        }
        return Task.CompletedTask;
    }
};

// 4. Hub 映射
app.MapHub<NotificationHub>("/hubs/notification").RequireAuthorization();
```

### 检查 Hub 实现

**文件：** `Platform.ApiService/Hubs/NotificationHub.cs`

✅ **应该包含：**
```csharp
[Authorize]  // ✅ 需要认证
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // 获取用户信息
        var userId = _noticeFactory.GetRequiredUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        await base.OnConnectedAsync();
    }
}
```

---

## 📋 完整检查清单

在联系开发人员之前，请确保：

- [ ] 已启用调试模式 (`enableAllSignalRDebug()`)
- [ ] Token 存在且有效 (`checkTokenValidity()`)
- [ ] 协商请求返回 JSON (`testSignalRNegotiate()`)
- [ ] 服务器正在运行 (`dotnet watch` 显示 "Build succeeded")
- [ ] 浏览器控制台无 CORS 错误
- [ ] 客户端 URL 在 `AllowedOrigins` 中
- [ ] 已尝试刷新页面
- [ ] 已尝试清除浏览器缓存
- [ ] 已尝试重新登录

---

## 📚 相关文件

- **诊断指南：** `SIGNALR_NEGOTIATION_FIX.md`
- **快速排查：** `SIGNALR_TROUBLESHOOTING_QUICK_GUIDE.md`
- **客户端 Hook：** `Platform.Admin/src/hooks/useSignalRConnection.ts`
- **调试工具：** `Platform.Admin/src/utils/signalrDebug.ts`
- **服务器配置：** `Platform.ApiService/Program.cs`
- **Hub 实现：** `Platform.ApiService/Hubs/NotificationHub.cs`

---

## 🎯 下一步

1. **启用调试**
   - 在应用中调用 `enableAllSignalRDebug()`

2. **运行诊断**
   - 在浏览器控制台执行诊断命令

3. **收集信息**
   - 记录诊断输出
   - 截图 Network 标签
   - 保存服务器日志

4. **应用修复**
   - 根据诊断结果应用相应的修复
   - 参考上面的"常见问题及解决方案"

5. **验证**
   - 测试 SignalR 连接
   - 确认实时功能正常工作

---

## 💡 提示

- 始终在开发环境启用详细日志
- 定期检查 Token 有效性
- 使用浏览器 DevTools 监控网络请求
- 保存诊断信息便于问题排查

