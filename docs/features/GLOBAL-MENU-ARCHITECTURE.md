# 全局菜单架构设计

## 📋 架构变更说明

**变更日期**: 2025-01-14  
**版本**: v5.0  
**类型**: 🔴 **重大架构变更**

### 核心决策

**菜单从"企业专属资源"变更为"全局系统资源"**

- **之前**: 每个企业有自己的菜单，通过 `CompanyId` 隔离
- **现在**: 所有企业共享相同的系统菜单，通过权限控制显示

## 🎯 设计理念

### 为什么采用全局菜单？

1. **统一用户体验**: 所有企业看到相同的菜单结构
2. **简化管理**: 不需要每个企业单独管理菜单
3. **权限控制**: 通过用户权限决定菜单是否显示，而不是菜单归属
4. **系统维护**: 菜单作为系统功能，由系统统一管理

### 菜单显示逻辑

```
系统菜单（全局）
    ↓
用户权限（企业专属）
    ↓
根据权限过滤菜单
    ↓
显示用户可见的菜单
```

## 🏗️ 技术实现

### 1. 数据模型变更

**之前**:
```csharp
public class Menu : MultiTenantEntity, INamedEntity
{
    // 有 CompanyId
}
```

**现在**:
```csharp
public class Menu : BaseEntity, INamedEntity
{
    // 无 CompanyId，全局资源
}
```

### 2. 菜单创建时机

**之前**: 用户注册时创建
```csharp
// ❌ 旧方式
CreatePersonalCompanyAsync()
  ├─ 创建企业
  ├─ 创建权限
  ├─ 创建角色
  └─ 创建菜单 ← 每个企业一份
```

**现在**: 系统初始化时创建
```csharp
// ✅ 新方式
DatabaseInitializerService.InitializeAsync()
  ├─ 创建索引
  └─ 创建全局菜单 ← 所有企业共享
```

### 3. 菜单权限控制

每个菜单可以配置所需权限：

```csharp
new Menu
{
    Name = "user-management",
    Title = "用户管理",
    Path = "/system/user-management",
    Permissions = new List<string> { "user:read" },  // ✅ 需要用户查看权限
    // ...
}
```

**显示逻辑**：
- 用户有 `user:read` 权限 → 显示"用户管理"菜单
- 用户无 `user:read` 权限 → 隐藏"用户管理"菜单

## 📊 默认菜单结构

### 菜单树

```
欢迎 (/welcome)
  - 无权限要求，所有用户可见

系统管理 (/system)
  ├─ 用户管理 (/system/user-management)
  │   └─ 需要权限：user:read
  ├─ 角色管理 (/system/role-management)
  │   └─ 需要权限：role:read
  ├─ 用户日志 (/system/user-log)
  │   └─ 需要权限：activity-log:read
  └─ 企业设置 (/system/company-settings)
      └─ 需要权限：company:read
```

### 菜单详细配置

| 菜单 | Name | Path | Icon | Permissions | ParentId |
|-----|------|------|------|-------------|----------|
| 欢迎 | welcome | /welcome | smile | [] | null |
| 系统管理 | system | /system | setting | [] | null |
| 用户管理 | user-management | /system/user-management | user | [user:read] | system |
| 角色管理 | role-management | /system/role-management | team | [role:read] | system |
| 用户日志 | user-log | /system/user-log | file-text | [activity-log:read] | system |
| 企业设置 | company-settings | /system/company-settings | bank | [company:read] | system |

## 🚫 移除的功能

### 1. 菜单管理模块

- ❌ 删除前端页面：`Platform.Admin/src/pages/menu-management/`
- ❌ 删除后端控制器：`Platform.ApiService/Controllers/MenuController.cs`
- ❌ 删除路由配置：`/system/menu-management`

**原因**: 菜单由系统统一管理，用户（包括管理员）不能修改

### 2. 菜单相关权限

从默认权限中移除：
- ❌ `menu:create`
- ❌ `menu:read`
- ❌ `menu:update`
- ❌ `menu:delete`

**原因**: 菜单是系统资源，不需要 CRUD 权限

### 3. 企业菜单统计

```csharp
// ❌ 旧版本统计
TotalMenus = await _menus.CountDocumentsAsync(...)

// ✅ 新版本
TotalMenus = 0,  // 菜单是全局资源，不再统计
```

## 🔧 开发规范

### 添加新菜单

要添加新的系统菜单，修改 `DatabaseInitializerService.cs`：

```csharp
private async Task CreateSystemMenusAsync()
{
    // 在 childMenus 数组中添加新菜单
    new Models.Menu
    {
        Name = "new-feature",
        Title = "新功能",
        Path = "/system/new-feature",
        Component = "./new-feature",
        Icon = "star",
        ParentId = systemMenu.Id,
        SortOrder = 5,
        IsEnabled = true,
        Permissions = new List<string> { "new-feature:read" },
        // ...
    }
}
```

**重要步骤**：
1. 在 `DatabaseInitializerService.cs` 中添加菜单定义
2. 创建对应的前端页面组件
3. 在 `routes.ts` 中添加路由
4. 创建对应的权限（如需要）
5. 清空数据库重新初始化，或手动添加菜单到数据库

