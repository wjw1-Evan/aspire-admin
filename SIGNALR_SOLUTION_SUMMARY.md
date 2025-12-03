# SignalR 协商失败问题 - 完整解决方案总结

## 📌 问题概述

**错误信息：**
```
FailedToNegotiateWithServerError: Failed to complete negotiation with the server: 
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**根本原因：** SignalR 客户端在协商阶段收到 HTML 错误页面而不是 JSON 响应，通常由 JWT Token 问题、认证失败或 CORS 配置错误引起。

---

## ✨ 已应用的解决方案

### 1. 改进客户端错误日志和诊断

**文件修改：** `Platform.Admin/src/hooks/useSignalRConnection.ts`

**改进内容：**
- ✅ 添加详细的 Token 信息日志
- ✅ 记录 `accessTokenFactory` 调用时的 Token 长度
- ✅ 添加连接状态变化的日志（重新连接、连接关闭）
- ✅ 改进错误消息，包含诊断信息（message、stack、hubUrl、hasToken）

**关键日志输出：**
```
[SignalR] 创建连接: { hubUrl, hasToken, tokenLength }
[SignalR] accessTokenFactory 被调用，token 长度: xxx
[SignalR] 重新连接中... 
[SignalR] ✅ 重新连接成功
[SignalR] 连接关闭
[SignalR] ❌ 连接失败: { message, stack, hubUrl, hasToken }
```

---

### 2. 创建强大的 SignalR 调试工具库

**新文件：** `Platform.Admin/src/utils/signalrDebug.ts`

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

#### D. 一键启用所有功能
```typescript
// 启用所有调试功能并暴露工具到全局
enableAllSignalRDebug()
// 在浏览器控制台可使用: __signalrDebug.*
```

---

### 3. 创建完整的诊断和故障排除文档

**新文件：**
1. `SIGNALR_NEGOTIATION_FIX.md` - 详细的诊断和解决方案指南
2. `SIGNALR_TROUBLESHOOTING_QUICK_GUIDE.md` - 快速排查指南（5 分钟）
3. `SIGNALR_FIXES_APPLIED.md` - 已应用的修复详细说明
4. `SIGNALR_TROUBLESHOOTING_FLOWCHART.md` - 故障排除流程图
5. `SIGNALR_ISSUE_SUMMARY.md` - 问题完整总结
6. `SIGNALR_SOLUTION_SUMMARY.md` - 本文件

---

## 🚀 快速开始指南

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

参考相应的文档进行修复

---

## 📊 诊断结果解读

### Token 检查结果

**有效的 Token：**
```javascript
{
  status: '✅',
  message: 'Token 有效',
  token: {
    payload: { /* ... */ },
    expiresAt: '2025-12-02T10:00:00.000Z',
    isExpired: false,
    timeToExpire: '3600s',
    isValid: true
  }
}
```

**无效的 Token：**
```javascript
{
  status: '❌',
  message: 'Token 不存在',
  token: null
}
```

### 协商请求结果

**成功：**
```javascript
{
  success: true,
  data: {
    connectionId: 'abc123...',
    availableTransports: [ /* ... */ ]
  }
}
```

**失败：**
```javascript
{
  success: false,
  error: 'HTTP 401',
  response: '<!DOCTYPE html>...'
}
```

---

## 🔍 常见问题及解决方案

| 问题 | 症状 | 解决方案 |
|------|------|--------|
| **Token 不存在** | `checkTokenValidity()` 返回 "Token 不存在" | 重新登录 |
| **Token 已过期** | `checkTokenValidity()` 返回 "Token 已过期" | 刷新 Token 或重新登录 |
| **协商返回 HTML** | `testSignalRNegotiate()` 返回 HTML 响应 | 检查认证和 CORS 配置 |
| **协商返回 401** | `testSignalRNegotiate()` 返回 HTTP 401 | 检查 Token 传递和服务器配置 |
| **CORS 错误** | 浏览器控制台显示 CORS 错误 | 检查 CORS 配置和客户端 URL |

---

## 📋 完整检查清单

在联系开发人员之前，请确保已检查以下项目：

### 客户端检查
- [ ] 已启用调试模式 (`enableAllSignalRDebug()`)
- [ ] Token 存在且有效 (`checkTokenValidity()`)
- [ ] 协商请求返回 JSON (`testSignalRNegotiate()`)
- [ ] 浏览器控制台无 CORS 错误
- [ ] 已清除浏览器缓存
- [ ] 已尝试重新登录

### 服务器检查
- [ ] SignalR 已配置 (`AddSignalR()`)
- [ ] CORS 已配置 (`AddCors()`)
- [ ] JWT 认证已配置 (`AddAuthentication()`)
- [ ] Hub 已映射 (`MapHub()`)
- [ ] 客户端 URL 在 `AllowedOrigins` 中
- [ ] `AllowCredentials()` 已启用
- [ ] 服务器已重启

### 网络检查
- [ ] 服务器正在运行 (`dotnet watch` 显示 "Build succeeded")
- [ ] 客户端可以访问服务器 URL
- [ ] 防火墙未阻止连接

---

## 📚 文档导航

| 文档 | 用途 | 适合场景 |
|------|------|--------|
| `SIGNALR_ISSUE_SUMMARY.md` | 问题完整总结 | 快速了解问题 |
| `SIGNALR_TROUBLESHOOTING_QUICK_GUIDE.md` | 快速排查指南 | 5 分钟快速诊断 |
| `SIGNALR_TROUBLESHOOTING_FLOWCHART.md` | 故障排除流程图 | 按步骤诊断 |
| `SIGNALR_NEGOTIATION_FIX.md` | 详细诊断指南 | 深入了解问题 |
| `SIGNALR_FIXES_APPLIED.md` | 已应用的修复 | 了解修改内容 |
| `SIGNALR_SOLUTION_SUMMARY.md` | 本文件 | 完整解决方案总结 |

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

1. **Token 是关键**
   - 大多数 SignalR 问题都与 Token 有关
   - 始终首先检查 Token 的有效性

2. **启用详细日志**
   - 使用调试工具快速定位问题
   - 在开发环境启用详细错误消息

3. **检查两端配置**
   - 客户端和服务器配置都很重要
   - 确保 CORS、JWT、Hub 映射都正确

4. **使用 DevTools**
   - Network 标签可以看到实际的请求和响应
   - Console 标签可以看到详细的日志

5. **查看服务器日志**
   - 服务器日志通常包含关键信息
   - 帮助快速定位问题

---

## 🔧 技术细节

### 客户端配置

**SignalR 连接配置：**
```typescript
const connection = new signalR.HubConnectionBuilder()
  .withUrl(hubUrl, {
    accessTokenFactory: () => tokenUtils.getToken() || '',
    skipNegotiation: false,
    transport: signalR.HttpTransportType.WebSockets | 
               signalR.HttpTransportType.LongPolling,
  })
  .withAutomaticReconnect({
    nextRetryDelayInMilliseconds: (retryCount) => {
      // 指数退避：1s, 2s, 4s, 8s, 16s, 30s, 30s...
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
```

### 服务器配置

**SignalR 服务注册：**
```csharp
builder.Services.AddSignalR(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.EnableDetailedErrors = true;
    }
}).AddJsonProtocol(options => { /* ... */ });
```

**CORS 配置：**
```csharp
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
```

**JWT 认证配置：**
```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(accessToken) &&
            path.StartsWithSegments("/hubs"))
        {
            context.Token = accessToken;
        }
        return Task.CompletedTask;
    }
};
```

---

## 🆘 获取帮助

如果问题仍未解决，请收集以下信息：

1. **诊断输出**
   ```javascript
   __signalrDebug.printSignalRDiagnostics()
   __signalrDebug.checkTokenValidity()
   __signalrDebug.testSignalRNegotiate(hubUrl)
   ```

2. **Network 标签信息**
   - `/negotiate` 请求的完整信息
   - 响应头和响应体

3. **浏览器控制台日志**
   - 所有 SignalR 相关的日志

4. **服务器日志**
   - `dotnet watch` 的完整输出

5. **环境信息**
   - 浏览器版本
   - 操作系统
   - 网络环境

---

## ✨ 总结

已为 SignalR 协商失败问题提供了完整的解决方案：

### 改进的代码
✅ `useSignalRConnection.ts` - 改进的客户端 Hook，包含详细日志  
✅ `signalrDebug.ts` - 强大的调试工具库  

### 完整的文档
✅ `SIGNALR_ISSUE_SUMMARY.md` - 问题完整总结  
✅ `SIGNALR_TROUBLESHOOTING_QUICK_GUIDE.md` - 快速排查指南  
✅ `SIGNALR_TROUBLESHOOTING_FLOWCHART.md` - 故障排除流程图  
✅ `SIGNALR_NEGOTIATION_FIX.md` - 详细诊断指南  
✅ `SIGNALR_FIXES_APPLIED.md` - 已应用的修复说明  
✅ `SIGNALR_SOLUTION_SUMMARY.md` - 本文件  

### 快速诊断
✅ 5 分钟内定位问题  
✅ 清晰的解决步骤  
✅ 强大的调试工具  
✅ 完整的检查清单  

现在你可以快速诊断和解决 SignalR 连接问题！🚀

---

## 📞 联系方式

如有任何问题，请：
1. 查看相关文档
2. 运行诊断命令
3. 收集诊断信息
4. 联系开发团队

---

**最后更新：** 2025-12-02  
**版本：** 1.0  
**状态：** ✅ 完成

