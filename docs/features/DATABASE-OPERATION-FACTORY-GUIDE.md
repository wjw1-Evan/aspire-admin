# 数据访问工厂使用指南

> 2026-01 更新：统一分页范围、字段名映射与审计写入的行为说明

为提升一致性与可维护性，数据工厂与构建器有如下更新与约定：

- 分页参数钳制：`page` 范围为 1–10000，`pageSize` 范围为 1–100；控制器直接传 `page/pageSize` 给 `FindPagedAsync`，不需自行计算 `skip`。
- 多租户过滤字段名：工厂应用租户过滤时优先使用实体 `CompanyId` 的 `[BsonElement]` 字段名；若无则使用属性名的 camelCase（避免硬编码 `"companyId"`）。
- FilterBuilder 的 BSON 字段映射：`Regex/Exists` 等使用字符串字段名的方法统一为 BsonElement-aware；与 `SortBuilder/UpdateBuilder` 保持一致。
- 数组包含语义：`Contains(field, value)` 采用 `Eq(field, value)` 的数组匹配语义（驱动在数组字段上解析为“数组包含元素”）。复杂数组匹配请使用 `AnyEq` 或自定义 `ElemMatch`。
- UpdateBuilder 空更新：`Build()` 在无任何更新项时抛出 `InvalidOperationException`，避免写入无意义更新。
- 审计字段写入：若实体实现 `IOperationTrackable`，工厂直接赋值 `CreatedBy/CreatedByUsername` 与 `UpdatedBy/UpdatedByUsername`；否则保留反射兜底，建议逐步实现接口以去反射化。

> 本文档说明如何使用 `IDatabaseOperationFactory<T>` 进行数据库操作，这是平台统一的数据访问方式。

## 📋 概述

`IDatabaseOperationFactory<T>` 是平台统一的数据访问抽象，提供了以下核心能力：

- **多租户隔离**：自动为实现了 `IMultiTenant` 的实体附加 `CompanyId` 过滤
- **软删除支持**：自动处理软删除逻辑，查询时自动过滤已删除记录
- **审计字段维护**：自动维护 `CreatedAt`、`UpdatedAt`、`CreatedBy`、`UpdatedBy` 等审计字段
- **原子操作**：所有操作都是原子性的，确保数据一致性

## 🚫 禁止行为

**⚠️ 重要：以下行为严格禁止**

1. **禁止直接注入 `IMongoCollection<T>` 或 `IMongoDatabase`**

   ```csharp
   // ❌ 错误示例
   public class UserService
   {
       private readonly IMongoCollection<User> _collection; // 禁止！
   }
   ```

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
// 推荐方式：统一注册
services.AddDatabaseFactory();
```

### 2. 服务注入

在业务服务中通过构造函数注入：

```csharp
public class UserService : IUserService
{
    private readonly IDatabaseOperationFactory<User> _factory;

