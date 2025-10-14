# MongoDB 索引多租户修复

## 📋 问题描述

系统启动时创建索引失败：
```
E11000 duplicate key error collection: mongodb.roles index: idx_name_unique 
dup key: { name: "admin" }
```

**原因**：角色和权限的唯一索引设置为全局唯一，但多租户系统中每个企业都需要有自己的"管理员"角色和权限。

## 🔍 问题分析

### 错误的索引设计

#### 角色索引（错误）
```csharp
// ❌ 问题：name字段全局唯一
var nameIndex = Builders<Role>.IndexKeys.Ascending(r => r.Name);
await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
    nameIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_name_unique" }
));
```

**问题**：
- 只允许一个"管理员"角色存在
- 但每个企业都需要自己的"管理员"角色
- 导致索引创建失败

#### 权限索引（错误）
```csharp
// ❌ 问题：code字段全局唯一
var codeIndex = Builders<Permission>.IndexKeys.Ascending(p => p.Code);
await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
    codeIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_code_unique" }
));
```

**问题**：
- 只允许一个"user:create"权限存在
- 但每个企业都需要自己的权限
- 导致重复数据冲突

### 多租户数据示例

```javascript
// 企业A的角色
{
  _id: "role1",
  name: "管理员",
  companyId: "companyA",  // 企业A
  // ...
}

// 企业B的角色
{
  _id: "role2",
  name: "管理员",
  companyId: "companyB",  // 企业B
  // ...
}

// ❌ 全局唯一索引会拒绝第二个"管理员"
// ✅ 企业内唯一索引允许不同企业有相同名称
```

## ✅ 解决方案

### 修改角色索引

**文件**: `Platform.ApiService/Scripts/CreateDatabaseIndexes.cs`

**修改前**:
```csharp
// ❌ 全局唯一
var nameIndex = Builders<Role>.IndexKeys.Ascending(r => r.Name);
await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
    nameIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_name_unique" }
));
```

**修改后**:
```csharp
// ✅ 企业内唯一
var companyNameIndex = Builders<Role>.IndexKeys
    .Ascending(r => r.CompanyId)
    .Ascending(r => r.Name);
await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
    companyNameIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_companyId_name_unique" }
));

// 额外添加 companyId 索引（用于企业过滤）
var companyIdIndex = Builders<Role>.IndexKeys.Ascending(r => r.CompanyId);
await roles.Indexes.CreateOneAsync(new CreateIndexModel<Role>(
    companyIdIndex,
    new CreateIndexOptions { Name = "idx_companyId" }
));
```

### 修改权限索引

**修改前**:
```csharp
// ❌ 全局唯一
var codeIndex = Builders<Permission>.IndexKeys.Ascending(p => p.Code);
await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
    codeIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_code_unique" }
));
```

**修改后**:
```csharp
// ✅ 企业内唯一
var companyCodeIndex = Builders<Permission>.IndexKeys
    .Ascending(p => p.CompanyId)
    .Ascending(p => p.Code);
await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
    companyCodeIndex,
    new CreateIndexOptions { Unique = true, Name = "idx_companyId_code_unique" }
));

// 额外添加 companyId 索引（用于企业过滤）
var companyIdIndex = Builders<Permission>.IndexKeys.Ascending(p => p.CompanyId);
await permissions.Indexes.CreateOneAsync(new CreateIndexModel<Permission>(
    companyIdIndex,
    new CreateIndexOptions { Name = "idx_companyId" }
));
```

## 📊 索引设计对比

### 修复前

| 集合 | 唯一索引 | 问题 |
|------|---------|------|
| roles | name | ❌ 全局唯一，不支持多租户 |
| permissions | code | ❌ 全局唯一，不支持多租户 |

### 修复后

| 集合 | 唯一索引 | 额外索引 | 效果 |
|------|---------|---------|------|
| roles | companyId + name | companyId | ✅ 企业内唯一，支持多租户 |
| permissions | companyId + code | companyId | ✅ 企业内唯一，支持多租户 |

## 🗑️ 清理旧索引和重复数据

### 方法1：删除数据库重新初始化（推荐）
```bash
# 停止服务
pkill -f "Platform.AppHost"

# 删除MongoDB容器
docker stop <container-id>
docker rm <container-id>

# 重新启动（Aspire会自动创建新容器）
dotnet run --project Platform.AppHost
```

### 方法2：手动清理索引和数据

```javascript
// MongoDB Shell
use mongodb

// 1. 删除旧的唯一索引
db.roles.dropIndex("idx_name_unique")
db.permissions.dropIndex("idx_code_unique")

// 2. 查找并删除重复数据（保留第一个）
db.roles.aggregate([
  { $group: { _id: { name: "$name", companyId: "$companyId" }, count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
]).forEach(function(doc) {
  doc.docs.shift(); // 保留第一个
  db.roles.deleteMany({ _id: { $in: doc.docs } });
});

db.permissions.aggregate([
  { $group: { _id: { code: "$code", companyId: "$companyId" }, count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
]).forEach(function(doc) {
  doc.docs.shift(); // 保留第一个
  db.permissions.deleteMany({ _id: { $in: doc.docs } });
});

// 3. 重启应用，让它创建新的复合唯一索引
```

## ✅ 新索引的优势

### 1. 支持多租户
```javascript
// ✅ 允许不同企业有相同的角色名
db.roles.insert({ name: "管理员", companyId: "companyA" })  // OK
db.roles.insert({ name: "管理员", companyId: "companyB" })  // OK

// ❌ 禁止同一企业内重复
db.roles.insert({ name: "管理员", companyId: "companyA" })  // Error
```

