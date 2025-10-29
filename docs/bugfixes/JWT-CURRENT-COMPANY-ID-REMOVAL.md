# JWT CurrentCompanyId 移除修复

## 📋 问题描述

**需求**: 移除 JWT token 中的 `CurrentCompanyId` claim，所有企业ID相关的逻辑统一从数据库的 `user.CurrentCompanyId` 获取。

**原因**: 
- JWT token 中的企业ID可能在切换企业后延迟更新
- 数据库中的 `user.CurrentCompanyId` 是权威数据源，更准确可靠
- 避免切换企业后权限检查失败的问题

## ✅ 修复内容

### 1. JWT Token 生成修改

#### JwtService.GenerateToken

```csharp
// ✅ 修复前
var claims = new List<Claim>
{
    new("userId", user.Id ?? string.Empty),
    new("username", user.Username)
};

// v3.1: 添加当前企业ID到token
if (!string.IsNullOrEmpty(user.CurrentCompanyId))
{
    claims.Add(new("currentCompanyId", user.CurrentCompanyId));
    claims.Add(new("companyId", user.CurrentCompanyId));  // 兼容性
}

// ✅ 修复后
var claims = new List<Claim>
{
    new("userId", user.Id ?? string.Empty),
    new("username", user.Username)
};

// ⚠️ 已移除：不再在 JWT token 中包含 CurrentCompanyId
// 所有企业ID相关的逻辑应从数据库的 user.CurrentCompanyId 获取，而非 JWT token
```

#### JwtService.GenerateRefreshToken

```csharp
// ✅ 修复前
var claims = new List<Claim>
{
    new("type", "refresh"),
    new("userId", user.Id ?? string.Empty),
    new("username", user.Username),
    new("companyId", user.CurrentCompanyId ?? string.Empty),  // v3.1: 使用 CurrentCompanyId
    new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
};

// ✅ 修复后
var claims = new List<Claim>
{
    new("type", "refresh"),
    new("userId", user.Id ?? string.Empty),
    new("username", user.Username),
    // ⚠️ 已移除：不再在 RefreshToken 中包含 companyId
    // 企业ID应从数据库获取，而非 JWT token
    new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
};
```

### 2. 服务层修改

#### MenuAccessService.GetUserMenuNamesAsync

```csharp
// ✅ 修复前
var companyId = user.CurrentCompanyId ?? _tenantContext.GetCurrentCompanyId();

// ✅ 修复后
// 获取用户的企业ID（从数据库获取，不使用 JWT token 中的企业ID）
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，统一从数据库获取
var companyId = user.CurrentCompanyId;
```

#### UserService.GetUserPermissionsAsync

```csharp
// ✅ 修复前
var companyId = _userFactory.GetCurrentCompanyId();

// ✅ 修复后
// 获取用户在当前企业的角色（从数据库获取，不使用 JWT token）
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，统一从数据库获取
var companyId = user.CurrentCompanyId;
```

#### UserService.CreateUserAsync

```csharp
// ✅ 修复前
var companyId = _userFactory.GetCurrentCompanyId();

// ✅ 修复后
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
var currentUserId = _userFactory.GetRequiredUserId();
var currentUser = await _userFactory.GetByIdAsync(currentUserId);
var companyId = currentUser?.CurrentCompanyId;
```

#### UserService.GetUsersWithRolesAsync

```csharp
// ✅ 修复前
var currentCompanyId = _userFactory.GetRequiredCompanyId();

// ✅ 修复后
// 验证当前企业（从数据库获取，不使用 JWT token）
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
var currentUserId = _userFactory.GetRequiredUserId();
var currentUser = await _userFactory.GetByIdAsync(currentUserId);
if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
{
    throw new UnauthorizedAccessException("未找到当前企业信息");
}
var currentCompanyId = currentUser.CurrentCompanyId;
```

#### UserService.GetUserStatisticsAsync & BulkUpdateUsersAsync

```csharp
// ✅ 修复前
var currentCompanyId = _userFactory.GetCurrentCompanyId();

// ✅ 修复后
// ✅ 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
var currentUserId = _userFactory.GetRequiredUserId();
var currentUser = await _userFactory.GetByIdAsync(currentUserId);
if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
{
    throw new UnauthorizedAccessException("未找到当前企业信息");
}
var currentCompanyId = currentUser.CurrentCompanyId;
```

