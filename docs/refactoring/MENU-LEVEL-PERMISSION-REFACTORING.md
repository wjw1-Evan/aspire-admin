# 菜单级权限系统重构

## 📋 概述

将原有的CRUD级权限系统简化为菜单级权限控制，移除复杂的Permission实体和操作权限管理功能，实现更简洁的权限架构。

## 🎯 重构目标

### 简化前
- **权限粒度**: 资源级 + 操作级（如 `user:create`, `user:read`, `user:update`, `user:delete`）
- **权限模型**: Permission实体 + Role.PermissionIds + User.CustomPermissionIds
- **前端控制**: 基于操作权限显示/隐藏按钮
- **后端验证**: 使用 `[RequirePermission(resource, action)]` 特性

### 简化后
- **权限粒度**: 菜单级（如 `user-management`, `role-management`）
- **权限模型**: Role.MenuIds（移除Permission实体）
- **前端控制**: 所有用户看到相同按钮，权限由后端API控制
- **后端验证**: 使用 `[RequireMenu(menuName)]` 特性

## 🏗️ 架构变更

### 数据模型变更

#### Menu模型
```csharp
// 移除
[BsonElement("permissions")]
public List<string> Permissions { get; set; } = new();
```

#### Role模型
```csharp
// 移除
[BsonElement("permissionIds")]
public List<string> PermissionIds { get; set; } = new();

// 统计字段
public int PermissionCount { get; set; }
```

#### AppUser模型
```csharp
// 移除
[BsonElement("customPermissionIds")]
public List<string> CustomPermissionIds { get; set; } = new();
```

#### CurrentUser模型
```csharp
// 移除
[BsonElement("permissions")]
public List<string> Permissions { get; set; } = new();
```

### 新增服务

#### MenuAccessService
```csharp
public interface IMenuAccessService
{
    Task<bool> HasMenuAccessAsync(string userId, string menuName);
    Task<List<string>> GetUserMenuNamesAsync(string userId);
    Task<bool> HasAnyMenuAccessAsync(string userId, params string[] menuNames);
}
```

#### RequireMenuAttribute
```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireMenuAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string MenuName { get; }
    // 检查用户是否有访问该菜单的权限
}
```

## 🗑️ 删除的文件

### 后端文件
- `Models/PermissionModels.cs`
- `Controllers/PermissionController.cs`
- `Controllers/DiagnosticController.cs`
- `Controllers/FixController.cs`
- `Services/PermissionService.cs`
- `Services/IPermissionService.cs`
- `Services/PermissionCheckService.cs`
- `Services/IPermissionCheckService.cs`
- `Attributes/RequirePermissionAttribute.cs`
- `Constants/PermissionResources.cs`
- `Constants/PermissionActions.cs`

### 前端文件
- `src/pages/permission-management/` (整个目录)
- `src/pages/role-management/components/PermissionConfigModal.tsx`
- `src/pages/user-management/components/UserPermissionModal.tsx`
- `src/services/permission/` (整个目录)
- `src/components/PermissionGuard/` (整个目录)
- `src/components/PermissionControl/` (整个目录)

### 辅助脚本
- `diagnose-permission-data.js`
- `diagnose-permissions.js`
- `diagnose-user-permissions.js`
- `fix-admin-permissions.js`
- `fix-user-permissions.js`
- `simple-diagnose-permissions.js`
- `test-role-permission-fix.sh`

## 🔄 修改的文件

### 后端核心文件

1. **BaseApiController.cs**
   - 移除: `HasPermissionAsync`, `RequirePermissionAsync`, `HasAnyPermissionAsync`, `HasAllPermissionsAsync`
   - 新增: `HasMenuAccessAsync`, `RequireMenuAccessAsync`, `HasAnyMenuAccessAsync`

2. **Program.cs**
   - 移除: `IPermissionService`, `IPermissionCheckService` 服务注册
   - 新增: `IMenuAccessService` 服务注册

3. **AuthService.cs**
   - 移除: `IPermissionService` 依赖
   - 移除: Permission创建逻辑
   - 简化: `GetCurrentUserAsync` 不再返回权限列表

4. **CompanyService.cs**
   - 移除: `IPermissionService` 依赖
   - 移除: Permission创建逻辑
   - 移除: `CompanyStatistics.TotalPermissions` 字段

5. **RoleService.cs**
   - 移除: `_permissions` 集合引用
   - 移除: `GetRolePermissionsAsync`, `AssignPermissionsToRoleAsync` 方法
   - 移除: 统计信息中的 `PermissionCount`

6. **UserService.cs**
   - 移除: `_permissions` 集合引用
   - 移除: `GetUserCustomPermissionsAsync`, `AssignCustomPermissionsAsync`, `GetUserAllPermissionsAsync` 方法

7. **DatabaseInitializerService.cs**
   - 移除: `CreateSystemPermissionsAsync` 方法
   - 移除: `FixRoleMenuIdsAsync` 方法
   - 移除: `FixAdminRolePermissionsAsync` 方法
   - 移除: 菜单创建中的 `Permissions` 字段
   - 移除: permission-management菜单项

