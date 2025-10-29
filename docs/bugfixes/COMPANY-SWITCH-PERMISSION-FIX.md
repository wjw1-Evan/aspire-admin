# 企业切换后权限检查失败修复

## 📋 问题描述

**问题**: 用户切换企业后，访问需要菜单权限的接口（如 `/api/role/with-stats`）返回 403 错误：

```json
{
  "success": false,
  "error": "无权访问菜单: role-management",
  "errorCode": "FORBIDDEN",
  "showType": 2
}
```

**根本原因**: 权限检查时，`DatabaseOperationFactory` 使用 JWT token 中的旧企业ID自动过滤角色，导致查询不到新企业的角色。

## 🔍 问题分析

### 问题流程

```
1. 用户切换企业
   ↓
2. 后端更新数据库 user.CurrentCompanyId = 新企业ID ✅
   ↓
3. 后端生成新 JWT token（包含新企业ID）✅
   ↓
4. 前端更新 localStorage 中的 token ✅
   ↓
5. 前端发送请求，但可能还在使用旧的 JWT token（请求已发起）❌
   ↓
6. MenuAccessService.GetUserMenuNamesAsync：
   - 从数据库获取 user.CurrentCompanyId = 新企业ID ✅
   - 查询 UserCompany（新企业ID），能找到 ✅
   - 查询 Role 时：
     - 手动过滤: CompanyId = 新企业ID ✅
     - 但 DatabaseOperationFactory 自动过滤: CompanyId = JWT token 中的旧企业ID ❌
   - 结果：找不到角色（因为自动过滤使用了旧企业ID）❌
   ↓
7. 权限检查失败，返回 403 ❌
```

### 关键代码问题

#### MenuAccessService.GetUserMenuNamesAsync

```csharp
// ❌ 问题代码
var companyId = user.CurrentCompanyId ?? _tenantContext.GetCurrentCompanyId();
// companyId = 新企业ID（从数据库获取）✅

var roleFilter = _roleFactory.CreateFilterBuilder()
    .In(r => r.Id, userCompany.RoleIds)
    .Equal(r => r.CompanyId, companyId)  // ✅ 手动过滤：新企业ID
    .Equal(r => r.IsActive, true)
    .Build();

var roles = await _roleFactory.FindAsync(roleFilter);  // ❌ 问题在这里
```

**问题**:
- `FindAsync` 会触发 `DatabaseOperationFactory.ApplyTenantFilter`
- `ApplyTenantFilter` 使用 `_tenantContext.GetCurrentCompanyId()`（从 JWT token 获取）
- 如果 JWT token 还是旧的，会自动添加 `CompanyId = 旧企业ID` 过滤
- 最终查询条件变成：`CompanyId = 新企业ID AND CompanyId = 旧企业ID`（矛盾）
- 结果：查询不到角色

#### DatabaseOperationFactory.ApplyTenantFilter

```csharp
private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
{
    if (typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
    {
        var companyId = _tenantContext.GetCurrentCompanyId();  // ❌ 从 JWT token 获取
        if (!string.IsNullOrEmpty(companyId))
        {
            // 自动添加 CompanyId 过滤
            var companyFilter = Builders<T>.Filter.Eq("CompanyId", companyId);
            return Builders<T>.Filter.And(filter, companyFilter);
        }
    }
    return filter;
}
```

## ✅ 修复方案

### 修复原则

**使用 `FindWithoutTenantFilterAsync` 因为我们已在 filter 中手动添加了 `CompanyId` 过滤**

这样可以避免 `DatabaseOperationFactory` 使用 JWT token 中的企业ID自动过滤，改用数据库中 `user.CurrentCompanyId`（更准确，不会受 JWT token 延迟影响）。

### 修复代码

#### 1. MenuAccessService.GetUserMenuNamesAsync

```csharp
// ✅ 修复后
var companyId = user.CurrentCompanyId ?? _tenantContext.GetCurrentCompanyId();

var roleFilter = _roleFactory.CreateFilterBuilder()
    .In(r => r.Id, userCompany.RoleIds)
    .Equal(r => r.CompanyId, companyId)  // ✅ 手动过滤：使用数据库中的 CurrentCompanyId
    .Equal(r => r.IsActive, true)
    .Build();

// ✅ 使用 FindWithoutTenantFilterAsync，避免自动过滤使用 JWT token 中的旧企业ID
var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
```

#### 2. UserService.GetUserPermissionsAsync

