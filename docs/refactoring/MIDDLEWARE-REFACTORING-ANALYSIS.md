# 中间件重构分析报告

## 执行摘要

通过代码审查，发现了 4 个可以重构为中间件的重复模式，可以减少约 60+ 处重复代码，提高代码质量和可维护性。

## 发现的重复模式

### 1. 🔴 全局异常处理（高优先级）

#### 问题描述
几乎每个控制器方法都有相同的 try-catch 错误处理结构。

#### 重复代码示例
```csharp
// RoleController.GetAllRoles
try
{
    var roles = await _roleService.GetAllRolesAsync();
    return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
}
catch (Exception ex)
{
    return StatusCode(500, ApiResponse<RoleListResponse>.ServerErrorResult($"Failed to get roles: {ex.Message}"));
}

// RoleController.GetRoleById
try
{
    var role = await _roleService.GetRoleByIdAsync(id);
    if (role == null)
    {
        return NotFound(ApiResponse<Role>.NotFoundResult("Role not found"));
    }
    return Ok(ApiResponse<Role>.SuccessResult(role));
}
catch (Exception ex)
{
    return StatusCode(500, ApiResponse<Role>.ServerErrorResult($"Failed to get role: {ex.Message}"));
}

// UserController.CreateUserManagement
try
{
    // ... 业务逻辑
    return Ok(new { success = true, data = user });
}
catch (InvalidOperationException ex)
{
    return BadRequest(new { success = false, error = ex.Message });
}
catch (Exception ex)
{
    return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
}
```

#### 统计数据
- **出现次数**：40+ 处
- **涉及文件**：所有 Controller 文件
- **重复行数**：约 200+ 行

#### 推荐解决方案

**创建 GlobalExceptionMiddleware**：

```csharp
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (InvalidOperationException ex)
        {
            await HandleExceptionAsync(context, ex, StatusCodes.Status400BadRequest, "BAD_REQUEST");
        }
        catch (UnauthorizedAccessException ex)
        {
            await HandleExceptionAsync(context, ex, StatusCodes.Status401Unauthorized, "UNAUTHORIZED");
        }
        catch (KeyNotFoundException ex)
        {
            await HandleExceptionAsync(context, ex, StatusCodes.Status404NotFound, "NOT_FOUND");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await HandleExceptionAsync(context, ex, StatusCodes.Status500InternalServerError, "INTERNAL_ERROR");
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex, int statusCode, string errorCode)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            errorCode,
            errorMessage = ex.Message,
            showType = 2,
            traceId = context.TraceIdentifier
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}
```

**使用后的控制器代码**：
```csharp
// ✅ 简化后 - 无需 try-catch
[HttpGet]
public async Task<IActionResult> GetAllRoles()
{
    var roles = await _roleService.GetAllRolesAsync();
    return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
}

[HttpGet("{id}")]
public async Task<IActionResult> GetRoleById(string id)
{
    var role = await _roleService.GetRoleByIdAsync(id);
    if (role == null)
        throw new KeyNotFoundException("Role not found");
    
    return Ok(ApiResponse<Role>.SuccessResult(role));
}
```

**收益**：
- ✅ 减少 40+ 处重复的 try-catch
- ✅ 统一错误响应格式
- ✅ 集中管理错误处理逻辑
- ✅ 自动记录错误日志
- ✅ 添加 traceId 用于问题追踪

---

### 2. 🔴 当前用户信息提取（高优先级）

#### 问题描述
从 JWT token 提取用户 ID 的代码在 UserController 中重复了 11 次。

#### 重复代码示例
```csharp
// 在 UserController 中重复 11 次
var userId = User.FindFirst("userId")?.Value;
if (string.IsNullOrEmpty(userId))
    return Unauthorized(new { success = false, error = "未找到用户信息" });

// 在 MenuController 中
var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
if (string.IsNullOrEmpty(userId))
{
    return Unauthorized(ApiResponse<List<MenuTreeNode>>.UnauthorizedResult("User not authenticated"));
}
```

#### 统计数据
- **出现次数**：15+ 处
- **涉及文件**：UserController, MenuController 等
- **重复行数**：约 50+ 行

