# 权限系统使用指南

## 📋 概述

Aspire Admin Platform 采用基于角色的访问控制（RBAC）权限系统，提供细粒度的权限管理和控制。

## 🏗️ 权限系统架构

### 核心组件

- **Permission（权限）** - 定义具体的操作权限，如 `user:read`、`role:create`
- **Role（角色）** - 权限的集合，企业级别的权限分组
- **Menu（菜单）** - 系统菜单，关联相应的权限要求
- **User（用户）** - 通过角色获得权限，支持自定义权限分配

### 权限层级

```
用户（User）
  ├── 角色权限（Role Permissions）
  └── 自定义权限（Custom Permissions）

角色（Role）
  └── 权限列表（Permission IDs）

权限（Permission）
  ├── 资源名称（Resource Name）
  ├── 操作类型（Action）
  └── 权限代码（Code）
```

## 🔧 权限代码格式

权限代码采用 `resource:action` 的格式：

```
{resource}:{action}
```

### 资源类型（Resource）

| 资源 | 描述 | 示例 |
|------|------|------|
| `user` | 用户管理 | `user:read`、`user:create` |
| `role` | 角色管理 | `role:read`、`role:assign` |
| `menu` | 菜单管理 | `menu:read`、`menu:update` |
| `permission` | 权限管理 | `permission:read`、`permission:delete` |
| `notice` | 通知管理 | `notice:read`、`notice:create` |
| `tag` | 标签管理 | `tag:read`、`tag:update` |
| `activity-log` | 活动日志 | `activity-log:read` |
| `company` | 企业设置 | `company:read`、`company:update` |
| `system` | 系统管理 | `system:admin` |

### 操作类型（Action）

| 操作 | 描述 | 示例 |
|------|------|------|
| `read` | 查看/读取 | `user:read`、`role:read` |
| `create` | 创建 | `user:create`、`notice:create` |
| `update` | 编辑/更新 | `user:update`、`menu:update` |
| `delete` | 删除 | `user:delete`、`permission:delete` |
| `assign` | 分配 | `role:assign`（为角色分配权限） |
| `admin` | 管理员操作 | `system:admin`（系统管理员权限） |

## 🎯 使用权限系统

### 1. API 端权限控制

#### 控制器权限装饰器

```csharp
// ✅ 推荐：使用 RequirePermission 特性
[HttpGet]
[RequirePermission("user", "read")]
public async Task<IActionResult> GetUsers()
{
    var users = await _userService.GetAllUsersAsync();
    return Success(users);
}

// ✅ 推荐：条件权限检查
[HttpPost("bulk")]
[Authorize]
public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request)
{
    // 根据操作类型检查不同权限
    if (request.Action == "delete")
        await RequirePermissionAsync("user", "delete");
    else
        await RequirePermissionAsync("user", "update");

    // 业务逻辑...
}
```

#### BaseApiController 提供的权限方法

```csharp
// 检查权限（返回布尔值）
bool hasPermission = await HasPermissionAsync("user", "read");

// 要求权限（无权限抛异常）
await RequirePermissionAsync("user", "create");

// 检查任意权限
bool hasAny = await HasAnyPermissionAsync("user:read", "user:update");

// 检查所有权限
bool hasAll = await HasAllPermissionsAsync("user:read", "user:update");
```

### 2. 前端权限控制

#### PermissionGuard 组件

```tsx
// ✅ 推荐：使用 PermissionGuard 组件
import { PermissionGuard } from '@/components/PermissionGuard';

export default function UserManagement() {
  return (
    <PermissionGuard
      permission="user:read"
      fallback={<AccessDenied />}
    >
      <UserList />
    </PermissionGuard>
  );
}

// 多权限检查
<PermissionGuard
  resource="user"
  action="create"
  fallback={<Button disabled>无权限</Button>}
>
  <CreateUserButton />
</PermissionGuard>
```

#### useAuthState 钩子

```tsx
// ✅ 推荐：使用 useAuthState 钩子
import { useAuthState } from '@/hooks/useAuthState';

export default function MyComponent() {
  const { hasPermission, can, isAdmin } = useAuthState();

  // 检查具体权限
  if (hasPermission('user:delete')) {
    // 显示删除按钮
  }

  // 检查资源权限
  if (can('user', 'create')) {
    // 显示创建按钮
  }

  // 检查管理员权限
  if (isAdmin()) {
    // 显示管理员功能
  }
}
```

