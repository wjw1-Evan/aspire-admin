# 修复"我的活动"数据记录不完整问题

## 📋 问题描述

系统管理 → 我的活动 页面的数据记录不完整，缺少很多操作的活动记录。

## 🔍 问题根因分析

### 初始诊断

1. **ActivityLogMiddleware 异步日志记录**
   - 使用 `Task.Run` 将日志记录任务卸载到后台线程
   - 后台线程中访问 `HttpContext`（通过 `IHttpContextAccessor`）时，`HttpContext` 可能已被释放或不可用
   - 导致 `ITenantContext.GetCurrentUserId()` 返回 `null`，从而 `CompanyId` 也为 `null`

### 深入分析

经过修复后的进一步分析发现，问题的根本原因是：

1. **ActivityLogMiddleware 的问题**
   - 在 `Task.Run` 中访问 `HttpContext` 导致线程上下文丢失
   - `IHttpContextAccessor.HttpContext` 在后台线程可能返回 `null`
   - 用户信息无法正确提取

2. **UserActivityLogService 的依赖问题**
   - 依赖 `ITenantContext` 和 `IHttpContextAccessor` 获取企业ID
   - 在后台线程中这些依赖无法正常工作

## ✅ 解决方案

### 1. ActivityLogMiddleware 修复

**关键修复**：在请求线程中提取所有 `HttpContext` 相关的数据，然后传递给后台线程。

```csharp
// 在请求线程中提取所有数据
var logData = ExtractLogData(context, stopwatch.ElapsedMilliseconds);

if (logData.HasValue)
{
    // 异步记录日志（不等待完成，避免阻塞响应）
    _ = Task.Run(async () =>
    {
        try
        {
            await LogRequestAsync(logData.Value, logService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log activity for {Path}", logData.Value.path);
        }
    });
}
```

**ExtractLogData 方法**：
```csharp
private (string? userId, string? username, string httpMethod, string path, string? queryString, int statusCode, long durationMs, string? ipAddress, string? userAgent)? ExtractLogData(HttpContext context, long durationMs)
{
    // 提取用户信息
    string? userId = null;
    string? username = null;

    if (context.User?.Identity?.IsAuthenticated == true)
    {
        userId = context.User.FindFirst("userId")?.Value;
        username = context.User.FindFirst("username")?.Value
                  ?? context.User.FindFirst("name")?.Value
                  ?? context.User.Identity.Name;
    }

    // 检查是否包含匿名用户
    var includeAnonymous = _configuration.GetValue<bool>("ActivityLog:IncludeAnonymous", false);
    if (string.IsNullOrEmpty(userId) && !includeAnonymous)
    {
        return null; // 不记录匿名请求
    }

    // 提取请求信息
    var httpMethod = context.Request.Method;
    var path = context.Request.Path.Value ?? string.Empty;
    var queryString = context.Request.QueryString.Value;
    
    // ... 提取其他信息 ...

    return (userId, username, httpMethod, path, queryString, statusCode, durationMs, ipAddress, userAgent);
}
```

### 2. UserActivityLogService 修复

**关键修复**：移除对 `ITenantContext` 和 `IHttpContextAccessor` 的依赖，直接从数据库查询用户的企业ID。

**添加依赖**：
```csharp
private readonly IDatabaseOperationFactory<AppUser> _userFactory;

public UserActivityLogService(
    IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
    IDatabaseOperationFactory<AppUser> userFactory,  // 新增
    ILogger<UserActivityLogService> logger)
{
    _activityLogFactory = activityLogFactory;
    _userFactory = userFactory;  // 新增
    _logger = logger;
}
```

**新增方法**：
```csharp
/// <summary>
/// 尝试获取用户的企业ID（从数据库获取，不使用 JWT token）
/// 如果没有用户上下文或用户未登录，返回 null
/// </summary>
private async Task<string?> TryGetUserCompanyIdAsync(string? userId)
{
    if (string.IsNullOrEmpty(userId))
    {
        return null;
    }

    try
    {
        var user = await _userFactory.GetByIdAsync(userId);
        return user?.CurrentCompanyId;
    }
    catch
    {
        return null;
    }
}
```

**使用新方法**：
```csharp
public async Task LogHttpRequestAsync(
    string? userId,
    string? username,
    string httpMethod,
    string path,
    string? queryString,
    int statusCode,
    long durationMs,
    string? ipAddress,
    string? userAgent)
{
    var action = GenerateActionFromPath(httpMethod, path);
    var description = GenerateDescription(httpMethod, path, statusCode, username, ipAddress, queryString);

    // 获取当前企业上下文（从数据库获取，不使用 JWT token）
    var companyId = await TryGetUserCompanyIdAsync(userId);

    var log = new UserActivityLog
    {
        UserId = userId ?? "anonymous",
        Username = username ?? "匿名用户",
        Action = action,
        Description = description,
        HttpMethod = httpMethod,
        Path = path,
        QueryString = queryString,
        StatusCode = statusCode,
        Duration = durationMs,
        IpAddress = ipAddress,
        UserAgent = userAgent,
        CompanyId = companyId ?? string.Empty,
        IsDeleted = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    await _activityLogFactory.CreateAsync(log);
}
```

