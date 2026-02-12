# 全局身份验证中间件

本文档介绍了为 Platform.ApiService 添加的全局身份验证中间件，用于增强API的安全性。

## 功能概述

### 🔐 核心功能

1. **全局JWT Token验证** - 自动验证所有API请求的JWT token
2. **灵活的路径配置** - 支持配置无需认证的公共路径
3. **属性标记支持** - 通过属性精确控制单个控制器或方法的认证要求
4. **详细的安全日志** - 记录认证失败和异常情况
5. **标准化的错误响应** - 统一的401/403错误格式

### 🛡️ 安全特性

- **Token格式验证** - 检查JWT token的格式和签名
- **过期时间验证** - 严格验证token的有效期
- **Claims验证** - 确保token包含必要的用户信息
- **并发请求保护** - 防止token并发刷新冲突
- **开发环境配置** - 灵活的开发和生产环境配置

## 安装和配置

### 1. 中间件注册

在 `Program.cs` 中注册中间件：

```csharp
using Platform.ApiService.Extensions;
using Platform.ApiService.Middleware;

// 添加配置选项
builder.Services.Configure<GlobalAuthenticationOptions>(
    builder.Configuration.GetSection("GlobalAuthenticationOptions"));

// 在认证管道后添加全局认证中间件
app.UseAuthentication();
app.UseAuthorization();
app.UseGlobalAuthentication(); // 添加全局身份验证中间件
```

### 2. 配置选项

创建 `appsettings.json` 配置：

```json
{
  "GlobalAuthentication": {
    "Enabled": true,
    "DisableStrictValidationInDevelopment": true,
    "TokenExpiryBufferMinutes": 5,
    "EnableDetailedSecurityLogging": false,
    "MaxFailureAttempts": 5,
    "FailureLockoutMinutes": 15,
    "PublicPaths": [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/captcha",
      "/api/auth/captcha/image",
      "/api/auth/verify-captcha",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/refresh-token",
      "/health",
      "/healthz",
      "/.well-known",
      "/api/public",
      "/swagger",
      "/openapi",
      "/docs",
      "/api-docs",
      "/static",
      "/content",
      "/assets",
      "/api/files/download/public",
      "/api/images"
    ]
  }
}
```

## 使用方法

### 1. 默认保护所有API

默认情况下，所有API端点都需要身份验证，除非满足以下条件之一：
- 路径在 `PublicPaths` 列表中
- 控制器或方法标记了 `[SkipGlobalAuthentication]` 属性

### 2. 跳过全局认证

#### 控制器级别跳过

```csharp
using Platform.ApiService.Attributes;

[ApiController]
[Route("api/public")]
[SkipGlobalAuthentication("公共接口，允许匿名访问")]
public class PublicController : BaseApiController
{
    // 所有方法都不需要认证
}
```

#### 方法级别跳过

```csharp
[ApiController]
[Route("api/mixed")]
public class MixedController : BaseApiController
{
    [HttpGet("public-data")]
    [SkipGlobalAuthentication("公共数据访问")]
    public IActionResult GetPublicData()
    {
        // 这个方法不需要认证
        return Ok(new { message = "Public data" });
    }

    [HttpGet("private-data")]
    // 需要认证
    public IActionResult GetPrivateData()
    {
        // 这个方法需要认证
        return Ok(new { message = "Private data" });
    }
}
```

#### 强制要求认证

即使在公共路径中，也可以强制要求认证：

```csharp
[ApiController]
[Route("api/public")]
[SkipGlobalAuthentication("大部分是公共接口")]
public class PublicController : BaseApiController
{
    [HttpGet("system-info")]
    // 公共接口，不需要认证
    public IActionResult GetSystemInfo()
    {
        return Ok(new { version = "1.0.0" });
    }

    [HttpGet("current-user")]
    [Authorize] // 覆盖SkipGlobalAuthentication
    [RequireGlobalAuthentication("获取用户信息需要认证")]
    public IActionResult GetCurrentUser()
    {
        // 强制需要认证，即使在公共控制器中
        return Ok(new { userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value });
    }
}
```

