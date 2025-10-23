# 新用户菜单权限修复

## 📋 问题描述

新注册的用户登录成功后访问 `/api/user/statistics` 返回 403 Forbidden 错误。

**错误信息**：
```
请求 URL: http://localhost:15001/api/user/statistics
请求方法: GET
状态代码: 403 Forbidden
```

## 🔍 问题分析

### 根本原因

`MenuAccessService.GetUserMenuNamesAsync()` 方法在获取用户菜单权限时，依赖于 `GetCurrentCompanyId()` 来获取当前企业ID，但在权限检查时，这个上下文可能不可用，导致无法正确获取用户的菜单权限。

### 问题代码

```csharp
// ❌ 问题代码
var companyId = GetCurrentCompanyId();
if (!string.IsNullOrEmpty(companyId))
{
    // 权限检查逻辑
}
```

**问题**：
- `GetCurrentCompanyId()` 依赖于 HTTP 上下文
- 在权限检查时，上下文可能不可用
- 导致新用户无法获取正确的菜单权限

## ✅ 解决方案

### 1. 修复 MenuAccessService

修改 `GetUserMenuNamesAsync()` 方法，优先从用户信息中获取企业ID：

```csharp
// ✅ 修复后的代码
// 获取用户的企业ID（优先从用户信息获取，其次从当前上下文获取）
var companyId = user.CurrentCompanyId ?? GetCurrentCompanyId();
if (string.IsNullOrEmpty(companyId))
{
    _logger.LogWarning("用户 {UserId} 没有关联的企业ID", userId);
    return new List<string>();
}
```

### 2. 添加调试接口

创建 `DebugController` 用于排查权限问题：

```csharp
[HttpGet("user-permissions/{userId}")]
public async Task<IActionResult> CheckUserPermissions(string userId)
{
    // 检查用户权限状态的详细信息
}
```

## 🔧 修复内容

### 文件修改

1. **Platform.ApiService/Services/MenuAccessService.cs**
   - 修改 `GetUserMenuNamesAsync()` 方法
   - 优先使用 `user.CurrentCompanyId` 获取企业ID
   - 添加警告日志

2. **Platform.ApiService/Controllers/DebugController.cs**
   - 新增调试控制器
   - 提供用户权限状态检查接口
   - 提供全局菜单状态检查接口

## 🧪 测试验证

### 1. 测试新用户注册

```bash
# 1. 注册新用户
curl -X POST http://localhost:15000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }'

# 2. 登录获取 token
curl -X POST http://localhost:15000/api/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "captcha": "1234"
  }'

# 3. 测试统计接口
curl -H "Authorization: Bearer {token}" \
  http://localhost:15000/api/user/statistics
```

### 2. 调试权限状态

```bash
# 检查用户权限状态
curl -H "Authorization: Bearer {token}" \
  http://localhost:15000/api/debug/user-permissions/{userId}

# 检查全局菜单状态
curl -H "Authorization: Bearer {token}" \
  http://localhost:15000/api/debug/global-menus
```

## 📊 预期结果

修复后，新注册用户应该能够：

1. ✅ 成功访问 `/api/user/statistics` 接口
2. ✅ 获得正确的菜单权限
3. ✅ 在前端看到完整的菜单结构

## 🔍 调试信息

### 权限检查流程

1. **用户注册** → 创建个人企业 → 创建管理员角色 → 分配所有菜单ID
2. **权限检查** → 获取用户企业ID → 查找用户-企业关联 → 获取角色菜单ID → 检查菜单名称

### 关键日志

```
用户 {UserId} 没有关联的企业ID  // 如果企业ID为空
获取 {Count} 个全局菜单          // 菜单初始化
创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单  // 角色创建
```

## 📚 相关文档

- [菜单级权限控制指南](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md)
- [用户注册流程规范](.cursor/rules/user-registration-flow.mdc)
- [全局菜单架构](.cursor/rules/global-menu-architecture.mdc)

## 🎯 总结

这个修复解决了新注册用户无法访问需要菜单权限的API接口的问题。通过优先使用用户信息中的企业ID，确保权限检查能够正确工作，让新用户能够获得完整的管理员权限。