8. **Controller更新**
   - `UserController.cs`: `[RequirePermission]` → `[RequireMenu("user-management")]`
   - `RoleController.cs`: `[RequirePermission]` → `[RequireMenu("role-management")]`
   - `TagController.cs`: `[RequirePermission]` → `[RequireMenu("tag")]`
   - `NoticeController.cs`: `[RequirePermission]` → `[RequireMenu("notice")]`

### 前端核心文件

1. **types定义**
   - `services/ant-design-pro/typings.d.ts`: 移除 `permissions` 字段，移除 `MenuTreeNode.permissions`
   - `services/role/types.ts`: 移除 `permissionCount` 字段
   - `services/menu/types.ts`: 移除 `permissions` 字段

2. **access.ts**
   - 移除: `hasPermission`, `can` 函数
   - 移除: 所有CRUD权限检查函数 (`canCreateUser`, `canReadUser` 等)
   - 保留: `hasRole`, `canAdmin`, `canAccessMenu`, `canAccessPath`

3. **pages/role-management/index.tsx**
   - 移除: PermissionConfigModal导入和使用
   - 移除: "操作权限"菜单项
   - 移除: PermissionControl包装
   - 移除: permissionCount显示

4. **pages/user-management/index.tsx**
   - 移除: UserPermissionModal导入和使用
   - 移除: "配置权限"菜单项
   - 移除: PermissionControl包装

5. **locales/zh-CN/menu.ts**
   - 移除: 权限相关翻译

## ✅ 权限控制逻辑

### 前端
- **菜单显示**: 基于 `Role.MenuIds` 控制，用户只能看到分配的菜单
- **路由访问**: 通过 `access.canAccessPath` 拦截未授权的路由访问
- **按钮显示**: 所有用户看到相同按钮（不做前端权限控制）

### 后端
- **API权限**: 基于用户可访问的菜单判断
- **权限特性**: 使用 `[RequireMenu("menu-name")]` 替代 `[RequirePermission]`
- **菜单映射**: 

| 菜单名称 | API路径 | 说明 |
|---------|---------|------|
| user-management | /api/user/management/* | 用户管理相关API |
| role-management | /api/role/* | 角色管理相关API |
| user-log | /api/users/activity-logs | 活动日志API |
| tag | /api/tag/* | 标签管理API |
| notice | /api/notices/* (创建) | 通知创建API |

## 📊 迁移指南

### 数据库清理

重构后需要手动删除数据库，系统将重新初始化：

```bash
# MongoDB 清理命令
mongo aspire-admin
> db.dropDatabase()
> exit
```

### 功能迁移对照表

| 原功能 | 新功能 | 说明 |
|--------|--------|------|
| 权限管理页面 | （已删除） | 不再需要管理操作权限 |
| 角色的操作权限配置 | （已删除） | 只配置菜单权限 |
| 用户的自定义权限 | （已删除） | 只通过角色分配菜单 |
| `[RequirePermission]` | `[RequireMenu]` | 检查菜单访问权限 |
| `HasPermissionAsync` | `HasMenuAccessAsync` | 检查菜单访问 |
| `currentUser.permissions` | （已删除） | 不再返回权限列表 |

## 🔧 开发指南

### 新增菜单权限控制

```csharp
// 1. 在 DatabaseInitializerService 中添加菜单定义
new Models.Menu
{
    Name = "new-feature",
    Title = "新功能",
    Path = "/system/new-feature",
    Component = "./new-feature",
    Icon = "icon-name",
    ParentId = systemMenu.Id,
    SortOrder = 6,
    IsEnabled = true,
    CreatedAt = now,
    UpdatedAt = now
}

// 2. 在Controller中使用菜单权限
[HttpGet]
[RequireMenu("new-feature")]
public async Task<IActionResult> GetData()
{
    // 只有能访问"new-feature"菜单的用户才能调用
}

// 3. 在前端routes.ts中添加路由映射
{
    path: '/system/new-feature',
    component: './new-feature',
    hideInMenu: true,
}
```

### 角色配置流程

1. 创建角色（名称、描述）
2. 分配菜单权限（选择可访问的菜单）
3. 将角色分配给用户

## ⚠️ 注意事项

1. **数据库必须重新初始化**: 删除旧数据库，让系统创建全新的数据结构
2. **菜单是全局资源**: 所有企业共享相同的系统菜单
3. **按钮全部显示**: 前端不再根据权限显示/隐藏按钮，由后端API返回错误
4. **API层面控制**: 所有权限验证在API层面通过 `[RequireMenu]` 实现

## 📚 相关文档

- [Menu模型](mdc:Platform.ApiService/Models/MenuModels.cs)
- [Role模型](mdc:Platform.ApiService/Models/RoleModels.cs)
- [MenuAccessService](mdc:Platform.ApiService/Services/MenuAccessService.cs)
- [RequireMenuAttribute](mdc:Platform.ApiService/Attributes/RequireMenuAttribute.cs)
- [DatabaseInitializerService](mdc:Platform.ApiService/Services/DatabaseInitializerService.cs)

## 🎯 核心原则

1. **简化优于复杂**: 菜单级权限足够满足大多数场景
2. **后端为主**: 权限验证主要在后端API层面进行
3. **用户体验**: 前端不隐藏按钮，避免用户困惑
4. **安全为先**: API层面的权限验证确保安全性

---

重构完成日期: 2025-10-14  
重构版本: v6.0  
重构类型: 架构简化

