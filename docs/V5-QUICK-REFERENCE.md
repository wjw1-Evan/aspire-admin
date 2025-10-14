# v5.0 快速参考指南

## 🚀 快速开始

### 全新部署

```bash
# 1. 启动应用
dotnet run --project Platform.AppHost

# 2. 等待初始化完成（约5秒）
# 查看日志："全局系统菜单创建完成（6 个）"

# 3. 访问应用
open http://localhost:15001

# 4. 注册第一个用户
# 自动创建：企业、24个权限、管理员角色
```

### 多实例测试

```bash
# 测试并发启动
./test-concurrent-startup.sh

# 预期结果：
# ✅ 只有1个实例执行初始化
# ✅ 其他实例安全跳过
```

## 📋 v5.0 核心变更

### 1. 数据库初始化

**精简前**（v4.0）：
```csharp
// 40+ 行初始化代码
var fixAllEntities = new FixAllEntitiesIsDeletedField(database);
await fixAllEntities.FixAsync();
// ... 10+ 个脚本
```

**精简后**（v5.0）：
```csharp
// 5 行
var initializer = scope.ServiceProvider.GetRequiredService<IDatabaseInitializerService>();
await initializer.InitializeAsync();
```

### 2. 全局菜单

**菜单归属**：
- v4.0: 企业专属（有 CompanyId）
- v5.0: 全局资源（无 CompanyId）

**创建时机**：
- v4.0: 用户注册时
- v5.0: 系统初始化时

**用户管理**：
- v4.0: ✅ 可管理
- v5.0: ❌ 不可管理

### 3. 权限变化

**移除的权限**（8个）：
```
menu:create
menu:read
menu:update
menu:delete
permission:create  // 权限也不再允许创建
permission:read
permission:update
permission:delete
```

**保留的权限**（24个）：
```
user:* (4个)
role:* (4个)
notice:* (4个)
tag:* (4个)
activity-log:* (4个)
company:* (4个)
```

## 🗄️ 数据库状态

### 空数据库启动后

```javascript
db.menus.countDocuments()          // 6（全局菜单）
db.system_locks.countDocuments()   // 1（分布式锁）
db.companies.countDocuments()      // 0（无默认企业）
db.users.countDocuments()          // 0（无默认用户）
db.permissions.countDocuments()    // 0（无全局权限）
```

### 用户注册后

```javascript
db.companies.countDocuments()      // 1（用户的个人企业）
db.users.countDocuments()          // 1（注册的用户）
db.permissions.countDocuments()    // 24（企业的权限）
db.roles.countDocuments()          // 1（管理员角色）
db.user_companies.countDocuments() // 1（用户-企业关联）
db.menus.countDocuments()          // 6（全局菜单，不增加）
```

## 🎯 关键文件

### 后端核心

| 文件 | 作用 |
|-----|------|
| `Services/DatabaseInitializerService.cs` | 统一初始化管理 |
| `Services/DistributedLockService.cs` | 分布式锁实现 |
| `Scripts/CreateAllIndexes.cs` | 索引创建（含重复数据清理） |
| `Models/MenuModels.cs` | 菜单模型（BaseEntity，无 CompanyId） |
| `Services/MenuService.cs` | 菜单服务（只读） |
| `Controllers/MenuController.cs` | 菜单 API（只读） |

### 前端核心

| 文件 | 变更 |
|-----|------|
| `config/routes.ts` | 业务路由 hideInMenu: true |
| `src/app.tsx` | menuDataRender 只使用数据库菜单 |

### 删除的文件

- ❌ `Platform.Admin/src/pages/menu-management/` - 菜单管理页面
- ❌ `Platform.ApiService/Scripts/` 下 11 个迁移脚本

## 📖 重要文档

### 必读文档

1. **[V5 优化完成报告](./reports/V5-OPTIMIZATION-COMPLETE.md)** - 完整的优化总结
2. **[全局菜单架构](./features/GLOBAL-MENU-ARCHITECTURE.md)** - 菜单架构设计
3. **[数据库初始化优化](./optimization/DATABASE-INITIALIZATION-OPTIMIZATION.md)** - 初始化详解