    public UserService(IDatabaseOperationFactory<User> factory)
    {
        _factory = factory;
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
    return await _factory.CreateAsync(user);
}
```

### 5. 查询实体

使用构建器创建查询条件：

```csharp
public async Task<User?> GetUserByIdAsync(string id)
{
    var filter = _factory.CreateFilterBuilder()
        .Eq(u => u.Id, id)
        .Build();

    return await _factory.GetByIdAsync(id);
}

public async Task<List<User>> GetUsersAsync(string? keyword)
{
    var filterBuilder = _factory.CreateFilterBuilder();

    if (!string.IsNullOrEmpty(keyword))
    {
        filterBuilder.Regex(u => u.Username, keyword);
    }

    var filter = filterBuilder.Build();
    var sort = _factory.CreateSortBuilder()
        .Descending(u => u.CreatedAt)
        .Build();

    return await _factory.FindAsync(filter, sort);
}
```

### 6. 更新实体

```csharp
public async Task<User?> UpdateUserAsync(string id, UpdateUserRequest request)
{
    var update = _factory.CreateUpdateBuilder()
        .Set(u => u.Username, request.Username)
        .Set(u => u.Email, request.Email)
        .Build();

    var filter = _factory.CreateFilterBuilder()
        .Eq(u => u.Id, id)
        .Build();

    // 使用原子更新，自动维护 UpdatedAt、UpdatedBy
    return await _factory.FindOneAndUpdateAsync(filter, update);
}
```

### 7. 软删除

```csharp
public async Task<bool> DeleteUserAsync(string id)
{
    // 软删除，自动设置 IsDeleted、DeletedAt、DeletedBy
    return await _factory.FindOneAndSoftDeleteAsync(id);
}
```

### 8. 批量操作

```csharp
// 批量创建
var users = new List<User> { user1, user2, user3 };
var createdUsers = await _factory.CreateManyAsync(users);

// 批量更新
var update = _factory.CreateUpdateBuilder()
    .Set(u => u.IsActive, true)
    .Build();
var filter = _factory.CreateFilterBuilder()
    .In(u => u.Id, userIds)
    .Build();
var count = await _factory.UpdateManyAsync(filter, update);

// 批量软删除
var deleteFilter = _factory.CreateFilterBuilder()
    .In(u => u.Id, userIds)
    .Build();
var deletedCount = await _factory.SoftDeleteManyAsync(deleteFilter);
```

## 🔧 构建器使用

### FilterBuilder（过滤器构建器）

```csharp
var filter = _factory.CreateFilterBuilder()
    .Eq(u => u.Status, "Active")           // 等于
    .Ne(u => u.IsDeleted, true)            // 不等于
    .In(u => u.Id, ids)                    // 在列表中
    .Nin(u => u.Role, roles)               // 不在列表中
    .Gt(u => u.CreatedAt, startDate)       // 大于
    .Gte(u => u.Age, 18)                   // 大于等于
    .Lt(u => u.CreatedAt, endDate)         // 小于
    .Lte(u => u.Score, 100)                // 小于等于
    .Regex(u => u.Username, "admin")       // 正则匹配
    .Exists(u => u.Email, true)            // 字段存在
    .And(filters)                          // 与条件
    .Or(filters)                           // 或条件
    .Not(filter)                           // 非条件
    .Build();
```

### SortBuilder（排序构建器）

```csharp
var sort = _factory.CreateSortBuilder()
    .Ascending(u => u.CreatedAt)          // 升序
    .Descending(u => u.UpdatedAt)         // 降序
    .Build();
```

### UpdateBuilder（更新构建器）

```csharp
var update = _factory.CreateUpdateBuilder()
    .Set(u => u.Username, "newName")       // 设置值
    .Unset(u => u.OldField)                // 删除字段
    .Inc(u => u.ViewCount, 1)              // 增加数值
    .Mul(u => u.Price, 1.1)                // 乘以数值
    .Push(u => u.Tags, "newTag")           // 数组追加
    .Pull(u => u.Tags, "oldTag")           // 数组移除
    .AddToSet(u => u.Tags, "uniqueTag")    // 数组去重追加
    .Build();
```

### ProjectionBuilder（投影构建器）

```csharp
var projection = _factory.CreateProjectionBuilder()
    .Include(u => u.Id)                     // 包含字段
    .Include(u => u.Username)
    .Exclude(u => u.Password)              // 排除字段
    .Build();
```

## 🌐 多租户隔离

对于实现了 `IMultiTenant` 的实体，工厂会自动：

1. **创建时**：自动设置 `CompanyId`（从 `ITenantContext` 获取）
2. **查询时**：自动附加 `CompanyId` 过滤条件
3. **更新时**：确保只能更新当前企业的数据

```csharp
// 实体实现 IMultiTenant
public class Role : MultiTenantEntity, ISoftDeletable, ITimestamped, IEntity
{
    // CompanyId 由 MultiTenantEntity 提供
}

// 使用时无需手动处理 CompanyId
var role = new Role { Name = "Admin" };
var created = await _factory.CreateAsync(role); // 自动设置 CompanyId

// 查询时自动过滤当前企业的角色
var roles = await _factory.FindAsync(filter, sort); // 只返回当前企业的角色
```

## 🔄 后台线程场景

在后台线程中（如定时任务、消息处理），可能无法访问 `HttpContext`，此时可以使用重载方法：

```csharp
// 提供用户信息，避免访问 HttpContext
var entity = new SomeEntity { /* ... */ };
await _factory.CreateAsync(entity, userId: "user123", username: "admin");
```

## 📝 最佳实践

1. **始终使用工厂**：所有数据库操作都通过工厂进行
2. **使用构建器**：使用 `FilterBuilder`、`SortBuilder` 等构建查询条件，避免手写 BsonDocument
3. **不要手动设置审计字段**：让工厂自动处理
4. **利用多租户隔离**：实现 `IMultiTenant` 接口，自动获得租户隔离能力
5. **使用原子操作**：优先使用 `FindOneAndUpdateAsync`、`FindOneAndSoftDeleteAsync` 等原子操作

## 🔍 常见问题

### Q: 如何查询已删除的记录？

A: 工厂默认过滤已删除记录。如需查询已删除记录，需要直接使用 `IMongoCollection`（不推荐，仅在特殊场景使用）。

### Q: 如何跨企业查询？

A: 工厂设计为单企业隔离。如需跨企业查询，需要特殊处理（如系统管理员功能），此时应直接使用 `IMongoCollection` 并手动处理权限。

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
