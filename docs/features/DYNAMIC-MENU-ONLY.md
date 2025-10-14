# 完全动态菜单架构

## 📋 架构变更

**变更日期**: 2025-01-14  
**版本**: v5.0  
**类型**: 🔴 **重大架构变更**

### 核心变更

**移除静态菜单，100% 从数据库动态加载**

## 🎯 设计原则

### 路由 vs 菜单的职责分离

**之前（v4.0）**：
```
routes.ts 既是路由配置，也是菜单源
  ├─ 定义 path → component 映射
  └─ 作为菜单数据源（后备方案）
```

**现在（v5.0）**：
```
routes.ts：只负责路由映射
  └─ 定义 path → component 映射（hideInMenu: true）

数据库：唯一的菜单数据源
  ├─ 菜单结构和层级
  ├─ 菜单权限控制
  └─ 菜单显示名称和图标
```

## 🏗️ 实现细节

### 1. routes.ts 配置

**只保留三类静态路由**：

#### ① 认证相关（无需登录）
```typescript
{
  path: '/user',
  layout: false,
  routes: [
    { path: '/user/login', component: './user/login' },
    { path: '/user/register', component: './user/register' },
    { path: '/user/register-result', component: './user/register-result' }
  ]
}
```

#### ② 隐藏页面（hideInMenu: true）
```typescript
// 个人中心、修改密码、企业搜索等
{ path: '/user/change-password', component: './user/change-password', hideInMenu: true }
{ path: '/account/center', component: './account/center', hideInMenu: true }
{ path: '/company/search', component: './company/search', hideInMenu: true }
```

#### ③ 业务页面路由映射
```typescript
// 只定义路由映射，hideInMenu: true 不显示在静态菜单
{ path: '/welcome', component: './Welcome', hideInMenu: true }
{ path: '/system/user-management', component: './user-management', hideInMenu: true }
{ path: '/system/role-management', component: './role-management', hideInMenu: true }
```

**关键点**：
- ✅ `hideInMenu: true` - 不在静态菜单中显示
- ✅ 只定义 path 和 component 映射
- ✅ 菜单数据完全由数据库提供

### 2. app.tsx 菜单渲染

**移除后备方案**：

```typescript
// ❌ 之前：有后备方案
menuDataRender: (menuData) => {
  if (currentUser?.menus?.length > 0) {
    return convertMenuTreeToProLayout(currentUser.menus);  // 数据库菜单
  }
  return menuData;  // ⚠️ routes.ts 菜单（后备方案）
}

// ✅ 现在：只使用数据库菜单
menuDataRender: () => {
  if (currentUser?.menus?.length > 0) {
    return convertMenuTreeToProLayout(currentUser.menus);  // 数据库菜单
  }
  console.warn('⚠️ 数据库中没有菜单，请检查系统初始化');
  return [];  // ✅ 明确返回空，不使用静态路由
}
```

### 3. 数据库菜单初始化

```csharp
// DatabaseInitializerService.cs
private async Task CreateSystemMenusAsync()
{
    // 检查菜单是否已存在
    var existingCount = await menus.CountDocumentsAsync();
    if (existingCount > 0)
    {
        return;  // 已初始化，跳过
    }
    
    // 创建全局系统菜单
    // 1. 欢迎
    // 2. 系统管理
    //    ├─ 用户管理
    //    ├─ 角色管理
    //    ├─ 用户日志
    //    └─ 企业设置
}
```

## 📊 架构对比

| 方面 | v4.0 静态+动态 | v5.0 纯动态 |
|-----|---------------|-----------|
| **菜单数据源** | 数据库 OR routes.ts | 仅数据库 |
| **后备方案** | routes.ts | 无（返回空） |
| **数据库故障** | 显示静态菜单 | 显示空菜单+警告 |
| **一致性** | 可能不一致 | 完全一致 |
| **问题发现** | 难（隐藏问题） | 易（立即暴露） |

## ✅ 优势

### 1. 数据一致性

```
唯一数据源 = 数据库
  ↓
菜单显示 = 数据库内容
  ↓
不会出现菜单与数据库不一致的情况
```

### 2. 问题快速发现

```
数据库没有菜单
  ↓
前端立即显示空菜单
  ↓
控制台警告："数据库中没有菜单"
  ↓
开发者立即发现问题并修复
```

### 3. 权限控制更准确

```
菜单来自数据库
  ↓
菜单权限由数据库定义
  ↓
权限检查与菜单显示完全对应
```

## ⚠️ 重要注意事项

### 1. 系统初始化必须成功

**数据库菜单是强依赖**：
- ✅ 系统首次启动必须创建菜单
- ✅ 菜单创建失败会导致用户看不到任何菜单
- ✅ 必须监控初始化日志

**检查方法**：
```bash
# 检查菜单是否已创建
mongo aspire-admin --eval "db.menus.countDocuments()"
# 应该返回 6

# 查看菜单
mongo aspire-admin --eval "db.menus.find({}, {name: 1, title: 1}).pretty()"
```