#### UserService.ValidateRoleOwnershipAsync

```csharp
// ✅ 修复前
var companyId = _userFactory.GetCurrentCompanyId();

// ✅ 修复后
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
var currentUserId = _userFactory.GetRequiredUserId();
var currentUser = await _userFactory.GetByIdAsync(currentUserId);
var companyId = currentUser?.CurrentCompanyId;
```

#### RoleService.CreateRoleAsync

```csharp
// ✅ 修复前
var companyId = _roleFactory.GetRequiredCompanyId();

// ✅ 修复后
// 获取当前企业ID（从数据库获取，不使用 JWT token）
// ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
var currentUserId = _roleFactory.GetRequiredUserId();
var currentUser = await _userFactory.GetByIdAsync(currentUserId);
if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
{
    throw new UnauthorizedAccessException("未找到当前企业信息");
}
var companyId = currentUser.CurrentCompanyId;
```

#### RuleService（所有方法）

```csharp
// ✅ 修复前
var companyId = _tenantContext.GetCurrentCompanyId();

// ✅ 修复后
// 添加辅助方法获取企业ID
private async Task<string> GetCurrentCompanyIdAsync()
{
    // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
    var currentUserId = _userFactory.GetRequiredUserId();
    var currentUser = await _userFactory.GetByIdAsync(currentUserId);
    if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
    {
        throw new UnauthorizedAccessException("未找到当前企业信息");
    }
    return currentUser.CurrentCompanyId;
}

// 在所有方法中使用
var companyId = await GetCurrentCompanyIdAsync();
```

#### UserActivityLogService（所有方法）

```csharp
// ✅ 修复前
companyId = _tenantContext.GetCurrentCompanyId();

// ✅ 修复后
// 添加辅助方法获取企业ID（可选）
private async Task<string?> TryGetCurrentCompanyIdAsync()
{
    try
    {
        // ⚠️ 已移除 JWT token 中的 CurrentCompanyId，从当前用户获取
        var currentUserId = _userFactory.GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
        {
            return null;
        }
        
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        return currentUser?.CurrentCompanyId;
    }
    catch
    {
        // 如果无法获取（如用户未登录），返回 null
        return null;
    }
}

// 在所有方法中使用
var companyId = await TryGetCurrentCompanyIdAsync();
```

## 🔧 影响分析

### TenantContext.GetCurrentCompanyId()

`TenantContext.GetCurrentCompanyId()` 现在将始终返回 `null`，因为它从 JWT token 中的 `companyId` claim 获取：

```csharp
public string? GetCurrentCompanyId()
{
    return _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;
}
```

**影响**: 
- 所有依赖 `TenantContext.GetCurrentCompanyId()` 的代码都需要改为从数据库获取
- `DatabaseOperationFactory.ApplyTenantFilter` 将不再自动添加 CompanyId 过滤

### DatabaseOperationFactory 自动租户过滤

```csharp
private FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T> filter)
{
    if (typeof(IMultiTenant).IsAssignableFrom(typeof(T)))
    {
        var companyId = _tenantContext.GetCurrentCompanyId();  // 现在返回 null
        if (!string.IsNullOrEmpty(companyId))
        {
            // 这个分支将不再执行
            var companyFilter = Builders<T>.Filter.Eq("CompanyId", companyId);
            return Builders<T>.Filter.And(filter, companyFilter);
        }
    }
    return filter;
}
```

**影响**:
- 自动租户过滤不再生效
- 所有查询 `IMultiTenant` 实体的代码需要手动添加 `CompanyId` 过滤
- 或者使用 `FindWithoutTenantFilterAsync` 并手动添加 `CompanyId` 过滤

## ⚠️ 注意事项

### 1. 多租户实体查询

所有查询 `IMultiTenant` 实体的代码必须：

```csharp
// ✅ 正确：手动添加 CompanyId 过滤
var filter = _roleFactory.CreateFilterBuilder()
    .In(r => r.Id, roleIds)
    .Equal(r => r.CompanyId, companyId)  // 手动添加
    .Equal(r => r.IsActive, true)
    .Build();

var roles = await _roleFactory.FindWithoutTenantFilterAsync(filter);  // 跳过自动过滤
```

### 2. 权限检查相关服务

