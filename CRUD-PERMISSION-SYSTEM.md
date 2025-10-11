# CRUD 级别权限系统实现总结

## 📋 实现概述

本系统实现了一个完整的 CRUD 级别权限控制系统，支持混合模式（角色权限 + 用户自定义权限），精确控制到每个资源的增删查改操作。

## ✅ 已完成功能

### 后端部分（Platform.ApiService）

#### 1. 数据模型
- **Permission 模型** (`Models/PermissionModels.cs`)
  - 权限实体：资源名、操作类型、权限代码等
  - 权限代码格式：`{resource}:{action}`（如 `user:create`）
  
- **扩展 Role 模型**
  - 添加 `PermissionIds` 字段用于存储角色权限
  
- **扩展 AppUser 模型**
  - 添加 `CustomPermissionIds` 字段用于存储用户自定义权限

#### 2. 服务层
- **PermissionService** (`Services/PermissionService.cs`)
  - 权限 CRUD 操作
  - 按资源分组查询
  - 初始化默认权限（7个资源 × 4个操作 = 28个权限）
  
- **PermissionCheckService** (`Services/PermissionCheckService.cs`)
  - 检查用户是否有指定权限
  - 合并角色权限和自定义权限
  - 支持多权限验证

- **扩展 RoleService**
  - 为角色分配权限
  - 获取角色权限列表
  
- **扩展 UserService**
  - 为用户分配自定义权限
  - 获取用户所有权限

#### 3. 权限验证
- **RequirePermissionAttribute** (`Attributes/RequirePermissionAttribute.cs`)
  - 控制器方法级别的权限验证
  - 超级管理员自动拥有所有权限
  - 权限不足返回 403 Forbidden

- **扩展 BaseApiController**
  - `HasPermissionAsync()` - 检查权限
  - `RequirePermissionAsync()` - 要求权限（无权限抛异常）
  - `HasAnyPermissionAsync()` - 检查任意权限
  - `HasAllPermissionsAsync()` - 检查所有权限

#### 4. API 端点

**PermissionController** (`/api/permission`)
- `GET /api/permission` - 获取所有权限
- `GET /api/permission/grouped` - 按资源分组获取
- `GET /api/permission/{id}` - 获取单个权限
- `GET /api/permission/by-resource/{resource}` - 按资源获取
- `POST /api/permission` - 创建权限
- `PUT /api/permission/{id}` - 更新权限
- `DELETE /api/permission/{id}` - 删除权限
- `POST /api/permission/initialize` - 初始化默认权限

**扩展 RoleController**
- `GET /api/role/{id}/permissions` - 获取角色权限
- `POST /api/role/{id}/permissions` - 分配权限到角色

**扩展 UserController**
- `GET /api/user/{id}/permissions` - 获取用户权限
- `POST /api/user/{id}/custom-permissions` - 分配自定义权限
- `GET /api/user/my-permissions` - 获取当前用户权限

**已添加权限验证的控制器**
- MenuController - 菜单管理（`menu:create/read/update/delete`）
- NoticeController - 公告管理（`notice:create/read/update/delete`）
- TagController - 标签管理（`tag:create/read/update/delete`）

#### 5. 初始化脚本
- **InitializePermissions.cs** (`Scripts/InitializePermissions.cs`)
  - 系统启动时自动初始化28个默认权限
  - 为超级管理员分配所有权限

### 前端部分（Platform.Admin）

#### 1. 类型定义
- `permission/types.ts` - Permission、PermissionGroup、UserPermissionsResponse 等类型

#### 2. 服务层
- `permission/index.ts` - 完整的权限管理 API 服务
  - 权限 CRUD
  - 角色权限管理
  - 用户权限管理

#### 3. 权限控制
- **access.ts** - 权限访问控制
  - `hasPermission()` - 检查指定权限
  - `can()` - 检查资源操作权限
  - 预定义所有资源的 CRUD 权限检查

- **usePermission Hook** (`hooks/usePermission.ts`)
  - 提供权限检查的便捷 Hook
  - 支持单个/多个权限检查

- **PermissionControl 组件** (`components/PermissionControl/index.tsx`)
  - 声明式权限控制组件
  - 用法：`<PermissionControl permission="user:create">...</PermissionControl>`

