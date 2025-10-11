# 软删除感知的数据初始化

## 改进概述

在数据初始化逻辑中全面考虑软删除场景，确保：
1. **检查时只查找未删除的记录** - 避免误判已软删除的记录为"已存在"
2. **自动恢复已删除的关键数据** - 如果发现默认数据被软删除，自动恢复
3. **完整的日志输出** - 清晰显示恢复、创建、更新等操作

## 问题场景分析

### 场景 1：admin 用户被误删除

**问题**：
```
1. 管理员误操作软删除了 admin 用户
2. 系统重启时，初始化脚本查询 username == "admin"
3. 找到已软删除的 admin 用户，认为用户存在
4. 不执行任何操作
5. 结果：无法登录系统（admin 用户被软删除）
```

**解决**：
- 查询时过滤软删除的用户
- 如果发现已软删除的 admin 用户，自动恢复

### 场景 2：默认菜单被删除

**问题**：
```
1. 系统管理菜单被软删除
2. 重启时查询 name == "system"
3. 找到已软删除的菜单，认为存在
4. 不创建新菜单
5. 结果：菜单不显示，无法访问子菜单
```

**解决**：
- 查询时过滤软删除的菜单
- 如果发现已软删除的默认菜单，自动恢复

### 场景 3：默认角色被删除

**问题**：
```
1. super-admin 角色被软删除
2. admin 用户失去角色权限
3. 重启时查询 name == "super-admin"
4. 找到已软删除的角色，认为存在
5. 结果：权限系统异常
```

**解决**：
- 查询时过滤软删除的角色
- 如果发现已软删除的默认角色，自动恢复并更新权限

## 改进实现

### 1. CreateAdminUser.cs - 管理员用户初始化

#### 改进前
```csharp
// ❌ 没有考虑软删除
var existingAdmin = await users.Find(u => u.Username == "admin").FirstOrDefaultAsync();
if (existingAdmin != null)
{
    // 直接返回，即使用户已被软删除
    return;
}
```

#### 改进后
```csharp
// ✅ 充分考虑软删除
// 1. 首先检查未删除的 admin 用户
var filter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
    SoftDeleteExtensions.NotDeleted<AppUser>()
);
var existingAdmin = await users.Find(filter).FirstOrDefaultAsync();

if (existingAdmin != null)
{
    Console.WriteLine($"✓ 管理员用户已存在");
    return;
}

// 2. 检查是否存在已软删除的 admin 用户
var deletedFilter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(u => u.Username, "admin"),
    Builders<AppUser>.Filter.Eq(u => u.IsDeleted, true)
);
var deletedAdmin = await users.Find(deletedFilter).FirstOrDefaultAsync();

if (deletedAdmin != null)
{
    // 3. 恢复已软删除的 admin 用户
    var update = Builders<AppUser>.Update
        .Set(u => u.IsDeleted, false)
        .Set(u => u.DeletedAt, null)
        .Set(u => u.DeletedBy, null)
        .Set(u => u.DeletedReason, null)
        .Set(u => u.IsActive, true)
        .Set(u => u.UpdatedAt, DateTime.UtcNow);

    await users.UpdateOneAsync(u => u.Id == deletedAdmin.Id, update);
    Console.WriteLine($"  ↻ 恢复已软删除的管理员用户");
    return;
}

// 4. 创建新的 admin 用户
```

### 2. InitialMenuData.cs - 菜单和角色初始化

#### 菜单检查逻辑改进

