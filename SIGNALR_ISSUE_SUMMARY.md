# SignalR 协商失败问题 - 完整解决方案

## 🚨 问题描述

```
FailedToNegotiateWithServerError: Failed to complete negotiation with the server: 
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**症状：** SignalR 客户端在协商阶段收到 HTML 错误页面而不是 JSON 响应

---

## 🔍 根本原因

SignalR 协商失败通常由以下原因引起（按优先级排序）：

1. **❌ JWT Token 问题**
   - Token 不存在（用户未登录）
   - Token 已过期
   - Token 格式错误
   - Token 未正确传递给服务器

2. **❌ 认证配置问题**
   - JWT 密钥配置不匹配
   - Token 签名验证失败
   - 服务器返回 401 Unauthorized

3. **❌ CORS 配置问题**
   - 客户端 URL 不在 `AllowedOrigins` 中
   - CORS 预检请求被拒绝
   - 缺少 `AllowCredentials()` 配置

4. **❌ 服务器配置问题**
   - SignalR 未正确配置
   - Hub 路由错误
   - 中间件拦截请求

---

## ✅ 已应用的解决方案

### 1️⃣ 改进客户端错误日志

**文件：** `Platform.Admin/src/hooks/useSignalRConnection.ts`

**改进内容：**
- ✅ 添加详细的 Token 信息日志
- ✅ 记录连接状态变化（重新连接、连接关闭）
- ✅ 改进错误消息，包含诊断信息

**关键日志：**
```
[SignalR] 创建连接: { hubUrl, hasToken, tokenLength }
[SignalR] accessTokenFactory 被调用，token 长度: xxx
[SignalR] 重新连接中... 
[SignalR] ✅ 重新连接成功
[SignalR] 连接关闭
[SignalR] ❌ 连接失败: { message, stack, hubUrl, hasToken }
```

---

### 2️⃣ 创建 SignalR 调试工具库

**文件：** `Platform.Admin/src/utils/signalrDebug.ts`

**功能模块：**

#### A. Token 验证工具
```typescript
// 检查 Token 有效性
checkTokenValidity()
// 返回: { status, message, token: { payload, expiresAt, isExpired, ... } }

// 解析 JWT Token
parseJWT(token)
// 返回: { payload, expiresAt, isExpired, timeToExpire, isValid }
```

#### B. 网络请求拦截
```typescript
// 拦截并记录所有 /negotiate 请求
enableSignalRNegotiateDebug()
// 显示: 请求头、响应状态、响应内容
```

#### C. 诊断工具
```typescript
// 打印完整诊断信息
printSignalRDiagnostics()
// 显示: Token 状态、浏览器信息、SignalR 配置

// 测试协商请求
testSignalRNegotiate(hubUrl)
// 返回: { success, data/error, response }
```

#### D. 一键启用
```typescript
// 启用所有调试功能
enableAllSignalRDebug()
// 暴露工具到全局: __signalrDebug.*
```

---

## 🚀 快速开始

### 步骤 1: 启用调试模式

在 `main.tsx` 或 `app.tsx` 中添加：

```typescript
import { enableAllSignalRDebug } from '@/utils/signalrDebug';

// 在应用启动时调用
if (process.env.NODE_ENV === 'development') {
  enableAllSignalRDebug();
}
```

### 步骤 2: 打开浏览器开发者工具

按 `F12` 打开 DevTools，切换到 **Console** 标签

### 步骤 3: 运行诊断命令

```javascript
// 1. 查看完整诊断信息
__signalrDebug.printSignalRDiagnostics()

// 2. 检查 Token 有效性
__signalrDebug.checkTokenValidity()