### 3. 权限管理界面

访问：系统管理 → 权限管理

#### 功能特性

- **权限列表** - 查看所有系统权限
- **权限创建** - 创建新的权限
- **权限编辑** - 修改权限信息
- **权限删除** - 删除权限（需谨慎操作）

#### 创建权限

1. 点击「新建权限」按钮
2. 填写权限信息：
   - 资源名称：如 `user`、`role`、`menu`
   - 资源标题：如「用户管理」、「角色管理」
   - 操作：如 `read`、`create`、`update`、`delete`
   - 操作标题：如「查看」、「创建」、「编辑」、「删除」
   - 描述：权限的详细说明（可选）

#### 编辑权限

1. 在权限列表中点击「编辑」按钮
2. 修改权限信息
3. 点击「确定」保存

#### 删除权限

1. 在权限列表中点击「删除」按钮
2. 确认删除操作
3. 删除后，与该权限关联的角色权限将被移除

## 🔐 权限检查流程

### 1. 用户权限获取

用户权限通过以下方式获取：

1. **角色权限** - 用户所属角色的所有权限
2. **自定义权限** - 直接分配给用户的权限
3. **合并去重** - 合并所有权限代码，形成最终权限列表

### 2. 权限验证流程

```
用户请求 → 检查认证 → 获取用户权限列表 → 检查目标权限 → 允许/拒绝
```

### 3. 菜单权限控制

菜单显示通过以下机制控制：

1. **菜单权限要求** - 菜单定义了所需的权限代码
2. **用户权限检查** - 用户必须拥有菜单要求的权限才能看到菜单
3. **动态菜单渲染** - 前端根据用户权限动态渲染菜单

## 🎯 最佳实践

### 1. API 端最佳实践

```csharp
// ✅ 推荐：清晰的权限要求
[HttpGet]
[RequirePermission("user", "read")]
public async Task<IActionResult> GetUsers()

// ✅ 推荐：参数验证在前，权限检查在后
[HttpPost]
public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
{
    // 先验证参数，再检查权限
    request.Username.EnsureNotEmpty("用户名");
    await RequirePermissionAsync("user", "create");

    // 业务逻辑...
}

// ✅ 推荐：使用统一的错误消息
throw new KeyNotFoundException(ErrorMessages.ResourceNotFound, "用户");
```

### 2. 前端最佳实践

```tsx
// ✅ 推荐：组件级权限控制
<PermissionGuard permission="user:read">
  <UserList />
</PermissionGuard>

// ✅ 推荐：按钮级权限控制
<PermissionGuard permission="user:create" fallback={<Button disabled>无权限</Button>}>
  <CreateUserButton />
</PermissionGuard>

// ✅ 推荐：条件渲染
{can('user', 'delete') && <DeleteButton />}
```

### 3. 权限设计最佳实践

1. **权限粒度适中** - 不要过于细粒度或粗粒度
2. **权限代码一致** - 使用统一的命名规范
3. **权限描述清晰** - 便于管理员理解
4. **权限继承合理** - 避免权限冲突和冗余

## 🚫 常见错误

### ❌ 错误 1: 硬编码权限检查

```csharp
// ❌ 错误：硬编码角色检查
if (User.IsInRole("admin"))
{
    // 管理员操作
}

// ✅ 正确：使用权限检查
if (await HasPermissionAsync("system", "admin"))
{
    // 管理员操作
}
```

### ❌ 错误 2: 忽略权限验证

```csharp
// ❌ 错误：敏感操作无权限检查
[HttpPost]
[Authorize]
public async Task<IActionResult> DeleteUser(string id)
{
    // 缺少权限检查！
}

// ✅ 正确：添加权限检查
[HttpPost]
[RequirePermission("user", "delete")]
public async Task<IActionResult> DeleteUser(string id)
{
    // 权限已验证
}
```

### ❌ 错误 3: 前端权限检查不一致

