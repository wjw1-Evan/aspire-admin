# 个人资料更新多租户过滤问题修复

## 📋 问题描述

用户保存个人资料时出现 `KeyNotFoundException: 用户不存在` 错误。

### 错误信息
```
System.Collections.Generic.KeyNotFoundException: 用户不存在
   at Platform.ApiService.Controllers.UserController.UpdateCurrentUserProfile(UpdateProfileRequest request) 
   in /Volumes/thinkplus/Projects/aspire-admin/Platform.ApiService/Controllers/UserController.cs:line 309
```

### 问题症状
- 用户在个人中心编辑资料
- 修改姓名、邮箱或年龄
- 点击"保存"按钮
- 提示保存失败，后端日志显示"用户不存在"

## 🔍 根因分析

### 1. 多租户架构设计

系统采用多租户架构：
- **AppUser** 模型继承 `MultiTenantEntity`，有 `CompanyId` 字段
- **用户可以属于多个企业**，通过 `UserCompany` 关联表管理
- **用户可以切换企业**，当前企业ID存储在 `CurrentCompanyId` 字段

### 2. 问题根源

在 `UserService.UpdateUserProfileAsync` 方法中：

```csharp
// ❌ 问题代码
private IMongoCollection<AppUser> _users => _userRepository.Collection;

public async Task<AppUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
{
    var filter = Builders<AppUser>.Filter.Eq(user => user.Id, userId);
    // ...
    var result = await _users.UpdateOneAsync(filter, update);  // ❌ 使用了 BaseRepository 的 collection
    
    if (result.ModifiedCount > 0)
    {
        return await GetUserByIdAsync(userId);  // ❌ 也使用了多租户过滤
    }
    
    return null;
}
```

**问题分析**：
1. `_users` 是通过 `_userRepository.Collection` 获取的
2. `BaseRepository` 会自动应用多租户过滤（根据 `CurrentCompanyId`）
3. 用户的 `CompanyId` 可能不等于 `CurrentCompanyId`（用户切换了企业）
4. 导致过滤条件不匹配，`UpdateOneAsync` 找不到用户
5. `result.ModifiedCount = 0`，返回 null
6. 控制器抛出 `KeyNotFoundException`

### 3. 场景示例

**场景 1：用户属于多个企业**
```
用户 admin:
  - CompanyId: "company_A" (个人企业)
  - CurrentCompanyId: "company_B" (切换到企业B)
  
更新操作：
  - BaseRepository 过滤：WHERE CompanyId = "company_B"
  - 但用户的 CompanyId = "company_A"
  - 结果：找不到用户 ❌
```

**场景 2：普通用户**
```
用户 user1:
  - CompanyId: "company_A"
  - CurrentCompanyId: "company_A"
  
更新操作：
  - BaseRepository 过滤：WHERE CompanyId = "company_A"
  - 用户的 CompanyId = "company_A"
  - 结果：成功更新 ✅
```

### 4. 为什么获取个人资料正常？

在 `UserController.GetCurrentUserProfile` 中：
```csharp
var user = await _userService.GetUserByIdWithoutTenantFilterAsync(userId);
```
使用了 `GetUserByIdWithoutTenantFilterAsync`，不应用多租户过滤，所以获取正常。

## ✅ 解决方案

### 修复代码

修改 `UserService.UpdateUserProfileAsync` 方法，使用不带多租户过滤的方式：

```csharp
public async Task<AppUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
{
    // ✅ v3.1: 使用不带多租户过滤的方式更新，因为用户可能属于多个企业
    var users = GetCollection<AppUser>("users");  // ✅ 直接获取 collection
    var filter = Builders<AppUser>.Filter.And(
        Builders<AppUser>.Filter.Eq(user => user.Id, userId),
        Builders<AppUser>.Filter.Eq(user => user.IsDeleted, false)  // ✅ 只过滤删除状态
    );
    
    var update = Builders<AppUser>.Update
        .Set(user => user.UpdatedAt, DateTime.UtcNow);

    if (!string.IsNullOrEmpty(request.Email))
    {
        _validationService.ValidateEmail(request.Email);
        await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email, excludeUserId: userId);
        update = update.Set(user => user.Email, request.Email);
    }

    if (!string.IsNullOrEmpty(request.Name))
        update = update.Set(user => user.Name, request.Name);

    if (request.Age.HasValue)
        update = update.Set(user => user.Age, request.Age.Value);

    var result = await users.UpdateOneAsync(filter, update);

    if (result.ModifiedCount > 0)
    {
        // ✅ v3.1: 使用不带多租户过滤的方式获取更新后的用户
        return await GetUserByIdWithoutTenantFilterAsync(userId);
    }

    return null;
}
```