```csharp
// ✅ 三层检查策略

// 第 1 层：检查未删除的菜单
var filter = Builders<Menu>.Filter.And(
    Builders<Menu>.Filter.Eq(m => m.Name, menuName),
    SoftDeleteExtensions.NotDeleted<Menu>()
);
var existing = await _menus.Find(filter).FirstOrDefaultAsync();

if (existing != null)
{
    // 菜单存在且未删除
    return existing;
}

// 第 2 层：检查已软删除的菜单
var deletedFilter = Builders<Menu>.Filter.And(
    Builders<Menu>.Filter.Eq(m => m.Name, menuName),
    Builders<Menu>.Filter.Eq(m => m.IsDeleted, true)
);
var deletedMenu = await _menus.Find(deletedFilter).FirstOrDefaultAsync();

if (deletedMenu != null)
{
    // 恢复已软删除的菜单
    var update = Builders<Menu>.Update
        .Set(m => m.IsDeleted, false)
        .Set(m => m.DeletedAt, null)
        .Set(m => m.DeletedBy, null)
        .Set(m => m.DeletedReason, null)
        .Set(m => m.IsEnabled, true)
        .Set(m => m.UpdatedAt, DateTime.UtcNow);

    await _menus.UpdateOneAsync(m => m.Id == deletedMenu.Id, update);
    Console.WriteLine($"  ↻ 恢复已删除菜单: {deletedMenu.Title}");
    return deletedMenu;
}

// 第 3 层：创建新菜单
await _menus.InsertOneAsync(newMenu);
Console.WriteLine($"  + 创建菜单: {newMenu.Title}");
```

#### 角色检查逻辑改进

```csharp
// ✅ 角色检查同样采用三层策略

// 1. 检查未删除的角色
var filter = Builders<Role>.Filter.And(
    Builders<Role>.Filter.Eq(r => r.Name, roleName),
    SoftDeleteExtensions.NotDeleted<Role>()
);

// 2. 检查已软删除的角色并恢复
// 3. 创建新角色
```

### 3. FixAllEntitiesIsDeletedField.cs - 通用字段修复

这个脚本修复所有实体的 `IsDeleted` 字段，确保：
- 所有记录都有正确的 `IsDeleted` 字段
- 历史数据能够被正确查询

## 初始化流程

```
系统启动
    ↓
1. 修复所有实体的 IsDeleted 字段
   ├── 用户: 修复 X 条
   ├── 菜单: 修复 Y 条
   ├── 角色: 修复 Z 条
   └── ... 其他实体
    ↓
2. 创建/恢复 admin 用户
   ├── 检查未删除的 admin 用户
   │   └── 存在 → 完成
   ├── 检查已删除的 admin 用户
   │   └── 存在 → 恢复用户
   └── 都不存在 → 创建新用户
    ↓
3. 检查菜单完整性
   ├── 对每个默认菜单：
   │   ├── 检查未删除的菜单
   │   │   └── 存在 → 使用现有菜单
   │   ├── 检查已删除的菜单
   │   │   └── 存在 → 恢复菜单
   │   └── 都不存在 → 创建新菜单
   └── 返回所有菜单 ID 映射
    ↓
4. 检查角色完整性
   ├── 对每个默认角色：
   │   ├── 检查未删除的角色
   │   │   └── 存在 → 检查并更新权限
   │   ├── 检查已删除的角色
   │   │   └── 存在 → 恢复角色并更新权限
   │   └── 都不存在 → 创建新角色
   └── 完成
    ↓
5. 验证 admin 用户角色
   └── 确保 admin 用户有 super-admin 角色
```

## 日志输出示例

### 完整输出（包含恢复操作）

```
========================================
开始修复所有实体的 IsDeleted 字段...
========================================

✓ 用户: 修复了 5 条记录
✓ 菜单: 修复了 6 条记录
✓ 角色: 修复了 3 条记录
✓ 用户活动日志: 所有记录的 IsDeleted 字段都已正确设置
✓ 通知: 所有记录的 IsDeleted 字段都已正确设置
✓ 标签: 所有记录的 IsDeleted 字段都已正确设置
✓ 规则: 所有记录的 IsDeleted 字段都已正确设置

========================================
修复完成！共修复 14 条记录
========================================

✓ 恢复已软删除的管理员用户:
  - 用户名: admin
  - 邮箱: admin@example.com
  - ID: 67890123456789012345678
  - 删除时间: 2025-10-10T08:00:00Z

========================================
开始检查数据完整性...
========================================

[菜单完整性检查]
  ✓ 菜单已存在: 系统管理 (system)
  ↻ 恢复已删除菜单: 欢迎 (welcome)
  ✓ 菜单已存在: 用户管理 (user-management)
  + 创建菜单: 角色管理 (role-management)
  ✓ 菜单已存在: 菜单管理 (menu-management)
  ✓ 菜单已存在: 用户日志 (user-log)

  菜单检查完成: 已存在 4 个，新创建 1 个，恢复 1 个，共 6 个

[角色完整性检查]
  ✓ 角色已存在: super-admin (超级管理员，拥有所有权限)
    → 更新菜单权限: 6 个菜单
  ↻ 恢复已删除角色: admin (普通管理员，除菜单管理外的所有权限)
  ✓ 角色已存在: user (普通用户，仅有基本访问权限)

  角色检查完成: 已存在 2 个，新创建 0 个，恢复 1 个，更新 1 个

[管理员用户角色检查]
  ✓ admin 用户已拥有 super-admin 角色

========================================
数据完整性检查完成
========================================
```