#### 推荐解决方案（方案A：Action Filter）

**创建 CurrentUserActionFilter**：

```csharp
public class CurrentUserActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 提取用户信息
        var userId = context.HttpContext.User.FindFirst("userId")?.Value;
        var username = context.HttpContext.User.FindFirst("username")?.Value;

        // 注入到 HttpContext.Items
        context.HttpContext.Items["CurrentUserId"] = userId;
        context.HttpContext.Items["CurrentUsername"] = username;

        await next();
    }
}

// 控制器中使用扩展方法
public static class ControllerBaseExtensions
{
    public static string? GetCurrentUserId(this ControllerBase controller)
    {
        return controller.HttpContext.Items["CurrentUserId"] as string;
    }

    public static string? GetCurrentUsername(this ControllerBase controller)
    {
        return controller.HttpContext.Items["CurrentUsername"] as string;
    }
}
```

**使用后的控制器代码**：
```csharp
// ✅ 简化后
[HttpGet("profile")]
[Authorize]
public async Task<IActionResult> GetCurrentUserProfile()
{
    var userId = this.GetCurrentUserId();  // 简洁的扩展方法
    if (string.IsNullOrEmpty(userId))
        throw new UnauthorizedAccessException("未找到用户信息");

    var user = await _userService.GetUserByIdAsync(userId);
    return Ok(new { success = true, data = user });
}
```

**收益**：
- ✅ 减少 15+ 处重复代码
- ✅ 统一用户信息提取逻辑
- ✅ 更清晰的代码

#### 推荐解决方案（方案B：Base Controller）

**创建 BaseApiController**：

```csharp
public abstract class BaseApiController : ControllerBase
{
    protected string? CurrentUserId => User.FindFirst("userId")?.Value;
    protected string? CurrentUsername => User.FindFirst("username")?.Value;
    
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }
}

// 控制器继承
public class UserController : BaseApiController
{
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = GetRequiredUserId();  // 一行代码，自动抛异常
        var user = await _userService.GetUserByIdAsync(userId);
        return Ok(new { success = true, data = user });
    }
}
```

**收益**：
- ✅ 更简单，无需中间件
- ✅ 强类型，编译时检查
- ✅ 可复用其他辅助方法

---

### 3. 🟡 响应格式不统一（中优先级）

#### 问题描述
不同控制器使用不同的响应格式。

#### 现状分析

**RoleController** - 使用 ApiResponse：
```csharp
return Ok(ApiResponse<Role>.SuccessResult(role));
```

**RuleController** - 直接返回对象：
```csharp
return Ok(result);
```

**UserController** - 混合格式：
```csharp
// 有时用 ApiResponse
return Ok(ApiResponse<T>.SuccessResult(data));

// 有时用匿名对象
return Ok(new { success = true, data = user });
```

#### 推荐解决方案

**创建 ResponseFormattingMiddleware**：

```csharp
public class ResponseFormattingMiddleware
{
    private readonly RequestDelegate _next;

    public async Task InvokeAsync(HttpContext context)
    {
        var originalBodyStream = context.Response.Body;

        using (var responseBody = new MemoryStream())
        {
            context.Response.Body = responseBody;

            await _next(context);

            // 格式化响应
            if (context.Response.StatusCode == 200 && 
                context.Response.ContentType?.Contains("application/json") == true)
            {
                responseBody.Seek(0, SeekOrigin.Begin);
                var bodyText = await new StreamReader(responseBody).ReadToEndAsync();
                
                // 如果不是 ApiResponse 格式，包装它
                if (!bodyText.Contains("\"success\""))
                {
                    var wrappedResponse = new
                    {
                        success = true,
                        data = JsonSerializer.Deserialize<object>(bodyText),
                        timestamp = DateTime.UtcNow
                    };
                    bodyText = JsonSerializer.Serialize(wrappedResponse);
                }

                responseBody.SetLength(0);
                await responseBody.WriteAsync(Encoding.UTF8.GetBytes(bodyText));
            }

            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
    }
}
```

**收益**：
- ✅ 所有响应格式统一
- ✅ 前端处理更简单
- ✅ 易于添加全局字段（timestamp, traceId）

