# 用户 IsDeleted 字段修复说明

## 问题描述

后端 API 获取全部用户时显示无用户，即使已经初始化了 admin 用户。

## 问题原因

### 根本原因

1. **软删除过滤器**：`UserService.GetAllUsersAsync()` 方法使用了软删除过滤器：
   ```csharp
   var filter = SoftDeleteExtensions.NotDeleted<AppUser>();
   return await _users.Find(filter).ToListAsync();
   ```

2. **过滤条件**：`NotDeleted<T>()` 方法创建的过滤条件是：
   ```csharp
   Builders<T>.Filter.Eq(x => x.IsDeleted, false)
   ```

3. **字段缺失**：初始化 admin 用户时，**没有设置 `IsDeleted` 字段**：
   ```csharp
   var adminUser = new AppUser
   {
       Username = "admin",
       Email = "admin@example.com",
       PasswordHash = HashPassword("admin123"),
       Role = "admin",
       IsActive = true,
       // IsDeleted 字段未设置，在数据库中为 null
       CreatedAt = DateTime.UtcNow,
       UpdatedAt = DateTime.UtcNow
   };
   ```

4. **过滤失效**：由于 admin 用户的 `IsDeleted` 字段为 `null`，无法通过 `IsDeleted == false` 的过滤条件，导致该用户被过滤掉。

### 技术细节

MongoDB 中的字段比较：
- `{ IsDeleted: false }` - 匹配
- `{ IsDeleted: null }` - **不匹配**
- `{ IsDeleted: 字段不存在 }` - **不匹配**

## 解决方案

### 1. 修复初始化脚本

**文件**: `Platform.ApiService/Scripts/CreateAdminUser.cs`

**改动**: 在创建 admin 用户时显式设置 `IsDeleted = false`

```csharp
var adminUser = new AppUser
{
    Username = "admin",
    Email = "admin@example.com",
    PasswordHash = HashPassword("admin123"),
    Role = "admin",
    IsActive = true,
    IsDeleted = false,  // ✅ 显式设置软删除标志
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};
```

### 2. 创建修复脚本

**文件**: `Platform.ApiService/Scripts/FixExistingUsersIsDeletedField.cs`

**功能**: 自动修复数据库中已存在用户的 `IsDeleted` 字段

**修复逻辑**:
1. 查找所有 `IsDeleted` 字段不存在或为 `null` 的用户
2. 批量更新这些用户，设置 `IsDeleted = false`
3. 输出修复结果和受影响的用户列表

**关键代码**:
```csharp
// 查找需要修复的用户
var filter = Builders<AppUser>.Filter.Or(
    Builders<AppUser>.Filter.Exists("isDeleted", false),
    Builders<AppUser>.Filter.Eq("isDeleted", MongoDB.Bson.BsonNull.Value)
);

// 批量更新
var update = Builders<AppUser>.Update.Set(u => u.IsDeleted, false);
var result = await users.UpdateManyAsync(filter, update);
```

### 3. 在启动时执行修复

**文件**: `Platform.ApiService/Program.cs`

**改动**: 在初始化之前执行修复脚本

```csharp
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    
    // 修复已存在用户的 IsDeleted 字段（一次性修复脚本）
    var fixUsers = new FixExistingUsersIsDeletedField(database);
    await fixUsers.FixAsync();
    
    // 初始化管理员用户
    var createAdminUser = new CreateAdminUser(database);
    await createAdminUser.CreateDefaultAdminAsync();
    
    // 初始化菜单和角色
    var initialMenuData = new InitialMenuData(database);
    await initialMenuData.InitializeAsync();
}
```

## 修复效果

### 修复前
```
GET /api/user
返回: []  // 空数组，看不到任何用户
```

### 修复后
```
GET /api/user
返回: [
  {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "isActive": true,
    "isDeleted": false,
    ...
  }
]
```

## 启动时的输出

### 首次启动（无需修复）
```
✓ 所有用户的 IsDeleted 字段都已正确设置
✓ 管理员用户已存在: admin (ID: ...)
```

