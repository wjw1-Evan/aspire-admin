# 数据库操作工厂迁移指南

## 📋 概述

本指南帮助您将现有的服务从 `BaseRepository<T>` 迁移到新的 `IDatabaseOperationFactory<T>` 架构。迁移完成后，您将获得更好的多租户安全、操作审计和类型安全。

## 🎯 迁移目标

- ✅ 移除 `BaseRepository<T>` 依赖
- ✅ 使用 `IDatabaseOperationFactory<T>` 进行所有数据库操作
- ✅ 获得自动的多租户过滤和操作审计
- ✅ 简化服务构造函数
- ✅ 提高代码的类型安全性

## 📋 迁移检查清单

### 阶段 1: 准备迁移

- [ ] 确认项目已注册 `IDatabaseOperationFactory<T>`
- [ ] 确认实体类实现了必需接口：`IEntity`、`ISoftDeletable`、`ITimestamped`
- [ ] 备份现有代码
- [ ] 准备测试环境

### 阶段 2: 服务迁移

- [ ] 更新服务构造函数，注入 `IDatabaseOperationFactory<T>`
- [ ] 移除 `BaseRepository<T>` 和 `IMongoCollection<T>` 直接使用
- [ ] 更新所有 CRUD 方法使用工厂
- [ ] 更新复杂查询使用 `FilterBuilder`、`SortBuilder`、`UpdateBuilder`
- [ ] 测试所有功能正常工作

### 阶段 3: 清理和优化

- [ ] 移除未使用的 `BaseRepository<T>` 引用
- [ ] 更新单元测试使用工厂接口
- [ ] 更新文档和注释
- [ ] 性能测试和优化

## 🔄 迁移步骤详解

### 步骤 1: 更新服务构造函数

#### 迁移前

```csharp
public class UserService : BaseService, IUserService
{
    private readonly BaseRepository<User> _userRepository;
    private readonly IMongoCollection<User> _users;
    
    public UserService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        ILogger<UserService> logger)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _userRepository = new BaseRepository<User>(database, "users", httpContextAccessor, tenantContext, logger);
        _users = database.GetCollection<User>("users");
    }
}
```

#### 迁移后

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

### 步骤 2: 更新 CRUD 操作

#### 迁移前

```csharp
public async Task<List<User>> GetAllUsersAsync()
{
    return await _userRepository.FindAsync();
}

public async Task<User?> GetUserByIdAsync(string id)
{
    return await _userRepository.GetByIdAsync(id);
}

public async Task<User> CreateUserAsync(CreateUserRequest request)
{
    var user = new User
    {
        Username = request.Username,
        Email = request.Email
    };
    
    return await _userRepository.CreateAsync(user);
}

public async Task<bool> UpdateUserAsync(string id, UpdateUserRequest request)
{
    var user = await _userRepository.GetByIdAsync(id);
    if (user == null) return false;
    
    user.Username = request.Username;
    user.Email = request.Email;
    
    return await _userRepository.UpdateAsync(user);
}

public async Task<bool> DeleteUserAsync(string id)
{
    return await _userRepository.SoftDeleteAsync(id);
}
```

#### 迁移后

```csharp
public async Task<List<User>> GetAllUsersAsync()
{
    return await _userFactory.FindAsync();
}

public async Task<User?> GetUserByIdAsync(string id)
{
    return await _userFactory.GetByIdAsync(id);
}

public async Task<User> CreateUserAsync(CreateUserRequest request)
{
    var user = new User
    {
        Username = request.Username,
        Email = request.Email
    };
    
    return await _userFactory.CreateAsync(user);
}

public async Task<bool> UpdateUserAsync(string id, UpdateUserRequest request)
{
    var user = await _userFactory.GetByIdAsync(id);
    if (user == null) return false;
    
    user.Username = request.Username;
    user.Email = request.Email;
    
    return await _userFactory.UpdateAsync(user);
}

public async Task<bool> DeleteUserAsync(string id)
{
    return await _userFactory.SoftDeleteAsync(id);
}
```

### 步骤 3: 更新复杂查询

#### 迁移前

```csharp
public async Task<List<User>> SearchUsersAsync(string keyword)
{
    var filter = Builders<User>.Filter.And(
        Builders<User>.Filter.Regex(u => u.Username, new BsonRegularExpression(keyword, "i")),
        Builders<User>.Filter.Eq(u => u.IsActive, true),
        Builders<User>.Filter.Eq(u => u.IsDeleted, false),
        Builders<User>.Filter.Eq(u => u.CompanyId, GetRequiredCompanyId())
    );
    
    return await _users.Find(filter).ToListAsync();
}

public async Task<(List<User> users, long total)> GetUsersPagedAsync(int page, int pageSize)
{
    var filter = Builders<User>.Filter.And(
        Builders<User>.Filter.Eq(u => u.IsDeleted, false),
        Builders<User>.Filter.Eq(u => u.CompanyId, GetRequiredCompanyId())
    );
    
    var sort = Builders<User>.Sort.Descending(u => u.CreatedAt);
    
    var total = await _users.CountDocumentsAsync(filter);
    var users = await _users.Find(filter)
        .Sort(sort)
        .Skip((page - 1) * pageSize)
        .Limit(pageSize)
        .ToListAsync();
    
    return (users, total);
}
```