---

### 4. 🟢 性能监控中间件（低优先级）

#### 功能
- 记录所有 API 的响应时间
- 识别慢请求
- 生成性能报告

#### 实现建议
```csharp
public class PerformanceMonitoringMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        await _next(context);
        
        stopwatch.Stop();
        
        if (stopwatch.ElapsedMilliseconds > 1000)
        {
            _logger.LogWarning("Slow request: {Method} {Path} took {Duration}ms",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
```

---

### 5. 🟢 API 限流中间件（低优先级）

#### 功能
- 按 IP 或用户限制请求频率
- 防止 API 滥用
- 保护系统资源

#### 实现建议
使用第三方库：`AspNetCoreRateLimit`

---

## 推荐的实施计划

### 阶段 1：基础中间件（立即实施）

1. **全局异常处理中间件**
   - 文件：`Middleware/GlobalExceptionMiddleware.cs`
   - 收益：减少 40+ 处重复代码
   - 工作量：2小时

2. **Base Controller 重构**（不是中间件，但解决相同问题）
   - 文件：`Controllers/BaseApiController.cs`
   - 收益：减少 15+ 处重复代码
   - 工作量：1小时

3. **清理手动日志代码**
   - 移除控制器中的手动 `LogUserActivityAsync` 调用
   - 依赖已实现的 ActivityLogMiddleware
   - 工作量：1小时

### 阶段 2：增强中间件（可选）

4. **响应格式化中间件**
   - 统一所有响应格式
   - 工作量：3小时

5. **性能监控中间件**
   - 监控慢请求
   - 工作量：2小时

### 阶段 3：高级功能（未来）

6. **API 限流中间件**
   - 防止滥用
   - 工作量：4小时

---

## 详细实施方案

### 方案 1：全局异常处理中间件

#### 创建文件
`Platform.ApiService/Middleware/GlobalExceptionMiddleware.cs`

#### 实现代码
```csharp
using System.Net;
using System.Text.Json;
using Platform.ApiService.Models;

namespace Platform.ApiService.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;
        
        // 记录错误日志
        _logger.LogError(exception, 
            "Unhandled exception. TraceId: {TraceId}, Path: {Path}", 
            traceId, 
            context.Request.Path);

        // 确定状态码和错误码
        var (statusCode, errorCode, errorMessage) = exception switch
        {
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "UNAUTHORIZED", "未授权访问"),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "BAD_REQUEST", exception.Message),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "NOT_FOUND", exception.Message),
            ArgumentException => (StatusCodes.Status400BadRequest, "INVALID_ARGUMENT", exception.Message),
            _ => (StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "服务器内部错误")
        };

        // 构建响应
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            errorCode,
            errorMessage = errorMessage,
            showType = 2,  // ErrorShowType.ERROR_MESSAGE
            traceId,
            timestamp = DateTime.UtcNow
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}
```

#### 注册中间件
```csharp
// Program.cs
app.UseExceptionHandler();  // 可以移除或保留作为备份
app.UseMiddleware<GlobalExceptionMiddleware>();  // 添加全局异常处理

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ActivityLogMiddleware>();
```

#### 简化后的控制器
```csharp
// ❌ 之前：需要 try-catch
[HttpGet]
public async Task<ActionResult<ApiResponse<RoleListResponse>>> GetAllRoles()
{
    try
    {
        var roles = await _roleService.GetAllRolesAsync();
        return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
    }
    catch (Exception ex)
    {
        return StatusCode(500, ApiResponse<RoleListResponse>.ServerErrorResult($"Failed: {ex.Message}"));
    }
}

// ✅ 之后：简洁清晰
[HttpGet]
public async Task<ActionResult<ApiResponse<RoleListResponse>>> GetAllRoles()
{
    var roles = await _roleService.GetAllRolesAsync();
    return Ok(ApiResponse<RoleListResponse>.SuccessResult(roles));
}
```

#### 收益估算
- 减少代码行数：约 200 行
- 提高可维护性：集中管理错误处理
- 统一错误格式：所有错误响应一致
- 自动日志记录：所有异常都被记录

---

