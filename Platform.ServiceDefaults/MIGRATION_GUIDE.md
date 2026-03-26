# IDataFactory 到 PlatformDbContext 迁移指南

## 📋 概述

本文档指导如何将所有 IDataFactory 调用迁移到 PlatformDbContext，以符合 AGENTS.md 中的强制规范。

## 🔄 迁移映射表

### 查询操作

| IDataFactory | PlatformDbContext | 说明 |
|-------------|------------------|------|
| `GetByIdAsync(id)` | `_context.Set<T>().FirstOrDefaultAsync(e => e.Id == id)` | 单条查询 |
| `ExistsAsync(id)` | `_context.Set<T>().AnyAsync(e => e.Id == id)` | 存在性检查 |
| `ExistsAsync(filter)` | `_context.Set<T>().AnyAsync(filter)` | 条件存在性检查 |
| `CountAsync(filter)` | `_context.Set<T>().CountAsync(filter)` | 计数 |
| `SumAsync(filter, selector)` | `_context.Set<T>().Where(filter).SumAsync(selector)` | 求和 |
| `FindAsync(filter, orderBy, limit, includes)` | `_context.Set<T>().Where(filter).Include(...).OrderBy(...).Take(limit).ToListAsync()` | 列表查询 |
| `FindPagedAsync(filter, orderBy, page, pageSize)` | `_context.Set<T>().Where(filter).OrderBy(...).Skip((page-1)*pageSize).Take(pageSize).ToListAsync()` | 分页查询 |
| `FindWithoutTenantFilterAsync(...)` | `_context.Set<T>().IgnoreQueryFilters().Where(e => !e.IsDeleted).Where(filter).ToListAsync()` | 跨租户查询 |
| `GetByIdWithoutTenantFilterAsync(id)` | `_context.Set<T>().IgnoreQueryFilters().Where(e => !e.IsDeleted).FirstOrDefaultAsync(e => e.Id == id)` | 跨租户单条查询 |

### 写操作

| IDataFactory | PlatformDbContext | 说明 |
|-------------|------------------|------|
| `CreateAsync(entity)` | `_context.Set<T>().AddAsync(entity); await _context.SaveChangesAsync()` | 创建单条 |
| `CreateManyAsync(entities)` | `_context.Set<T>().AddRangeAsync(entities); await _context.SaveChangesAsync()` | 创建多条 |
| `UpdateAsync(id, action)` | 查询 → 修改 → SaveChangesAsync | 更新单条 |
| `UpdateManyAsync(filter, action)` | 分批查询 → 修改 → SaveChangesAsync | 批量更新 |
| `SoftDeleteAsync(id)` | 查询 → 设置 IsDeleted = true → SaveChangesAsync | 软删除单条 |
| `SoftDeleteManyAsync(filter)` | 分批查询 → 设置 IsDeleted = true → SaveChangesAsync | 软删除多条 |

## 📝 迁移示例

### 示例 1：简单查询

**迁移前：**
```csharp
private readonly IDataFactory<User> _userFactory;

public async Task<User?> GetUserAsync(string id)
    => await _userFactory.GetByIdAsync(id);
```

**迁移后：**
```csharp
private readonly PlatformDbContext _context;

public async Task<User?> GetUserAsync(string id)
    => await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == id);
```

### 示例 2：条件查询

**迁移前：**
```csharp
var users = await _userFactory.FindAsync(u => u.IsActive);
```

**迁移后：**
```csharp
var users = await _context.Set<User>()
    .Where(u => u.IsActive)
    .ToListAsync();
```

### 示例 3：分页查询

**迁移前：**
```csharp
var (items, total) = await _userFactory.FindPagedAsync(
    filter: u => u.IsActive,
    orderBy: q => q.OrderByDescending(u => u.CreatedAt),
    page: 1,
    pageSize: 10
);
```

**迁移后：**
```csharp
var filter = u => u.IsActive;
var total = await _context.Set<User>().CountAsync(filter);
var items = await _context.Set<User>()
    .Where(filter)
    .OrderByDescending(u => u.CreatedAt)
    .Skip(0)
    .Take(10)
    .ToListAsync();
```

### 示例 4：创建操作

**迁移前：**
```csharp
var user = new User { Name = "张三" };
await _userFactory.CreateAsync(user);
```

**迁移后：**
```csharp
var user = new User { Name = "张三" };
await _context.Set<User>().AddAsync(user);
await _context.SaveChangesAsync();
```

### 示例 5：更新操作

**迁移前：**
```csharp
await _userFactory.UpdateAsync(userId, user =>
{
    user.Name = "新名称";
    user.Email = "new@example.com";
});
```

**迁移后：**
```csharp
var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
if (user != null)
{
    user.Name = "新名称";
    user.Email = "new@example.com";
    await _context.SaveChangesAsync();
}
```

### 示例 6：软删除

**迁移前：**
```csharp
await _userFactory.SoftDeleteAsync(userId);
```

**迁移后：**
```csharp
var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
if (user != null)
{
    user.IsDeleted = true;
    await _context.SaveChangesAsync();
}
```

### 示例 7：批量更新

**迁移前：**
```csharp
await _userFactory.UpdateManyAsync(
    u => u.LastLoginAt < cutoffDate,
    u => u.IsActive = false
);
```