### Cursor Rules

1. **[database-initialization.mdc](mdc:.cursor/rules/database-initialization.mdc)** ⚡ 自动应用
2. **[global-menu-architecture.mdc](mdc:.cursor/rules/global-menu-architecture.mdc)** ⚡ 自动应用
3. **[distributed-lock-usage.mdc](mdc:.cursor/rules/distributed-lock-usage.mdc)** 📋 手动引用
4. **[mongodb-atomic-operations.mdc](mdc:.cursor/rules/mongodb-atomic-operations.mdc)** 📋 手动引用
5. **[multi-instance-deployment.mdc](mdc:.cursor/rules/multi-instance-deployment.mdc)** 📋 手动引用

## 🔍 常见问题

### Q1: 如何添加新菜单？

**A**: 修改 `DatabaseInitializerService.cs`：

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

然后清空数据库重启，或手动插入到数据库。

### Q2: 菜单显示为空怎么办？

**A**: 检查步骤：

```bash
# 1. 检查数据库菜单
mongo aspire-admin --eval "db.menus.countDocuments()"

# 2. 检查初始化日志
grep "全局系统菜单" logs/api.log

# 3. 重新初始化
mongo aspire-admin --eval "db.dropDatabase()"
dotnet run --project Platform.AppHost
```

### Q3: 如何控制用户看到的菜单？

**A**: 通过角色的 `MenuIds`：

```csharp
// 创建角色时指定可见菜单
var role = new Role
{
    Name = "客服人员",
    MenuIds = new List<string> 
    { 
        welcomeMenuId,
        userManagementMenuId
    },
    PermissionIds = new List<string> { "user:read" }
};
```

### Q4: 多实例部署需要注意什么？

**A**: 
- ✅ 分布式锁自动处理并发
- ✅ 无需特殊配置
- ✅ 可以直接扩展到多个实例

```yaml
# Kubernetes
spec:
  replicas: 10  # 任意数量
```

### Q5: 如何验证系统运行正常？

**A**: 检查清单：

```bash
# 1. 健康检查
curl http://localhost:15000/health

# 2. 菜单数量
mongo aspire-admin --eval "db.menus.countDocuments()"
# 应该返回 6

# 3. 用户注册
# 访问 /user/register 注册新用户

# 4. 登录查看菜单
# 应该看到完整的菜单树
```

## 🎯 核心原则速查

### 数据库初始化

✅ **使用 DatabaseInitializerService**  
✅ **使用分布式锁保护**  
✅ **确保幂等性**  
❌ **不创建默认企业**  
❌ **不创建全局数据**（Menu 例外）

### 菜单管理

✅ **菜单是全局资源**  
✅ **系统初始化创建**  
✅ **用户不能管理**  
✅ **通过权限控制显示**  
❌ **不在注册时创建**  
❌ **不使用静态路由作为菜单**

### 多租户

✅ **所有业务数据有 CompanyId**  
✅ **Menu 是合理的例外**  
✅ **Permission 有 CompanyId**  
✅ **Role 有 CompanyId**  
❌ **不创建全局业务数据**

## 📊 性能基准

| 操作 | v5.0 性能 |
|-----|----------|
| 首次启动 | 3-5秒 |
| 后续启动 | 0.3-0.5秒 |
| 用户注册 | < 1秒 |
| 获取菜单 | < 100ms |
| 并发启动 | 安全（分布式锁） |

## 🔗 快速链接

- [完整优化报告](./reports/V5-OPTIMIZATION-COMPLETE.md)
- [Cursor Rules 总览](./.cursor/rules/README.md)
- [测试脚本](../test-concurrent-startup.sh)
- [项目 README](../README.md)

---

**版本**: v5.0  
**更新日期**: 2025-01-14  
**状态**: ✅ Production Ready

