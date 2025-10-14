# 菜单渲染机制说明

## ❓ 问题：为什么数据库没有菜单也能显示？

**简短回答**: 前端有**双重菜单源机制** - 优先使用数据库菜单，失败时回退到静态路由配置。

## 🔍 详细分析

### 之前的菜单渲染流程

```
用户登录
  ↓
getInitialState() 调用
  ↓
尝试获取数据库菜单（/api/menu/user）
  ├─ 成功 → 使用数据库菜单 ✅
  └─ 失败/空 → 使用 routes.ts 静态菜单 ⚠️
  ↓
menuDataRender() 渲染菜单
  ├─ 有 currentUser.menus → 渲染数据库菜单
  └─ 无 currentUser.menus → 渲染 routes.ts 菜单
```

### 关键代码

**前端 - app.tsx**:
```typescript
export async function getInitialState() {
  const fetchUserInfo = async () => {
    // 获取用户菜单
    try {
      const menuResponse = await getUserMenus();
      if (menuResponse.success && menuResponse.data) {
        userInfo.menus = menuResponse.data;  // ✅ 数据库菜单
      }
    } catch (menuError) {
      console.log('Failed to fetch user menus, using default menus');
      // ⚠️ 失败时，menus 为空，会使用 routes.ts
    }
  }
}

// 菜单渲染
menuDataRender: (menuData) => {
  if (initialState?.currentUser?.menus?.length > 0) {
    return convertMenuTreeToProLayout(initialState.currentUser.menus);  // 数据库菜单
  }
  return menuData;  // ⚠️ routes.ts 的静态菜单（后备方案）
}
```

**后端 - MenuController**:
```csharp
[HttpGet("user")]
public async Task<IActionResult> GetUserMenus()
{
    // 从数据库获取菜单
    var menus = await _menuService.GetUserMenusAsync(roleIds);
    return Success(menus);
}
```

### 为什么这样设计？

这是一个**防御性设计**：
- ✅ 优点：即使数据库菜单有问题，系统也能正常使用
- ⚠️ 缺点：隐藏了数据库菜单缺失的问题，不容易发现

## 🆕 新架构：全局菜单系统

### 架构变更

**之前（v4.0）**：
```
每个企业有自己的菜单
  ├─ 用户注册 → 创建企业专属菜单
  ├─ 菜单有 CompanyId
  └─ 用户可以管理菜单
```

**现在（v5.0）**：
```
全局系统菜单（所有企业共享）
  ├─ 系统初始化 → 创建全局菜单
  ├─ 菜单无 CompanyId
  ├─ 通过权限控制显示
  └─ 用户不能管理菜单
```

### 新的菜单渲染流程

```
系统首次启动
  ↓
DatabaseInitializerService
  ├─ 创建索引
  └─ 创建6个全局菜单 ✅
  ↓
用户注册
  ├─ 创建企业
  ├─ 创建权限（无 menu 相关）
  ├─ 创建管理员角色（包含所有菜单ID）
  └─ ❌ 不再创建菜单
  ↓
用户登录
  ↓
调用 /api/menu/user
  ↓
根据角色的 MenuIds 过滤菜单
  ├─ 角色有哪些 MenuIds
  ├─ 从全局菜单中筛选这些ID
  └─ 返回可见菜单树
  ↓
前端渲染菜单
```

## 📊 菜单数据流

### 数据库结构

```javascript
// menus 集合（全局，无 companyId）
{
  _id: ObjectId("..."),
  name: "user-management",
  title: "用户管理",
  path: "/system/user-management",
  permissions: ["user:read"],  // 需要的权限
  parentId: "system_menu_id",
  isDeleted: false,
  // ❌ 无 companyId 字段
}

// roles 集合（企业专属，有 companyId）
{
  _id: ObjectId("..."),
  name: "管理员",
  companyId: "company_123",
  menuIds: ["menu_1", "menu_2", ...],  // 可访问的菜单ID
  permissionIds: ["perm_1", "perm_2", ...],
  isDeleted: false
}

// permissions 集合（企业专属，有 companyId）
{
  _id: ObjectId("..."),
  code: "user:read",
  companyId: "company_123",
  isDeleted: false
}
```

### 菜单显示逻辑

```
用户请求菜单
  ↓
获取用户在当前企业的角色
  ↓
角色有 menuIds: ["menu_1", "menu_2", ...]
  ↓
从全局菜单中查询这些ID
  ↓
构建菜单树
  ├─ 包含所有可访问的菜单
  ├─ 自动包含父菜单（即使不在 menuIds 中）
  └─ 按 sortOrder 排序
  ↓
返回给前端
```

## 🎯 权限 vs 菜单

### 两层控制机制

1. **菜单层**（MenuIds）:
   - 角色的 `MenuIds` 控制用户能看到哪些菜单
   - 粗粒度控制（整个菜单项）

2. **功能层**（Permissions）:
   - 权限控制具体功能的访问
   - 细粒度控制（增删改查）

### 示例说明

**场景**: 用户管理页面

```
角色配置：
  menuIds: ["user-management"]  → 用户能看到"用户管理"菜单
  permissions: ["user:read"]    → 用户能查看用户列表
                                → 但不能创建/编辑/删除用户

用户看到的效果：
  ✅ 左侧菜单显示"用户管理"（因为 menuIds 包含）
  ✅ 点击进入用户管理页面
  ✅ 能看到用户列表（因为有 user:read 权限）
  ❌ 没有"新建"按钮（因为无 user:create 权限）
  ❌ 没有"编辑"按钮（因为无 user:update 权限）
  ❌ 没有"删除"按钮（因为无 user:delete 权限）
```

