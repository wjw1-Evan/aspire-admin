# 用户日志 403 错误修复

> ⚠️ **版本说明**: 本文档描述 v5.0 版本的修复，使用的是已废弃的 CRUD 权限系统。  
> v6.0 版本已改为菜单级权限系统，参考 [菜单级权限使用指南](../features/MENU-LEVEL-PERMISSION-GUIDE.md)。

## 🐛 问题描述

**症状**：
- 使用管理员账户访问"用户日志"页面
- 接口返回 403 Forbidden
- 无法查看活动日志

## 🔍 根本原因

### 问题 1: 使用了过时的角色授权方式

**原始代码**：
```csharp
[HttpGet("/api/users/activity-logs")]
[Authorize(Roles = "admin")]  // ❌ 基于 role claim 的授权
public async Task<IActionResult> GetAllActivityLogs(...)
```

**问题**：
- v2.0 版本已经移除了 `AppUser.Role` 字段
- JWT Token 中不再包含 `role` claim
- `[Authorize(Roles = "admin")]` 检查会失败

### 问题 2: 缺少权限检查

原始代码没有调用权限检查，导致即使管理员有相应权限也无法访问。

## ✅ 解决方案

### 修改授权方式

**修改文件**: `Platform.ApiService/Controllers/UserController.cs`

**修复前**：
```csharp
[HttpGet("/api/users/activity-logs")]
[Authorize(Roles = "admin")]  // ❌ 基于角色字符串
public async Task<IActionResult> GetAllActivityLogs(...)
{
    // 直接查询，无权限检查
    var (logs, total, userMap) = await _userService.GetAllActivityLogsWithUsersAsync(...);
}
```

**修复后**：
```csharp
[HttpGet("/api/users/activity-logs")]
[Authorize]  // ✅ 只需要登录
public async Task<IActionResult> GetAllActivityLogs(...)
{
    // ✅ 使用权限系统检查
    await RequirePermissionAsync("activity-log", "read");
    
    var (logs, total, userMap) = await _userService.GetAllActivityLogsWithUsersAsync(...);
}
```

## 📊 权限系统说明

### 权限代码

根据 `InitializePermissions.cs` 中的定义：

```csharp
var resources = new[]
{
    ("user", "用户"),
    ("role", "角色"),
    ("menu", "菜单"),
    ("notice", "公告"),
    ("tag", "标签"),
    ("permission", "权限"),
    ("activity-log", "活动日志")  // ← 活动日志权限
};
```

**生成的权限**：
- `activity-log:create` - 创建活动日志
- `activity-log:read` - 查看活动日志 ✅ 需要此权限
- `activity-log:update` - 修改活动日志
- `activity-log:delete` - 删除活动日志

### 超级管理员权限

根据 `InitializePermissions.cs`：

```csharp
private async Task AssignAllPermissionsToSuperAdminAsync()
{
    // 查找 super-admin 角色
    var superAdmin = await roles.Find(r => r.Name == "super-admin" && !r.IsDeleted)
        .FirstOrDefaultAsync();
    
    // 分配所有权限
    var allPermissionIds = await permissions.Find(p => !p.IsDeleted)
        .Project(p => p.Id)
        .ToListAsync();
    
    await roles.UpdateOneAsync(
        r => r.Id == superAdmin.Id,
        Builders<Role>.Update.Set(r => r.PermissionIds, allPermissionIds)
    );
}
```

**说明**：
- `super-admin` 角色会自动获得**所有权限**
- 包括 `activity-log:read` 权限
- 应用启动时自动初始化

## 🧪 验证步骤

### 1. 检查管理员角色

在 MongoDB 中查看：

```javascript
// 查看 super-admin 角色的权限
db.roles.findOne({ name: "super-admin" })

// 应该有 permissionIds 数组，包含所有权限 ID

// 查看 activity-log 权限
db.permissions.find({ resourceName: "activity-log" }).pretty()

// 应该看到 4 个权限：create, read, update, delete
```

### 2. 检查 admin 用户的角色

```javascript
// 查看 admin 用户
db.users.findOne({ username: "admin" })

// 应该有 roleIds，包含 super-admin 角色的 ID
```

### 3. 测试 API

```bash
# 登录获取 token
curl -X POST "http://localhost:15000/api/login/account" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","autoLogin":true}'

# 复制 token

# 测试用户日志 API
curl -X GET "http://localhost:15000/api/users/activity-logs?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 应该返回 200 和日志数据，而不是 403
```

### 4. 前端测试

1. **刷新浏览器** http://localhost:15001
2. **重新登录** (admin / admin123)
3. **访问用户日志页面** - 应该正常显示数据

## 🔧 相关的授权方式对比

### ❌ 不推荐：基于角色字符串

```csharp
[Authorize(Roles = "admin")]  // v2.0 已废弃
```

**问题**：
- 依赖 JWT 中的 `role` claim（已移除）
- 不够灵活，无法细粒度控制
- 与新的权限系统不兼容

### ✅ 推荐：基于权限检查

```csharp
[Authorize]
public async Task<IActionResult> SomeAction()
{
    await RequirePermissionAsync("resource", "action");
    // ...
}
```

**优势**：
- 使用权限系统检查
- 细粒度控制（CRUD 级别）
- 灵活的权限分配
- 支持角色权限 + 用户自定义权限

### ✅ 可选：只验证登录

```csharp
[Authorize]  // 只需要登录，不检查权限
public async Task<IActionResult> SomeAction()
{
    // 所有登录用户都可访问
}
```

## 📝 全局检查

让我们检查是否还有其他控制器使用了 `[Authorize(Roles = ...)]`：

```bash
# 搜索所有使用角色授权的地方
grep -r "Authorize(Roles" Platform.ApiService/Controllers/

# 应该全部替换为权限检查
```

## ✅ 修复清单

- ✅ 移除 `[Authorize(Roles = "admin")]`
- ✅ 添加 `await RequirePermissionAsync("activity-log", "read")`
- ✅ 使用正确的权限代码（activity-log 而不是 user-log）
- ✅ 编译通过
- ✅ 重启应用

## 🎯 下一步

应用重启后，请：

1. **刷新浏览器**
2. **重新登录** (可能需要，因为 token 结构有变化)
3. **访问用户日志页面**
4. **验证数据正常显示**

如果还有 403 错误，请检查：
1. 浏览器控制台的具体错误信息
2. 是否需要重新登录获取新 token
3. 数据库中 admin 用户的角色和权限

## 📚 相关文档

- [权限系统文档](../permissions/CRUD-PERMISSION-SYSTEM.md)
- [BaseApiController 规范](../features/BASEAPICONTROLLER-STANDARDIZATION.md)
- [v2.0 更新总结](../features/v2.0-UPDATES-SUMMARY.md)

## 🎉 总结

这个问题是 v2.0 版本迁移的遗留问题：

- **旧方式**: `[Authorize(Roles = "admin")]` - 基于 role claim
- **新方式**: `await RequirePermissionAsync("resource", "action")` - 基于权限系统

现在所有接口都应该使用新的权限系统，避免类似问题！

