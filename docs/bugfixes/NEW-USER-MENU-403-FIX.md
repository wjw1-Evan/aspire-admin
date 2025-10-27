# 新注册用户无法获取菜单 403 错误修复

## 📋 问题概述

**问题**: 新注册用户登录后无法获取菜单，出现 403 错误

**错误信息**: 
```
用户 68fde6ca0a1e2f7308d0f7de 没有关联的企业ID
```

**根本原因**: 用户注册时 `CurrentCompanyId` 字段未正确更新到数据库，导致：
1. JWT token 中缺少 `companyId` claim
2. 登录后调用 `GetRequiredCompanyId()` 时抛出 `UnauthorizedAccessException`
3. 菜单获取接口返回 403 错误

## 🔍 问题分析

### 错误流程

1. **用户注册** → 创建用户、企业、角色、UserCompany 关联
2. **更新 CurrentCompanyId** → ❌ 代码存在缺陷，未正确设置
3. **用户登录** → JWT token 中缺少 `companyId` claim
4. **获取菜单** → `MenuController.GetUserMenus()` 调用 `GetRequiredCompanyId()`
5. **抛出异常** → "未找到企业信息"，返回 403

### 问题代码

```csharp
// ❌ 错误的代码（修复前）
// 设置用户的企业信息
var update = _userFactory.CreateUpdateBuilder()
    .Set(u => u.CurrentCompanyId, personalCompany.Id)
    .Set(u => u.PersonalCompanyId, personalCompany.Id)
    .Set(u => u.CompanyId, personalCompany.Id)
    .SetCurrentTimestamp()
    .Build();

// 更新用户对象
user.CurrentCompanyId = personalCompany.Id;

// ❌ 关键问题：update 构建了但未执行！
// 更新用户的个人企业信息
var userFilter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
var userUpdate = _userFactory.CreateUpdateBuilder()
    .Set(u => u.PersonalCompanyId, personalCompany.Id)
    .Set(u => u.CompanyId, personalCompany.Id!)
    .Build();
// ❌ 问题：userUpdate 不包含 CurrentCompanyId！

await _userFactory.FindOneAndUpdateAsync(userFilter, userUpdate);
```

**问题点**：
1. 第一个 `update` 构建了但从未执行
2. 实际执行的 `userUpdate` 不包含 `CurrentCompanyId` 字段
3. 数据库中的 `CurrentCompanyId` 仍然是 null
4. JWT token 生成时 `user.CurrentCompanyId` 为空，不添加 `companyId` claim

## ✅ 解决方案

### 修复代码

合并两个更新操作，确保 `CurrentCompanyId` 正确设置：

```csharp
// ✅ 正确的代码（修复后）
// 设置用户的企业信息
var userFilter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
var userUpdate = _userFactory.CreateUpdateBuilder()
    .Set(u => u.CurrentCompanyId, personalCompany.Id!)  // ✅ 添加到更新中
    .Set(u => u.PersonalCompanyId, personalCompany.Id!)
    .Set(u => u.CompanyId, personalCompany.Id!)
    .SetCurrentTimestamp()
    .Build();

await _userFactory.FindOneAndUpdateAsync(userFilter, userUpdate);

// 更新用户对象（用于后续返回）
user.CurrentCompanyId = personalCompany.Id;
user.PersonalCompanyId = personalCompany.Id;
user.CompanyId = personalCompany.Id;
```

### 修复内容

1. **移除未使用的 `update`** - 删除了构建但未执行的第一个更新
2. **添加 `CurrentCompanyId`** - 在 `userUpdate` 中添加 `.Set(u => u.CurrentCompanyId, personalCompany.Id!)`
3. **更新用户对象** - 在数据库更新后，同步更新内存中的 `user` 对象

## 🔧 影响范围

### 受影响的功能

- 新用户注册后首次登录
- 菜单获取接口 (`GET /api/menu/user`)
- JWT token 中的 `companyId` claim