// 3. 测试协商请求
__signalrDebug.testSignalRNegotiate('http://localhost:15001/hubs/notification')
```

### 步骤 4: 根据诊断结果修复

参考下面的"常见问题及解决方案"

---

## 📊 常见问题及解决方案

### 问题 1: Token 不存在

**诊断输出：**
```
checkTokenValidity() → { status: '❌', message: 'Token 不存在' }
```

**原因：** 用户未登录或 Token 未正确保存

**解决方案：**
```
1. 确保用户已登录
2. 检查 tokenUtils.getToken() 实现
3. 检查浏览器本地存储/会话存储
4. 重新登录获取新 Token
```

---

### 问题 2: Token 已过期

**诊断输出：**
```
checkTokenValidity() → { status: '❌', message: 'Token 已过期' }
```

**原因：** JWT Token 的 `exp` 时间已过

**解决方案：**
```
1. 实现 Token 刷新机制
2. 在 Token 过期前自动刷新
3. 或要求用户重新登录
```

---

### 问题 3: 协商返回 HTML

**诊断输出：**
```
testSignalRNegotiate() → { success: false, error: 'Invalid JSON response' }
浏览器控制台 → "❌ 响应是 HTML（不是 JSON）"
```

**原因：** 认证失败或服务器返回错误页面

**解决方案：**
```
1. 检查 Token 是否正确传递
2. 查看浏览器 DevTools Network 标签
3. 查看服务器日志 (dotnet watch 输出)
4. 检查 CORS 配置
```

---

### 问题 4: 协商返回 401

**诊断输出：**
```
testSignalRNegotiate() → { success: false, error: 'HTTP 401' }
```

**原因：** Token 无效或服务器认证失败

**解决方案：**
```
1. 验证 Token 格式（应该是 xxx.yyy.zzz）
2. 检查 Token 签名是否匹配
3. 检查服务器的 JWT 密钥配置
4. 查看服务器日志中的认证错误
```

---

### 问题 5: CORS 错误

**浏览器控制台错误：**
```
Access to XMLHttpRequest at '...' from origin '...' 
has been blocked by CORS policy
```

**原因：** 客户端 URL 不在允许列表中

**解决方案：**
```
1. 检查 Program.cs 中的 AllowedOrigins
2. 确保客户端 URL 在列表中
3. 确保 AllowCredentials() 已启用
4. 重启服务器使配置生效
```

---

## 📋 完整检查清单

在联系开发人员之前，请确保已检查以下项目：

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

## 🔧 服务器端配置验证

### 检查 SignalR 配置

**文件：** `Platform.ApiService/Program.cs`

✅ **应该包含以下配置：**

```csharp
// 1. SignalR 服务
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors = true;  // ✅ 开发环境启用详细错误
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
              .AllowCredentials();  // ✅ 必须启用凭证支持
    });
});

// 3. JWT 认证
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(accessToken) &&
            path.StartsWithSegments("/hubs"))
        {
            context.Token = accessToken;  // ✅ 从 query string 读取 token
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
        var userId = _noticeFactory.GetRequiredUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroupName(userId));
        await base.OnConnectedAsync();
    }
}
```

---

## 📚 相关文档

| 文档 | 用途 |
|------|------|
| `SIGNALR_NEGOTIATION_FIX.md` | 详细的诊断和解决方案指南 |
| `SIGNALR_TROUBLESHOOTING_QUICK_GUIDE.md` | 快速排查指南（5 分钟） |
| `SIGNALR_FIXES_APPLIED.md` | 已应用的修复详细说明 |
| `Platform.Admin/src/hooks/useSignalRConnection.ts` | 改进的客户端 Hook |
| `Platform.Admin/src/utils/signalrDebug.ts` | 调试工具库 |

---

## 🎯 推荐的诊断流程

```
1. 启用调试模式
   └─ enableAllSignalRDebug()

2. 检查 Token
   └─ __signalrDebug.checkTokenValidity()
      ├─ Token 不存在？ → 重新登录
      ├─ Token 已过期？ → 刷新 Token
      └─ Token 有效？ → 继续

3. 测试协商
   └─ __signalrDebug.testSignalRNegotiate(hubUrl)
      ├─ 返回 JSON？ → 问题已解决 ✅
      ├─ 返回 HTML？ → 检查认证
      ├─ 返回 401？ → 检查 Token 传递
      └─ 返回 403？ → 检查 CORS

4. 查看浏览器 DevTools
   └─ Network 标签 → 查看 /negotiate 请求
   └─ Console 标签 → 查看 SignalR 日志

5. 查看服务器日志
   └─ dotnet watch 输出 → 查找错误信息
```

---

## 💡 关键要点

1. **Token 是关键** - 大多数问题都与 Token 有关
2. **启用详细日志** - 使用调试工具快速定位问题
3. **检查两端配置** - 客户端和服务器配置都很重要
4. **使用 DevTools** - Network 标签可以看到实际的请求和响应
5. **查看服务器日志** - 服务器日志通常包含关键信息

---

## 🆘 获取帮助

如果问题仍未解决，请收集以下信息：

1. **诊断输出**
   ```javascript
   __signalrDebug.printSignalRDiagnostics()
   ```

2. **Network 标签截图**
   - `/negotiate` 请求的完整信息
   - 响应头和响应体

3. **浏览器控制台输出**
   - 所有 SignalR 相关的日志

4. **服务器日志**
   - `dotnet watch` 的完整输出

5. **环境信息**
   - 浏览器版本
   - 操作系统
   - 网络环境

---

## ✨ 总结

已为 SignalR 协商失败问题提供了完整的诊断和解决方案：

✅ **改进的客户端日志** - 更容易追踪问题  
✅ **强大的调试工具** - 快速诊断问题  
✅ **详细的文档** - 清晰的解决步骤  
✅ **完整的检查清单** - 确保不遗漏任何项目  

现在你可以快速诊断和解决 SignalR 连接问题！