### 有用户需要修复
```
发现 1 个用户需要修复 IsDeleted 字段:
✓ 已修复 1 个用户的 IsDeleted 字段
  - admin (admin@example.com)
✓ 管理员用户已存在: admin (ID: ...)
```

## 测试验证

### 1. 测试 API 端点

```bash
# 测试获取所有用户
curl http://localhost:15000/apiservice/api/user

# 测试用户列表（包含更多信息）
curl http://localhost:15000/apiservice/api/user/test-list
```

### 2. 检查数据库

使用 MongoDB Express（http://localhost:8081）或 MongoDB Shell：

```javascript
// 查看 users 集合
db.users.find({})

// 验证 IsDeleted 字段
db.users.find({ isDeleted: false })  // 应该返回所有用户
db.users.find({ isDeleted: null })   // 应该为空
db.users.find({ isDeleted: { $exists: false } })  // 应该为空
```

## 影响范围

### 修复的用户类型
- ✅ 初始化创建的 admin 用户
- ✅ 任何在修复脚本运行前创建的用户
- ✅ `IsDeleted` 字段为 `null` 的用户
- ✅ 没有 `IsDeleted` 字段的用户

### 不影响的用户
- ✅ 修复后新创建的用户（已正确设置 `IsDeleted`）
- ✅ 已软删除的用户（`IsDeleted = true`）

## 编译状态

✅ **编译成功** - 无错误  
✅ **无 Linter 错误**

## 文件清单

### 修改的文件
1. `Platform.ApiService/Scripts/CreateAdminUser.cs` - 添加 `IsDeleted = false`
2. `Platform.ApiService/Program.cs` - 添加修复脚本调用

### 新增的文件
1. `Platform.ApiService/Scripts/FixExistingUsersIsDeletedField.cs` - 修复脚本

## 后续建议

### 1. 移除修复脚本（可选）

一旦所有环境都运行过修复脚本，可以考虑移除它：

```csharp
// 在 Program.cs 中注释或删除
// var fixUsers = new FixExistingUsersIsDeletedField(database);
// await fixUsers.FixAsync();
```

### 2. 数据验证

添加数据验证逻辑，确保所有用户都有必要的字段：

```csharp
// 在 CreateUserAsync 等方法中
public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
{
    var user = new AppUser
    {
        // ... 其他字段
        IsDeleted = false,  // 始终设置
        IsActive = true,    // 始终设置
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    
    await _users.InsertOneAsync(user);
    return user;
}
```

### 3. 单元测试

添加单元测试验证软删除功能：

```csharp
[Fact]
public async Task GetAllUsers_ShouldNotReturnSoftDeletedUsers()
{
    // Arrange
    var user = await CreateTestUser();
    await _userService.DeleteUserAsync(user.Id);
    
    // Act
    var users = await _userService.GetAllUsersAsync();
    
    // Assert
    Assert.DoesNotContain(users, u => u.Id == user.Id);
}
```

## 最佳实践

### 1. 始终显式设置布尔字段

对于重要的布尔字段（如 `IsDeleted`、`IsActive`），应该始终显式设置，避免依赖默认值：

```csharp
// ✅ 推荐
var user = new AppUser
{
    IsActive = true,
    IsDeleted = false
};

// ❌ 不推荐
var user = new AppUser
{
    // IsActive 和 IsDeleted 依赖默认值
};
```

### 2. 使用构造函数设置默认值

```csharp
public class AppUser : ISoftDeletable
{
    public AppUser()
    {
        IsActive = true;
        IsDeleted = false;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    // ... 属性定义
}
```

### 3. 数据库索引

为 `IsDeleted` 字段创建索引以提高查询性能：

```javascript
// MongoDB
db.users.createIndex({ "isDeleted": 1 })
db.users.createIndex({ "isDeleted": 1, "isActive": 1 })
```

## 总结

此次修复解决了由于 `IsDeleted` 字段缺失导致的用户查询问题。通过：
1. ✅ 修改初始化脚本，确保新用户正确设置字段
2. ✅ 创建修复脚本，自动修复已存在的用户
3. ✅ 在启动时自动执行修复

确保了所有用户都能被正确查询和显示。

