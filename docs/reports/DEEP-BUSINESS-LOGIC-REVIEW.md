# 深度业务逻辑检查报告

## 📋 第二轮检查（深度检查）

**日期**: 2025-01-13  
**检查范围**: 全面业务流程  
**状态**: 进行中

## 🔍 新发现的问题

### 问题 5: 角色分配时未验证企业归属 ⚠️ **严重**

**位置**: `Platform.ApiService/Services/UserService.cs:186-187`

**问题描述**:
- 在 `UpdateUserManagementAsync` 中分配角色时，没有验证角色是否属于当前企业
- 理论上可以给用户分配其他企业的角色
- 可能导致权限泄露和数据混乱

**当前代码**:
```csharp
if (request.RoleIds != null)
    update = update.Set(user => user.RoleIds, request.RoleIds);
// ❌ 没有验证 RoleIds 是否属于当前企业
```

**应该修复为**:
```csharp
if (request.RoleIds != null && request.RoleIds.Count > 0)
{
    // v3.0 多租户：验证所有角色都属于当前企业
    var companyId = GetCurrentCompanyId();
    if (!string.IsNullOrEmpty(companyId))
    {
        var roleFilter = Builders<Role>.Filter.And(
            Builders<Role>.Filter.In(r => r.Id, request.RoleIds),
            Builders<Role>.Filter.Eq(r => r.CompanyId, companyId),
            Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
        );
        var roleCount = await _roles.CountDocumentsAsync(roleFilter);
        if (roleCount != request.RoleIds.Count)
        {
            throw new InvalidOperationException("部分角色不存在或不属于当前企业");
        }
    }
    update = update.Set(user => user.RoleIds, request.RoleIds);
}
```

---

### 问题 6: 创建用户时也未验证角色归属 ⚠️ **严重**

**位置**: `Platform.ApiService/Services/UserService.cs:120-133`

**问题描述**:
- 在 `CreateUserManagementAsync` 中创建用户时，也没有验证角色是否属于当前企业
- 可以在创建时分配其他企业的角色

**当前代码**:
```csharp
var user = new AppUser
{
    Username = request.Username,
    Email = request.Email,
    PasswordHash = passwordHash,
    RoleIds = request.RoleIds ?? new List<string>(),  // ❌ 未验证
    IsActive = request.IsActive,
    // ...
};
```

**需要修复**: 在创建前验证角色归属

---

### 问题 7: 角色分配菜单/权限时未验证归属 ⚠️ **中等**

**位置**: `Platform.ApiService/Services/RoleService.cs:149-150`

**问题描述**:
- 在更新角色时分配菜单和权限，没有验证这些资源是否属于当前企业

**当前代码**:
```csharp
if (request.MenuIds != null)
    updates.Add(updateBuilder.Set(r => r.MenuIds, request.MenuIds));
// ❌ 没有验证 MenuIds 是否属于当前企业
```

**同样问题存在于**:
- 创建角色时设置 MenuIds
- 更新角色时设置 PermissionIds
- 用户自定义权限分配

---

### 问题 8: 菜单路径/名称未检查唯一性 ⚠️ **中等**

**位置**: `Platform.ApiService/Services/MenuService.cs:129-148`

**问题描述**:
- 创建菜单时没有检查路径或名称的唯一性
- 可能导致同一企业内创建重复的菜单

**当前代码**:
```csharp
public async Task<Menu> CreateMenuAsync(CreateMenuRequest request)
{
    var menu = new Menu
    {
        Name = request.Name,
        Path = request.Path,
        // ...
    };

    return await _menuRepository.CreateAsync(menu);
    // ❌ 没有唯一性检查
}
```

---

### 问题 9: 权限代码未检查唯一性 ⚠️ **中等**

**位置**: `Platform.ApiService/Services/PermissionService.cs:50-83`

**问题描述**:
- 创建权限时没有检查权限代码的唯一性（企业内）

---

### 问题 10: 删除角色时查询用户未过滤企业 ⚠️ **低**

**位置**: `Platform.ApiService/Services/RoleService.cs:179-183`

**问题描述**:
- 删除角色时查找使用该角色的用户，没有添加 CompanyId 过滤
- 虽然不会造成数据泄露，但会产生不必要的查询

**当前代码**:
```csharp
var usersFilter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.AnyIn(u => u.RoleIds, new[] { id }),
    SoftDeleteExtensions.NotDeleted<AppUser>()
);
// ❌ 缺少 CompanyId 过滤
```

---

### 问题 11: 获取用户菜单时未过滤企业 ⚠️ **中等**

**位置**: `Platform.ApiService/Services/MenuService.cs:48-96`

**问题描述**:
- 在 `GetUserMenusAsync` 中获取用户菜单时，角色查询没有企业过滤

**当前代码**:
```csharp
var filter = Builders<Role>.Filter.And(
    Builders<Role>.Filter.In(r => r.Id, roleIds),
    Builders<Role>.Filter.Eq(r => r.IsActive, true),
    MongoFilterExtensions.NotDeleted<Role>()
);
// ❌ 缺少 CompanyId 过滤
```

---

## 📊 问题分类总计

### 严重问题（必须立即修复）
1. ✅ 用户名唯一性检查是全局的（已修复）
2. ⚠️ 角色分配时未验证企业归属
3. ⚠️ 创建用户时未验证角色归属

### 中等问题（建议修复）
4. ✅ 个人资料更新邮箱检查不一致（已修复）
5. ✅ 权限检查缺少企业过滤（已修复）
6. ⚠️ 角色分配菜单/权限时未验证归属
7. ⚠️ 菜单路径/名称未检查唯一性
8. ⚠️ 权限代码未检查唯一性
9. ⚠️ 获取用户菜单时未过滤企业

### 轻微问题（优化）
10. ⚠️ 删除角色时查询用户未过滤企业

## 🎯 修复优先级

**P0 - 立即修复（安全相关）**:
- [ ] 角色分配验证
- [ ] 创建用户时验证角色
- [ ] 获取用户菜单的企业过滤

**P1 - 高优先级**:
- [ ] 角色分配菜单/权限验证
- [ ] 菜单唯一性检查
- [ ] 权限代码唯一性检查

**P2 - 中优先级**:
- [ ] 删除角色时的企业过滤

## 📝 修复计划

### 阶段1: 角色分配验证
1. 修复 `UpdateUserManagementAsync`
2. 修复 `CreateUserManagementAsync`
3. 添加角色归属验证辅助方法

### 阶段2: 菜单和权限验证
1. 修复角色更新时的菜单/权限验证
2. 添加菜单唯一性检查
3. 添加权限代码唯一性检查

### 阶段3: 优化查询
1. 优化删除角色的用户查询
2. 优化获取用户菜单的角色查询

## 🔧 预期修复影响

**安全性**:
- ✅ 防止跨企业角色分配
- ✅ 防止跨企业权限泄露
- ✅ 确保数据完整性

**性能**:
- ✅ 减少不必要的查询范围
- ✅ 更好地利用索引

**代码质量**:
- ✅ 更严格的验证
- ✅ 更一致的安全模型

---

**检查人**: AI Assistant  
**状态**: 发现11个问题，已修复3个，待修复8个