#### 迁移后

```csharp
public async Task<List<User>> SearchUsersAsync(string keyword)
{
    var filter = _userFactory.CreateFilterBuilder()
        .Regex(u => u.Username, keyword)
        .Equal(u => u.IsActive, true)
        .Build();
    
    return await _userFactory.FindAsync(filter);
}

public async Task<(List<User> users, long total)> GetUsersPagedAsync(int page, int pageSize)
{
    var sort = _userFactory.CreateSortBuilder()
        .Descending(u => u.CreatedAt)
        .Build();
    
    return await _userFactory.FindPagedAsync(null, sort, page, pageSize);
}
```

### 步骤 4: 更新批量操作

#### 迁移前

```csharp
public async Task<long> DeactivateUsersAsync(List<string> userIds)
{
    var filter = Builders<User>.Filter.And(
        Builders<User>.Filter.In(u => u.Id, userIds),
        Builders<User>.Filter.Eq(u => u.IsDeleted, false),
        Builders<User>.Filter.Eq(u => u.CompanyId, GetRequiredCompanyId())
    );
    
    var update = Builders<User>.Update
        .Set(u => u.IsActive, false)
        .Set(u => u.UpdatedAt, DateTime.UtcNow);
    
    var result = await _users.UpdateManyAsync(filter, update);
    return result.ModifiedCount;
}
```

#### 迁移后

```csharp
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

### 步骤 5: 更新跨租户查询

#### 迁移前

```csharp
public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
{
    var filter = Builders<User>.Filter.And(
        Builders<User>.Filter.Eq(u => u.Id, id),
        Builders<User>.Filter.Eq(u => u.IsDeleted, false)
    );
    
    return await _users.Find(filter).FirstOrDefaultAsync();
}
```

#### 迁移后

```csharp
public async Task<User?> GetUserByIdWithoutTenantFilterAsync(string id)
{
    return await _userFactory.GetByIdWithoutTenantFilterAsync(id);
}
```

## ⚠️ 迁移注意事项

### 1. 多租户安全

迁移后，所有查询都会自动添加 `CompanyId` 过滤。确保：

- 不需要跨租户查询的场景使用 `FindWithoutTenantFilterAsync`
- 个人中心等场景可以使用跨租户查询
- 系统管理功能需要特殊处理

### 2. 操作审计

迁移后，所有操作都会自动记录审计日志：

- 确保审计数据不会过大
- 对于大数据量操作考虑禁用审计
- 定期清理旧的审计数据

### 3. 性能考虑

- 工厂操作性能与直接使用 MongoDB 驱动相当
- 使用批量操作提高性能
- 为常用查询字段创建索引

### 4. 错误处理

- 工厂会自动处理多租户过滤错误
- 确保实体类实现了必需接口
- 检查服务注册是否正确

## 🧪 迁移测试

### 单元测试更新

#### 迁移前

```csharp
[Test]
public async Task CreateUser_ShouldWork()
{
    // Arrange
    var user = new User { Username = "test", Email = "test@example.com" };
    
    // Act
    var result = await _userRepository.CreateAsync(user);
    
    // Assert
    Assert.That(result.Id, Is.Not.Null);
    Assert.That(result.Username, Is.EqualTo("test"));
}
```

#### 迁移后

```csharp
[Test]
public async Task CreateUser_ShouldWork()
{
    // Arrange
    var user = new User { Username = "test", Email = "test@example.com" };
    
    // Act
    var result = await _userFactory.CreateAsync(user);
    
    // Assert
    Assert.That(result.Id, Is.Not.Null);
    Assert.That(result.Username, Is.EqualTo("test"));
    Assert.That(result.CreatedBy, Is.Not.Null); // 自动填充
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

## 🔍 迁移验证

### 功能验证

- [ ] 所有 CRUD 操作正常工作
- [ ] 复杂查询返回正确结果
- [ ] 分页查询功能正常
- [ ] 批量操作性能良好
- [ ] 跨租户查询按预期工作

### 安全验证

- [ ] 多租户过滤正常工作
- [ ] 用户只能访问自己企业的数据
- [ ] 跨租户查询仅在必要时使用
- [ ] 操作审计记录完整

### 性能验证

- [ ] 查询性能与迁移前相当
- [ ] 批量操作性能良好
- [ ] 内存使用正常
- [ ] 数据库连接池正常

## 📚 相关文档

- [数据库操作工厂使用指南](DATABASE-OPERATION-FACTORY-GUIDE.md)
- [多租户系统开发规范](MULTI-TENANT-DEVELOPMENT.md)
- [操作审计系统](AUDIT-SYSTEM.md)
- [软删除机制](SOFT-DELETE-MECHANISM.md)

## 🎯 迁移完成检查

迁移完成后，请确认：

1. ✅ 所有服务都使用 `IDatabaseOperationFactory<T>`
2. ✅ 没有直接使用 `IMongoCollection<T>` 进行 CRUD 操作
3. ✅ 没有使用 `BaseRepository<T>`
4. ✅ 所有复杂查询使用构建器
5. ✅ 多租户过滤正常工作
6. ✅ 操作审计记录完整
7. ✅ 单元测试和集成测试通过
8. ✅ 性能测试通过

恭喜！您已成功迁移到新的数据库操作工厂架构！
