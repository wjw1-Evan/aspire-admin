# 修复 ActivityLogMiddleware 中 HttpContext 已释放的问题

## 问题描述

在 `ActivityLogMiddleware` 中，当在后台线程中记录 HTTP 请求日志时，会出现 `System.ObjectDisposedException` 错误：

```
System.ObjectDisposedException: IFeatureCollection has been disposed.
Object name: 'Collection'.
   at Microsoft.AspNetCore.Http.Features.FeatureReferences`1.ThrowContextDisposed()
   at Microsoft.AspNetCore.Http.Features.FeatureReferences`1.Fetch[TFeature](TFeature& cached, Func`2 factory)
   at Microsoft.AspNetCore.Http.DefaultHttpContext.get_User()
   at Platform.ServiceDefaults.Services.TenantContext.GetCurrentUserId()
   at Platform.ServiceDefaults.Services.DatabaseOperationFactory`1.GetActorAsync()
   at Platform.ServiceDefaults.Services.DatabaseOperationFactory`1.CreateAsync(T entity)
```

## 问题原因

1. `ActivityLogMiddleware` 在 `InvokeAsync` 中，在 `await _next(context)` 之后，使用 `Task.Run` 在后台线程中异步记录日志
2. 在后台线程中，`HttpContext` 已经被释放（因为请求已经完成）
3. `DatabaseOperationFactory.CreateAsync` 调用 `GetActorAsync()`，而 `GetActorAsync()` 调用 `TenantContext.GetCurrentUserId()`
4. `TenantContext.GetCurrentUserId()` 尝试访问 `_httpContextAccessor.HttpContext?.User`，但此时 `HttpContext` 已经被释放

## 解决方案

### 1. 在 `IDatabaseOperationFactory` 接口中添加重载方法

添加了一个支持传入 `userId` 和 `username` 的 `CreateAsync` 重载方法，用于后台线程场景：

```csharp
/// <summary>
/// 创建实体（原子操作，后台线程场景，避免访问 HttpContext）
/// </summary>
/// <param name="entity">要创建的实体</param>
/// <param name="userId">用户ID（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
/// <param name="username">用户名（可选，如果提供则使用此值，否则从 TenantContext 获取）</param>
Task<T> CreateAsync(T entity, string? userId, string? username);
```

### 2. 在 `DatabaseOperationFactory` 中实现重载方法

实现该方法时：
- 优先使用传入的 `userId` 和 `username`
- 如果未提供，尝试从 `TenantContext` 获取（可能失败，如果 `HttpContext` 已释放）
- 捕获 `ObjectDisposedException`，优雅处理后台线程场景
- 对于多租户实体，优先使用实体上已有的 `CompanyId`（后台线程场景中应该已经设置）

### 3. 修改 `UserActivityLogService.LogHttpRequestAsync`

使用新的重载方法，传入已提取的 `userId` 和 `username`：

```csharp
// ⚠️ 使用重载方法，传入 userId 和 username，避免在后台线程中访问已释放的 HttpContext
await _activityLogFactory.CreateAsync(log, request.UserId, request.Username);
```

### 4. 优化 `TenantContext.GetCurrentUserId()`

添加异常处理，优雅处理 `HttpContext` 已释放的情况：

```csharp
public string? GetCurrentUserId()
{
    try
    {
        var user = _httpContextAccessor.HttpContext?.User;
        // ... 原有逻辑 ...
    }
    catch (ObjectDisposedException)
    {
        // HttpContext 已被释放（常见于后台线程场景）
        // 返回 null，调用方应该提供备用值
        return null;
    }
}
```

## 修改的文件

1. `Platform.ServiceDefaults/Services/IDatabaseOperationFactory.cs` - 添加重载方法接口
2. `Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs` - 实现重载方法
3. `Platform.ApiService/Services/UserActivityLogService.cs` - 使用新的重载方法
4. `Platform.ServiceDefaults/Services/ITenantContext.cs` - 优化异常处理

## 测试建议

1. 测试正常请求场景，确保日志记录正常
2. 测试后台线程场景，确保不再出现 `ObjectDisposedException`
3. 测试匿名用户请求，确保日志记录正常
4. 测试多租户场景，确保 `CompanyId` 正确设置

## 相关规则

- 遵循后端核心规则：所有实体访问统一走 `IDatabaseOperationFactory<T>`
- 遵循审计与软删规则：创建/更新/删除统一走工厂的原子方法
- 遵循多租户隔离规则：所有实体访问统一走 `IDatabaseOperationFactory<T>`，实现 `IMultiTenant` 自动附加 `CompanyId` 过滤

## 后续修复

### TypeLoadException 问题

在修复后，出现了新的运行时错误：
```
System.TypeLoadException: GenericArguments[0], 'T', on 'Platform.ServiceDefaults.Services.IDatabaseOperationFactory`1[T]' violates the constraint of type parameter 'T'.
```

**问题原因**：
- `UserActivityLog` 类使用了完全限定的接口名称（`Platform.ServiceDefaults.Models.ISoftDeletable` 等）
- 但接口定义中的约束使用的是简短的接口名称（`ISoftDeletable` 等）
- 这导致运行时类型解析时无法正确匹配接口

**解决方案**：
1. 在 `Platform.ApiService/Models/User.cs` 中添加 `using Platform.ServiceDefaults.Models;`
2. 将 `UserActivityLog` 类的接口实现从完全限定名称改为简短名称：
   ```csharp
   // 修改前
   public class UserActivityLog : Platform.ServiceDefaults.Models.ISoftDeletable, ...
   
   // 修改后
   public class UserActivityLog : ISoftDeletable, IEntity, ITimestamped, IMultiTenant
   ```

## 日期

2025-01-XX