## 符号说明

| 符号 | 含义 | 说明 |
|-----|------|-----|
| ✓ | 已存在 | 数据已存在且未删除 |
| + | 创建 | 新创建的数据 |
| ↻ | 恢复 | 恢复已软删除的数据 |
| → | 更新 | 更新现有数据 |
| ⚠ | 警告 | 需要注意的情况 |

## 恢复操作详解

### 恢复用户
```csharp
var update = Builders<AppUser>.Update
    .Set(u => u.IsDeleted, false)        // 清除删除标志
    .Set(u => u.DeletedAt, null)         // 清除删除时间
    .Set(u => u.DeletedBy, null)         // 清除删除操作人
    .Set(u => u.DeletedReason, null)     // 清除删除原因
    .Set(u => u.IsActive, true)          // 重新激活
    .Set(u => u.UpdatedAt, DateTime.UtcNow);  // 更新时间
```

### 恢复菜单
```csharp
var update = Builders<Menu>.Update
    .Set(m => m.IsDeleted, false)        // 清除删除标志
    .Set(m => m.DeletedAt, null)         // 清除删除时间
    .Set(m => m.DeletedBy, null)         // 清除删除操作人
    .Set(m => m.DeletedReason, null)     // 清除删除原因
    .Set(m => m.IsEnabled, true)         // 重新启用
    .Set(m => m.UpdatedAt, DateTime.UtcNow);  // 更新时间
```

### 恢复角色
```csharp
var update = Builders<Role>.Update
    .Set(r => r.IsDeleted, false)        // 清除删除标志
    .Set(r => r.DeletedAt, null)         // 清除删除时间
    .Set(r => r.DeletedBy, null)         // 清除删除操作人
    .Set(r => r.DeletedReason, null)     // 清除删除原因
    .Set(r => r.IsActive, true)          // 重新激活
    .Set(r => r.MenuIds, defaultMenuIds) // 更新菜单权限
    .Set(r => r.UpdatedAt, DateTime.UtcNow);  // 更新时间
```

## 测试场景

### 场景 1：正常初始化（全新数据库）
```
输入: 空数据库
输出:
  + 创建管理员用户: admin
  + 创建 6 个菜单
  + 创建 3 个角色
```

### 场景 2：所有数据完整（未删除）
```
输入: admin 用户、6个菜单、3个角色都存在且未删除
输出:
  ✓ admin 用户已存在
  ✓ 6个菜单已存在
  ✓ 3个角色已存在
```

### 场景 3：admin 用户被软删除
```
输入: admin 用户存在但 IsDeleted = true
输出:
  ↻ 恢复已软删除的管理员用户
  - 用户名: admin
  - 删除时间: 2025-10-10T08:00:00Z
```

### 场景 4：默认菜单被部分软删除
```
输入: welcome 和 system 菜单被软删除，其他菜单正常
输出:
  ↻ 恢复已删除菜单: 欢迎 (welcome)
  ↻ 恢复已删除菜单: 系统管理 (system)
  ✓ 其他 4 个菜单已存在
  
  菜单检查完成: 已存在 4 个，新创建 0 个，恢复 2 个，共 6 个
```