### 3. UserActivityLog 模型修复

确保 `UserActivityLog` 实现 `IMultiTenant` 接口，以便自动应用企业过滤：

```csharp
public class UserActivityLog : ISoftDeletable, IEntity, ITimestamped, IMultiTenant
{
    // ... 其他字段 ...
    
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
}
```

## 🎯 修复效果

### 修复前

- ❌ 活动日志中 `CompanyId` 为空
- ❌ 很多操作没有被记录
- ❌ 跨租户数据泄露风险（无企业过滤）

### 修复后

- ✅ 所有操作的活动日志都正确记录
- ✅ `CompanyId` 从数据库正确获取
- ✅ 自动企业过滤（`UserActivityLog` 实现了 `IMultiTenant`）
- ✅ 异步日志记录不阻塞请求响应

## 🔧 技术要点

### 1. 后台线程访问 HttpContext

**问题**：
```csharp
// ❌ 错误：在 Task.Run 中访问 HttpContext
_ = Task.Run(async () =>
{
    var userId = _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
    // HttpContext 可能已释放
});
```

**解决方案**：
```csharp
// ✅ 正确：在请求线程提取数据，然后在后台线程使用
var logData = ExtractLogData(context, durationMs);
_ = Task.Run(async () =>
{
    await LogRequestAsync(logData.Value, logService);
});
```

### 2. 依赖解耦

**问题**：
```csharp
// ❌ 错误：依赖 HttpContext 和 ITenantContext
public UserActivityLogService(
    IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
    ITenantContext tenantContext,  // ❌ 依赖 HttpContext
    IHttpContextAccessor httpContextAccessor)  // ❌ 依赖 HttpContext
```

**解决方案**：
```csharp
// ✅ 正确：直接查询数据库，不依赖 HttpContext
public UserActivityLogService(
    IDatabaseOperationFactory<UserActivityLog> activityLogFactory,
    IDatabaseOperationFactory<AppUser> userFactory)  // ✅ 直接查询
```

### 3. 异步日志记录性能优化

**关键设计**：
- 在请求线程中提取所有 `HttpContext` 数据
- 使用 `Task.Run` 异步记录日志（不等待完成）
- 避免阻塞请求响应

## 📋 修改文件清单

1. **Platform.ApiService/Middleware/ActivityLogMiddleware.cs**
   - 添加 `ExtractLogData` 方法提取日志数据
   - 修改 `InvokeAsync` 方法在请求线程中提取数据
   - 修改 `LogRequestAsync` 接受预提取的数据

2. **Platform.ApiService/Services/UserActivityLogService.cs**
   - 添加 `IDatabaseOperationFactory<AppUser>` 依赖
   - 移除 `ITenantContext` 和 `IHttpContextAccessor` 依赖
   - 添加 `TryGetUserCompanyIdAsync` 方法
   - 更新 `LogHttpRequestAsync` 和 `LogActivityAsync` 使用新方法

3. **Platform.ApiService/Models/User.cs**
   - 确保 `UserActivityLog` 实现 `IMultiTenant` 接口

## 🧪 验证方法

### 1. 验证活动日志完整性

1. 登录系统
2. 执行以下操作：
   - 查看用户列表
   - 创建新用户
   - 更新用户信息
   - 删除用户
   - 修改密码
   - 查看通知
   - 创建角色
3. 访问"我的活动"页面
4. 验证所有操作都被正确记录

### 2. 验证企业过滤

1. 使用不同企业的用户登录
2. 检查"我的活动"只显示当前企业的记录
3. 验证数据库中 `CompanyId` 字段正确填充

### 3. 验证性能

1. 发送多个并发请求
2. 检查响应时间是否正常（日志记录不应该影响响应）
3. 检查日志是否正确异步记录

## 📚 相关文档

- [ActivityLogMiddleware 设计文档](../middleware/ACTIVITY-LOG-MIDDLEWARE.md)
- [UserActivityLogService 设计文档](../services/USER-ACTIVITY-LOG-SERVICE.md)
- [多租户系统开发规范](../../.cursor/rules/multi-tenant-development.mdc)
- [数据库操作工厂使用指南](../features/DATABASE-OPERATION-FACTORY-GUIDE.md)

## ✅ 修复完成

- ✅ 修复了 ActivityLogMiddleware 的 HttpContext 访问问题
- ✅ 修复了 UserActivityLogService 的依赖问题
- ✅ 确保了 UserActivityLog 正确实现 IMultiTenant
- ✅ 验证了活动日志记录的完整性
- ✅ 验证了企业过滤的正确性

