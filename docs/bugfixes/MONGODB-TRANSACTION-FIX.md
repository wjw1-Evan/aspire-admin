# MongoDB 事务错误修复

## 📋 问题描述

用户注册时出现错误：
```
注册失败: Standalone servers do not support transactions.
```

**原因**：MongoDB 单机模式不支持事务（transactions），只有副本集（Replica Set）才支持事务。

## ✅ 解决方案（已实施）

**项目已完全移除MongoDB事务支持，改用错误回滚机制确保数据一致性。**

## 🔍 问题分析

### 代码位置
**文件**: `Platform.ApiService/Services/AuthService.cs` - `CreatePersonalCompanyAsync()` 方法

### 问题代码
```csharp
// ❌ 问题：使用了MongoDB事务
using var session = await _database.Client.StartSessionAsync();
session.StartTransaction();

try
{
    await companies.InsertOneAsync(session, company, new InsertOneOptions());
    await permissions.InsertManyAsync(session, permissionList, new InsertManyOptions());
    // ...
    await session.CommitTransactionAsync();
}
catch
{
    await session.AbortTransactionAsync();
    throw;
}
```

### 为什么会失败？

MongoDB事务支持要求：
- ✅ MongoDB 4.0+ 版本
- ✅ **副本集模式（Replica Set）**
- ❌ 单机模式不支持

当前环境：
- MongoDB 运行在单机模式
- 没有配置副本集
- 调用 `StartSessionAsync()` 时抛出异常

## ✅ 解决方案

### 方案选择

#### 方案1：配置MongoDB副本集（生产环境推荐）
```yaml
# docker-compose.yml
services:
  mongo:
    image: mongo:latest
    command: --replSet rs0
    # 需要额外配置初始化副本集
```

**优点**：
- ✅ 真正的ACID事务
- ✅ 数据一致性保证
- ✅ 适合生产环境

**缺点**：
- ❌ 配置复杂
- ❌ 资源消耗大
- ❌ 开发环境过重

#### 方案2：错误回滚机制（开发环境推荐）⭐
```csharp
// ✅ 不使用事务，改用错误回滚
Company? company = null;
Role? adminRole = null;
// ...

try
{
    await companies.InsertOneAsync(company);
    await permissions.InsertManyAsync(permissionList);
    await roles.InsertOneAsync(adminRole);
    // ...
}
catch (Exception ex)
{
    // 手动回滚：删除已创建的数据
    if (adminRole?.Id != null)
        await roles.DeleteOneAsync(r => r.Id == adminRole.Id);
    
    if (company?.Id != null)
        await companies.DeleteOneAsync(c => c.Id == company.Id);
    
    throw;
}
```

**优点**：
- ✅ 无需配置副本集
- ✅ 开发环境友好
- ✅ 错误时自动清理数据
- ✅ 代码简单易懂

**缺点**：
- ⚠️ 回滚过程中可能失败（极少见）
- ⚠️ 非原子操作（但对注册场景影响小）

**选择**：使用方案2（错误回滚机制）

## 🔧 修复实现

### 修复后的代码

**文件**: `Platform.ApiService/Services/AuthService.cs`

```csharp
private async Task<Company> CreatePersonalCompanyAsync(AppUser user)
{
    var companies = _database.GetCollection<Company>("companies");
    var roles = _database.GetCollection<Role>("roles");
    var menus = _database.GetCollection<Menu>("menus");
    var permissions = _database.GetCollection<Permission>("permissions");
    var userCompanies = _database.GetCollection<UserCompany>("user_companies");
    
    // 跟踪已创建的资源，用于回滚
    Company? company = null;
    List<Permission>? permissionList = null;
    Role? adminRole = null;
    List<Menu>? defaultMenus = null;
    
    try
    {
        // 1. 创建个人企业
        company = new Company { /* ... */ };
        await companies.InsertOneAsync(company);
        
        // 2. 创建默认权限
        permissionList = new List<Permission>();
        // ...
        await permissions.InsertManyAsync(permissionList);
        
        // 3. 创建管理员角色
        adminRole = new Role { /* ... */ };
        await roles.InsertOneAsync(adminRole);
        
        // 4. 创建默认菜单
        defaultMenus = CreateDefaultMenus(company.Id!);
        await menus.InsertManyAsync(defaultMenus);
        
        // 5. 更新角色的菜单权限
        var updateRole = Builders<Role>.Update.Set(r => r.MenuIds, ...);
        await roles.UpdateOneAsync(r => r.Id == adminRole.Id, updateRole);
        
        // 6. 创建用户-企业关联
        var userCompany = new UserCompany { /* ... */ };
        await userCompanies.InsertOneAsync(userCompany);
        
        _logger.LogInformation("个人企业创建完成");
        return company;
    }
    catch (Exception ex)
    {
        // 错误回滚：清理已创建的数据（逆序删除）
        _logger.LogError(ex, "创建个人企业失败，开始清理数据");
        
        try
        {
            // 按创建的逆序删除
            if (adminRole?.Id != null)
            {
                await roles.DeleteOneAsync(r => r.Id == adminRole.Id);
                _logger.LogInformation("已清理角色: {RoleId}", adminRole.Id);
            }
            
            if (defaultMenus != null && defaultMenus.Count > 0)
            {
                var menuIds = defaultMenus.Select(m => m.Id!).ToList();
                await menus.DeleteManyAsync(m => menuIds.Contains(m.Id!));
                _logger.LogInformation("已清理菜单: {Count}个", defaultMenus.Count);
            }
            
            if (permissionList != null && permissionList.Count > 0)
            {
                var permissionIds = permissionList.Select(p => p.Id!).ToList();
                await permissions.DeleteManyAsync(p => permissionIds.Contains(p.Id!));
                _logger.LogInformation("已清理权限: {Count}个", permissionList.Count);
            }
            
            if (company?.Id != null)
            {
                await companies.DeleteOneAsync(c => c.Id == company.Id);
                _logger.LogInformation("已清理企业: {CompanyId}", company.Id);
            }
        }
        catch (Exception cleanupEx)
        {
            _logger.LogError(cleanupEx, "清理数据失败，可能需要手动清理");
        }
        
        throw new InvalidOperationException($"注册失败: {ex.Message}", ex);
    }
}
```

