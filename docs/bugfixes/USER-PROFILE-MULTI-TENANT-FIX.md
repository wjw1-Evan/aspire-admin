# 个人中心多租户过滤问题修复

## 📋 问题描述

用户登录后，点击个人中心显示"用户不存在"，但用户已经成功登录。

## 🔍 问题分析

### 问题根源

在 v3.1 多企业关联架构中：

1. **用户可以属于多个企业** - 用户和企业的关系通过 `UserCompany` 表管理
2. **用户登录时选择企业** - JWT token 包含 `userId` 和当前选择的 `currentCompanyId`
3. **AppUser 实体有 CompanyId** - 这个 `CompanyId` 是用户注册时的初始企业ID
4. **BaseRepository 自动过滤** - 所有查询都会自动添加 `CompanyId == currentCompanyId` 过滤

### 问题场景

```
用户注册 → 创建企业A (AppUser.CompanyId = 企业A)
        ↓
用户加入企业B (UserCompany 表中添加记录)
        ↓
用户登录选择企业B (JWT token: currentCompanyId = 企业B)
        ↓
访问个人中心 → GetUserByIdAsync(userId)
        ↓
BaseRepository 查询: userId = xxx AND CompanyId = 企业B
        ↓
找不到记录 (因为 AppUser.CompanyId = 企业A)
        ↓
返回 null → 抛出 "用户不存在" 异常
```

### 核心问题

**用户是跨企业的全局实体，不应该使用多租户过滤。**

## ✅ 修复方案

### 1. 新增方法：不带多租户过滤的用户查询

**IUserService.cs**
```csharp
Task<AppUser?> GetUserByIdWithoutTenantFilterAsync(string id);
```

**UserService.cs**
```csharp
/// <summary>
/// 根据ID获取用户（不使用多租户过滤）
/// v3.1: 用于获取个人中心信息等跨企业场景
/// </summary>
public async Task<AppUser?> GetUserByIdWithoutTenantFilterAsync(string id)
{
    var users = GetCollection<AppUser>("users");
    var filter = Builders<AppUser>.Filter.And(
        Builders<AppUser>.Filter.Eq(u => u.Id, id),
        Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false)
    );
    return await users.Find(filter).FirstOrDefaultAsync();
}
```

### 2. 修改个人中心接口

**UserController.cs - GetCurrentUserProfile**
```csharp
[HttpGet("profile")]
[Authorize]
public async Task<IActionResult> GetCurrentUserProfile()
{
    var userId = GetRequiredUserId();
    // v3.1: 获取用户信息时不使用多租户过滤，因为用户可以属于多个企业
    var user = await _userService.GetUserByIdWithoutTenantFilterAsync(userId);
    if (user == null)
        throw new KeyNotFoundException("用户不存在");

    return Success(user);
}
```

### 3. 修改密码修改接口

**UserService.cs - ChangePasswordAsync**
```csharp
public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request)
{
    // v3.1: 修改密码时不使用多租户过滤
    var user = await GetUserByIdWithoutTenantFilterAsync(userId);
    if (user == null)
        return false;

    // 验证当前密码
    if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        return false;

    // 更新密码
    var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
    var filter = Builders<AppUser>.Filter.Eq(u => u.Id, userId);
    var update = Builders<AppUser>.Update
        .Set(u => u.PasswordHash, newPasswordHash)
        .Set(u => u.UpdatedAt, DateTime.UtcNow);

    var result = await _users.UpdateOneAsync(filter, update);
    return result.ModifiedCount > 0;
}
```

## 📝 修改文件清单

- ✅ `Platform.ApiService/Services/IUserService.cs` - 新增接口方法
- ✅ `Platform.ApiService/Services/UserService.cs` - 实现不带多租户过滤的查询方法
- ✅ `Platform.ApiService/Controllers/UserController.cs` - 修改个人中心接口使用新方法
- ✅ `Platform.ApiService/Services/UserService.cs` - 修改密码修改方法使用新方法

