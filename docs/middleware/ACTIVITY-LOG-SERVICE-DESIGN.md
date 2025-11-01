# UserActivityLogService 设计说明

## 📋 概述

本文档说明 `UserActivityLogService` 的设计决策，特别是为什么**不使用 `ITenantContext`**，而是直接从数据库获取企业ID。

## ✅ 核心设计

### 为什么不用 ITenantContext？

**核心原因**：`ActivityLogMiddleware` 在后台线程（`Task.Run`）中记录日志，`ITenantContext` 依赖 `HttpContext`，而在后台线程中 `HttpContext` 可能不可用。

### 解决方案：直接查询数据库

```csharp
public class UserActivityLogService : IUserActivityLogService
{
    private readonly IDatabaseOperationFactory<UserActivityLog> _activityLogFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;  // ✅ 直接查询用户
    private readonly ILogger<UserActivityLogService> _logger;

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

    public async Task LogHttpRequestAsync(...)
    {
        var companyId = await TryGetUserCompanyIdAsync(userId);  // ✅ 直接查询
        
        var log = new UserActivityLog
        {
            CompanyId = companyId ?? string.Empty,
            // ...
        };
        
        await _activityLogFactory.CreateAsync(log);
    }
}
```

## 🔍 架构对比

### ❌ 错误设计（使用 ITenantContext）

```csharp
public class UserActivityLogService : IUserActivityLogService
{
    private readonly ITenantContext _tenantContext;  // ❌ 依赖 HttpContext
    
    public async Task LogHttpRequestAsync(...)
    {
        // ❌ 在后台线程中，HttpContext 可能不可用
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        // ...
    }
}
```

**问题**：
1. `ITenantContext` 依赖 `HttpContext`
2. `ActivityLogMiddleware` 在后台线程执行
3. 后台线程无法访问 `HttpContext`
4. 导致 `CompanyId` 为空

### ✅ 正确设计（直接查询数据库）

```csharp
public class UserActivityLogService : IUserActivityLogService
{
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    
    public async Task LogHttpRequestAsync(...)
    {
        // ✅ 直接查询数据库，不依赖 HttpContext
        var companyId = await TryGetUserCompanyIdAsync(userId);
        // ...
    }
}
```

**优点**：
1. ✅ 不依赖 `HttpContext`
2. ✅ 可以在任何线程、任何上下文中运行
3. ✅ 可靠性高
4. ✅ 数据一致性好

## 🎯 设计原则

### 1. 解耦 HttpContext

**原则**：后台任务不应依赖请求上下文

**实现**：
- 在请求线程中提取所有 `HttpContext` 数据
- 传递给后台线程使用预提取的数据

```csharp
// Middleware: 请求线程提取数据
var logData = ExtractLogData(context, durationMs);

// 后台线程: 使用预提取的数据
_ = Task.Run(async () => {
    using var scope = context.RequestServices.CreateScope();
    var logService = scope.ServiceProvider.GetRequiredService<IUserActivityLogService>();
    await LogRequestAsync(logData.Value, logService);  // ✅ 已提取的数据
});
```

### 2. 直接查询数据源

**原则**：需要什么数据就直接查询什么数据

**实现**：
- 不需要 `ITenantContext` 的复杂逻辑
- 只需要用户的 `CurrentCompanyId`
- 直接查询 `AppUser` 集合

### 3. 容错设计

**原则**：失败不应影响业务

**实现**：
```csharp
private async Task<string?> TryGetUserCompanyIdAsync(string? userId)
{
    if (string.IsNullOrEmpty(userId))
        return null;

    try
    {
        var user = await _userFactory.GetByIdAsync(userId);
        return user?.CurrentCompanyId;
    }
    catch
    {
        return null;  // ✅ 失败时返回 null，不影响日志记录
    }
}
```

## 📊 数据流

```
[请求线程]                           [后台线程]
    │                                     │
    ├─ ExtractLogData                    │
    │   └─ userId, username, etc.        │
    │                                     │
    ├─ Task.Run ────────────────────>    ├─ CreateScope
    │                                     ├─ GetService
    │                                     ├─ TryGetUserCompanyIdAsync
    │                                     │   └─ 查询 AppUser 集合
    │                                     │       └─ 获取 CurrentCompanyId
    │                                     │
    │                                     └─ Create ActivityLog
```

## 🔍 性能考虑