### 菜单权限配置

```csharp
// 简单权限：单个权限
Permissions = new List<string> { "user:read" }

// 复杂权限：多个权限（OR 逻辑）
Permissions = new List<string> { "user:read", "user:update" }

// 无权限要求（所有用户可见）
Permissions = new List<string>()
```

## 🗄️ 数据库变更

### 索引变更

**之前**（多租户索引）:
```javascript
db.menus.createIndex({ companyId: 1, name: 1 })
db.menus.createIndex({ companyId: 1, parentId: 1 })
db.menus.createIndex({ companyId: 1, isDeleted: 1, isEnabled: 1 })
```

**现在**（全局索引）:
```javascript
db.menus.createIndex({ name: 1 }, { unique: true })  // 名称全局唯一
db.menus.createIndex({ parentId: 1, sortOrder: 1 })
db.menus.createIndex({ isDeleted: 1, isEnabled: 1 })
```

### 数据迁移

如果有旧数据，需要清理：

```javascript
// 1. 清空旧的企业菜单
db.menus.deleteMany({})

// 2. 重启应用，自动创建全局菜单
```

## 🧪 测试验证

### 系统初始化测试

```bash
# 1. 清空数据库
mongo aspire-admin --eval "db.dropDatabase()"

# 2. 启动应用
dotnet run --project Platform.AppHost

# 3. 检查菜单
mongo aspire-admin --eval "db.menus.find().pretty()"

# 预期结果：
# - 6 个全局菜单
# - 没有 companyId 字段
# - name 字段唯一
```

### 用户注册测试

```bash
# 1. 注册新用户
# 访问 http://localhost:15001/user/register

# 2. 检查数据
db.companies.countDocuments()      // 1（用户的个人企业）
db.users.countDocuments()          // 1（注册的用户）
db.permissions.countDocuments()    // 24（6个资源 × 4个操作，无 menu）
db.menus.countDocuments()          // 6（全局菜单，不增加）

# 3. 登录后查看菜单
# 应该看到根据权限过滤后的菜单
```

### 权限控制测试

```bash
# 场景1: 管理员用户（所有权限）
# 应该看到所有菜单

# 场景2: 普通用户（部分权限）
# 只看到有权限的菜单

# 场景3: 新注册用户（默认管理员角色）
# 应该看到所有菜单
```

## ⚠️ 注意事项

### 1. 菜单不可修改

- 用户（包括管理员）不能创建、修改、删除菜单
- 菜单由系统管理员通过代码维护
- 需要添加/修改菜单时，需要更新代码并重新部署

### 2. 权限 vs 菜单

- **权限**: 企业专属，控制功能访问
- **菜单**: 全局共享，控制界面导航
- **关系**: 菜单通过 `Permissions` 字段关联权限

### 3. 现有数据处理

如果系统已有运行数据：

**选项1: 清空重建（推荐）**
```bash
# 删除所有菜单
db.menus.deleteMany({})

# 重启应用，自动创建全局菜单
```

**选项2: 手动迁移（不推荐）**
```javascript
// 移除 companyId 字段
db.menus.updateMany({}, { $unset: { companyId: "" } })

// 清理重复菜单（保留一份）
// 手动处理...
```

## 📚 相关文档

- [DatabaseInitializerService](mdc:Platform.ApiService/Services/DatabaseInitializerService.cs)
- [Menu 模型](mdc:Platform.ApiService/Models/MenuModels.cs)
- [前端路由配置](mdc:Platform.Admin/config/routes.ts)
- [权限系统文档](../permissions/CRUD-PERMISSION-SYSTEM.md)

## 🎯 核心原则

### 菜单管理的新原则

1. **全局唯一**: 菜单在整个系统中全局唯一
2. **系统管理**: 由系统代码维护，不提供管理界面
3. **权限控制**: 通过权限控制菜单显示
4. **统一体验**: 所有企业看到相同的系统菜单
5. **版本管理**: 菜单变更通过代码版本控制

### 多租户例外规则

虽然强调"所有数据必须有 CompanyId"，但菜单是**合理的例外**：

✅ **例外的资源**（全局）:
- Menu（菜单）- 系统导航结构

✅ **仍需 CompanyId 的资源**（企业专属）:
- Permission（权限）- 企业的功能访问控制
- Role（角色）- 企业的用户角色
- User（用户）- 企业的用户数据
- Notice（通知）- 企业的通知消息
- ActivityLog（日志）- 企业的活动日志

## 🎉 优势总结

### 用户体验

- ✅ 统一的界面导航
- ✅ 简化的权限配置
- ✅ 更快的初始化（无需为每个企业创建菜单）

### 系统维护

- ✅ 菜单在代码中维护，版本可控
- ✅ 升级时自动更新菜单
- ✅ 减少数据库存储（一份菜单 vs N份）

### 性能优化

- ✅ 注册更快（无需创建菜单）
- ✅ 查询更快（无需过滤 CompanyId）
- ✅ 索引更简单（无复合索引）

---

**设计者**: 产品团队  
**实施者**: AI Assistant  
**状态**: ✅ 已实施并验证

