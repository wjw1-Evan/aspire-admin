# 数据访问工厂使用指南

> 2026-02 重构：由 `IDatabaseOperationFactory` 升级为 `IDataFactory`，全面支持 **LINQ 表达式**，消除对 MongoDB 特定 API 的硬编码依赖。

为提升一致性与可维护性，数据工厂与构建器有如下更新与约定：

- **完全数据库无关**：所有查询与更新均采用 LINQ 表达式。
- **简化 API**：移除了繁琐的 `FilterBuilder/UpdateBuilder`，改用标准的 Lambda 表达式。
- **分页与排序**：`FindPagedAsync` 集成了排序逻辑；排序统一使用 `Func<IQueryable<T>, IOrderedQueryable<T>>`。
- **类型安全更新**：`UpdateAsync` 接受 `Action<T>`，在实体对象上直接操作，由工厂自动检测变更并执行审计字段更新。
- **自动审计与租户**：保留对 `IMultiTenant`、`ISoftDeletable`、`ITimestamped` 的自动处理，逻辑集中在 `PlatformDbContext` 中。

> 本文档说明如何使用 `IDataFactory<T>` 进行数据库操作，这是平台统一且未来兼容（如迁移 EF Core）的数据访问方式。

## 📋 概述

`IDataFactory<T>` 是平台统一的数据访问抽象，提供了以下核心能力：

- **多租户隔离**：自动为实现了 `IMultiTenant` 的实体附加 `CompanyId` 过滤
- **软删除支持**：自动处理软删除逻辑，查询时自动过滤已删除记录
- **审计字段维护**：由 `PlatformDbContext` 自动维护 `CreatedAt`、`UpdatedAt`、`CreatedBy`、`UpdatedBy` 等审计字段
- **原子操作**：所有操作都是原子性的，确保数据一致性

## 🚫 禁止行为

**⚠️ 重要：以下行为严格禁止**

1. **禁止直接注入数据库驱动特定对象**（如 `IMongoCollection<T>`、`IMongoDatabase` 或 `DbContext`）

   ```csharp
   // ❌ 错误示例
   public class UserService
   {
       private readonly IMongoCollection<User> _collection; // 禁止！
   }
   ```

2. **禁止使用 MongoDB 特定构建器**（如 `Builders<T>.Filter`、`UpdateBuilder` 等）

2. **禁止手动设置审计字段**

   ```csharp
   // ❌ 错误示例
   entity.CreatedAt = DateTime.UtcNow; // 禁止！
   entity.CreatedBy = userId; // 禁止！
   ```

3. **禁止绕过工厂直接操作数据库**

   ```csharp
   // ❌ 错误示例
   await _collection.InsertOneAsync(entity); // 禁止！
   ```

## ✅ 正确使用方式

### 1. 服务注册

在 `Program.cs` 中注册数据库工厂：

```csharp
// 推荐方式：一键注册平台数据库与基础设施
builder.AddPlatformDatabase();
```

### 2. 服务注入

在业务服务中通过构造函数注入：

```csharp
public class UserService : IUserService
{
    private readonly IDataFactory<User> _userFactory;

    public UserService(IDataFactory<User> userFactory)
    {
        _userFactory = userFactory;
    }
}
```

### 3. 实体设计

实体必须实现以下接口：

```csharp
public class User : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    public string Id { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CompanyId { get; set; } = string.Empty; // 多租户
}
```

### 4. 创建实体

```csharp
public async Task<User> CreateUserAsync(CreateUserRequest request)
{
    var user = new User
    {
        Username = request.Username,
        Email = request.Email,
        // 不要设置 CreatedAt、CreatedBy 等字段，工厂会自动处理
    };

    // 使用工厂创建，自动处理审计字段和多租户隔离
    return await _userFactory.CreateAsync(user);
}
```

使用 LINQ 表达式构建查询条件：

```csharp
public async Task<User?> GetUserByIdAsync(string id)
{
    // 简单查询
    return await _userFactory.GetByIdAsync(id);
}

public async Task<List<User>> GetUsersAsync(string? keyword)
{
    // 使用 LINQ 表达式进行过滤和排序
    var search = keyword?.ToLower();
    
    return await _userFactory.FindAsync(
        u => string.IsNullOrEmpty(search) || u.Username.ToLower().Contains(search),
        q => q.OrderByDescending(u => u.CreatedAt)
    );
}

public async Task<(List<User> items, int total)> GetPagedUsersAsync(int page, int pageSize, string? keyword)
{
    var search = keyword?.ToLower();

    return await _userFactory.FindPagedAsync(
        u => string.IsNullOrEmpty(search) || u.Username.ToLower().Contains(search),
        q => q.OrderByDescending(u => u.CreatedAt),
        page,
        pageSize
    );
}
```

