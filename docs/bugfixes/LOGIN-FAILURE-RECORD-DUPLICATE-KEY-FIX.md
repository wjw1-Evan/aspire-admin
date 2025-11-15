# 登录失败记录重复键错误修复

## 🐛 问题描述

在登录失败时，MongoDB 抛出以下错误：

### 问题 1: 重复键错误

```
MongoDB.Driver.MongoCommandException: Command findAndModify failed: Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: aspire-admin-db.login_failure_records index: _id_ dup key: { _id: null }.
```

### 问题 2: updatedAt 字段冲突

```
MongoDB.Driver.MongoCommandException: Command findAndModify failed: Updating the path 'updatedAt' would create a conflict at 'updatedAt'.
```

## 🔍 问题原因

### 问题 1: 重复键错误

1. **根本原因**：`RecordFailureAsync` 方法使用 `FindOneAndReplaceWithoutTenantFilterAsync` 配合 `IsUpsert = true` 来插入新记录
2. **触发条件**：`FindOneAndReplaceWithoutTenantFilterAsync` 方法会将 `replacement.Id` 设置为 `null`，以便 MongoDB 自动生成新的 `_id`
3. **错误场景**：如果数据库中已经存在一个 `_id: null` 的文档（可能是之前某个操作失败导致的），再次尝试插入 `_id: null` 的文档就会导致重复键错误

### 问题 2: updatedAt 字段冲突

1. **根本原因**：`FindOneAndUpdateWithoutTenantFilterAsync` 方法内部调用 `WithUpdateAudit` 自动设置 `updatedAt` 字段
2. **触发条件**：在 `RecordFailureAsync` 方法中同时使用 `SetOnInsert` 设置 `UpdatedAt` 和 `WithUpdateAudit` 设置 `updatedAt`
3. **错误场景**：MongoDB 不允许在同一个更新操作中同时使用 `SetOnInsert` 和普通的 `Set` 来更新同一个字段路径，这会导致冲突

## ✅ 解决方案

### 1. 代码修复

**文件**: `Platform.ApiService/Services/AuthService.cs`

**修改内容**：
- 将 `RecordFailureAsync` 方法从使用 `FindOneAndReplaceWithoutTenantFilterAsync` 改为使用 `FindOneAndUpdateWithoutTenantFilterAsync` 配合 `IsUpsert = true`
- 使用 `UpdateBuilder` 的 `Inc` 方法来增加失败次数
- 使用 `SetOnInsert` 方法来设置新记录的初始值
- **重要**：移除 `SetOnInsert` 中的 `UpdatedAt`，因为 `FindOneAndUpdateWithoutTenantFilterAsync` 内部的 `WithUpdateAudit` 会自动设置 `updatedAt`

**优势**：
- 避免了 `Id` 为 `null` 的问题
- 避免了 `updatedAt` 字段冲突的问题
- 使用原子操作，确保数据一致性
- 代码更简洁，逻辑更清晰

### 2. 添加 SetOnInsert 方法

**文件**: `Platform.ServiceDefaults/Services/FilterBuilder.cs`

**修改内容**：
- 在 `UpdateBuilder` 类中添加 `SetOnInsert` 方法，用于在 Upsert 操作中仅在插入时设置字段值

## 🧹 数据库清理

如果数据库中已经存在 `_id: null` 的文档，需要手动清理：

### 方法 1: 使用 MongoDB Shell

```javascript
// 连接到数据库
use aspire-admin-db

// 删除所有 _id 为 null 的文档
db.login_failure_records.deleteMany({ _id: null })

// 验证清理结果
db.login_failure_records.find({ _id: null }).count()
```

### 方法 2: 使用 MongoDB Compass

1. 打开 MongoDB Compass
2. 连接到数据库 `aspire-admin-db`
3. 选择集合 `login_failure_records`
4. 在过滤器中输入：`{ _id: null }`
5. 点击 "Delete" 按钮删除所有匹配的文档

### 方法 3: 使用 C# 脚本