### 不受影响的功能

- 老用户（已存在且数据完整）
- 企业管理员用户
- 其他已正常工作的用户

## 📋 验证步骤

### 1. 注册新用户

```bash
curl -X POST http://localhost:15000/apiservice/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "email": "test@example.com"
  }'
```

### 2. 登录获取 token

```bash
curl -X POST http://localhost:15000/apiservice/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456"
  }'
```

### 3. 检查 JWT token

解码 JWT token，确认包含 `companyId` claim：

```json
{
  "userId": "...",
  "username": "testuser",
  "companyId": "68fde6ca0a1e2f7308d0f7df",  // ✅ 应该存在
  "currentCompanyId": "68fde6ca0a1e2f7308d0f7df"
}
```

### 4. 获取菜单

```bash
curl -X GET http://localhost:15000/apiservice/api/menu/user \
  -H "Authorization: Bearer {token}"
```

**预期结果**: 成功返回菜单列表，不再出现 403 错误

### 5. 数据库验证

```bash
# 检查用户记录
docker exec mongo-efe7aa87 mongosh aspire-admin --quiet --eval \
  "db.users.findOne({username: 'testuser'}, {currentCompanyId: 1, personalCompanyId: 1, companyId: 1})"
```

**预期结果**:
```json
{
  "currentCompanyId": "68fde6ca0a1e2f7308d0f7df",
  "personalCompanyId": "68fde6ca0a1e2f7308d0f7df",
  "companyId": "68fde6ca0a1e2f7308d0f7df"
}
```

## 🎯 预防措施

### 1. 代码审查要点

在修改用户注册逻辑时，确保：
- [ ] 所有必需的字段都包含在 `UpdateBuilder` 中
- [ ] 构建的 `UpdateBuilder` 确实被执行
- [ ] 内存对象与数据库记录保持一致

### 2. 测试覆盖

添加单元测试验证：
- 新用户注册后 `CurrentCompanyId` 是否正确设置
- JWT token 中是否包含 `companyId` claim
- 菜单获取接口是否正常工作

### 3. 日志监控

添加日志记录：
```csharp
_logger.LogInformation("用户 {Username} 注册完成，CurrentCompanyId: {CompanyId}", 
    user.Username, user.CurrentCompanyId);
```

## 📚 相关文档

- [用户注册流程](mdc:Platform.ApiService/Services/AuthService.cs)
- [JWT Token 生成](mdc:Platform.ApiService/Services/JwtService.cs)
- [菜单获取接口](mdc:Platform.ApiService/Controllers/MenuController.cs)
- [数据库操作工厂](mdc:Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs)

## 🎯 修复总结

**问题**: 新注册用户的 `CurrentCompanyId` 字段未正确设置  
**原因**: 代码中存在构建但未执行的更新操作  
**修复**: 合并更新操作，确保 `CurrentCompanyId` 包含在数据库更新中  
**影响**: 修复后新用户注册后可以正常获取菜单，不再出现 403 错误  

## ✅ 验证结果

- [x] 新用户注册成功
- [x] `CurrentCompanyId` 正确设置到数据库
- [x] JWT token 包含 `companyId` claim
- [x] 菜单获取接口正常工作
- [x] 不再出现 403 错误

## 📝 注意事项

1. **老用户数据修复** - 对于已注册但 `CurrentCompanyId` 为空的用户，需要手动修复：
   ```javascript
   // MongoDB 修复脚本
   db.users.updateMany(
     { currentCompanyId: null },
     { $set: { currentCompanyId: "$personalCompanyId" } }
   );
   ```

2. **数据完整性** - 确保 `CurrentCompanyId` 和 `PersonalCompanyId` 始终一致

3. **JWT 刷新** - 用户可能需要重新登录以获取包含 `companyId` 的新 token

---

**修复日期**: 2025-01-27  
**修复人员**: AI Assistant  
**影响版本**: v5.0+
