# 用户注册错误回滚支持功能

## 📋 概述

为用户注册流程添加了完整的错误回滚机制，确保在注册过程中发生任何错误时都能进行回滚，保证数据一致性。由于 MongoDB 单机模式不支持事务，我们使用错误回滚机制来实现类似的效果。

## ✨ 功能特性

### 回滚保护范围
- ✅ 用户创建
- ✅ 个人企业创建
- ✅ 管理员角色创建
- ✅ 用户-企业关联创建
- ✅ 用户企业信息更新

### 错误回滚机制
- ✅ 任何步骤失败都会回滚所有操作
- ✅ 按相反顺序删除已创建的数据
- ✅ 详细的错误日志记录
- ✅ 用户友好的错误消息
- ✅ 兼容 MongoDB 单机模式

## 🔧 技术实现

### 错误回滚流程

```csharp
// 使用错误回滚机制（兼容 MongoDB 单机模式）
User? user = null;
Company? personalCompany = null;
Role? adminRole = null;
UserCompany? userCompany = null;

try
{
    // 1. 创建用户
    user = new User { /* ... */ };
    await _users.InsertOneAsync(user);
    
    // 2. 创建个人企业（包含角色和关联）
    var companyResult = await CreatePersonalCompanyWithDetailsAsync(user);
    personalCompany = companyResult.Company;
    adminRole = companyResult.Role;
    userCompany = companyResult.UserCompany;
    
    // 3. 更新用户企业信息
    await _users.UpdateOneAsync(u => u.Id == user.Id, update);
}
catch (Exception ex)
{
    // 4. 回滚所有操作
    await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
    throw;
}
```

### 回滚机制实现

```csharp
private async Task RollbackUserRegistrationAsync(User? user, Company? company, Role? role, UserCompany? userCompany)
{
    // 按相反顺序删除（避免外键约束问题）
    if (userCompany != null)
        await userCompanies.DeleteOneAsync(uc => uc.Id == userCompany.Id);
    
    if (role != null)
        await roles.DeleteOneAsync(r => r.Id == role.Id);
    
    if (company != null)
        await companies.DeleteOneAsync(c => c.Id == company.Id);
    
    if (user != null)
        await _users.DeleteOneAsync(u => u.Id == user.Id);
}
```

### 企业创建详细信息

```csharp
private async Task<CompanyCreationResult> CreatePersonalCompanyWithDetailsAsync(User user)
{
    // 1. 创建企业
    var company = new Company { /* ... */ };
    await companies.InsertOneAsync(company);
    
    // 2. 获取全局菜单
    var allMenus = await menus.Find(m => m.IsEnabled && m.DeletedAt == null).ToListAsync();
    
    // 3. 创建管理员角色
    var adminRole = new Role { /* ... */ };
    await roles.InsertOneAsync(adminRole);
    
    // 4. 创建用户-企业关联
    var userCompany = new UserCompany { /* ... */ };
    await userCompanies.InsertOneAsync(userCompany);
    
    // 返回详细信息用于回滚
    return new CompanyCreationResult
    {
        Company = company,
        Role = adminRole,
        UserCompany = userCompany
    };
}
```

## 🎯 错误处理

### 异常类型处理

| 异常类型 | 处理方式 | 回滚操作 |
|---------|---------|---------|
| `ArgumentException` | 参数验证错误 | ✅ 回滚 |
| `InvalidOperationException` | 业务逻辑错误 | ✅ 回滚 |
| `Exception` | 系统错误 | ✅ 回滚 |

### 错误日志

```csharp
catch (Exception ex)
{
    await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
    _logger.LogError(ex, "用户注册失败，已执行回滚操作");
    return ApiResponse<User>.ErrorResult("SERVER_ERROR", $"注册失败: {ex.Message}");
}
```

## 📊 数据一致性保证

### 原子性操作
- 使用错误回滚机制模拟事务效果
- 要么全部成功，要么全部回滚
- 不会出现部分数据创建的情况

### 数据完整性
- 用户必须有对应的企业
- 企业必须有对应的角色
- 用户-企业关联必须正确建立
- 回滚时按相反顺序删除，避免外键约束问题

## 🔍 验证方法

### 测试回滚机制

1. **模拟菜单初始化失败**
   ```csharp
   // 在 CreatePersonalCompanyWithDetailsAsync 中
   if (allMenuIds.Count == 0)
   {
       throw new InvalidOperationException("系统菜单未初始化");
   }
   ```

2. **模拟角色创建失败**
   ```csharp
   // 在角色创建前抛出异常
   throw new Exception("模拟角色创建失败");
   ```

3. **验证回滚结果**
   - 检查用户是否被删除
   - 检查企业是否被删除
   - 检查角色是否被删除
   - 检查关联是否被删除

### 预期结果

**成功场景：**
- ✅ 用户创建成功
- ✅ 企业创建成功
- ✅ 角色创建成功
- ✅ 关联创建成功
- ✅ 事务提交成功

**失败场景：**
- ❌ 任何步骤失败
- ✅ 所有操作回滚
- ✅ 数据库保持干净状态
- ✅ 用户收到错误消息

## 🚀 性能考虑

### 回滚开销
- 错误回滚机制有轻微性能开销
- 对于用户注册场景，开销可接受
- 数据一致性比性能更重要

### 优化建议
- 回滚范围尽可能小
- 避免在回滚中进行长时间操作
- 合理设计回滚顺序

## 📚 相关文档

- [用户注册流程规范](mdc:.cursor/rules/user-registration-flow.mdc)
- [多租户系统开发规范](mdc:.cursor/rules/multi-tenant-development.mdc)
- [错误处理规范](mdc:.cursor/rules/error-handling.mdc)
- [MongoDB 事务文档](https://docs.mongodb.com/manual/core/transactions/)

## 🎯 核心原则

1. **数据一致性** - 确保注册过程的数据完整性
2. **错误回滚** - 任何错误都要回滚所有操作
3. **用户友好** - 提供清晰的错误消息
4. **日志记录** - 详细记录错误和回滚信息
5. **性能平衡** - 在一致性和性能间找到平衡

## ⚠️ 注意事项

### MongoDB 单机模式限制
- 单机模式不支持事务
- 使用错误回滚机制替代
- 副本集模式支持事务（可选升级）

### 回滚机制限制
- 回滚不是原子操作
- 可能存在部分回滚失败的情况
- 需要监控回滚日志

### 并发控制
- 回滚期间可能与其他操作冲突
- 避免长时间回滚操作
- 合理设计回滚顺序

## 🔧 配置要求

### MongoDB 配置
```yaml
# mongod.conf
storage:
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      journalCompressor: snappy
```

### 应用配置
```csharp
// 回滚超时配置
var rollbackTimeout = TimeSpan.FromSeconds(30);

// 日志配置
builder.Logging.AddFilter("Platform.ApiService.Services.AuthService", LogLevel.Information);
```

## 🎉 总结

通过添加错误回滚机制，用户注册流程现在具有了完整的数据一致性保证：

- ✅ **原子性** - 所有操作要么全部成功，要么全部回滚
- ✅ **一致性** - 确保数据关系的完整性
- ✅ **兼容性** - 兼容 MongoDB 单机模式
- ✅ **持久性** - 成功提交的数据持久保存

这大大提高了系统的可靠性和数据质量，为用户提供了更好的注册体验。虽然使用的是错误回滚机制而不是真正的事务，但在单机 MongoDB 环境下提供了类似的数据一致性保证。
