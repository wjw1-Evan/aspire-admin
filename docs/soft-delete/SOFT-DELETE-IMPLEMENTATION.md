# 软删除功能实现总结

## 概述

本文档总结了在 Platform.ApiService 项目中实现的软删除功能。所有数据实体现在都支持软删除，包括未来新增的实体。

## 实现的功能

### 1. 软删除字段标准

创建了 `ISoftDeletable` 接口，定义了以下字段：
- **IsDeleted** (bool) - 是否已删除，默认值为 `false`
- **DeletedAt** (DateTime?) - 删除时间
- **DeletedBy** (string?) - 删除人ID（从JWT token中获取）
- **DeletedReason** (string?) - 删除原因

### 2. 更新的实体模型

所有实体都已实现 `ISoftDeletable` 接口：

#### 核心实体
- `AppUser` - 应用用户
- `User` - 简单用户
- `Role` - 角色
- `Menu` - 菜单
- `UserActivityLog` - 用户活动日志

#### 其他实体
- `NoticeIconItem` - 通知
- `TagItem` - 标签
- `RuleListItem` - 规则列表项

### 3. 软删除扩展方法

创建了 `SoftDeleteExtensions` 类，提供以下扩展方法：

```csharp
// 构建排除已删除数据的过滤器
FilterDefinition<T> WithSoftDeleteFilter<T>()
FilterDefinition<T> NotDeleted<T>()

// 构建软删除更新定义
UpdateDefinition<T> ApplySoftDelete<T>(string? deletedBy, string? reason)

// 软删除操作
Task<bool> SoftDeleteOneAsync<T>(...)
Task<long> SoftDeleteManyAsync<T>(...)
Task<bool> SoftDeleteByIdAsync<T>(...)
```

### 4. 更新的 Service 层

#### UserService
- ✅ 所有查询方法添加软删除过滤
- ✅ `GetAllUsersAsync()` - 只返回未删除用户
- ✅ `GetUserByIdAsync()` - 只查找未删除用户
- ✅ `DeleteUserAsync()` - 改为软删除，支持删除原因
- ✅ `BulkUpdateUsersAsync()` - 批量删除改为软删除
- ✅ `GetUsersWithPaginationAsync()` - 分页查询排除已删除
- ✅ `GetUserStatisticsAsync()` - 统计排除已删除用户
- ✅ `CheckEmailExistsAsync()` - 检查时排除已删除
- ✅ `CheckUsernameExistsAsync()` - 检查时排除已删除
- ✅ `SearchUsersByNameAsync()` - 搜索排除已删除
- ✅ 添加了 `GetCurrentUserId()` 方法从 HTTP 上下文获取当前用户

#### RoleService
- ✅ 所有查询方法添加软删除过滤
- ✅ `GetAllRolesAsync()` - 只返回未删除角色
- ✅ `GetRoleByIdAsync()` - 只查找未删除角色
- ✅ `GetRoleByNameAsync()` - 只查找未删除角色
- ✅ `DeleteRoleAsync()` - 改为软删除，支持删除原因
- ✅ 删除前检查是否有未删除的用户使用该角色

#### MenuService
- ✅ 所有查询方法添加软删除过滤
- ✅ `GetAllMenusAsync()` - 只返回未删除菜单
- ✅ `GetUserMenusAsync()` - 获取用户菜单时排除已删除
- ✅ `GetMenuByIdAsync()` - 只查找未删除菜单
- ✅ `DeleteMenuAsync()` - 改为软删除，支持删除原因
- ✅ 删除前检查是否有未删除的子菜单
- ✅ `AddParentMenuIds()` - 递归查找父菜单时排除已删除

#### AuthService
- ✅ `LoginAsync()` - 登录时排除已删除用户
- ✅ `RegisterAsync()` - 注册时检查用户名和邮箱排除已删除

### 5. 更新的 Controller 层

