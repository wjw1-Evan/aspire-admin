# 菜单级权限系统 (v6.0)

## 🎯 重大变更

v6.0版本将复杂的CRUD级权限系统简化为菜单级权限控制，大幅降低系统复杂度。

## ✨ 新特性

### 简化的权限模型

- ✅ **菜单即权限**: 能访问菜单，就能使用该功能
- ✅ **后端验证**: 使用 `[RequireMenu("menu-name")]` 特性
- ✅ **前端简化**: 所有用户看到相同按钮，权限由后端控制
- ✅ **易于理解**: 权限配置更直观，降低学习成本

### 移除的功能

- ❌ Permission实体和相关API
- ❌ 操作级权限管理（create/read/update/delete）
- ❌ 用户自定义权限
- ❌ 权限管理页面
- ❌ 前端按钮权限控制组件

## 🚀 快速开始

### 1. 删除旧数据库

```bash
# MongoDB Shell
mongo aspire-admin
> db.dropDatabase()
> exit
```

### 2. 启动系统

```bash
dotnet run --project Platform.AppHost
```

系统将自动：
- 创建4个全局菜单（welcome, user-management, role-management, user-log, company-settings）
- 用户注册时自动创建管理员角色（拥有所有菜单权限）

### 3. 登录测试

使用注册的账户登录，应该能看到所有菜单并正常操作。

## 📖 使用指南

### 后端开发

```csharp
// 在Controller中使用菜单权限
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MyController : BaseApiController
{
    [HttpGet]
    [RequireMenu("my-feature")]  // 检查菜单访问权限
    public async Task<IActionResult> GetData()
    {
        // 只有能访问"my-feature"菜单的用户才能调用
        var data = await _service.GetDataAsync();
        return Success(data);
    }
}
```

### 前端开发

```tsx
// 直接显示按钮，不做权限控制
<Button type="primary" onClick={handleCreate}>
  新增
</Button>

<Button onClick={handleEdit}>
  编辑
</Button>

<Button danger onClick={handleDelete}>
  删除
</Button>

// 后端API会返回403错误如果无权限
```

### 角色配置

1. 进入"角色管理"页面
2. 创建新角色或编辑现有角色
3. 点击"菜单权限"按钮
4. 选择该角色可访问的菜单
5. 保存

## 📋 菜单列表

| 菜单名称 | 显示名称 | 路径 | 说明 |
|---------|---------|------|------|
| welcome | 欢迎 | /welcome | 首页（所有用户可见） |
| user-management | 用户管理 | /system/user-management | 用户CRUD |
| role-management | 角色管理 | /system/role-management | 角色配置 |
| user-log | 用户日志 | /system/user-log | 活动日志 |
| company-settings | 企业设置 | /system/company-settings | 企业配置 |

## 🧪 测试

运行测试脚本验证权限系统：

```bash
./test-menu-level-permission.sh
```

## 📚 完整文档

- [菜单级权限使用指南](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md) - 详细使用说明
- [权限系统重构文档](docs/refactoring/MENU-LEVEL-PERMISSION-REFACTORING.md) - 架构变更说明
- [文档索引](docs/INDEX.md) - 所有文档入口

## ⚠️ 重要提示

1. **必须删除旧数据库**: 否则会有数据不一致问题
2. **所有用户看到相同按钮**: 这是设计特性，不是bug
3. **权限由后端API验证**: 点击按钮后，无权限会返回403错误
4. **菜单是全局资源**: 所有企业共享相同的系统菜单

## 🎯 迁移对照

| v5.0功能 | v6.0功能 | 说明 |
|----------|----------|------|
| `[RequirePermission("user", "create")]` | `[RequireMenu("user-management")]` | 使用菜单权限 |
| `HasPermissionAsync("user", "read")` | `HasMenuAccessAsync("user-management")` | 检查菜单访问 |
| `currentUser.permissions` | ❌ 已删除 | 不再返回权限列表 |
| `Role.PermissionIds` | ❌ 已删除 | 只保留MenuIds |
| `User.CustomPermissionIds` | ❌ 已删除 | 只通过角色分配 |
| 权限管理页面 | ❌ 已删除 | 不再需要 |

---

版本: v6.0  
更新日期: 2025-10-14