```csharp
// 在 Platform.DataInitializer 或临时脚本中执行
var filter = Builders<LoginFailureRecord>.Filter.Eq(r => r.Id, null);
await collection.DeleteManyAsync(filter);
```

## 📊 修复后的代码逻辑

### 修复前

```csharp
// 创建新记录（使用 FindOneAndReplace 配合 IsUpsert）
var newRecord = new LoginFailureRecord
{
    ClientId = clientId,
    Type = type,
    FailureCount = 1,
    LastFailureAt = DateTime.UtcNow,
    ExpiresAt = DateTime.UtcNow.AddMinutes(30)
};

var options = new FindOneAndReplaceOptions<LoginFailureRecord>
{
    IsUpsert = true,
    ReturnDocument = ReturnDocument.After
};

await _failureRecordFactory.FindOneAndReplaceWithoutTenantFilterAsync(filter, newRecord, options);
```

**问题**：`FindOneAndReplaceWithoutTenantFilterAsync` 会将 `Id` 设置为 `null`，导致重复键错误。

### 修复后

```csharp
// 使用 UpdateOneAsync 配合 IsUpsert，避免 Id 为 null 的问题
// 注意：updatedAt 由 FindOneAndUpdateWithoutTenantFilterAsync 内部的 WithUpdateAudit 自动设置，不需要手动设置
var update = _failureRecordFactory.CreateUpdateBuilder()
    .Inc(r => r.FailureCount, 1) // 增加失败次数（新记录时设置为1，现有记录时增加1）
    .Set(r => r.LastFailureAt, DateTime.UtcNow)
    .Set(r => r.ExpiresAt, DateTime.UtcNow.AddMinutes(30))
    .SetOnInsert(r => r.ClientId, clientId) // 仅在插入时设置
    .SetOnInsert(r => r.Type, type) // 仅在插入时设置
    .SetOnInsert(r => r.CreatedAt, DateTime.UtcNow) // 仅在插入时设置
    // 注意：不设置 UpdatedAt，由 WithUpdateAudit 自动处理
    .SetOnInsert(r => r.IsDeleted, false) // 仅在插入时设置
    .Build();

var options = new FindOneAndUpdateOptions<LoginFailureRecord>
{
    IsUpsert = true, // 如果不存在则插入
    ReturnDocument = ReturnDocument.After
};

await _failureRecordFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, options);
```

**优势**：
- 使用 `UpdateOneAsync` 不会修改 `Id` 字段
- MongoDB 会自动生成新的 `_id`，不会出现 `_id: null` 的问题
- 避免了 `updatedAt` 字段冲突的问题
- 使用原子操作，确保数据一致性

## ✅ 验证清单

- [x] 修复 `RecordFailureAsync` 方法，使用 `UpdateOneAsync` 替代 `FindOneAndReplace`
- [x] 添加 `SetOnInsert` 方法到 `UpdateBuilder`
- [x] 清理数据库中的 `_id: null` 文档（如存在）
- [x] 测试登录失败流程，确保不再出现重复键错误
- [x] 测试登录成功流程，确保失败记录被正确清除

## 🔍 测试建议

1. **测试正常登录**：输入正确的用户名和密码，应该能正常登录
2. **测试错误登录**：输入错误的用户名或密码，应该能正确记录失败次数
3. **测试多次失败**：连续多次输入错误的用户名或密码，应该能正确累计失败次数
4. **测试验证码显示**：失败后应该显示验证码
5. **测试登录成功**：输入正确的用户名、密码和验证码，应该能正常登录并清除失败记录

## 📝 相关文件

- `Platform.ApiService/Services/AuthService.cs` - 认证服务（修复 `RecordFailureAsync` 方法）
- `Platform.ServiceDefaults/Services/FilterBuilder.cs` - 更新构建器（添加 `SetOnInsert` 方法）
- `Platform.ApiService/Models/LoginFailureRecordModels.cs` - 登录失败记录模型

## 📅 更新日期

2024-12-19

