# SignalR 协商失败快速排查指南

## 🚨 错误信息
```
FailedToNegotiateWithServerError: Failed to complete negotiation with the server: 
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## ⚡ 快速诊断（5 分钟）

### 步骤 1: 启用调试模式
在你的应用初始化代码中添加（通常在 `main.tsx` 或 `app.tsx`）：

```typescript
import { enableAllSignalRDebug } from '@/utils/signalrDebug';

// 在应用启动时调用
enableAllSignalRDebug();
```

### 步骤 2: 打开浏览器开发者工具
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 查看是否有 SignalR 相关的错误日志

### 步骤 3: 检查诊断信息
在浏览器控制台执行：
```javascript
// 查看完整诊断信息
__signalrDebug.printSignalRDiagnostics()

// 检查 Token 有效性
__signalrDebug.checkTokenValidity()

// 测试协商请求
__signalrDebug.testSignalRNegotiate('http://localhost:15001/hubs/notification')
```

---

## 🔍 常见问题排查表

| 症状 | 可能原因 | 检查方法 | 解决方案 |
|------|--------|--------|--------|
| **Token 不存在** | 用户未登录 | `__signalrDebug.checkTokenValidity()` | 重新登录 |
| **Token 已过期** | Token 过期 | 检查 Token 的 `exp` 字段 | 刷新 Token 或重新登录 |
| **协商返回 HTML** | 认证失败 | 查看 Network 标签的响应 | 检查 Token 是否正确传递 |
| **协商返回 401** | 权限不足 | 检查服务器日志 | 检查用户权限配置 |
| **协商返回 403** | CORS 被拒绝 | 检查 CORS 错误 | 检查 CORS 配置 |
| **WebSocket 连接失败** | 服务器不支持 WS | 查看 Network 标签 | 使用 LongPolling 作为备选 |

---

## 🛠️ 详细排查步骤

### 问题 1: Token 不存在或无效

**检查 Token：**
```javascript
// 在浏览器控制台执行
__signalrDebug.checkTokenValidity()
```

**预期输出（有效）：**
```
{
  status: '✅',
  message: 'Token 有效',
  token: {
    payload: { ... },
    expiresAt: '2025-12-02T10:00:00.000Z',
    isExpired: false,
    timeToExpire: '3600s',
    isValid: true
  }
}
```

**预期输出（无效）：**
```
{
  status: '❌',
  message: 'Token 不存在',
  token: null
}
```

**解决方案：**
- 如果 Token 不存在，需要重新登录
- 如果 Token 已过期，需要刷新 Token

---

### 问题 2: 协商请求返回 HTML

**检查网络请求：**
1. 打开 DevTools → Network 标签
2. 刷新页面
3. 查找 `/negotiate` 请求
4. 查看 Response 标签

**如果看到 `<!DOCTYPE html>`：**
- 说明服务器返回了错误页面
- 可能是认证失败或服务器错误

**解决方案：**
1. 检查 Token 是否正确
2. 检查服务器日志（`dotnet watch` 输出）
3. 检查 CORS 配置

---

### 问题 3: 服务器返回 401 Unauthorized

**检查服务器日志：**
```bash
# 查看 dotnet watch 输出
# 应该看到类似的日志：
# [SignalR Auth] 认证失败: ...
```

**可能的原因：**
- Token 格式错误
- Token 未正确传递给服务器
- Token 签名无效

**解决方案：**
1. 验证 Token 格式（应该是 `xxx.yyy.zzz` 三部分）
2. 检查 `accessTokenFactory` 是否正确返回 Token
3. 检查服务器的 JWT 配置

---

### 问题 4: CORS 错误

**浏览器控制台错误信息：**
```
Access to XMLHttpRequest at 'http://localhost:15001/...' from origin 'http://localhost:15000' 
has been blocked by CORS policy
```

**检查 CORS 配置：**
查看 `Program.cs` 中的 CORS 配置：
```csharp
var allowedOrigins = new[]
{
    "http://localhost:15000",  // 管理后台
    "http://localhost:15001",  // 其他应用
    "http://localhost:15002",  // 其他应用
};
```

**解决方案：**
1. 确保客户端 URL 在 `allowedOrigins` 中
2. 确保 `AllowCredentials()` 已启用
3. 重启服务器使配置生效

---

## 📊 完整诊断流程

```
开始
  ↓
[1] 启用调试模式
  ↓
[2] 打开浏览器 DevTools
  ↓
[3] 执行 __signalrDebug.checkTokenValidity()
  ├─ Token 不存在？ → 重新登录
  ├─ Token 已过期？ → 刷新 Token
  └─ Token 有效？ → 继续
  ↓
[4] 查看 Network 标签的 /negotiate 请求
  ├─ 返回 HTML？ → 检查认证
  ├─ 返回 401？ → 检查 Token 传递
  ├─ 返回 403？ → 检查 CORS
  └─ 返回 200 + JSON？ → 继续
  ↓
[5] 执行 __signalrDebug.testSignalRNegotiate()
  ├─ 成功？ → 问题已解决 ✅
  └─ 失败？ → 查看错误信息
  ↓
[6] 检查服务器日志
  ├─ 有错误？ → 根据错误修复
  └─ 无错误？ → 联系开发人员
```

---

## 🔧 服务器端调试

### 启用详细日志

**在 `Program.cs` 中：**
```csharp
builder.Services.AddSignalR(options =>
{
    // 开发环境启用详细错误
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors = true;
    }
})
```

### 查看认证日志

在 `Program.cs` 的 JWT 配置中添加日志：
```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var path = context.HttpContext.Request.Path;
        if (path.StartsWithSegments("/hubs"))
        {
            System.Diagnostics.Debug.WriteLine($"[SignalR] Token 长度: {context.Request.Query["access_token"].ToString().Length}");
        }
        return Task.CompletedTask;
    },
    OnAuthenticationFailed = context =>
    {
        System.Diagnostics.Debug.WriteLine($"[SignalR] 认证失败: {context.Exception?.Message}");
        return Task.CompletedTask;
    }
};
```

---

## 📋 检查清单

在联系开发人员之前，请确保已检查以下项目：

- [ ] Token 存在且有效（未过期）
- [ ] 浏览器控制台没有 CORS 错误
- [ ] 服务器正在运行（`dotnet watch` 显示 "Build succeeded"）
- [ ] Hub 路由正确（`/hubs/notification`）
- [ ] 客户端 URL 在服务器的 `AllowedOrigins` 中
- [ ] 已尝试刷新页面和清除浏览器缓存
- [ ] 已尝试重新登录

---

## 🆘 获取帮助

如果问题仍未解决，请收集以下信息：

1. **浏览器控制台输出**
   ```javascript
   __signalrDebug.printSignalRDiagnostics()
   ```

2. **Network 标签截图**
   - `/negotiate` 请求的完整信息
   - 响应头和响应体

3. **服务器日志**
   - `dotnet watch` 的完整输出
   - 特别是 SignalR 相关的错误

4. **环境信息**
   - 浏览器版本
   - 操作系统
   - 网络环境（是否在代理后面）

---

## 📚 相关文档

- [SignalR 诊断指南](./SIGNALR_NEGOTIATION_FIX.md)
- [SignalR 实现总结](./Platform.Admin/docs/SIGNALR_IMPLEMENTATION_SUMMARY.md)
- [ASP.NET Core SignalR 官方文档](https://docs.microsoft.com/en-us/aspnet/core/signalr/)