#### UserController
- ✅ `DeleteUser()` - 支持通过 query 参数传递删除原因
- ✅ `BulkUserAction()` - 批量操作支持删除原因（通过 request body）
- ✅ 更新了日志记录，记录删除原因

#### RoleController
- ✅ `DeleteRole()` - 支持通过 query 参数传递删除原因

#### MenuController
- ✅ `DeleteMenu()` - 支持通过 query 参数传递删除原因

### 6. 新增的请求模型

#### DeleteModels.cs
```csharp
public class DeleteRequest
{
    public string? Reason { get; set; }
}

public class BulkDeleteRequest
{
    public List<string> Ids { get; set; } = new();
    public string? Reason { get; set; }
}
```

#### 更新的模型
- `BulkUserActionRequest` - 添加了 `Reason` 字段

## 查询行为

### 默认行为
所有查询默认排除已删除的数据：
- Find 操作自动添加 `IsDeleted == false` 过滤条件
- Count 操作只统计未删除的记录
- 关联查询（如检查用户是否使用角色）只检查未删除的数据

### 示例代码
```csharp
// 使用扩展方法构建过滤器
var filter = SoftDeleteExtensions.NotDeleted<AppUser>();
var users = await _users.Find(filter).ToListAsync();

// 组合其他条件
var filter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(u => u.Username, username),
    SoftDeleteExtensions.NotDeleted<AppUser>()
);

// 软删除操作
await _users.SoftDeleteOneAsync(filter, currentUserId, reason);
```

## 删除原因传递方式

### 单个删除
通过 URL query 参数传递：
```http
DELETE /api/user/123?reason=用户申请注销
DELETE /api/role/456?reason=角色已废弃
DELETE /api/menu/789?reason=功能下线
```

### 批量删除
通过请求体传递：
```json
POST /api/user/bulk-action
{
  "userIds": ["id1", "id2"],
  "action": "delete",
  "reason": "批量清理无效账户"
}
```

## 数据库影响

### 向后兼容性
- 现有数据库中的记录会有 `IsDeleted = false` 的默认值（在模型定义中）
- 不需要数据迁移脚本
- 新字段 `DeletedAt`、`DeletedBy`、`DeletedReason` 默认为 `null`

### 建议的索引
为提高查询性能，建议在 MongoDB 中创建以下索引：
```javascript
// AppUser collection
db.users.createIndex({ "isDeleted": 1 })
db.users.createIndex({ "isDeleted": 1, "username": 1 })
db.users.createIndex({ "isDeleted": 1, "email": 1 })

// Role collection
db.roles.createIndex({ "isDeleted": 1 })
db.roles.createIndex({ "isDeleted": 1, "name": 1 })

// Menu collection
db.menus.createIndex({ "isDeleted": 1 })
db.menus.createIndex({ "isDeleted": 1, "parentId": 1 })
```

## 审计功能

软删除记录了以下审计信息：
1. **删除标记** - `IsDeleted = true`
2. **删除时间** - `DeletedAt` 记录精确的删除时间戳
3. **删除人** - `DeletedBy` 记录执行删除操作的用户ID
4. **删除原因** - `DeletedReason` 记录为什么删除（可选）

### 查询已删除数据示例
```csharp
// 如果需要查看已删除数据（管理员功能）
var allUsers = await _users.Find(_ => true).ToListAsync();
var deletedUsers = allUsers.Where(u => u.IsDeleted).ToList();

// 查看特定时间范围的删除记录
var filter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.Eq(u => u.IsDeleted, true),
    Builders<AppUser>.Filter.Gte(u => u.DeletedAt, DateTime.UtcNow.AddDays(-30))
);
var recentlyDeleted = await _users.Find(filter).ToListAsync();
```

## 未来扩展

### 可能的功能增强
1. **恢复功能** - 添加 API 端点恢复已删除的数据
2. **自动清理** - 定时任务物理删除超过一定时间的软删除数据
3. **删除历史** - 记录详细的删除历史和变更日志
4. **权限控制** - 只有特定权限的用户才能查看已删除数据
5. **级联软删除** - 删除父实体时自动软删除关联的子实体

