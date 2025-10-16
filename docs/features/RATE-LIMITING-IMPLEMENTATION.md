# ⏱️ 请求频率限制（Rate Limiting）实施方案

## 📋 方案概览

**目标**: 防止暴力破解和DDoS攻击  
**优先级**: P2 - 中优先级  
**状态**: 📝 方案设计完成，待实施  
**预计工时**: 2-3天

---

## 🎯 需求分析

### 需要限流的场景

1. **登录接口** - 防止暴力破解密码
2. **注册接口** - 防止批量注册垃圾账户
3. **验证码接口** - 防止验证码攻击
4. **重置密码接口** - 防止滥用
5. **全局API** - 防止DDoS攻击

### 限流规则建议

| 接口类型 | 限流规则 | 时间窗口 | 超限响应 |
|---------|---------|---------|---------|
| 登录 | 5次 | 1分钟 | 429 Too Many Requests |
| 注册 | 3次 | 1小时 | 429 Too Many Requests |
| 验证码 | 5次 | 1分钟 | 429 Too Many Requests |
| 密码重置 | 3次 | 1小时 | 429 Too Many Requests |
| 全局API | 100次 | 1分钟 | 429 Too Many Requests |

---

## 🔧 技术方案

### 方案：AspNetCoreRateLimit

**包**: AspNetCoreRateLimit  
**GitHub**: https://github.com/stefanprodan/AspNetCoreRateLimit  
**稳定性**: ⭐⭐⭐⭐⭐ (Production Ready)

#### 优点

✅ 功能完善
- IP限流
- 端点限流
- 客户端ID限流
- 分布式支持（Redis）

✅ 配置灵活
- 全局规则
- 端点规则
- 白名单/黑名单

✅ 性能好
- 内存缓存
- 异步处理
- 分布式扩展

---

## 📝 实施步骤

### 步骤1：安装NuGet包

```bash
cd Platform.ApiService
dotnet add package AspNetCoreRateLimit
```

### 步骤2：配置服务（Program.cs）

```csharp
// 添加内存缓存（如果还没有）
builder.Services.AddMemoryCache();

// 配置IP限流
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    // 全局规则
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 100,  // 全局API：100次/分钟
        }
    };
    
    // 端点规则（优先级高于全局规则）
    options.EndpointWhitelist = new List<string>
    {
        "get:/health",  // 健康检查不限流
        "get:/api/openapi",  // API文档不限流
    };
});

// 配置端点限流规则
builder.Services.Configure<ClientRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests = false;
    
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "POST:/api/login/account",
            Period = "1m",
            Limit = 5,  // 登录：5次/分钟
        },
        new RateLimitRule
        {
            Endpoint = "POST:/api/register",
            Period = "1h",
            Limit = 3,  // 注册：3次/小时
        },
        new RateLimitRule
        {
            Endpoint = "GET:/api/login/captcha",
            Period = "1m",
            Limit = 5,  // 验证码：5次/分钟
        },
        new RateLimitRule
        {
            Endpoint = "POST:/api/change-password",
            Period = "1h",
            Limit = 5,  // 修改密码：5次/小时
        },
    };
});

// 注入限流服务
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();

// 添加中间件
var app = builder.Build();

app.UseIpRateLimiting();  // 添加在认证之前
app.UseAuthentication();
app.UseAuthorization();
```

### 步骤3：配置文件（appsettings.json）

```json
{
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-ClientId",
    "HttpStatusCode": 429,
    "QuotaExceededMessage": "请求过于频繁，请稍后再试",
    "GeneralRules": [
      {
        "Endpoint": "*",
        "Period": "1m",
        "Limit": 100
      },
      {
        "Endpoint": "POST:/api/login/account",
        "Period": "1m",
        "Limit": 5
      },
      {
        "Endpoint": "POST:/api/register",
        "Period": "1h",
        "Limit": 3
      }
    ]
  }
}
```

### 步骤4：自定义错误响应