#### 4. 管理页面
- **权限管理页面** (`pages/permission-management/index.tsx`)
  - 按资源分组显示所有权限
  - 支持刷新和初始化功能
  - 折叠面板展示

- **角色权限配置模态框** (`pages/role-management/components/PermissionConfigModal.tsx`)
  - 表格形式展示资源和操作权限
  - 支持全选/反选
  - 为角色批量分配权限

#### 5. 应用初始化
- **app.tsx** - 在初始化时获取用户权限
  - 调用 `getMyPermissions()` 获取用户所有权限代码
  - 存储在 `currentUser.permissions` 中

## 🎯 系统权限列表

系统自动初始化以下权限：

### 用户管理 (user)
- `user:create` - 创建用户
- `user:read` - 查看用户
- `user:update` - 修改用户
- `user:delete` - 删除用户

### 角色管理 (role)
- `role:create` - 创建角色
- `role:read` - 查看角色
- `role:update` - 修改角色
- `role:delete` - 删除角色

### 菜单管理 (menu)
- `menu:create` - 创建菜单
- `menu:read` - 查看菜单
- `menu:update` - 修改菜单
- `menu:delete` - 删除菜单

### 公告管理 (notice)
- `notice:create` - 创建公告
- `notice:read` - 查看公告
- `notice:update` - 修改公告
- `notice:delete` - 删除公告

### 标签管理 (tag)
- `tag:create` - 创建标签
- `tag:read` - 查看标签
- `tag:update` - 修改标签
- `tag:delete` - 删除标签

### 权限管理 (permission)
- `permission:create` - 创建权限
- `permission:read` - 查看权限
- `permission:update` - 修改权限
- `permission:delete` - 删除权限

### 活动日志 (activity-log)
- `activity-log:read` - 查看活动日志
- `activity-log:create` - 创建活动日志
- `activity-log:update` - 修改活动日志
- `activity-log:delete` - 删除活动日志

## 🚀 使用指南

### 后端使用

#### 1. 在控制器中添加权限验证

```csharp
[HttpPost]
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
{
    // 创建用户逻辑
}

[HttpPut("{id}")]
[RequirePermission("user", "update")]
public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
{
    // 更新用户逻辑
}
```

#### 2. 在代码中检查权限

```csharp
public class MyController : BaseApiController
{
    public async Task<IActionResult> MyAction()
    {
        // 检查权限
        if (await HasPermissionAsync("user", "create"))
        {
            // 有权限
        }
        
        // 要求权限（无权限抛异常）
        await RequirePermissionAsync("user", "update");
        
        // 执行操作
    }
}
```

### 前端使用

#### 1. 在页面中控制按钮显示

```typescript
import PermissionControl from '@/components/PermissionControl';

<PermissionControl permission="user:create">
  <Button type="primary" onClick={handleCreate}>
    新建用户
  </Button>
</PermissionControl>

<PermissionControl permission="user:delete">
  <Button danger onClick={() => handleDelete(record)}>
    删除
  </Button>
</PermissionControl>
```

#### 2. 使用 Hook 进行权限检查

```typescript
import { usePermission } from '@/hooks/usePermission';

function UserManagement() {
  const { can, hasPermission } = usePermission();
  
  // 检查资源操作权限
  if (can('user', 'create')) {
    // 显示创建按钮
  }
  
  // 检查完整权限代码
  if (hasPermission('user:update')) {
    // 显示编辑按钮
  }
}
```

#### 3. 使用 access 进行路由级权限控制

```typescript
// config/routes.ts
{
  path: '/user-management',
  name: '用户管理',
  component: './user-management',
  access: 'canReadUser', // 需要 user:read 权限
}
```

## 📌 权限管理流程

### 1. 为角色分配权限
1. 进入「角色管理」页面
2. 点击角色的「配置权限」按钮
3. 在弹出的模态框中勾选需要的权限
4. 保存配置

### 2. 为用户分配自定义权限
1. 进入「用户管理」页面
2. 点击用户的「配置权限」按钮
3. 查看从角色继承的权限（只读）
4. 添加/移除用户的自定义权限
5. 保存配置

### 3. 查看和管理权限
1. 进入「权限管理」页面
2. 查看按资源分组的所有权限
3. 可以初始化默认权限
4. 可以创建自定义权限（高级功能）

