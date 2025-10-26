# 数据库操作工厂使用指南

## 📋 概述

数据库操作工厂（DatabaseOperationFactory）是一个统一的数据库操作接口，提供自动化的多租户过滤、软删除处理、操作审计和追踪功能。所有服务都应该使用工厂进行数据库操作，而不是直接使用 `IMongoCollection<T>` 或 `BaseRepository<T>`。

## ✨ 核心特性

### 1. 自动化处理
- **多租户过滤**：自动添加 `CompanyId` 过滤条件
- **软删除过滤**：自动排除 `IsDeleted = true` 的记录
- **操作审计**：自动记录所有 CRUD 操作
- **操作追踪**：自动设置 `CreatedBy`、`UpdatedBy` 等字段
- **时间戳**：自动设置 `CreatedAt`、`UpdatedAt`

### 2. 类型安全
- **强类型构建器**：`FilterBuilder<T>`、`SortBuilder<T>`、`UpdateBuilder<T>`
- **编译时检查**：所有操作都有类型安全保证
- **智能提示**：IDE 提供完整的智能提示支持

### 3. 统一接口
- **CRUD 操作**：`CreateAsync`、`UpdateAsync`、`SoftDeleteAsync`、`HardDeleteAsync`
- **查询操作**：`FindAsync`、`FindPagedAsync`、`GetByIdAsync`、`CountAsync`、`ExistsAsync`
- **跨租户查询**：`FindWithoutTenantFilterAsync`、`GetByIdWithoutTenantFilterAsync`

## 🔧 服务注册

### 在 Program.cs 中注册

```csharp
// 注册数据库操作工厂
builder.Services.AddDatabaseFactory();

// 或者为特定实体注册
builder.Services.AddDatabaseOperationFactory<User>();
builder.Services.AddDatabaseOperationFactory<Role>();
builder.Services.AddDatabaseOperationFactory<NoticeIconItem>();
```

### 服务构造函数

```csharp
public class UserService : BaseService, IUserService
{
    private readonly IDatabaseOperationFactory<User> _userFactory;
    
    public UserService(
        IMongoDatabase database,
        IDatabaseOperationFactory<User> userFactory,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<UserService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _userFactory = userFactory;
    }
}
```

## 📖 使用示例

### 1. 简单查询

```csharp
// 获取所有用户
public async Task<List<User>> GetAllUsersAsync()
{
    return await _userFactory.FindAsync();
}

// 根据ID获取用户
public async Task<User?> GetUserByIdAsync(string id)
{
    return await _userFactory.GetByIdAsync(id);
}

// 检查用户是否存在
public async Task<bool> UserExistsAsync(string id)
{
    return await _userFactory.ExistsAsync(id);
}

// 统计用户数量
public async Task<long> CountUsersAsync()
{
    return await _userFactory.CountAsync();
}
```

### 2. 复杂查询

```csharp
// 使用 FilterBuilder 构建复杂查询
public async Task<List<User>> SearchUsersAsync(string keyword)
{
    var filter = _userFactory.CreateFilterBuilder()
        .Regex(u => u.Username, keyword)
        .Equal(u => u.IsActive, true)
        .Build();
    
    return await _userFactory.FindAsync(filter);
}

// 分页查询
public async Task<(List<User> users, long total)> GetUsersPagedAsync(int page, int pageSize)
{
    var sort = _userFactory.CreateSortBuilder()
        .Descending(u => u.CreatedAt)
        .Build();
    
    return await _userFactory.FindPagedAsync(null, sort, page, pageSize);
}

// 日期范围查询
public async Task<List<User>> GetUsersByDateRangeAsync(DateTime startDate, DateTime endDate)
{
    var filter = _userFactory.CreateFilterBuilder()
        .DateRange(u => u.CreatedAt, startDate, endDate)
        .Build();
    
    return await _userFactory.FindAsync(filter);
}
```

### 3. 数据创建

```csharp
public async Task<User> CreateUserAsync(CreateUserRequest request)
{
    var user = new User
    {
        Username = request.Username,
        Email = request.Email,
        IsActive = true
    };

    return await _userFactory.CreateAsync(user);
}

// 批量创建
public async Task<List<User>> CreateUsersAsync(List<CreateUserRequest> requests)
{
    var users = requests.Select(request => new User
    {
        Username = request.Username,
        Email = request.Email,
        IsActive = true
    }).ToList();

    return await _userFactory.CreateManyAsync(users);
}
```

### 4. 数据更新