### 2. 查询性能优化
```csharp
// 使用 companyId 索引快速过滤
var roles = await _roles.Find(r => r.CompanyId == companyId).ToListAsync();

// 使用复合索引快速查找
var role = await _roles.Find(r => 
    r.CompanyId == companyId && 
    r.Name == "管理员"
).FirstOrDefaultAsync();
```

### 3. 数据完整性
```
✓ 企业内角色名称不重复
✓ 企业内权限代码不重复
✓ 不同企业可以有相同的角色/权限
✓ 符合多租户隔离原则
```

## 🧪 验证测试

### 测试1：创建重复角色（同一企业）
```csharp
// 企业A创建"管理员"角色
var role1 = new Role
{
    Name = "管理员",
    CompanyId = "companyA"
};
await roles.InsertOneAsync(role1);  // ✅ 成功

// 企业A再次创建"管理员"角色
var role2 = new Role
{
    Name = "管理员",
    CompanyId = "companyA"
};
await roles.InsertOneAsync(role2);  // ❌ 失败：E11000 duplicate key
```

### 测试2：不同企业相同名称（允许）
```csharp
// 企业A创建"管理员"角色
var roleA = new Role { Name = "管理员", CompanyId = "companyA" };
await roles.InsertOneAsync(roleA);  // ✅ 成功

// 企业B创建"管理员"角色
var roleB = new Role { Name = "管理员", CompanyId = "companyB" };
await roles.InsertOneAsync(roleB);  // ✅ 成功
```

## 📝 相关修改

### 修改的文件
- `Platform.ApiService/Scripts/CreateDatabaseIndexes.cs`
  - 修改roles索引：name → companyId + name
  - 修改permissions索引：code → companyId + code
  - 添加companyId单独索引提升查询性能

### 索引变更清单

| 集合 | 旧索引 | 新索引 | 说明 |
|------|--------|--------|------|
| roles | idx_name_unique (name) | idx_companyId_name_unique (companyId + name) | 企业内唯一 |
| roles | - | idx_companyId (companyId) | 新增，提升过滤性能 |
| permissions | idx_code_unique (code) | idx_companyId_code_unique (companyId + code) | 企业内唯一 |
| permissions | - | idx_companyId (companyId) | 新增，提升过滤性能 |

## 🎯 最佳实践

### 多租户索引设计原则

1. **企业内唯一** - 业务唯一性约束加上 companyId
```csharp
// ✅ 正确：复合唯一索引
Builders<Entity>.IndexKeys
    .Ascending(e => e.CompanyId)
    .Ascending(e => e.UniqueField)
```

2. **全局唯一** - 真正需要全局唯一的字段
```csharp
// ✅ 正确：用户名全局唯一
Builders<AppUser>.IndexKeys.Ascending(u => u.Username)
// 用户可以在不同企业工作，用户名必须全局唯一
```

3. **过滤索引** - 为CompanyId字段创建索引
```csharp
// ✅ 正确：提升企业数据过滤性能
Builders<Entity>.IndexKeys.Ascending(e => e.CompanyId)
```

### 索引创建检查清单

创建多租户实体的索引时，检查：

- [ ] 业务唯一字段是否加上了 CompanyId
- [ ] CompanyId 是否有单独索引
- [ ] 是否考虑了软删除字段
- [ ] 是否添加了常用查询的复合索引
- [ ] 唯一索引是否使用 sparse 选项（允许null）

## 🚀 测试验证

### 方法1：通过浏览器测试（推荐）

1. **访问注册页面**：
   ```
   http://localhost:15001/user/register
   ```

2. **填写注册信息**：
   - 用户名：testuser001
   - 密码：Test123456
   - 邮箱：test001@example.com

3. **提交注册**

4. **预期结果**：
   - ✅ 注册成功，无索引错误
   - ✅ 系统自动创建企业
   - ✅ 自动创建企业专属的角色、权限、菜单
   - ✅ 跳转到登录页

### 方法2：通过API测试

```bash
curl -X POST http://localhost:15000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser002",
    "password": "Test123456",
    "email": "test002@example.com"
  }'
```

### 方法3：查看Aspire Dashboard

访问：`http://localhost:17064`

检查：
- API服务是否正常运行
- MongoDB容器是否正常
- 索引创建日志

### 方法4：验证索引创建

通过 Mongo Express（http://localhost:8081）查看：
1. 进入 `mongodb` 数据库
2. 查看 `roles` 集合的索引
3. 确认存在 `idx_companyId_name_unique` 索引
4. 查看 `permissions` 集合的索引
5. 确认存在 `idx_companyId_code_unique` 索引

## 📚 相关文档

- [CreateDatabaseIndexes.cs](mdc:Platform.ApiService/Scripts/CreateDatabaseIndexes.cs)
- [多租户数据隔离规范](mdc:.cursor/rules/multi-tenant-data-isolation.mdc)
- [MongoDB事务修复](mdc:docs/bugfixes/MONGODB-TRANSACTION-FIX.md)
- [移除全局数据初始化](mdc:docs/reports/REMOVE-GLOBAL-DATA-INITIALIZATION.md)

## 🎯 核心原则

1. **企业内唯一** - 业务唯一性约束在企业范围内
2. **全局唯一** - 用户标识（username、email）全局唯一
3. **过滤索引** - CompanyId字段必须有索引
4. **性能优先** - 为常用查询创建复合索引
5. **数据完整性** - 索引确保数据一致性

遵循这些原则，确保多租户系统的索引设计正确！

---

**修复时间**: 2025-10-14  
**版本**: v3.1.1  
**状态**: ✅ 已完成