```csharp
// ✅ 修复后
var roleFilter = _roleFactory.CreateFilterBuilder()
    .In(r => r.Id, userCompany.RoleIds)
    .Equal(r => r.CompanyId, companyId)  // ✅ 手动过滤
    .Equal(r => r.IsActive, true)
    .Build();

// ✅ 使用 FindWithoutTenantFilterAsync
var roles = await _roleFactory.FindWithoutTenantFilterAsync(roleFilter);
```

## 🔧 修复后的流程

```
1. 用户切换企业
   ↓
2. 后端更新数据库 user.CurrentCompanyId = 新企业ID ✅
   ↓
3. 后端生成新 JWT token ✅
   ↓
4. 前端更新 token ✅
   ↓
5. MenuAccessService.GetUserMenuNamesAsync：
   - 从数据库获取 user.CurrentCompanyId = 新企业ID ✅
   - 查询 UserCompany（新企业ID），能找到 ✅
   - 查询 Role 时：
     - 手动过滤: CompanyId = 新企业ID ✅
     - 使用 FindWithoutTenantFilterAsync，跳过自动过滤 ✅
     - 结果：能找到角色（只使用手动过滤）✅
   ↓
6. 权限检查成功 ✅
```

## 🎯 为什么这样修复？

### 1. 数据源优先级

在权限检查场景中，**数据库中的 `CurrentCompanyId` 比 JWT token 中的 `companyId` 更准确**：

- ✅ **数据库中的 `CurrentCompanyId`**：切换企业时立即更新，是权威数据源
- ❌ **JWT token 中的 `companyId`**：可能存在延迟（前端可能还在使用旧 token）

### 2. 查询安全性

使用 `FindWithoutTenantFilterAsync` + 手动 `CompanyId` 过滤是安全的：

- ✅ 已经在 filter 中手动指定了 `CompanyId`
- ✅ 明确指定了企业ID，不会有跨企业数据泄露
- ✅ 避免了自动过滤和手动过滤的冲突

### 3. 场景适配

在权限检查场景中，我们已经从数据库中获取了 `user.CurrentCompanyId`，这个值是最新的、最准确的。使用它来进行权限检查，比依赖 JWT token 更可靠。

## 📝 相关文件

- `Platform.ApiService/Services/MenuAccessService.cs` - ✅ 已修复
- `Platform.ApiService/Services/UserService.cs` - ✅ 已修复
- `Platform.ServiceDefaults/Services/DatabaseOperationFactory.cs` - 自动过滤逻辑（未修改）

## 🧪 验证方法

1. **切换企业**
   - 登录系统
   - 切换到新创建的企业

2. **访问需要权限的接口**
   ```bash
   GET http://localhost:15001/api/role/with-stats
   Authorization: Bearer {token}
   ```

3. **预期结果**
   - ✅ 应该返回角色列表（不返回 403）
   - ✅ 只显示新企业的角色

4. **检查日志**
   - 查看 `MenuAccessService` 的日志输出
   - 确认成功查询到角色

## 🎯 修复效果

### 修复前
- ❌ 切换企业后访问 `/api/role/with-stats` 返回 403
- ❌ 权限检查失败，因为查询不到角色

### 修复后
- ✅ 切换企业后可以正常访问所有需要权限的接口
- ✅ 权限检查正确，使用数据库中的 `CurrentCompanyId`
- ✅ 不受 JWT token 延迟影响

## 🔒 安全性

修复后仍然保持多租户隔离安全：

- ✅ 手动指定 `CompanyId` 过滤，确保只查询当前企业的角色
- ✅ 使用明确的企业ID（从数据库获取），不会有跨企业数据泄露
- ✅ 权限检查逻辑不变，只是数据源更准确

## ✅ 测试要点

1. ✅ 切换企业后，可以访问需要权限的接口
2. ✅ 权限检查使用数据库中的 `CurrentCompanyId`
3. ✅ 不会出现跨企业数据泄露
4. ✅ 日志输出正确，显示查询到的角色数量

## 📚 相关文档

- [权限系统完整性检查](mdc:docs/reports/PERMISSION-SYSTEM-COMPLETE-CHECK.md)
- [用户多角色功能检查](mdc:docs/reports/MULTI-ROLE-USER-CHECK.md)
- [企业切换 Token 更新修复](mdc:docs/bugfixes/COMPANY-SWITCH-TOKEN-FIX.md)