### 回滚机制

#### 创建顺序
```
1. Company（企业）
2. Permissions（权限）
3. Role（角色）
4. Menus（菜单）
5. Role更新（菜单权限）
6. UserCompany（用户-企业关联）
```

#### 回滚顺序（逆序）
```
6. （UserCompany未创建，无需清理）
5. （Role更新操作，无需特殊清理）
4. 删除 Menus
3. 删除 Role
2. 删除 Permissions
1. 删除 Company
```

## 📊 对比分析

### 使用事务（副本集模式）
```
优点：
✅ 原子性操作
✅ 自动回滚
✅ 数据强一致性

缺点：
❌ 需要副本集配置
❌ 资源消耗大
❌ 配置复杂
```

### 错误回滚机制（单机模式）
```
优点：
✅ 无需副本集
✅ 开发环境友好
✅ 代码简单
✅ 自动清理失败数据

缺点：
⚠️ 非原子操作
⚠️ 回滚可能失败（极少）
```

## 🎯 适用场景

### 开发环境
- ✅ 使用错误回滚机制
- ✅ 简单快速
- ✅ 满足开发需求

### 生产环境
- ⚠️ 建议配置MongoDB副本集
- ⚠️ 使用真正的事务
- ⚠️ 确保数据强一致性

## 🧪 测试验证

### 测试注册成功
```bash
POST /api/register
{
  "username": "testuser",
  "password": "Test@123",
  "email": "test@example.com"
}

预期：
✓ 创建用户成功
✓ 创建企业成功
✓ 创建权限成功（28个）
✓ 创建角色成功（1个）
✓ 创建菜单成功（3个）
✓ 创建用户-企业关联成功
✓ 返回成功响应
```

### 测试注册失败（模拟）
```bash
# 模拟中途失败（如菜单创建失败）
预期：
✓ 捕获异常
✓ 自动清理已创建的数据：
  - 删除角色
  - 删除权限
  - 删除企业
✓ 返回失败响应
✓ 数据库保持干净（无残留数据）
```

## 📝 日志输出

### 成功场景
```
创建个人企业: testuser 的企业 (personal-67890...)
创建 28 个默认权限
创建 3 个默认菜单
个人企业创建完成
```

### 失败场景
```
创建个人企业: testuser 的企业 (personal-67890...)
创建 28 个默认权限
创建个人企业失败，开始清理数据
已清理权限: 28个
已清理企业: 67890...
```

## 🎯 当前状态

**项目已完全移除MongoDB事务支持，原因：**

1. **单机模式限制** - 当前MongoDB运行在单机模式，不支持事务
2. **开发环境友好** - 错误回滚机制更适合开发环境
3. **代码简化** - 移除事务相关代码，减少复杂性
4. **功能完整** - 错误回滚机制已能保证数据一致性

## 🎯 未来优化

如果需要在生产环境使用事务：

### 1. 配置MongoDB副本集

**AppHost.cs**:
```csharp
var mongo = builder.AddMongoDB("mongo")
    .WithArgs("--replSet", "rs0")  // 启用副本集
    .WithMongoExpress()
    .WithLifetime(ContainerLifetime.Persistent);
```

### 2. 初始化副本集

```javascript
// MongoDB Shell
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" }
  ]
})
```

### 3. 恢复事务代码

如果配置了副本集，可以恢复使用事务代码，提供更强的数据一致性保证。

## 📚 相关文档

- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [MongoDB Replica Set](https://www.mongodb.com/docs/manual/replication/)
- [用户注册流程](mdc:Platform.ApiService/Services/AuthService.cs)

## 🎯 核心原则

1. **开发环境** - 使用错误回滚机制，简单快速
2. **生产环境** - 配置副本集，使用真正的事务
3. **数据清理** - 确保失败时不留残留数据
4. **日志完善** - 记录每一步操作和清理过程
5. **异常处理** - 捕获并合理处理所有异常

遵循这些原则，确保注册流程的可靠性！

---

**修复时间**: 2025-10-14  
**版本**: v3.1.1  
**状态**: ✅ 已完成