```csharp
public async Task<bool> UpdateUserAsync(string id, UpdateUserRequest request)
{
    var user = await _userFactory.GetByIdAsync(id);
    if (user == null) return false;

    if (!string.IsNullOrEmpty(request.Username))
        user.Username = request.Username;
    
    if (!string.IsNullOrEmpty(request.Email))
        user.Email = request.Email;

    return await _userFactory.UpdateAsync(user);
}

// 批量更新
public async Task<long> DeactivateUsersAsync(List<string> userIds)
{
    var filter = _userFactory.CreateFilterBuilder()
        .In(u => u.Id, userIds)
        .Build();
    
    var update = _userFactory.CreateUpdateBuilder()
        .Set(u => u.IsActive, false)
        .SetCurrentTimestamp()
        .Build();
    
    return await _userFactory.UpdateManyAsync(filter, update);
}
```

### 5. 数据删除

```csharp
// 软删除
public async Task<bool> DeleteUserAsync(string id)
{
    return await _userFactory.SoftDeleteAsync(id);
}

// 批量软删除
public async Task<long> DeleteUsersAsync(List<string> userIds)
{
    return await _userFactory.SoftDeleteManyAsync(userIds);
}

// 硬删除（谨慎使用）
public async Task<bool> HardDeleteUserAsync(string id)
{
    return await _userFactory.HardDeleteAsync(id);
}
```

### 6. 跨租户查询

```csharp
// 获取用户信息（跨企业，用于个人中心等场景）
public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
{
    return await _userFactory.GetByIdWithoutTenantFilterAsync(id);
}

// 跨企业查询用户列表
public async Task<List<User>> FindUsersWithoutTenantFilterAsync(string keyword)
{
    var filter = _userFactory.CreateFilterBuilder()
        .Regex(u => u.Username, keyword)
        .Build();
    
    return await _userFactory.FindWithoutTenantFilterAsync(filter);
}
```

## 🎯 FilterBuilder 使用指南

### 基本条件

```csharp
var filter = _factory.CreateFilterBuilder()
    .Equal(u => u.IsActive, true)           // 等于
    .NotEqual(u => u.Status, "deleted")   // 不等于
    .In(u => u.Id, userIds)                 // 在范围内
    .NotIn(u => u.Id, excludeIds)          // 不在范围内
    .GreaterThan(u => u.CreatedAt, startDate)  // 大于
    .LessThan(u => u.UpdatedAt, endDate)       // 小于
    .Regex(u => u.Username, keyword)       // 正则表达式
    .Text(searchText)                      // 文本搜索
    .Build();
```

### 日期范围

```csharp
var filter = _factory.CreateFilterBuilder()
    .DateRange(u => u.CreatedAt, startDate, endDate)  // 日期范围
    .CreatedBetween(startDate, endDate)               // 创建时间范围
    .UpdatedBetween(startDate, endDate)               // 更新时间范围
    .Build();
```

### 数组操作

```csharp
var filter = _factory.CreateFilterBuilder()
    .Contains(u => u.RoleIds, roleId)      // 数组包含
    .Exists(u => u.Email, true)            // 字段存在
    .IsNull(u => u.LastLoginAt)            // 字段为空
    .IsNotNull(u => u.Email)               // 字段不为空
    .Build();
```

### 多租户和软删除

```csharp
var filter = _factory.CreateFilterBuilder()
    .ExcludeDeleted()                      // 排除已删除记录
    .WithTenant(companyId)                 // 添加租户过滤
    .ByUser(userId)                        // 按用户过滤
    .Build();
```

## 🎯 SortBuilder 使用指南

```csharp
var sort = _factory.CreateSortBuilder()
    .Ascending(u => u.Username)            // 升序
    .Descending(u => u.CreatedAt)          // 降序
    .TextScore("score")                    // 文本搜索排序
    .Build();
```

## 🎯 UpdateBuilder 使用指南

```csharp
var update = _factory.CreateUpdateBuilder()
    .Set(u => u.Username, newUsername)     // 设置字段值
    .SetCurrentTimestamp()                 // 设置当前时间戳
    .SetOperationTracking(userId, username, OperationType.Update)  // 设置操作追踪
    .SetSoftDelete()                       // 设置软删除
    .UnsetSoftDelete()                     // 取消软删除
    .Inc(u => u.LoginCount, 1)             // 递增数值
    .AddToSet(u => u.RoleIds, roleId)      // 向数组添加元素
    .Pull(u => u.RoleIds, roleId)          // 从数组移除元素
    .Build();
```