### 查询开销

**问题**：每次日志记录都查询数据库，是否有性能问题？

**分析**：
1. **并发影响**：日志记录是异步的，不阻塞请求
2. **数据量**：单次查询按 ID，非常快（有索引）
3. **实际场景**：异步写入，不会造成数据库压力
4. **权衡**：用少量查询换取架构简单性和可靠性

### 优化选项

如果将来需要优化：

```csharp
// 可选优化1：缓存用户ID到CompanyID的映射
private readonly IMemoryCache _cache;

// 可选优化2：批量获取多个用户的CompanyID
private async Task<Dictionary<string, string>> GetUsersCompanyIdsAsync(List<string> userIds)

// 可选优化3：使用 Message Queue + Background Service
// 见 ActivityLogMiddleware 架构评估文档
```

**当前建议**：无需优化，当前设计已足够。

## ✅ 多租户过滤

### 自动企业过滤

`UserActivityLog` 实现了 `IMultiTenant`，查询时自动过滤：

```csharp
public async Task<UserActivityLogPagedResponse> GetActivityLogsAsync(...)
{
    var filter = _activityLogFactory.CreateFilterBuilder()
        .Equal(log => log.UserId, request.UserId)
        .Build();
    
    // ✅ 数据工厂会自动添加企业过滤
    var (logs, total) = await _activityLogFactory.FindPagedAsync(filter, sort, page, pageSize);
}
```

## 🧪 测试考虑

### 单元测试

```csharp
[Test]
public async Task LogHttpRequestAsync_ShouldGetCompanyIdFromDatabase()
{
    // Arrange
    var userId = "user123";
    var user = new AppUser { Id = userId, CurrentCompanyId = "company123" };
    _mockUserFactory.Setup(f => f.GetByIdAsync(userId)).ReturnsAsync(user);
    
    // Act
    await _service.LogHttpRequestAsync(userId, ...);
    
    // Assert
    _mockActivityLogFactory.Verify(f => f.CreateAsync(
        It.Is<UserActivityLog>(log => log.CompanyId == "company123")
    ));
}
```

### 集成测试

```csharp
[Test]
public async Task ActivityLog_ShouldWorkInBackgroundThread()
{
    // Arrange
    var userId = "user123";
    
    // Act - 模拟后台线程记录日志
    await Task.Run(async () => {
        await _service.LogHttpRequestAsync(userId, ...);
    });
    
    // Assert
    var logs = await _service.GetActivityLogsAsync(...);
    Assert.That(logs.Data, Has.Count.EqualTo(1));
    Assert.That(logs.Data[0].CompanyId, Is.EqualTo("company123"));
}
```

## 📋 对比总结

| 特性 | 使用 ITenantContext ❌ | 直接查询数据库 ✅ |
|------|---------------------|-----------------|
| **依赖** | HttpContext（请求上下文） | 数据库（持久化） |
| **后台线程** | ❌ 无法工作 | ✅ 完美支持 |
| **可靠性** | ❌ 可能失败 | ✅ 高可靠性 |
| **复杂度** | ❌ 复杂的依赖链 | ✅ 简单直接 |
| **性能** | ✅ 无需查询 | ⚠️ 需要查询 |
| **可测试性** | ❌ 需要模拟 HttpContext | ✅ 易于测试 |
| **架构清晰度** | ❌ 隐含依赖 | ✅ 明确依赖 |

## 🎯 设计原则总结

1. ✅ **解耦 HttpContext**：后台任务不依赖请求上下文
2. ✅ **直接查询**：需要什么数据就查询什么数据
3. ✅ **容错设计**：失败不影响业务
4. ✅ **简单明了**：架构清晰，易于维护

## 📚 相关文档

- [ActivityLogMiddleware 设计评估](ACTIVITY-LOG-MIDDLEWARE-REVIEW.md)
- [我的活动数据记录不完整修复](../bugfixes/ACTIVITY-LOG-INCOMPLETE-FIX.md)
- [中间件开发规范](../../.cursor/rules/middleware-development.mdc)

## ✅ 结论

**`UserActivityLogService` 不使用 `ITenantContext` 是正确的设计选择**，因为：
1. 后台线程无法访问 `HttpContext`
2. 直接查询数据库更可靠
3. 架构更简单清晰
4. 易于测试和维护

当前设计是**架构级别的正确决策**。