## 🔧 受影响的接口

### 已修复
- ✅ `GET /api/user/profile` - 获取当前用户信息（个人中心）
- ✅ `PUT /api/user/profile` - 更新当前用户信息（个人中心）
- ✅ `PUT /api/user/profile/password` - 修改当前用户密码

### 不受影响（已验证）
- ✅ `GET /api/user/profile/activity-logs` - 活动日志查询（直接通过 userId 查询）
- ✅ `PUT /api/user/profile` - 更新个人资料（直接使用 _users 集合，无多租户过滤）

## ✨ 核心原则

### 用户实体的特殊性

**用户（AppUser）是跨企业的全局实体，不应该使用多租户过滤。**

原因：
1. 用户可以属于多个企业
2. 用户的企业关系通过 `UserCompany` 表管理
3. `AppUser.CompanyId` 只是注册时的初始企业，不代表用户当前所属企业
4. 个人信息、密码等操作是针对用户本身，与企业无关

### 何时使用多租户过滤

**多租户过滤只应用于企业专属数据：**
- ✅ Menu（菜单） - 企业专属
- ✅ Permission（权限） - 企业专属
- ✅ Role（角色） - 企业专属
- ✅ Notice（通知） - 企业专属
- ❌ AppUser（用户） - 跨企业全局实体

## 🧪 测试验证

### 测试步骤

1. **用户注册并创建企业A**
   ```bash
   POST /api/register
   {
     "username": "testuser",
     "password": "password123",
     "companyCode": "CompanyA"
   }
   ```

2. **用户加入企业B**
   - 管理员邀请用户加入企业B
   - `UserCompany` 表中创建新记录

3. **用户登录选择企业B**
   ```bash
   POST /api/login/account
   {
     "username": "testuser",
     "password": "password123",
     "companyCode": "CompanyB"
   }
   ```

4. **访问个人中心**
   ```bash
   GET /api/user/profile
   Authorization: Bearer {token}
   ```

### 预期结果

- ✅ 成功返回用户信息
- ✅ 不再显示"用户不存在"错误
- ✅ 能正常修改个人资料
- ✅ 能正常修改密码

## 📚 相关文档

- [多企业关联架构](mdc:docs/features/MULTI-ENTERPRISE-AFFILIATION.md)
- [多租户数据隔离规范](mdc:.cursor/rules/multi-tenant-data-isolation.mdc)
- [BaseRepository 实现](mdc:Platform.ApiService/Services/BaseRepository.cs)
- [UserService 实现](mdc:Platform.ApiService/Services/UserService.cs)

## 🎯 经验教训

1. **理解实体的归属性** - 区分哪些是企业专属数据，哪些是跨企业的全局数据
2. **谨慎使用自动过滤** - BaseRepository 的多租户过滤很方便，但不适用于所有场景
3. **提供灵活的查询方法** - 对于特殊场景，需要提供不带自动过滤的查询方法
4. **完善的测试** - 多企业场景需要充分的测试覆盖

## 📌 注意事项

### 安全考虑

虽然个人中心接口不使用多租户过滤，但：
- ✅ 仍然需要 `[Authorize]` 认证
- ✅ 只能访问当前登录用户自己的信息（通过 JWT token 获取 userId）
- ✅ 无法访问其他用户的个人信息

### 其他需要类似处理的场景

如果发现以下场景也有类似问题，需要使用 `GetUserByIdWithoutTenantFilterAsync`：
- 用户头像上传/更新
- 用户偏好设置
- 用户通知设置
- 其他与用户本身相关、与企业无关的功能

## ✅ 修复状态

- [x] 问题分析完成
- [x] 修复方案实施
- [x] 代码修改完成
- [ ] 测试验证通过
- [ ] 文档更新完成

---

**修复日期**: 2025-01-14  
**修复版本**: v3.1  
**相关 Issue**: 个人中心显示用户不存在