## ⚠️ 重要注意事项

### 1. 强制使用工厂
- **禁止直接使用** `IMongoCollection<T>` 进行 CRUD 操作
- **禁止使用** `BaseRepository<T>`（已移除）
- **必须使用** `IDatabaseOperationFactory<T>` 进行所有数据库操作

### 2. 多租户安全
- 工厂自动添加 `CompanyId` 过滤，确保数据隔离
- 跨租户查询仅在必要时使用 `FindWithoutTenantFilterAsync`
- 个人中心等场景可以使用跨租户查询

### 3. 操作审计
- 所有操作自动记录审计日志
- 审计信息包含：用户、时间、操作类型、数据变更
- 可通过 `IAuditService` 查询操作历史

### 4. 性能考虑
- 工厂操作性能与直接使用 MongoDB 驱动相当
- 批量操作使用 `CreateManyAsync`、`UpdateManyAsync` 等
- 复杂查询使用 `FilterBuilder` 构建，避免重复代码

## 📋 审计功能

### 查询操作历史

```csharp
public class AuditController : BaseApiController
{
    private readonly IAuditService _auditService;

    /// <summary>
    /// 获取实体操作历史
    /// </summary>
    [HttpGet("entity/{entityType}/{entityId}")]
    public async Task<IActionResult> GetEntityHistory(string entityType, string entityId, int page = 1, int pageSize = 20)
    {
        var history = await _auditService.GetEntityAuditHistoryAsync(entityType, entityId, page, pageSize);
        return Success(history);
    }

    /// <summary>
    /// 获取用户操作历史
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserHistory(string userId, int page = 1, int pageSize = 20)
    {
        var history = await _auditService.GetUserAuditHistoryAsync(userId, page, pageSize);
        return Success(history);
    }

    /// <summary>
    /// 获取企业操作历史
    /// </summary>
    [HttpGet("company/{companyId}")]
    public async Task<IActionResult> GetCompanyHistory(string companyId, int page = 1, int pageSize = 20)
    {
        var history = await _auditService.GetCompanyAuditHistoryAsync(companyId, page, pageSize);
        return Success(history);
    }
}
```

### 审计数据结构

```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "entityType": "User",
  "entityId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "operationType": "Create",
  "userId": "64f8a1b2c3d4e5f6a7b8c9d2",
  "username": "admin",
  "companyId": "64f8a1b2c3d4e5f6a7b8c9d3",
  "beforeData": null,
  "afterData": "{\"id\":\"64f8a1b2c3d4e5f6a7b8c9d1\",\"username\":\"test\",\"email\":\"test@example.com\"}",
  "description": "创建User",
  "clientIp": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "0HMQ8VQJQJQJQ",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## ⚡ 性能优化

### 索引建议

```javascript
// MongoDB 索引创建
db.users.createIndex({ "companyId": 1, "isDeleted": 1 })
db.users.createIndex({ "companyId": 1, "username": 1 })
db.users.createIndex({ "companyId": 1, "email": 1 })
db.users.createIndex({ "companyId": 1, "createdAt": -1 })
db.users.createIndex({ "companyId": 1, "updatedAt": -1 })

// 文本搜索索引
db.users.createIndex({ "username": "text", "email": "text" })

// 操作审计索引
db.operationAudits.createIndex({ "entityType": 1, "entityId": 1 })
db.operationAudits.createIndex({ "userId": 1, "createdAt": -1 })
db.operationAudits.createIndex({ "companyId": 1, "createdAt": -1 })
```

### 批量操作优化

```csharp
// 批量操作比单个操作更高效
var users = new List<User> { /* 大量用户数据 */ };
var createdUsers = await _userFactory.CreateManyAsync(users);

// 而不是循环单个创建
// foreach (var user in users)
// {
//     await _userFactory.CreateAsync(user);  // 低效
// }
```

## 🚫 注意事项

### 1. 多租户安全

```csharp
// ✅ 正确：使用工厂方法自动过滤
var users = await _userFactory.FindAsync(filter);

// ❌ 错误：直接使用 Collection 可能绕过多租户过滤
var users = await _collection.Find(filter).ToListAsync();
```

### 2. 审计数据大小

```csharp
// 对于大对象，考虑禁用审计或只记录关键字段
var context = _userFactory.CreateOperationContext()
    .WithDescription("批量导入大文件")
    .EnableAudit(false)  // 禁用审计避免数据过大
    .Build();