### 修复要点

1. **直接获取 collection**
   ```csharp
   var users = GetCollection<AppUser>("users");  // ✅ 不通过 repository
   ```

2. **只过滤 ID 和删除状态**
   ```csharp
   var filter = Builders<AppUser>.Filter.And(
       Builders<AppUser>.Filter.Eq(user => user.Id, userId),
       Builders<AppUser>.Filter.Eq(user => user.IsDeleted, false)  // ✅ 不过滤 CompanyId
   );
   ```

3. **返回时也不使用多租户过滤**
   ```csharp
   return await GetUserByIdWithoutTenantFilterAsync(userId);  // ✅ 不带过滤
   ```

## 🎯 为什么这样修复是正确的？

### 1. 安全性考虑

**问题**：不使用多租户过滤是否会有安全隐患？

**答案**：不会，因为：
- ✅ **用户只能更新自己的资料**：通过 `GetRequiredUserId()` 获取当前登录用户ID
- ✅ **不存在跨用户越权**：userId 来自 JWT token，不是请求参数
- ✅ **其他验证仍然存在**：邮箱唯一性、格式验证等

### 2. 业务逻辑正确性

**场景**：用户属于多个企业
- 用户在企业A注册（CompanyId = A）
- 用户加入企业B（CurrentCompanyId = B）
- 用户更新个人资料（姓名、邮箱等）
- ✅ **预期**：无论在哪个企业，都能更新自己的资料
- ✅ **实际**：修复后符合预期

### 3. 与其他方法一致性

系统中其他个人操作也使用了不带多租户过滤的方式：

```csharp
// ✅ 获取个人资料
GetUserByIdWithoutTenantFilterAsync(userId)

// ✅ 修改密码
public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
{
    var user = await GetUserByIdWithoutTenantFilterAsync(userId);
    // ...
}

// ✅ 更新个人资料（修复后）
UpdateUserProfileAsync(userId, request)
```

## 🧪 测试验证

### 测试场景 1: 单企业用户
```
用户信息：
  - CompanyId: "personal_company"
  - CurrentCompanyId: "personal_company"

操作：修改姓名、邮箱、年龄

预期结果：
  - ✅ 保存成功
  - ✅ 数据正确更新
```

### 测试场景 2: 多企业用户（关键场景）
```
用户信息：
  - CompanyId: "company_A" (个人企业)
  - CurrentCompanyId: "company_B" (当前企业)
  - 通过 UserCompany 关联企业A和B

操作：在企业B的上下文中修改个人资料

预期结果：
  - ✅ 保存成功（修复前会失败）
  - ✅ 数据正确更新
  - ✅ 在企业A和B中都能看到更新后的用户信息
```

### 测试场景 3: 邮箱唯一性验证
```
用户 A: email = "user@example.com", CompanyId = "company_A"
用户 B: email = "other@example.com", CompanyId = "company_B"

用户B操作：将邮箱改为 "user@example.com"

预期结果：
  - ✅ 触发邮箱唯一性检查
  - ✅ 如果在同一企业内重复，阻止更新
  - ✅ 如果在不同企业，根据业务规则处理
```

## 📝 相关文件

### 修改的文件
- [UserService.cs](mdc:Platform.ApiService/Services/UserService.cs) - UpdateUserProfileAsync 方法

### 相关文件
- [UserController.cs](mdc:Platform.ApiService/Controllers/UserController.cs) - UpdateCurrentUserProfile 接口
- [BaseRepository.cs](mdc:Platform.ApiService/Services/BaseRepository.cs) - 多租户过滤逻辑
- [AppUser 模型](mdc:Platform.ApiService/Models/AuthModels.cs) - 用户数据模型

## 🔄 类似问题检查

### 需要检查的其他方法