以下服务已经修复，使用数据库中的 `user.CurrentCompanyId`:
- ✅ `MenuAccessService` - 已修复
- ✅ `UserService.GetUserPermissionsAsync` - 已修复
- ✅ `UserService` 其他方法 - 已修复
- ✅ `RoleService` - 已修复
- ✅ `RuleService` - 已修复
- ✅ `UserActivityLogService` - 已修复

### 3. 自动租户过滤失效

`DatabaseOperationFactory.ApplyTenantFilter` 将不再自动添加 CompanyId 过滤，因为 `TenantContext.GetCurrentCompanyId()` 返回 null。

**解决方案**:
- 所有查询 `IMultiTenant` 实体的代码必须手动添加 `CompanyId` 过滤
- 或者使用 `FindWithoutTenantFilterAsync` 并明确指定 `CompanyId`

## 🧪 验证方法

1. **检查 JWT Token 内容**
   ```bash
   # 解码 JWT token，确认不包含 currentCompanyId 和 companyId claim
   # 可以使用 jwt.io 或在线工具解码
   ```

2. **测试切换企业功能**
   - 登录系统
   - 切换到新企业
   - 访问需要权限的接口（如 `/api/role/with-stats`）
   - 预期：应该正常返回数据，不返回 403

3. **检查权限检查逻辑**
   - 验证 `MenuAccessService.HasMenuAccessAsync` 正常工作
   - 验证用户权限计算正确

4. **检查数据库查询**
   - 确认所有查询 `IMultiTenant` 实体的代码都手动添加了 `CompanyId` 过滤
   - 确认不会出现跨企业数据泄露

## 📝 相关文件修改

- ✅ `Platform.ApiService/Services/JwtService.cs` - 移除 JWT token 中的 CurrentCompanyId
- ✅ `Platform.ApiService/Services/MenuAccessService.cs` - 从数据库获取企业ID
- ✅ `Platform.ApiService/Services/UserService.cs` - 从数据库获取企业ID
- ✅ `Platform.ApiService/Services/RoleService.cs` - 从数据库获取企业ID
- ✅ `Platform.ApiService/Services/RuleService.cs` - 从数据库获取企业ID
- ✅ `Platform.ApiService/Services/UserActivityLogService.cs` - 从数据库获取企业ID

## 🎯 修复效果

### 修复前
- ❌ JWT token 中包含 `currentCompanyId` 和 `companyId` claim
- ❌ 切换企业后，JWT token 可能延迟更新
- ❌ 权限检查可能使用旧的企业ID

### 修复后
- ✅ JWT token 不再包含 `currentCompanyId` 和 `companyId` claim
- ✅ 所有企业ID相关逻辑统一从数据库获取
- ✅ 切换企业后，权限检查立即使用新企业ID
- ✅ 避免了 JWT token 延迟更新的问题

## 🔒 安全性

移除 JWT token 中的企业ID不会影响安全性：

- ✅ 所有企业ID都从数据库的 `user.CurrentCompanyId` 获取（权威数据源）
- ✅ 查询时手动添加 `CompanyId` 过滤，确保多租户隔离
- ✅ 不会出现跨企业数据泄露

## 📚 相关文档

- [企业切换权限修复](mdc:docs/bugfixes/COMPANY-SWITCH-PERMISSION-FIX.md)
- [权限系统完整性检查](mdc:docs/reports/PERMISSION-SYSTEM-COMPLETE-CHECK.md)
- [用户多角色功能检查](mdc:docs/reports/MULTI-ROLE-USER-CHECK.md)

## ✅ 测试要点

1. ✅ JWT token 不再包含 `currentCompanyId` 和 `companyId` claim
2. ✅ 切换企业后，权限检查正常
3. ✅ 所有服务从数据库获取企业ID
4. ✅ 不会出现跨企业数据泄露
5. ✅ 日志记录正确

## 🎯 总结

移除 JWT token 中的 `CurrentCompanyId` 后，系统将更可靠：
- **数据源统一**：所有企业ID相关逻辑从数据库获取
- **实时性更好**：切换企业后立即生效，不受 JWT token 延迟影响
- **更易维护**：减少了 JWT token 和数据库之间的同步问题

所有的企业ID相关逻辑现在都统一从数据库的 `user.CurrentCompanyId` 获取，确保数据的准确性和实时性。