```

### 3. 操作追踪字段

```csharp
// 确保实体实现 IOperationTrackable 接口
public class User : MultiTenantEntity, IOperationTrackable
{
    // 必须实现这些字段
    public string? CreatedBy { get; set; }
    public string? CreatedByUsername { get; set; }
    public string? UpdatedBy { get; set; }
    public string? UpdatedByUsername { get; set; }
    public string? LastOperationType { get; set; }
    public DateTime? LastOperationAt { get; set; }
}
```

## 🧪 测试示例

### 单元测试

```csharp
[Test]
public async Task CreateUser_ShouldRecordAudit()
{
    // Arrange
    var user = new User { Username = "test", Email = "test@example.com" };
    var context = _userFactory.CreateOperationContext()
        .WithUser("user123", "testuser")
        .WithCompany("company123")
        .Build();

    // Act
    var createdUser = await _userFactory.CreateAsync(user, context);

    // Assert
    Assert.That(createdUser.Id, Is.Not.Null);
    Assert.That(createdUser.CreatedBy, Is.EqualTo("user123"));
    Assert.That(createdUser.CreatedByUsername, Is.EqualTo("testuser"));

    // 验证审计记录
    var auditHistory = await _auditService.GetEntityAuditHistoryAsync("User", createdUser.Id);
    Assert.That(auditHistory, Has.Count.EqualTo(1));
    Assert.That(auditHistory[0].OperationType, Is.EqualTo(OperationType.Create));
}
```

### 集成测试

```csharp
[Test]
public async Task MultiTenantFilter_ShouldWorkCorrectly()
{
    // Arrange
    var company1Users = new List<User> { /* 企业1的用户 */ };
    var company2Users = new List<User> { /* 企业2的用户 */ };

    // Act
    await _userFactory.CreateManyAsync(company1Users, 
        _userFactory.CreateOperationContext().WithCompany("company1").Build());
    
    await _userFactory.CreateManyAsync(company2Users, 
        _userFactory.CreateOperationContext().WithCompany("company2").Build());

    // 切换到企业1上下文
    _tenantContext.SetCurrentCompanyId("company1");
    var company1Result = await _userFactory.FindAsync();

    // 切换到企业2上下文
    _tenantContext.SetCurrentCompanyId("company2");
    var company2Result = await _userFactory.FindAsync();

    // Assert
    Assert.That(company1Result, Has.Count.EqualTo(company1Users.Count));
    Assert.That(company2Result, Has.Count.EqualTo(company2Users.Count));
}
```

## 🔍 故障排除

### 常见错误

1. **未注册工厂**
   ```
   System.InvalidOperationException: Unable to resolve service for type 'IDatabaseOperationFactory<User>'
   ```
   **解决方案**：在 Program.cs 中添加 `builder.Services.AddDatabaseFactory()`

2. **多租户过滤失败**
   ```
   UnauthorizedAccessException: 当前用户没有关联的企业
   ```
   **解决方案**：确保用户已登录并选择了企业

3. **实体类型不匹配**
   ```
   System.ArgumentException: Entity must implement IEntity, ISoftDeletable, ITimestamped
   ```
   **解决方案**：确保实体类实现了必需的接口

### 调试技巧

1. **启用详细日志**
   ```csharp
   builder.Logging.SetMinimumLevel(LogLevel.Debug);
   ```

2. **检查审计日志**
   ```csharp
   var audits = await _auditService.GetEntityAuditHistoryAsync("User", userId);
   ```

3. **验证过滤器**
   ```csharp
   var filter = _factory.CreateFilterBuilder()
       .Equal(u => u.IsActive, true)
       .Build();
   
   // 检查生成的 MongoDB 过滤器
   Console.WriteLine(filter.Render(/* serializer */));
   ```

## 📚 相关文档

- [数据库操作工厂架构设计](DATABASE-OPERATION-FACTORY-GUIDE.md)
- [多租户系统设计](MULTI-TENANT-SYSTEM.md)
- [操作审计系统](AUDIT-SYSTEM.md)
- [软删除机制](SOFT-DELETE-MECHANISM.md)

## 🎯 最佳实践

1. **服务设计**：每个服务只注入需要的工厂类型
2. **查询优化**：使用 `FilterBuilder` 构建高效查询
3. **批量操作**：优先使用批量方法提高性能
4. **错误处理**：利用工厂的自动审计和日志记录
5. **测试策略**：使用工厂的接口进行单元测试

遵循这些指南，您将能够高效、安全地使用数据库操作工厂进行开发！