### 场景 5：super-admin 角色被软删除
```
输入: super-admin 角色被软删除
输出:
  ↻ 恢复已删除角色: super-admin (超级管理员，拥有所有权限)
  ✓ admin 角色已存在
  ✓ user 角色已存在
  
  角色检查完成: 已存在 2 个，新创建 0 个，恢复 1 个
```

### 场景 6：IsDeleted 字段缺失
```
输入: 数据存在但 IsDeleted 字段为 null
输出:
  [字段修复阶段]
  ✓ 用户: 修复了 1 条记录
  ✓ 菜单: 修复了 6 条记录
  ✓ 角色: 修复了 3 条记录
  
  [数据完整性检查]
  ✓ 所有数据正常
```

## 关键改进点

### 1. 三层检查策略

对于所有关键数据（用户、菜单、角色）：

1. **第一层** - 检查未删除的记录
   - 使用 `SoftDeleteExtensions.NotDeleted<T>()`
   - 找到则使用现有记录

2. **第二层** - 检查已软删除的记录
   - 使用 `IsDeleted == true` 过滤
   - 找到则自动恢复

3. **第三层** - 创建新记录
   - 如果前两层都没找到，创建新记录
   - 显式设置 `IsDeleted = false`

### 2. 恢复操作规范

恢复软删除的记录时：
- ✅ 清除所有软删除相关字段（`IsDeleted`, `DeletedAt`, `DeletedBy`, `DeletedReason`）
- ✅ 重新激活记录（`IsActive = true`, `IsEnabled = true`）
- ✅ 更新修改时间（`UpdatedAt = DateTime.UtcNow`）
- ✅ 对于角色，同时更新菜单权限

### 3. 日志输出优化

- ✓ 已存在（绿色含义）
- + 新创建（蓝色含义）
- ↻ 恢复（黄色含义，表示恢复操作）
- → 更新（青色含义）
- ⚠ 警告（红色含义）

### 4. 统计信息增强

```csharp
var summary = $"检查完成: 已存在 {existingCount} 个，新创建 {createdCount} 个";
if (restoredCount > 0)
    summary += $"，恢复 {restoredCount} 个";
if (updatedCount > 0)
    summary += $"，更新 {updatedCount} 个";
```

## 数据库操作优化

### 查询优化

```csharp
// ✅ 推荐：使用组合过滤器
var filter = Builders<T>.Filter.And(
    Builders<T>.Filter.Eq(x => x.Name, name),
    SoftDeleteExtensions.NotDeleted<T>()
);

// ❌ 避免：分开查询
var all = await collection.Find(_ => true).ToListAsync();
var filtered = all.Where(x => x.Name == name && !x.IsDeleted).ToList();
```

### 批量更新优化

```csharp
// ✅ 推荐：使用 UpdateDefinition
var update = Builders<T>.Update
    .Set(x => x.IsDeleted, false)
    .Set(x => x.DeletedAt, null)
    .Set(x => x.UpdatedAt, DateTime.UtcNow);

await collection.UpdateOneAsync(filter, update);
```

## 数据安全保障

### 1. 关键数据自动恢复

以下数据如果被软删除，系统启动时会自动恢复：
- ✅ admin 用户
- ✅ 6 个默认菜单（welcome, system, user-management, role-management, menu-management, user-log）
- ✅ 3 个默认角色（super-admin, admin, user）

### 2. 恢复时的数据完整性

恢复时会：
- ✅ 清除所有软删除相关字段
- ✅ 重新激活记录
- ✅ 对于角色，确保菜单权限正确
- ✅ 对于用户，确保角色分配正确

### 3. 历史数据保护

- ✅ 保留原始 ID，不创建新记录
- ✅ 保留创建时间（`CreatedAt`）
- ✅ 更新修改时间（`UpdatedAt`）

## 性能影响

### 查询次数

| 操作 | 原逻辑 | 新逻辑 | 影响 |
|-----|--------|--------|------|
| 检查 admin 用户 | 1 次 | 2 次（最多） | 可接受 |
| 检查每个菜单 | 1 次 | 2 次（最多） | 可接受 |
| 检查每个角色 | 1 次 | 2 次（最多） | 可接受 |