```csharp
// 创建自定义限流中间件包装器
public class CustomRateLimitMiddleware
{
    private readonly RequestDelegate _next;

    public CustomRateLimitMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (RateLimitException ex)
        {
            context.Response.StatusCode = 429;
            context.Response.ContentType = "application/json";
            
            var response = new
            {
                success = false,
                errorCode = "RATE_LIMIT_EXCEEDED",
                errorMessage = "请求过于频繁，请稍后再试",
                showType = 2,
                retryAfter = ex.RetryAfter
            };
            
            await context.Response.WriteAsJsonAsync(response);
        }
    }
}
```

---

## 🧪 测试验证

### 测试用例

#### 1. 登录限流测试

```bash
# 连续6次登录请求（超过5次限制）
for i in {1..6}; do
  echo "Request $i"
  curl -X POST http://localhost:15000/api/login/account \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# 预期：前5次返回401（密码错误），第6次返回429（限流）
```

#### 2. 注册限流测试

```bash
# 1小时内4次注册请求（超过3次限制）
for i in {1..4}; do
  echo "Request $i"
  curl -X POST http://localhost:15000/api/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test$i\",\"password\":\"test123\"}"
  sleep 1
done

# 预期：前3次正常处理，第4次返回429
```

#### 3. 全局API限流测试

```bash
# 1分钟内101次请求（超过100次限制）
for i in {1..101}; do
  curl http://localhost:15000/api/some-endpoint -s -o /dev/null -w "%{http_code}\n"
done

# 预期：前100次返回正常，第101次返回429
```

---

## 🚀 生产环境优化

### 分布式部署（使用Redis）

```bash
dotnet add package AspNetCoreRateLimit.Redis
```

```csharp
// 配置Redis缓存
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"];
    options.InstanceName = "RateLimit:";
});

// 使用Redis存储
builder.Services.AddSingleton<IIpPolicyStore, DistributedCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, DistributedCacheRateLimitCounterStore>();
```

**优点**:
- 多实例共享限流状态
- 防止单实例绕过
- 支持水平扩展

---

## 📊 监控和告警

### 限流日志

```csharp
// 记录限流事件
public class RateLimitLogger : IRateLimitLogger
{
    private readonly ILogger<RateLimitLogger> _logger;

    public RateLimitLogger(ILogger<RateLimitLogger> logger)
    {
        _logger = logger;
    }

    public void LogInformation(string message)
    {
        _logger.LogInformation("[RateLimit] {Message}", message);
    }

    public void LogWarning(string message)
    {
        _logger.LogWarning("[RateLimit] ⚠️ {Message}", message);
    }
}
```

### 告警规则

**告警场景**:
- 单IP在5分钟内触发限流超过3次
- 整体限流触发频率异常升高
- 特定端点频繁被限流

**告警方式**:
- 日志记录
- 邮件通知
- Slack/钉钉通知

---

## 🎯 实施优先级

### P0 - 紧急

- [ ] 登录接口限流（防止暴力破解）

### P1 - 高优先级

- [ ] 注册接口限流（防止垃圾注册）
- [ ] 验证码接口限流（防止滥用）

### P2 - 中优先级

- [ ] 全局API限流（防止DDoS）
- [ ] 其他敏感接口限流

---

## ✅ 完成标准

- [ ] AspNetCoreRateLimit包已安装
- [ ] 限流规则已配置
- [ ] 所有测试用例通过
- [ ] 错误响应格式统一
- [ ] 监控日志已实施
- [ ] 文档已更新

---

## 📚 相关文档

- [AspNetCoreRateLimit官方文档](https://github.com/stefanprodan/AspNetCoreRateLimit/wiki)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [安全部署检查清单](../deployment/SECURITY-CHECKLIST.md)

---

## 🎯 总结

Rate Limiting是重要的安全防护措施。建议：

1. **短期**（1周内）: 实施登录和注册限流
2. **中期**（1个月内）: 完善全局限流和监控
3. **长期**（持续）: 基于实际使用情况调整规则

**预期收益**:
- ✅ 防止暴力破解
- ✅ 防止DDoS攻击
- ✅ 保护系统资源
- ✅ 提升系统稳定性

---

**制定人**: AI Security Agent  
**日期**: 2025-01-15  
**版本**: v1.0