## 🔐 权限验证流程

1. **用户登录**
   - 系统返回 JWT Token
   - Token 包含用户 ID、角色等信息

2. **获取用户权限**
   - 前端调用 `/api/user/my-permissions`
   - 后端查询用户的角色权限和自定义权限
   - 合并去重后返回权限代码列表

3. **前端权限检查**
   - 将权限列表存储在 `currentUser.permissions`
   - 使用 PermissionControl 组件或 usePermission Hook
   - 控制按钮、菜单的显示/隐藏

4. **后端权限验证**
   - 请求到达控制器
   - RequirePermission 特性拦截请求
   - 调用 PermissionCheckService 验证权限
   - 权限不足返回 403 Forbidden

## 🎨 特殊说明

### 超级管理员
- 角色名为 `super-admin` 的用户拥有所有权限
- 系统启动时自动为超级管理员分配所有权限
- 权限验证时超级管理员自动通过

### 权限合并规则
- 用户最终权限 = 角色权限 ∪ 自定义权限
- 去重后返回唯一的权限代码列表
- 角色权限和自定义权限是叠加关系

## 📚 相关文件

### 后端
- `Platform.ApiService/Models/PermissionModels.cs` - 权限模型
- `Platform.ApiService/Services/PermissionService.cs` - 权限服务
- `Platform.ApiService/Services/PermissionCheckService.cs` - 权限检查服务
- `Platform.ApiService/Attributes/RequirePermissionAttribute.cs` - 权限验证特性
- `Platform.ApiService/Controllers/PermissionController.cs` - 权限控制器
- `Platform.ApiService/Scripts/InitializePermissions.cs` - 权限初始化脚本

### 前端
- `Platform.Admin/src/services/permission/` - 权限服务
- `Platform.Admin/src/hooks/usePermission.ts` - 权限Hook
- `Platform.Admin/src/components/PermissionControl/` - 权限控制组件
- `Platform.Admin/src/pages/permission-management/` - 权限管理页面
- `Platform.Admin/src/pages/role-management/components/PermissionConfigModal.tsx` - 角色权限配置
- `Platform.Admin/src/access.ts` - 权限访问控制

## 🚧 待完成功能

以下功能框架已就绪，但需要进一步完善：

1. **用户自定义权限配置模态框**
   - 显示用户从角色继承的权限
   - 添加/移除用户自定义权限
   - 区分显示继承权限和自定义权限

2. **在用户管理页面添加权限控制按钮**
   - 使用 PermissionControl 控制新建、编辑、删除按钮
   
3. **在角色管理页面集成权限配置**
   - 添加「配置权限」按钮
   - 调用 PermissionConfigModal

4. **扩展其他管理页面**
   - 公告管理、标签管理等页面添加权限控制

## ✨ 系统优势

1. **细粒度控制** - 精确到每个资源的 CRUD 操作
2. **灵活配置** - 支持角色权限和用户自定义权限
3. **易于扩展** - 添加新资源权限只需初始化4个权限
4. **开发友好** - 提供特性、Hook、组件等多种使用方式
5. **自动初始化** - 系统启动自动创建默认权限
6. **统一管理** - 前后端权限逻辑一致

## 📖 开发规范

### 添加新资源权限

1. **后端初始化脚本** (`InitializePermissions.cs`)
   ```csharp
   var resources = new[]
   {
       ("user", "用户"),
       ("role", "角色"),
       ("your-resource", "你的资源"), // 添加新资源
   };
   ```

2. **控制器添加权限验证**
   ```csharp
   [RequirePermission("your-resource", "create")]
   public async Task<IActionResult> Create() { }
   ```

3. **前端 access.ts 添加权限**
   ```typescript
   canCreateYourResource: can('your-resource', 'create'),
   canReadYourResource: can('your-resource', 'read'),
   ```

4. **前端页面使用权限控制**
   ```typescript
   <PermissionControl permission="your-resource:create">
     <Button>创建</Button>
   </PermissionControl>
   ```

## 🎉 总结

CRUD 权限系统已经完整实现了核心功能，包括权限定义、验证、管理等模块。系统支持混合权限模式，提供了灵活的权限配置能力，可以满足大部分企业级应用的权限控制需求。