**总体影响**：
- 最坏情况：查询次数增加一倍
- 仅在启动时执行一次
- 性能影响可忽略不计

### 索引优化建议

```javascript
// 为常用查询字段创建复合索引
db.users.createIndex({ "username": 1, "isDeleted": 1 })
db.menus.createIndex({ "name": 1, "isDeleted": 1 })
db.roles.createIndex({ "name": 1, "isDeleted": 1 })
```

## 修改的文件

### 初始化脚本（2个）
1. `Platform.ApiService/Scripts/CreateAdminUser.cs`
   - 添加软删除过滤
   - 添加恢复逻辑
   - 添加命名空间引用

2. `Platform.ApiService/Scripts/InitialMenuData.cs`
   - 菜单检查添加软删除过滤和恢复逻辑
   - 角色检查添加软删除过滤和恢复逻辑
   - 优化日志输出
   - 添加命名空间引用

### 新增文件（1个）
1. `Platform.ApiService/Scripts/FixAllEntitiesIsDeletedField.cs`
   - 通用字段修复脚本
   - 支持所有实体类型

### 服务层（7个）
所有创建实体的代码都已添加 `IsDeleted = false`：
1. `UserService.cs`
2. `AuthService.cs`
3. `MenuService.cs`
4. `RoleService.cs`
5. `NoticeService.cs`
6. `TagService.cs`
7. `RuleService.cs`
8. `UserActivityLogService.cs`

## 编译状态

✅ **编译成功** - 无错误  
⚠️ **Linter 警告** - 2 个（代码质量建议，不影响功能）

## 最佳实践总结

### 1. 初始化时充分考虑软删除

```csharp
// ✅ 推荐模式
public async Task EnsureEntityExists()
{
    // 1. 检查未删除的记录
    var existing = await FindNotDeleted();
    if (existing != null) return existing;
    
    // 2. 检查已删除的记录并恢复
    var deleted = await FindDeleted();
    if (deleted != null) return await Restore(deleted);
    
    // 3. 创建新记录
    return await Create();
}
```

### 2. 所有创建操作都要设置 IsDeleted

```csharp
// ✅ 推荐
var entity = new Entity
{
    // ... 业务字段
    IsDeleted = false,  // 必须设置
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};
```

### 3. 查询时使用软删除过滤器

```csharp
// ✅ 推荐
var filter = Builders<T>.Filter.And(
    Builders<T>.Filter.Eq(x => x.Name, name),
    SoftDeleteExtensions.NotDeleted<T>()
);

// ❌ 避免
var entity = await collection.Find(x => x.Name == name).FirstOrDefaultAsync();
```

## 系统健壮性提升

### 改进前的风险

| 风险 | 影响 | 概率 |
|-----|------|------|
| admin 用户被删除无法恢复 | 无法登录系统 | 中 |
| 默认菜单被删除无法访问 | 菜单丢失 | 中 |
| 默认角色被删除权限异常 | 权限系统失效 | 中 |
| IsDeleted 字段缺失导致查询失败 | 数据不可见 | 高 |

### 改进后的保障

| 保障 | 效果 |
|-----|------|
| 自动恢复关键数据 | ✅ 系统自愈 |
| 三层检查策略 | ✅ 数据完整 |
| 字段自动修复 | ✅ 历史兼容 |
| 详细日志输出 | ✅ 问题可追踪 |

## 总结

此次改进实现了真正的**软删除感知初始化**，确保：

1. ✅ **自动恢复** - 关键数据被删除后自动恢复
2. ✅ **数据完整性** - 三层检查确保数据完整
3. ✅ **历史兼容** - 自动修复历史数据的字段问题
4. ✅ **运维友好** - 详细的日志便于排查问题
5. ✅ **系统健壮** - 提高系统容错能力

系统现在能够智能处理软删除相关的各种边界情况，大大提高了数据初始化的可靠性和系统的健壮性。

