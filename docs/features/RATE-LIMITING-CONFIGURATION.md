# API 速率限制配置指南

## 📋 概述

为防止暴力破解、DDoS攻击和资源滥用，系统需要实施API速率限制。

## 🎯 限制策略

### 全局限制
- **普通端点**: 每分钟60次请求
- **登录端点**: 每分钟5次请求
- **注册端点**: 每小时10次请求
- **密码重置**: 每小时3次请求

### IP限制
- 同一IP地址的所有请求计入配额
- 使用 X-Real-IP 或 X-Forwarded-For 头识别真实IP

## 🔧 实施方案

### 方案1: 使用 AspNetCoreRateLimit (推荐)

#### 1. 添加包引用

```bash
cd Platform.ApiService
dotnet add package AspNetCoreRateLimit
```

#### 2. 在 Program.cs 中配置

```csharp
using AspNetCoreRateLimit;

// 添加内存缓存
builder.Services.AddMemoryCache();

// 配置 IP 速率限制选项
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests = false;
    options.HttpStatusCode = 429;  // Too Many Requests
    options.RealIpHeader = "X-Real-IP";
    options.ClientIdHeader = "X-ClientId";
    
    options.GeneralRules = new List<RateLimitRule>
    {
        // 全局限制：每分钟60次
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 60
        },
        // 登录限制：每分钟5次
        new RateLimitRule
        {
            Endpoint = "*/api/login/*",
            Period = "1m",
            Limit = 5
        },
        // 注册限制：每小时10次
        new RateLimitRule
        {
            Endpoint = "*/api/register",
            Period = "1h",
            Limit = 10
        },
        // 密码重置限制：每小时3次
        new RateLimitRule
        {
            Endpoint = "*/api/change-password",
            Period = "1h",
            Limit = 3
        },
        // 刷新token限制：每分钟10次
        new RateLimitRule
        {
            Endpoint = "*/api/refresh-token",
            Period = "1m",
            Limit = 10
        }
    };
});

// 配置速率限制策略
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();

// 在中间件管道中使用
var app = builder.Build();

// 必须在认证之前
app.UseIpRateLimiting();

app.UseAuthentication();
app.UseAuthorization();
```

#### 3. 配置文件 (appsettings.json)

```json
{
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-ClientId",
    "HttpStatusCode": 429,
    "GeneralRules": [
      {
        "Endpoint": "*",
        "Period": "1m",
        "Limit": 60
      },
      {
        "Endpoint": "*/api/login/*",
        "Period": "1m",
        "Limit": 5
      }
    ]
  }
}
```

### 方案2: 自定义中间件

如果不想引入额外依赖，可以实现简单的内存速率限制：

```csharp
// Platform.ApiService/Middleware/RateLimitMiddleware.cs
public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RateLimitMiddleware> _logger;
    
    // 限制规则：endpoint -> (period, limit)
    private static readonly Dictionary<string, (TimeSpan Period, int Limit)> Rules = new()
    {
        { "/api/login/account", (TimeSpan.FromMinutes(1), 5) },
        { "/api/register", (TimeSpan.FromHours(1), 10) },
        { "/api/change-password", (TimeSpan.FromHours(1), 3) },
        { "default", (TimeSpan.FromMinutes(1), 60) }
    };
    
    public RateLimitMiddleware(
        RequestDelegate next, 
        IMemoryCache cache,
        ILogger<RateLimitMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = GetClientIp(context);
        var endpoint = context.Request.Path.Value?.ToLower() ?? "";
        
        // 获取适用的规则
        var rule = Rules.ContainsKey(endpoint) 
            ? Rules[endpoint] 
            : Rules["default"];
        
        var cacheKey = $"rate_limit:{clientIp}:{endpoint}";
        var requestCount = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = rule.Period;
            return 0;
        });
        
        if (requestCount >= rule.Limit)
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                errorCode = "RATE_LIMIT_EXCEEDED",
                error = "请求过于频繁，请稍后再试",
                retryAfter = rule.Period.TotalSeconds
            });
            
            _logger.LogWarning(
                "Rate limit exceeded for {ClientIp} on {Endpoint}", 
                clientIp, endpoint);
            return;
        }
        
        _cache.Set(cacheKey, requestCount + 1, rule.Period);
        await _next(context);
    }
    
    private string GetClientIp(HttpContext context)
    {
        var xForwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xForwardedFor))
        {
            return xForwardedFor.Split(',')[0].Trim();
        }
        
        var xRealIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xRealIp))
        {
            return xRealIp;
        }
        
        return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }
}

// 扩展方法
public static class RateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UseRateLimit(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RateLimitMiddleware>();
    }
}
```

使用自定义中间件：

```csharp
// Program.cs
app.UseRateLimit();  // 在认证之前

app.UseAuthentication();
app.UseAuthorization();
```

## 📊 监控和日志

### 记录速率限制事件

```csharp
_logger.LogWarning(
    "Rate limit exceeded: IP={ClientIp}, Endpoint={Endpoint}, Limit={Limit}/{Period}",
    clientIp, endpoint, limit, period);
```

### 响应头

添加速率限制信息到响应头：

```csharp
context.Response.Headers["X-RateLimit-Limit"] = limit.ToString();
context.Response.Headers["X-RateLimit-Remaining"] = (limit - requestCount).ToString();
context.Response.Headers["X-RateLimit-Reset"] = resetTime.ToString("o");
```

## 🧪 测试

### 测试登录速率限制

```bash
# 快速连续登录6次，第6次应该被限制
for i in {1..6}; do
  echo "尝试 $i"
  curl -X POST http://localhost:15000/apiservice/api/login/account \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

预期结果：
- 前5次：返回 400 (密码错误)
- 第6次：返回 429 (Too Many Requests)

### 测试全局速率限制

```bash
# 快速发送61次请求
for i in {1..61}; do
  curl -s http://localhost:15000/apiservice/health > /dev/null
done
```

## 📈 生产环境建议

### 使用 Redis 存储

对于分布式部署，使用 Redis 存储速率限制计数器：

```csharp
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
});

builder.Services.AddSingleton<IRateLimitCounterStore, DistributedCacheRateLimitCounterStore>();
```

### 自定义限制策略

根据用户角色设置不同限制：

```csharp
// 管理员更高的限制
if (context.User.IsInRole("admin"))
{
    limit = 200;  // 管理员每分钟200次
}
```

## 🔐 安全考虑

1. **绕过检测**: 攻击者可能使用多个IP绕过限制
   - 解决：使用 Cloudflare 等CDN的速率限制
   
2. **分布式攻击**: 大量IP同时攻击
   - 解决：在负载均衡器层面实施限制

3. **合法用户影响**: 速率限制可能影响合法用户
   - 解决：为认证用户提供更高限制

## 📚 相关文档

- [AspNetCoreRateLimit 文档](https://github.com/stefanprodan/AspNetCoreRateLimit)
- [安全审查报告](../reports/SECURITY-AUDIT-REPORT.md)
- [API 安全最佳实践](../optimization/API-SECURITY-BEST-PRACTICES.md)

## ✅ 实施检查清单

- [ ] 添加速率限制包或实现自定义中间件
- [ ] 配置限制规则
- [ ] 测试各个端点的限制
- [ ] 添加监控和日志
- [ ] 配置响应头
- [ ] 生产环境使用 Redis
- [ ] 文档更新

---

**更新日期**: 2025-10-19  
**作者**: Security Team