**迁移后：**
```csharp
const int batchSize = 1000;
var skip = 0;

while (true)
{
    var batch = await _context.Set<User>()
        .Where(u => u.LastLoginAt < cutoffDate)
        .Skip(skip)
        .Take(batchSize)
        .ToListAsync();
    
    if (batch.Count == 0) break;
    
    foreach (var user in batch)
    {
        user.IsActive = false;
    }
    
    await _context.SaveChangesAsync();
    skip += batchSize;
}
```

### 示例 8：跨租户查询

**迁移前：**
```csharp
var user = await _userFactory.GetByIdWithoutTenantFilterAsync(userId);
```

**迁移后：**
```csharp
var user = await _context.Set<User>()
    .IgnoreQueryFilters()
    .Where(u => !u.IsDeleted)
    .FirstOrDefaultAsync(u => u.Id == userId);
```

## 🔧 依赖注入修改

### 修改前

```csharp
public class UserService
{
    private readonly IDataFactory<User> _userFactory;
    private readonly IDataFactory<Role> _roleFactory;
    
    public UserService(
        IDataFactory<User> userFactory,
        IDataFactory<Role> roleFactory)
    {
        _userFactory = userFactory;
        _roleFactory = roleFactory;
    }
}
```

### 修改后

```csharp
public class UserService
{
    private readonly PlatformDbContext _context;
    
    public UserService(PlatformDbContext context)
    {
        _context = context;
    }
}
```

## ⚠️ 注意事项

### 1. 审计字段自动填充

PlatformDbContext 在 SaveChanges 时自动填充：
- `CreatedAt` / `UpdatedAt`（时间戳）
- `CreatedBy` / `UpdatedBy`（操作人）
- `CompanyId`（多租户）
- `DeletedAt` / `DeletedBy`（软删除）

**无需手动设置这些字段。**

### 2. 全局过滤器

PlatformDbContext 自动应用全局过滤器：
- 软删除过滤：`IsDeleted == false`
- 多租户过滤：`CompanyId == CurrentCompanyId`

**普通查询会自动应用这些过滤器。**

### 3. 跨租户查询

需要绕过多租户过滤时，使用 `IgnoreQueryFilters()`：

```csharp
var user = await _context.Set<User>()
    .IgnoreQueryFilters()
    .Where(u => !u.IsDeleted)  // 仍需手动过滤软删除
    .FirstOrDefaultAsync(u => u.Id == userId);
```

### 4. 事务处理

多个操作需要事务保护时：

```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    await _context.Set<User>().AddAsync(user1);
    await _context.Set<Role>().AddAsync(role1);
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

## 📊 迁移进度

| 服务类 | 状态 | 优先级 |
|--------|------|--------|
| CompanyService | ⏳ 待迁移 | 🔴 高 |
| AuthService | ⏳ 待迁移 | 🔴 高 |
| DocumentService | ⏳ 待迁移 | 🔴 高 |
| WorkflowEngine | ⏳ 待迁移 | 🔴 高 |
| OrganizationService | ⏳ 待迁移 | 🟡 中 |
| ProjectService | ⏳ 待迁移 | 🟡 中 |
| TaskService | ⏳ 待迁移 | 🟡 中 |
| ChatAiService | ⏳ 待迁移 | 🟡 中 |
| ChatSessionService | ⏳ 待迁移 | 🟡 中 |
| IoTService | ⏳ 待迁移 | 🟡 中 |
| FileVersionService | ⏳ 待迁移 | 🟢 低 |
| ImageCaptchaService | ⏳ 待迁移 | 🟢 低 |
| SmtpEmailService | ⏳ 待迁移 | 🟢 低 |

## 🚀 迁移步骤

1. **更新依赖注入** - 将 IDataFactory<T> 替换为 PlatformDbContext
2. **替换查询操作** - 使用 _context.Set<T>() 替代工厂方法
3. **替换写操作** - 使用 AddAsync/SaveChangesAsync 替代工厂方法
4. **处理特殊情况** - 跨租户查询、批量操作、事务处理
5. **编译验证** - 确保代码编译通过
6. **功能测试** - 验证业务逻辑正确性

## 📞 常见问题

### Q: 如何处理多个 DbSet 操作？

A: 直接使用 _context.Set<T>()，无需创建多个工厂实例：

```csharp
var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId);
var role = await _context.Set<Role>().FirstOrDefaultAsync(r => r.Id == roleId);
```

### Q: 如何处理复杂的查询条件？

A: 使用 LINQ 链式调用：

```csharp
var users = await _context.Set<User>()
    .Where(u => u.IsActive)
    .Where(u => u.CreatedAt > startDate)
    .OrderByDescending(u => u.CreatedAt)
    .Take(10)
    .ToListAsync();
```

### Q: 如何处理关联查询？

A: 使用 Include：

```csharp
var users = await _context.Set<User>()
    .Include(u => u.Company)
    .Include(u => u.Roles)
    .Where(u => u.IsActive)
    .ToListAsync();
```

### Q: 如何处理投影查询？

A: 使用 Select：

```csharp
var userDtos = await _context.Set<User>()
    .Where(u => u.IsActive)
    .Select(u => new UserDto { Id = u.Id, Name = u.Name })
    .ToListAsync();
```