## 🔧 开发指南

### 添加新菜单的步骤

1. **修改 DatabaseInitializerService.cs**:
   ```csharp
   new Models.Menu
   {
       Name = "new-feature",
       Title = "新功能",
       Path = "/system/new-feature",
       Component = "./new-feature",
       Icon = "star",
       ParentId = systemMenu.Id,
       Permissions = new List<string> { "new-feature:read" },
       SortOrder = 5,
       IsEnabled = true
   }
   ```

2. **创建前端页面**: `Platform.Admin/src/pages/new-feature/index.tsx`

3. **添加路由配置**: 在 `routes.ts` 中添加路由

4. **创建对应权限**: 在 `PermissionService.GetDefaultPermissions()` 中添加资源

5. **重启应用**: 清空数据库并重启，自动创建新菜单

### 角色菜单配置

管理员为角色分配菜单时：

```csharp
// 角色的 MenuIds 包含可访问的菜单ID
var role = new Role
{
    Name = "客服人员",
    MenuIds = new List<string> 
    { 
        welcomeMenuId,        // 欢迎页
        userManagementMenuId   // 用户管理
        // 不包括角色管理、用户日志等
    }
};
```

用户分配到这个角色后，只能看到：
- 欢迎
- 系统管理
  - 用户管理（其他子菜单隐藏）

## ⚠️ 注意事项

### 1. 菜单是只读的

- ✅ 系统初始化时创建
- ✅ 代码版本控制
- ❌ 用户不能创建/修改/删除
- ❌ 没有菜单管理界面

### 2. 角色关联菜单

角色创建时需要分配 `MenuIds`：

```csharp
var adminRole = new Role
{
    Name = "管理员",
    MenuIds = allMenuIds,  // 所有菜单ID
    PermissionIds = allPermissionIds
};
```

### 3. 数据库菜单必须存在

现在菜单**必须**在数据库中：
- ❌ 不能依赖 routes.ts 作为菜单源
- ✅ 必须确保系统初始化创建了菜单
- ✅ 数据库没有菜单时用户看不到菜单（明确的问题提示）

## 🧪 测试验证

### 测试场景1：空数据库启动

```bash
# 1. 清空数据库
mongo aspire-admin --eval "db.dropDatabase()"

# 2. 启动应用
dotnet run --project Platform.AppHost

# 3. 检查菜单
db.menus.find().count()  // 应该是 6

# 4. 查看菜单
db.menus.find({}, {name: 1, title: 1, path: 1})
```

**预期结果**：
```javascript
{ name: "welcome", title: "欢迎", path: "/welcome" }
{ name: "system", title: "系统管理", path: "/system" }
{ name: "user-management", title: "用户管理", path: "/system/user-management" }
{ name: "role-management", title: "角色管理", path: "/system/role-management" }
{ name: "user-log", title: "用户日志", path: "/system/user-log" }
{ name: "company-settings", title: "企业设置", path: "/system/company-settings" }
```

### 测试场景2：用户注册和登录

```bash
# 1. 注册新用户
# http://localhost:15001/user/register

# 2. 登录
# http://localhost:15001/user/login

# 3. 查看菜单
# 应该看到所有菜单（管理员角色默认有所有 MenuIds）
```

### 测试场景3：权限控制

```bash
# 1. 创建受限角色
POST /api/role
{
  "name": "受限用户",
  "menuIds": ["welcome_menu_id", "user_management_menu_id"],
  "permissionIds": ["user:read"]
}

# 2. 分配给用户

# 3. 登录查看
# 应该只看到：欢迎、系统管理（只有用户管理子菜单）
```

## 📚 相关文件

### 后端

| 文件 | 说明 |
|-----|------|
| `Models/MenuModels.cs` | Menu 模型（无 CompanyId） |
| `Services/DatabaseInitializerService.cs` | 创建全局菜单 |
| `Services/MenuService.cs` | 菜单查询服务（只读） |
| `Controllers/MenuController.cs` | 菜单API（只读） |

### 前端

| 文件 | 说明 |
|-----|------|
| `src/app.tsx` | 菜单渲染逻辑（menuDataRender） |
| `config/routes.ts` | 静态路由配置（不再作为菜单源） |
| `services/menu/api.ts` | 菜单API调用 |

## 🎊 总结

### 之前为什么能显示？

```
数据库没有菜单
  ↓
getUserMenus() 返回空数组
  ↓
menuDataRender() 检测 currentUser.menus 为空
  ↓
使用 routes.ts 作为后备菜单 ⚠️
  ↓
显示静态路由配置的菜单
```

### 现在的改进

```
系统初始化时创建全局菜单
  ↓
数据库一定有菜单
  ↓
getUserMenus() 返回过滤后的菜单
  ↓
menuDataRender() 使用数据库菜单
  ↓
显示根据权限过滤的菜单 ✅
```

### 核心原则

1. ✅ **菜单是全局系统资源** - 所有企业共享
2. ✅ **系统初始化时创建** - 不依赖用户注册
3. ✅ **通过权限控制显示** - 角色的 MenuIds + 用户权限
4. ✅ **用户不能管理菜单** - 删除了菜单管理模块
5. ✅ **代码版本控制** - 菜单在代码中维护

---

**文档日期**: 2025-01-14  
**版本**: v5.0  
**状态**: ✅ 已实施