```tsx
// ❌ 错误：多个权限检查方式
const { hasPermission } = usePermission();  // 旧的方式
const { can } = useAuthState();           // 新的方式

// ✅ 正确：统一使用一种方式
const { hasPermission } = useAuthState();
```

## 🔍 权限调试

### 查看用户权限

1. 在浏览器开发者工具中查看用户信息
2. 检查 `currentUser.permissions` 数组
3. 验证权限代码格式是否正确

### 调试权限检查

```typescript
// 在组件中调试权限
const { hasPermission, can } = useAuthState();

console.log('User permissions:', currentUser?.permissions);
console.log('Has user:read:', hasPermission('user:read'));
console.log('Can user create:', can('user', 'create'));
```

### 检查菜单权限

1. 查看菜单数据结构
2. 检查菜单的 `permissions` 字段
3. 验证用户是否拥有菜单要求的权限

## 📚 相关文档

- [权限系统架构设计](mdc:docs/features/PERMISSION-SYSTEM-ARCHITECTURE.md)
- [菜单权限控制机制](mdc:docs/features/MENU-PERMISSION-CONTROL.md)
- [API 权限装饰器使用](mdc:docs/permissions/API-PERMISSION-DECORATOR.md)
- [前端权限守卫组件](mdc:docs/permissions/FRONTEND-PERMISSION-GUARD.md)

## 🔧 故障排除

### 常见问题

#### 1. 新注册用户看不到创建角色的按钮

**问题现象：**
- 新注册用户登录后看不到"新增角色"按钮
- 无法创建新角色

**可能原因：**
- 管理员角色缺少 `role:create` 权限
- 前端权限数据缓存问题
- 权限数据未正确同步

**解决方案：**

**方法 1: 自动修复（推荐）**
```bash
# 运行修复脚本
node fix-admin-permissions.js
```
此脚本会为所有管理员角色补充缺失的权限。

**方法 2: 前端手动刷新**
1. 点击右上角头像
2. 选择"刷新权限"
3. 等待权限重新加载

**方法 3: 清除浏览器缓存**
1. 按 `Ctrl+Shift+R` (Windows/Linux) 或 `Cmd+Shift+R` (Mac) 强制刷新
2. 清除浏览器缓存和 Cookie

**方法 4: 检查权限数据**
```bash
# 运行诊断脚本检查权限状态
node diagnose-user-permissions.js
```

#### 2. 权限修改后不生效

**问题现象：**
- 修改了用户权限后，前端仍显示旧的权限状态

**解决方案：**
1. 点击头像下拉菜单中的"刷新权限"
2. 或按 `Ctrl+F5` 强制刷新页面
3. 检查浏览器开发者工具控制台的权限日志

#### 3. 某些功能按钮不显示

**问题现象：**
- 缺少特定功能的按钮（如"新增用户"、"编辑角色"等）

**检查步骤：**
1. 确认用户拥有相应的权限（如 `user:create`、`role:update`）
2. 检查前端控制台是否有权限错误
3. 运行诊断脚本来检查权限分配

### 🔍 调试技巧

#### 检查当前用户权限
在浏览器开发者工具中运行：
```javascript
// 查看当前用户权限
console.log(window.g_app._store.getState()?.initialState?.currentUser?.permissions);

// 检查特定权限
const permissions = window.g_app._store.getState()?.initialState?.currentUser?.permissions || [];
console.log('Has role:create:', permissions.includes('role:create'));
console.log('Has user:read:', permissions.includes('user:read'));
```

#### 查看权限加载日志
打开浏览器开发者工具，查看控制台输出：
```
🔑 用户权限更新: ["user:read", "role:create", "menu:read", ...]
```

#### 强制刷新权限数据
```javascript
// 在控制台中执行
window.location.reload();
```

## 🎯 核心原则

1. **统一性** - 前后端使用统一的权限检查机制
2. **安全性** - 所有敏感操作都必须进行权限验证
3. **可维护性** - 权限代码规范化，便于管理和维护
4. **用户友好** - 权限不足时提供清晰的反馈
5. **性能优化** - 权限检查不应影响系统性能
6. **实时同步** - 权限变更后及时同步到前端

遵循这些指南，权限系统将更加安全、可靠和易于维护！