### 2. 数据库菜单缺失的表现

**用户看到的**：
- 左侧菜单栏为空
- 只有顶部的头像、通知等组件

**控制台输出**：
```
⚠️ 数据库中没有菜单，请检查系统初始化是否完成
```

**解决方法**：
```bash
# 1. 检查系统初始化日志
grep "全局系统菜单创建" logs/api.log

# 2. 手动触发初始化
# 重启应用（分布式锁会保护）

# 3. 或清空数据库重新初始化
mongo aspire-admin --eval "db.dropDatabase()"
dotnet run --project Platform.AppHost
```

### 3. routes.ts 仍然需要

**UmiJS 需要 routes.ts 定义路由映射**：

```typescript
// ✅ 必须保留（路由映射）
{ path: '/welcome', component: './Welcome', hideInMenu: true }
{ path: '/system/user-management', component: './user-management', hideInMenu: true }

// ❌ 不能删除 routes.ts
// 否则 UmiJS 不知道如何渲染组件
```

**关键点**：
- `hideInMenu: true` - 不作为菜单数据源
- 只定义路由到组件的映射关系
- 菜单显示由数据库控制

## 🧪 测试验证

### 测试场景1：正常启动

```bash
# 1. 清空数据库
mongo aspire-admin --eval "db.dropDatabase()"

# 2. 启动应用
dotnet run --project Platform.AppHost

# 3. 注册并登录

# 预期结果：
# ✅ 看到6个菜单（从数据库）
# ✅ 控制台："✅ 使用数据库菜单"
```

### 测试场景2：菜单缺失（模拟故障）

```bash
# 1. 删除所有菜单
mongo aspire-admin --eval "db.menus.deleteMany({})"

# 2. 刷新页面

# 预期结果：
# ❌ 左侧菜单为空
# ⚠️ 控制台："数据库中没有菜单，请检查系统初始化"
# ✅ 明确的问题提示
```

### 测试场景3：权限过滤

```bash
# 1. 创建受限角色（只有部分 MenuIds）
POST /api/role
{
  "name": "受限用户",
  "menuIds": ["welcome_id", "user_management_id"],
  "permissionIds": ["user:read"]
}

# 2. 分配给用户并登录

# 预期结果：
# ✅ 只看到：欢迎、系统管理>用户管理
# ✅ 其他菜单被过滤
```

## 📊 数据流图

### 完整的菜单加载流程

```
应用启动
  ↓
[后端] DatabaseInitializerService
  ├─ 检查菜单数量
  ├─ 为 0 → 创建6个全局菜单
  └─ > 0 → 跳过
  ↓
[数据库] menus 集合
  └─ 6 个全局菜单（无 companyId）
  ↓
用户登录
  ↓
[前端] getInitialState()
  ├─ 调用 /api/currentUser
  └─ 调用 /api/menu/user
  ↓
[后端] MenuController.GetUserMenus()
  ├─ 获取用户角色
  ├─ 读取角色的 MenuIds
  ├─ 从数据库查询这些菜单
  └─ 返回过滤后的菜单树
  ↓
[前端] currentUser.menus = 数据库菜单
  ↓
[前端] menuDataRender()
  └─ 转换并渲染数据库菜单
  ↓
左侧菜单栏显示
```

## 🎯 核心原则

### 单一数据源原则

1. **菜单的唯一真相源**: 数据库
2. **routes.ts 的职责**: 路由映射（path → component）
3. **不使用后备方案**: 问题应该立即暴露，而不是被隐藏

### 明确失败原则

```
数据库菜单缺失
  ↓
❌ 不应该：显示静态菜单（隐藏问题）
✅ 应该：显示空菜单+警告（暴露问题）
  ↓
开发者立即发现并修复
```

## 📚 相关文档

- [全局菜单架构设计](./GLOBAL-MENU-ARCHITECTURE.md)
- [菜单渲染机制](./MENU-RENDERING-MECHANISM.md)
- [DatabaseInitializerService](mdc:Platform.ApiService/Services/DatabaseInitializerService.cs)
- [app.tsx 配置](mdc:Platform.Admin/src/app.tsx)
- [routes.ts 配置](mdc:Platform.Admin/config/routes.ts)

## 🎊 总结

### 架构变更完成

- ✅ routes.ts 只负责路由映射（hideInMenu: true）
- ✅ 菜单100%从数据库加载
- ✅ 移除后备方案，明确失败
- ✅ 系统初始化创建全局菜单
- ✅ 用户注册不再创建菜单
- ✅ 删除菜单管理模块

### 使用建议

**开发环境**：
1. 启动前确保数据库为空（会自动初始化）
2. 监控初始化日志，确认菜单创建成功
3. 如有问题，清空数据库重新初始化

**生产环境**：
1. 部署前确保数据库已初始化
2. 监控菜单API响应，确保返回正确
3. 配置告警，菜单为空时及时通知

---

**状态**: ✅ 已完成  
**测试**: ✅ 已验证  
**文档**: ✅ 已完善