### 3. 认证相关API

认证相关的API已经配置为公共路径：

```csharp
[ApiController]
[Route("api/auth")]
[SkipGlobalAuthentication("认证相关接口")]
public class AuthController : BaseApiController
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 登录逻辑
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // 注册逻辑
    }

    [HttpGet("current-user")]
    [Authorize] // 需要已登录用户访问
    public async Task<IActionResult> GetCurrentUser()
    {
        // 获取当前用户信息
    }
}
```

## 错误响应格式

### 401 Unauthorized

```json
{
  "success": false,
  "errorMessage": "未提供有效的认证令牌或令牌已过期。请重新登录。",
  "errorCode": "UNAUTHORIZED",
  "timestamp": "2024-02-12T10:30:00Z",
  "traceId": "00-1234567890abcdef-1234567890abcdef-01",
  "error": "UNAUTHORIZED",
  "message": "未提供有效的认证令牌或令牌已过期。请重新登录。"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "errorMessage": "您只是此资源的访问者，无权进行操作 (403 Forbidden)",
  "errorCode": "FORBIDDEN",
  "timestamp": "2024-02-12T10:30:00Z",
  "traceId": "00-1234567890abcdef-1234567890abcdef-01"
}
```

## 安全最佳实践

### 1. JWT 配置

确保在生产环境中正确配置JWT：

```csharp
// 使用强密钥
"Jwt:SecretKey": "your-super-secure-random-key-here"

// 设置合适的发行者和受众
"Jwt:Issuer": "YourPlatform.ApiService"
"Jwt:Audience": "YourPlatform.Web"
```

### 2. 路径配置

定期审查公共路径列表，确保不会意外暴露敏感接口：

```json
{
  "PublicPaths": [
    // 只包含必要的公共接口
    "/api/auth/login",
    "/api/auth/register",
    "/health"
    // 避免将敏感接口添加到公共列表
  ]
}
```

### 3. 日志监控

启用详细安全日志进行监控：

```json
{
  "GlobalAuthentication": {
    "EnableDetailedSecurityLogging": true,
    "MaxFailureAttempts": 5,
    "FailureLockoutMinutes": 15
  }
}
```

## 故障排除

### 常见问题

1. **所有请求都返回401**
   - 检查JWT配置是否正确
   - 确认SecretKey是否设置
   - 验证token格式是否正确

2. **公共接口仍要求认证**
   - 检查路径是否在PublicPaths列表中
   - 确认是否正确使用了[SkipGlobalAuthentication]属性
   - 检查路径大小写

3. **性能问题**
   - 检查EnableDetailedSecurityLogging是否在生产环境启用
   - 考虑调整TokenExpiryBufferMinutes设置

### 调试技巧

1. **启用详细日志**
   ```csharp
   builder.Logging.SetMinimumLevel(LogLevel.Debug);
   ```

2. **检查中间件执行顺序**
   ```csharp
   app.UseAuthentication();        // 1. JWT认证
   app.UseAuthorization();         // 2. 授权
   app.UseGlobalAuthentication();  // 3. 全局验证
   ```

3. **验证配置加载**
   ```csharp
   var options = app.Services.GetRequiredService<IOptions<GlobalAuthenticationOptions>>();
   Console.WriteLine($"Public paths: {string.Join(", ", options.Value.PublicPaths)}");
   ```

## 更新日志

### v1.0.0 (2024-02-12)
- ✅ 添加全局JWT token验证
- ✅ 实现灵活的路径配置
- ✅ 支持属性标记控制
- ✅ 添加标准错误响应格式
- ✅ 实现详细安全日志
- ✅ 添加开发环境配置支持

---

**注意**: 此中间件是对ASP.NET Core内置认证的补充，提供了更细粒度的控制和额外的安全层。请根据实际需求配置和使用。