### 方案 2：Base Controller 重构

#### 创建文件
`Platform.ApiService/Controllers/BaseApiController.cs`

#### 实现代码
```csharp
using Microsoft.AspNetCore.Mvc;

namespace Platform.ApiService.Controllers;

/// <summary>
/// API 控制器基类，提供常用的辅助方法
/// </summary>
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// 当前用户 ID（从 JWT token）
    /// </summary>
    protected string? CurrentUserId => User.FindFirst("userId")?.Value;

    /// <summary>
    /// 当前用户名（从 JWT token）
    /// </summary>
    protected string? CurrentUsername => User.FindFirst("username")?.Value 
                                        ?? User.FindFirst("name")?.Value;

    /// <summary>
    /// 当前用户角色（从 JWT token）
    /// </summary>
    protected string? CurrentUserRole => User.FindFirst("role")?.Value;

    /// <summary>
    /// 获取必需的用户 ID（如果为空则抛出异常）
    /// </summary>
    protected string GetRequiredUserId()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            throw new UnauthorizedAccessException("未找到用户信息");
        return CurrentUserId;
    }

    /// <summary>
    /// 检查当前用户是否为管理员
    /// </summary>
    protected bool IsAdmin => CurrentUserRole == "admin";

    /// <summary>
    /// 成功响应
    /// </summary>
    protected IActionResult Success<T>(T data, string message = "操作成功")
    {
        return Ok(new { success = true, data, message });
    }

    /// <summary>
    /// 错误响应
    /// </summary>
    protected IActionResult Error(string message, string? errorCode = null)
    {
        return Ok(new { success = false, error = message, errorCode });
    }
}
```

#### 使用示例
```csharp
// ❌ 之前
public class UserController : ControllerBase
{
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, error = "未找到用户信息" });
        
        var user = await _userService.GetUserByIdAsync(userId);
        return Ok(new { success = true, data = user });
    }
}

// ✅ 之后
public class UserController : BaseApiController
{
    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserProfile()
    {
        var userId = GetRequiredUserId();  // 一行代码，自动验证和抛异常
        var user = await _userService.GetUserByIdAsync(userId);
        return Success(user);  // 简洁的响应方法
    }
}
```

#### 收益估算
- 减少代码行数：约 60 行
- 提高可读性：更清晰的代码
- 类型安全：编译时检查
- 易于扩展：可添加更多辅助方法

---

### 方案 3：清理手动日志记录代码

#### 问题
控制器中还有约 8 处手动日志记录代码，但已经有了自动日志中间件。

#### 发现位置
```csharp
// UserController.CreateUserManagement (第 79 行)
await _userService.LogUserActivityAsync(currentUserId, "create_user", $"创建用户: {user.Username}");

// UserController.UpdateUserManagement (第 128 行)
await _userService.LogUserActivityAsync(currentUserId, "update_user", $"更新用户: {user.Username}");

// UserController.DeleteUser (第 168 行)
await _userService.LogUserActivityAsync(currentUserId, "delete_user", logMessage);

// ... 还有 5 处
```

#### 建议
1. **移除简单的日志调用** - 中间件已自动记录
2. **保留特殊的日志调用** - 如需要记录详细原因的批量操作

---

## 优先级建议

### 立即实施（今天）
1. ✅ **Global Exception Middleware** - 最大收益
2. ✅ **Base Controller** - 简单且有效

### 近期实施（本周）
3. **清理手动日志代码** - 代码清理

### 未来考虑（根据需求）
4. 响应格式化中间件
5. 性能监控中间件
6. API 限流中间件

---

## 实施建议

我建议您先实施以下两个改进（最高性价比）：

1. **全局异常处理中间件** 
   - 减少 40+ 处重复代码
   - 统一错误处理
   - 工作量：约 2 小时

2. **Base Controller 重构**
   - 减少 15+ 处重复代码
   - 简化用户信息提取
   - 工作量：约 1 小时

这两个改进可以：
- ✅ 减少约 260 行重复代码
- ✅ 提高代码质量和可维护性
- ✅ 统一错误处理和响应格式
- ✅ 简化控制器代码

**是否要我立即实施这两个改进？**

