# 菜单级权限使用指南

## 📋 概述

从v6.0开始，系统采用简化的菜单级权限控制，移除了复杂的操作权限管理，实现更简洁直观的权限架构。

## 🎯 权限控制原理

### 核心概念

**菜单即权限**: 用户能访问某个菜单，就能调用该菜单下的所有API功能。

```
用户 → 角色 → 菜单 → API权限
```

### 权限层级

1. **菜单显示层**: 用户只能看到分配的菜单项（前端控制）
2. **路由访问层**: 用户无法访问未授权的页面（前端拦截）
3. **API调用层**: 用户无法调用未授权菜单的API（后端验证）

## 🔧 后端实现

### 使用RequireMenu特性

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]  // 所有接口需要登录
public class UserController : BaseApiController
{
    // 用户管理相关API都需要user-management菜单权限
    
    [HttpGet]
    [RequireMenu("user-management")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Success(users);
    }
    
    [HttpPost]
    [RequireMenu("user-management")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var user = await _userService.CreateAsync(request);
        return Success(user, "创建成功");
    }
    
    [HttpPut("{id}")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
    {
        var success = await _userService.UpdateAsync(id, request);
        success.EnsureSuccess("用户", id);
        return Success("更新成功");
    }
    
    [HttpDelete("{id}")]
    [RequireMenu("user-management")]
    public async Task<IActionResult> Delete(string id)
    {
        var success = await _userService.DeleteAsync(id);
        success.EnsureSuccess("用户", id);
        return Success("删除成功");
    }
}
```

### 菜单名称规范

| 菜单名称 | 对应功能 | API路径示例 |
|---------|---------|------------|
| `user-management` | 用户管理 | `/api/user/management/*` |
| `role-management` | 角色管理 | `/api/role/*` |
| `user-log` | 用户日志 | `/api/users/activity-logs` |
| `tag` | 标签管理 | `/api/tag/*` |
| `notice` | 通知管理 | `/api/notices/*` (创建) |
| `company-settings` | 企业设置 | `/api/company/*` |

### BaseApiController辅助方法

```csharp
// 检查菜单访问权限
if (await HasMenuAccessAsync("user-management"))
{
    // 有权限
}

// 要求菜单访问权限（无权限抛异常）
await RequireMenuAccessAsync("user-management");

// 检查是否有任意一个菜单的权限
if (await HasAnyMenuAccessAsync("user-management", "role-management"))
{
    // 至少有一个菜单的权限
}
```

### 条件权限检查示例

```csharp
[HttpPost("bulk-action")]
[Authorize]
public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request)
{
    // 根据操作类型检查不同菜单权限
    if (request.Action == "delete")
        await RequireMenuAccessAsync("user-management");
    else if (request.Action == "export")
        await RequireMenuAccessAsync("data-export");
    
    // 执行操作
}
```

### 自己或有权限模式

```csharp
[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetUser(string id)
{
    // 可以查看自己的信息，或者需要菜单权限
    var currentUserId = CurrentUserId;
    if (currentUserId != id && !await HasMenuAccessAsync("user-management"))
    {
        throw new UnauthorizedAccessException("无权查看其他用户信息");
    }
    
    var user = await _userService.GetUserByIdAsync(id);
    return Success(user.EnsureFound("用户", id));
}
```

## 🎨 前端实现

### 菜单显示控制

菜单由后端API返回，前端自动渲染：

```typescript
// app.tsx - 自动处理
menuDataRender: (menuData) => {
  if (initialState?.currentUser?.menus) {
    return convertMenuTreeToProLayout(initialState.currentUser.menus);
  }
  return menuData;
}
```

### 路由访问控制

```typescript
// access.ts
export default function access(initialState: { currentUser?: API.CurrentUser }) {
  const { currentUser } = initialState ?? {};
  
  const canAccessPath = (path: string): boolean => {
    if (!currentUser || !currentUser.menus) {
      return false;
    }
    
    // 递归查找路径
    const findPath = (menus: API.MenuTreeNode[]): boolean => {
      for (const menu of menus) {
        if (menu.path === path) return true;
        if (menu.children?.length > 0) {
          if (findPath(menu.children)) return true;
        }
      }
      return false;
    };
    
    return findPath(currentUser.menus);
  };
  
  return {
    canAdmin: hasRole('admin') || hasRole('管理员'),
    canAccessPath,
    // ...
  };
}
```

### 按钮显示

**v6.0变更**: 所有用户看到相同的按钮，权限由后端API控制

```tsx
// ✅ 正确：直接显示按钮
<Button
  type="primary"
  onClick={handleCreate}
>
  新增用户
</Button>

<Button
  type="link"
  onClick={handleEdit}
>
  编辑
</Button>

// ❌ 已废弃：不再使用PermissionControl
<PermissionControl permission="user:create">
  <Button type="primary">新增用户</Button>
</PermissionControl>
```

## 👥 角色管理

### 创建角色

```typescript
const createRole = async (values: CreateRoleRequest) => {
  await createRole({
    name: values.name,
    description: values.description,
    menuIds: values.menuIds,  // 选择可访问的菜单
    isActive: true,
  });
};
```

### 分配菜单

```typescript
// 使用MenuPermissionModal组件
<MenuPermissionModal
  visible={visible}
  role={currentRole}
  onCancel={() => setVisible(false)}
  onSuccess={() => {
    setVisible(false);
    message.success('菜单权限分配成功');
  }}
/>
```

## 🧪 测试验证

### 验证步骤

1. **创建测试角色**
   - 创建角色"测试角色"
   - 只分配"用户管理"和"角色管理"菜单

2. **创建测试用户**
   - 创建新用户
   - 分配"测试角色"

3. **登录测试**
   - 使用测试用户登录
   - 验证只能看到"用户管理"和"角色管理"菜单
   - 验证可以访问这两个页面
   - 验证无法访问其他页面（如"用户日志"）

4. **API测试**
   - 调用用户管理API - 应该成功
   - 调用标签管理API - 应该返回403错误

## ❓ 常见问题

### Q: 如何新增一个需要权限控制的功能？

A: 三个步骤：
1. 在 `DatabaseInitializerService` 中添加菜单定义
2. 在Controller中使用 `[RequireMenu("menu-name")]`
3. 在 `routes.ts` 中添加路由映射

### Q: 普通用户点击无权限的按钮会怎样？

A: 前端显示按钮，但后端API会返回403错误，提示"无权访问菜单"。

### Q: 如何实现细粒度权限控制？

A: 将功能拆分为不同的菜单项。例如：
- `user-view` - 查看用户
- `user-manage` - 管理用户（增删改）

### Q: 为什么不在前端隐藏按钮？

A: 设计理念：
- 简化前端逻辑
- 避免用户困惑（为什么没有按钮）
- 后端API是最终的安全屏障
- 减少前后端权限逻辑的同步复杂度

## 🎯 最佳实践

1. **菜单命名**: 使用小写、短横线分隔，语义清晰
2. **粗粒度控制**: 一个模块一个菜单，而不是过度细分
3. **API一致性**: 同一功能模块的所有API使用相同的菜单权限
4. **角色设计**: 根据岗位职责设计角色，而不是按功能切分
5. **文档同步**: 新增菜单时更新本文档

## 📚 相关文档

- [菜单级权限重构文档](mdc:docs/refactoring/MENU-LEVEL-PERMISSION-REFACTORING.md)
- [Menu模型定义](mdc:Platform.ApiService/Models/MenuModels.cs)
- [MenuAccessService服务](mdc:Platform.ApiService/Services/MenuAccessService.cs)
- [RequireMenu特性](mdc:Platform.ApiService/Attributes/RequireMenuAttribute.cs)
- [全局菜单架构](mdc:.cursor/rules/global-menu-architecture.mdc)

---

文档创建日期: 2025-10-14  
适用版本: v6.0+

