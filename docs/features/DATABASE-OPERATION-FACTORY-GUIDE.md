# 数据访问规范

> 2026-03 更新：平台统一使用 **DbContext** + **LINQ 表达式** 进行数据访问，由 `PlatformDbContext` 自动处理租户隔离、软删除和审计追踪。

## 🚫 禁止行为

**⚠️ 重要：以下行为严格禁止**

1. **禁止修改** `Platform.ServiceDefaults/Services/PlatformDbContext.cs` 文件。

2. **禁止直接注入数据库驱动特定对象**（如 `IMongoCollection<T>`、`IMongoDatabase`）

   ```csharp
   // ❌ 错误示例
   public class UserService
   {
       private readonly IMongoCollection<User> _collection; // 禁止！
   }
   ```

3. **禁止手动设置审计字段**

   ```csharp
   // ❌ 错误示例
   entity.CreatedAt = DateTime.UtcNow; // 禁止！
   entity.CreatedBy = userId; // 禁止！
   ```

## ✅ 正确使用方式

### 1. 服务注入

在业务服务中通过构造函数注入 `DbContext`：

```csharp
public class UserService
{
    private readonly DbContext _context;

    public UserService(DbContext context)
    {
        _context = context;
    }
}
```

### 2. 实体设计

实体实现必要接口：

```csharp
public class User : BaseEntity, ISoftDeletable, IMultiTenant
{
    public string Id { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public string? CompanyId { get; set; } // 多租户
}
```

> `AppUser` 不实现 `IMultiTenant`，因为它是跨企业的全局用户模型，使用 `CurrentCompanyId` 进行动态切换。

### 3. 创建实体

```csharp
public async Task<User> CreateUserAsync(CreateUserRequest request)
{
    var user = new User
    {
        Username = request.Username,
        Email = request.Email
        // 不要设置 CreatedAt、CreatedBy 等字段，PlatformDbContext 会自动处理
    };

    await _context.Set<User>().AddAsync(user);
    await _context.SaveChangesAsync();
    return user;
}
```

### 4. 查询数据

使用 LINQ 表达式构建查询条件：

```csharp
public async Task<User?> GetUserByIdAsync(string id)
{
    return await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
}

public async Task<List<User>> GetUsersAsync(string? keyword)
{
    var query = _context.Set<User>().AsQueryable();
    
    if (!string.IsNullOrEmpty(keyword))
    {
        var search = keyword.ToLower();
        query = query.Where(u => u.Username.ToLower().Contains(search));
    }
    
    return await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
}

public async Task<(List<User> items, long total)> GetPagedUsersAsync(int page, int pageSize, string? keyword)
{
    var filter = (User? u) => true;
    
    if (!string.IsNullOrEmpty(keyword))
    {
        var search = keyword.ToLower();
        filter = u => u.Username.ToLower().Contains(search);
    }
    
    var query = _context.Set<User>().Where(filter);
    var total = await query.LongCountAsync();
    var items = await query.OrderByDescending(u => u.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
    
    return (items, total);
}
```

### 5. 更新实体

```csharp
public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
{
    var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
    if (user == null) return null;
    
    // 直接在实体上修改，EF Core 会自动跟踪变更
    if (!string.IsNullOrEmpty(request.Username))
        user.Username = request.Username;
    if (!string.IsNullOrEmpty(request.Email))
        user.Email = request.Email;
    
    await _context.SaveChangesAsync();
    return user;
}
```

### 6. 软删除

```csharp
public async Task<bool> DeleteUserAsync(string id)
{
    var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
    if (user == null) return false;
    
    user.IsDeleted = true;
    user.DeletedAt = DateTime.UtcNow;
    await _context.SaveChangesAsync();
    return true;
}
```

### 7. 批量操作

```csharp
// 批量查询
var ids = new List<string> { "1", "2" };
var users = await _context.Set<User>().Where(u => ids.Contains(u.Id)).ToListAsync();

// 批量创建
var newUsers = new List<User> { user1, user2 };
await _context.Set<User>().AddRangeAsync(newUsers);
await _context.SaveChangesAsync();
```

### 8. 跨租户查询

需要查询所有企业数据时，使用 `IgnoreQueryFilters()`：

```csharp
// 查询所有用户（忽略租户过滤器）
var allUsers = await _context.Set<User>().IgnoreQueryFilters().ToListAsync();

// 查询已删除的记录
var deletedUsers = await _context.Set<User>().IgnoreQueryFilters()
    .Where(u => u.IsDeleted).ToListAsync();
```

> 注意：使用 `IgnoreQueryFilters()` 需要确保有明确的权限控制。

## LINQ 常见操作

- **等于**: `u => u.Status == "Active"`
- **包含**: `u => ids.Contains(u.Id)`
- **模糊匹配**: `u => u.Username.Contains("admin")`
- **组合条件**: `u => u.IsActive && u.Age > 18`
- **排序**: `q => q.OrderBy(u => u.Name).ThenByDescending(u => u.CreatedAt)`

## 多租户隔离

`PlatformDbContext` 会自动为实现了 `IMultiTenant` 的实体应用租户过滤器：

1. **创建时**：自动设置 `CompanyId`（从 `ITenantContext` 获取）
2. **查询时**：自动附加 `CompanyId` 过滤条件
3. **更新时**：确保只能更新当前企业的数据

```csharp
// 实体实现 IMultiTenant
public class Role : BaseEntity, IMultiTenant, ISoftDeletable
{
    public string? CompanyId { get; set; }
}

// 查询时自动过滤当前企业的角色
var roles = await _context.Set<Role>().Where(r => r.Name == "Admin").ToListAsync();
```

## 后台线程场景

在后台线程中（如定时任务、消息处理），使用 `IServiceScopeFactory` 创建作用域：

```csharp
public class MyHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public MyHostedService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DbContext>();
        
        // 使用 context 进行数据库操作
    }
}
```

## 最佳实践

1. **始终使用 DbContext**：所有数据库操作通过 `DbContext` 进行。
2. **拥抱 LINQ**：完全弃用 `BsonDocument` 或驱动特定的构建器。
3. **不要手动设置审计字段**：让 `PlatformDbContext` 自动处理。
4. **利用多租户隔离**：实现 `IMultiTenant` 接口的实体会自动应用过滤器。
5. **优先使用对象更新**：直接修改实体属性，EF Core 会自动跟踪变更。

## 常见问题

### Q: 如何查询已删除的记录？

A: 使用 `IgnoreQueryFilters()` 方法。默认查询会自动过滤已删除记录。

### Q: 如何自定义集合名称？

A: 在实体类上使用 `[BsonCollectionName("customName")]` 特性：

```csharp
[BsonCollectionName("customUsers")]
public class User : BaseEntity
{
    // ...
}
```

### Q: 为什么登录/注册查询需要用 `IgnoreQueryFilters()`？

A: 因为 `AppUser` 是全局用户模型，不实现 `IMultiTenant`，但全局查询过滤器会尝试检查多租户条件导致错误。登录/注册是特殊的全局操作，需要绕过过滤器。

## 相关文档

- [后端核心与中间件规范](BACKEND-RULES.md)
- [统一 API 响应与控制器规范](API-RESPONSE-RULES.md)
- [开发规范](../开发规范.md)