### 6. 更新实体

```csharp
public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
{
    // 采用领域模型风格更新，工厂负责检测变更并保存，同时更新审计字段
    var updatedUser = await _userFactory.UpdateAsync(id, u => 
    {
        if (!string.IsNullOrEmpty(request.Username))
            u.Username = request.Username;
            
        if (!string.IsNullOrEmpty(request.Email))
            u.Email = request.Email;
    });

    if (updatedUser == null)
        throw new KeyNotFoundException($"用户 {id} 不存在");

    return updatedUser;
}
```

### 7. 软删除

```csharp
public async Task<bool> DeleteUserAsync(string id)
{
    // 软删除，自动设置 IsDeleted、DeletedAt、DeletedBy
    var updated = await _userFactory.UpdateAsync(id, u => u.IsDeleted = true);
    return updated != null;
}
```

### 8. 批量操作

```csharp
// 批量查询 (基于 LINQ)
var ids = new List<string> { "1", "2" };
var users = await _userFactory.FindAsync(u => ids.Contains(u.Id));

// 批量创建
var newUsers = new List<User> { user1, user2 };
var createdUsers = await _userFactory.CreateManyAsync(newUsers);

// 批量更新或删除 (通常建议循环调用 UpdateAsync 以确保审计完整性，或使用工厂支持的批处理方法)
// 注意：复杂的批量逻辑请根据具体 IDataFactory 实现来扩展。
```

### LINQ 常见操作对照 (取代旧 Builder)

- **等于**: `u => u.Status == "Active"`
- **包含**: `u => ids.Contains(u.Id)`
- **模糊匹配**: `u => u.Username.Contains("admin")`
- **正则 (由驱动支持)**: 使用 `System.Text.RegularExpressions.Regex.IsMatch` 或对应的 LINQ 扩展
- **组合条件**: `u => u.IsActive && u.Age > 18`
- **排序**: `q => q.OrderBy(u => u.Name).ThenByDescending(u => u.CreatedAt)`

## 🌐 多租户隔离

对于实现了 `IMultiTenant` 的实体，工厂会自动：

1. **创建时**：自动设置 `CompanyId`（从 `ITenantContext` 获取）
2. **查询时**：自动附加 `CompanyId` 过滤条件 (基于解析到的 `CurrentCompanyId`)
3. **更新时**：确保只能更新当前企业的数据

```csharp
// 实体实现 IMultiTenant
public class Role : MultiTenantEntity, ISoftDeletable, ITimestamped, IEntity
{
    // CompanyId 由 MultiTenantEntity 提供
}

// 查询时自动过滤当前企业的角色
var roles = await _userFactory.FindAsync(u => u.Name == "Admin"); // 只返回当前企业的 Admin 角色
```

## 🔄 后台线程场景

在后台线程中（如定时任务、消息处理），可能无法访问 `HttpContext`，此时可以使用重载方法：

```csharp
// 提供用户信息，避免访问 HttpContext
var entity = new SomeEntity { /* ... */ };
await _userFactory.CreateAsync(entity, userId: "user123", username: "admin");
```

## 📝 最佳实践

1. **始终使用工厂**：所有数据库操作都通过 `IDataFactory<T>` 进行。
2. **拥抱 LINQ**：完全弃用 `BsonDocument` 或驱动特定的构建器，确保代码可读性与跨数据库兼容性。
3. **不要手动设置审计字段**：让工厂自动处理。
4. **利用多租户隔离**：实现 `IMultiTenant` 接口。
5. **优先使用 Lambda 更新**：使用 `UpdateAsync(id, entity => { ... })` 保持业务逻辑在 C# 对象上操作。

## 🔍 常见问题

### Q: 如何查询已删除的记录？

A: 请使用 `FindIncludingDeletedAsync` 方法。工厂默认的 `FindAsync/FindPagedAsync` 会自动过滤已删除记录。

### Q: 如何跨企业查询？

A: 仅在系统管理员或后台任务等特殊场景下，可使用 `FindWithoutTenantFilterAsync` 方法。使用这些方法时必须确保有明确的权限控制。

### Q: 如何自定义集合名称？

A: 在实体类上使用 `[BsonCollectionName("customName")]` 特性：

```csharp
[BsonCollectionName("customUsers")]
public class User : IEntity, ISoftDeletable, ITimestamped
{
    // ...
}
```

## 📚 相关文档

- [后端核心与中间件规范](BACKEND-RULES.md)
- [统一 API 响应与控制器规范](API-RESPONSE-RULES.md)