### 恢复功能示例（未实现）
```csharp
// 可以添加以下方法实现恢复
public async Task<bool> RestoreAsync<T>(string id) where T : ISoftDeletable
{
    var filter = Builders<T>.Filter.And(
        Builders<T>.Filter.Eq("_id", ObjectId.Parse(id)),
        Builders<T>.Filter.Eq(x => x.IsDeleted, true)
    );
    
    var update = Builders<T>.Update
        .Set(x => x.IsDeleted, false)
        .Set(x => x.DeletedAt, null)
        .Set(x => x.DeletedBy, null)
        .Set(x => x.DeletedReason, null);
    
    var result = await collection.UpdateOneAsync(filter, update);
    return result.ModifiedCount > 0;
}
```

## 注意事项

1. **性能考虑** - 所有查询都增加了 `IsDeleted` 过滤条件，建议创建复合索引
2. **唯一约束** - 用户名、邮箱等唯一字段的检查已更新为排除已删除数据
3. **级联检查** - 删除角色时检查是否有用户使用、删除菜单时检查是否有子菜单
4. **HTTP Context** - Service 层现在依赖 `IHttpContextAccessor` 来获取当前用户ID
5. **依赖注入** - 确保在 `Program.cs` 中注册了 `IHttpContextAccessor`

## 测试建议

### 功能测试
- ✅ 测试软删除后数据不在列表中显示
- ✅ 测试软删除后再创建同名用户/角色
- ✅ 测试删除原因是否正确记录
- ✅ 测试级联检查（角色有用户、菜单有子菜单）
- ✅ 测试批量删除功能
- ✅ 测试登录时已删除用户无法登录

### 性能测试
- 测试大量数据情况下的查询性能
- 验证索引是否有效
- 测试分页查询的性能

## 文件清单

### 新增文件
- `Platform.ApiService/Models/ISoftDeletable.cs` - 软删除接口
- `Platform.ApiService/Models/DeleteModels.cs` - 删除请求模型
- `Platform.ApiService/Services/SoftDeleteExtensions.cs` - 软删除扩展方法

### 修改文件

#### Models
- `Platform.ApiService/Models/AuthModels.cs` - AppUser
- `Platform.ApiService/Models/RoleModels.cs` - Role
- `Platform.ApiService/Models/MenuModels.cs` - Menu
- `Platform.ApiService/Models/User.cs` - User, UserActivityLog, BulkUserActionRequest
- `Platform.ApiService/Models/NoticeModels.cs` - NoticeIconItem
- `Platform.ApiService/Models/TagModels.cs` - TagItem
- `Platform.ApiService/Models/RuleModels.cs` - RuleListItem

#### Services
- `Platform.ApiService/Services/UserService.cs` - 完整更新
- `Platform.ApiService/Services/RoleService.cs` - 完整更新
- `Platform.ApiService/Services/MenuService.cs` - 完整更新
- `Platform.ApiService/Services/AuthService.cs` - 登录和注册检查

#### Controllers
- `Platform.ApiService/Controllers/UserController.cs` - 删除方法更新
- `Platform.ApiService/Controllers/RoleController.cs` - 删除方法更新
- `Platform.ApiService/Controllers/MenuController.cs` - 删除方法更新

## 总结

软删除功能已成功实现在所有核心实体中，具有以下特点：

✅ **完整的审计追踪** - 记录删除时间、删除人和删除原因
✅ **查询自动过滤** - 所有查询默认排除已删除数据
✅ **扩展性强** - 新实体只需实现 ISoftDeletable 接口即可
✅ **向后兼容** - 现有数据无需迁移
✅ **安全性** - 数据不会真正删除，可用于审计和恢复

该实现为将来的数据恢复、审计和合规性需求提供了良好的基础。