以下方法涉及用户个人操作，应该确保不使用多租户过滤：

1. ✅ **GetUserByIdWithoutTenantFilterAsync** - 已正确实现
2. ✅ **ChangePasswordAsync** - 已正确实现（使用 GetUserByIdWithoutTenantFilterAsync）
3. ✅ **UpdateUserProfileAsync** - 本次修复
4. ❓ **其他个人操作** - 需要逐一检查

### 检查清单

当实现用户个人操作时，确保：

- [ ] 使用 `GetUserByIdWithoutTenantFilterAsync` 获取用户
- [ ] 或使用 `GetCollection<AppUser>("users")` 直接访问
- [ ] 只通过 userId 过滤，不使用 CompanyId 过滤
- [ ] 从 JWT token 获取 userId，不从请求参数获取
- [ ] 保留其他必要的验证（邮箱唯一性、格式验证等）

## 🎯 最佳实践

### 1. 区分业务场景

**个人操作**（不使用多租户过滤）：
- 获取个人资料
- 更新个人资料
- 修改密码
- 个人偏好设置

**企业管理操作**（使用多租户过滤）：
- 企业内用户管理
- 企业内角色管理
- 企业内权限管理

### 2. 统一方法命名

```csharp
// 个人操作 - 不带多租户过滤
GetUserByIdWithoutTenantFilterAsync(userId)
UpdateUserProfileAsync(userId, request)
ChangePasswordAsync(userId, request)

// 企业管理 - 带多租户过滤
GetUserByIdAsync(userId)  // 通过 BaseRepository
GetAllUsersAsync()        // 通过 BaseRepository
```

### 3. 注释说明

在涉及多租户过滤的代码中添加注释：

```csharp
// ✅ 推荐
// v3.1: 使用不带多租户过滤的方式更新，因为用户可能属于多个企业
var users = GetCollection<AppUser>("users");

// v3.1: 企业管理操作，使用多租户过滤确保数据隔离
return await _userRepository.GetAllAsync();
```

## 📚 参考文档

- [用户资料多租户修复](mdc:docs/bugfixes/USER-PROFILE-MULTI-TENANT-FIX.md)
- [多租户数据隔离规范](mdc:.cursor/rules/multi-tenant-data-isolation.mdc)
- [BaseRepository 实现](mdc:Platform.ApiService/Services/BaseRepository.cs)

## ✅ 修复验证

### 验证步骤

1. **启动应用**
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. **登录系统**
   - 访问：http://localhost:15001
   - 用户名：`admin`
   - 密码：`admin123`

3. **编辑个人资料**
   - 进入个人中心
   - 点击"编辑资料"
   - 修改姓名为"系统管理员"
   - 修改邮箱（如果需要）
   - 修改年龄（如果需要）
   - 点击"保存"

4. **验证结果**
   - ✅ 保存成功提示
   - ✅ 数据正确更新
   - ✅ 刷新页面后数据仍然正确
   - ✅ 后端日志无错误

### 预期结果
- ✅ 保存成功，不再出现"用户不存在"错误
- ✅ 个人资料正确更新
- ✅ 无论用户属于几个企业，都能正常更新个人资料

---

**修复日期**: 2025-10-14  
**影响范围**: 个人中心个人资料更新  
**优先级**: 高（阻塞功能）  
**状态**: ✅ 已修复

## 🔧 后续优化建议

### 1. 统一个人操作的 Service 层

创建专门的 `UserProfileService` 处理个人操作：

```csharp
public class UserProfileService
{
    private readonly IMongoCollection<AppUser> _users;
    
    // 所有方法都不使用多租户过滤
    public async Task<AppUser?> GetProfileAsync(string userId) { }
    public async Task<AppUser?> UpdateProfileAsync(string userId, UpdateProfileRequest request) { }
    public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request) { }
}
```

### 2. 添加集成测试

针对多企业场景添加集成测试：

```csharp
[Fact]
public async Task UpdateProfile_WithMultipleCompanies_ShouldSucceed()
{
    // Arrange: 创建用户属于多个企业的场景
    // Act: 更新个人资料
    // Assert: 验证更新成功
}
```

### 3. 监控和告警

添加监控指标：
- 个人资料更新成功率
- 多租户过滤导致的失败次数
- 响应时间

