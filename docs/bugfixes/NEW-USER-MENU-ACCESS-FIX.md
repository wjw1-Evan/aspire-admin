# 新注册用户无法访问角色管理问题修复

## 📋 问题描述

新注册用户访问角色管理API时返回错误：

```json
{
    "success": false,
    "error": "无权访问菜单: role-management",
    "errorCode": "FORBIDDEN",
    "showType": 2
}
```

## 🔍 问题分析

### 权限检查流程

1. **RequireMenuAttribute** - 拦截请求，检查菜单访问权限
   ```csharp
   [RequireMenu("role-management")]  // RoleController 上的特性
   ```

2. **MenuAccessService.HasMenuAccessAsync** - 检查用户是否有菜单访问权限
   - 获取用户的当前企业ID (从 JWT Token)
   - 查找用户在企业的角色 (UserCompany.RoleIds)
   - 查找角色的菜单列表 (Role.MenuIds)
   - 返回菜单名称列表

3. **权限链**: `用户 → 企业 → 角色 → 菜单`

### 可能的原因

#### 原因 1: 菜单没有初始化 ❌
- **症状**: 数据库 `menus` 表为空
- **位置**: `DatabaseInitializerService.CreateSystemMenusAsync()`
- **检查方法**:
  ```javascript
  db.menus.countDocuments({})  // 应该返回 6
  db.menus.find({name: "role-management"})  // 应该找到角色管理菜单
  ```

#### 原因 2: 角色没有分配菜单 ❌
- **症状**: 角色的 `MenuIds` 字段为空或不包含菜单ID
- **位置**: `AuthService.CreatePersonalCompanyAsync()` Line 377-387
- **检查方法**:
  ```javascript
  db.roles.find({companyId: "企业ID"}, {name: 1, menuIds: 1})
  // menuIds 应该是包含所有菜单ID的数组
  ```

#### 原因 3: 用户没有角色 ❌
- **症状**: `UserCompany.RoleIds` 为空
- **位置**: `AuthService.CreatePersonalCompanyAsync()` Line 397-409
- **检查方法**:
  ```javascript
  db.userCompanies.find({userId: "用户ID", companyId: "企业ID"}, {roleIds: 1})
  // roleIds 应该包含管理员角色ID
  ```

#### 原因 4: JWT Token 缺少企业ID ❌
- **症状**: `CurrentCompanyId` 为空，导致查询失败
- **位置**: `JwtService.GenerateToken()` Line 51-55
- **检查方法**: 解码JWT Token，检查是否包含 `currentCompanyId` 或 `companyId`

## 🔧 解决方案

### 方案 1: 重新初始化数据库（推荐）

这是最彻底的解决方案：

```bash
# 1. 停止应用
# Ctrl+C 停止 dotnet run

# 2. 删除数据库
mongosh aspire-admin --eval "db.dropDatabase()"

# 3. 重启应用
cd /Volumes/thinkplus/Projects/aspire-admin
dotnet run --project Platform.AppHost

# 4. 等待初始化完成，查看日志
# 应该看到：
#   - "开始创建数据库索引..."
#   - "开始创建全局系统菜单..."
#   - "全局系统菜单创建完成（6 个）"

# 5. 重新注册用户
curl -X POST http://localhost:15000/apiservice/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456",
    "email": "test@example.com"
  }'

# 6. 测试登录和访问
curl -X POST http://localhost:15000/apiservice/api/login/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456"
  }'
```

### 方案 2: 手动修复数据库

如果不想删除现有数据，可以手动修复：

```bash
# 使用修复脚本
cd /Volumes/thinkplus/Projects/aspire-admin
mongosh aspire-admin < check-and-fix-menu-access.js
```

或手动执行：

```javascript
// 1. 连接数据库
mongosh aspire-admin

// 2. 检查菜单
db.menus.countDocuments({})
db.menus.find({name: "role-management"})

// 3. 如果菜单不存在，手动创建（参考 DatabaseInitializerService.cs）

// 4. 获取所有菜单ID
const allMenuIds = db.menus.find({isEnabled: true, isDeleted: false}).map(m => m._id.toString());
print("菜单数量:", allMenuIds.length);

// 5. 更新所有角色，分配所有菜单
db.roles.updateMany(
    {isDeleted: false},
    {
        $set: {
            menuIds: allMenuIds,
            updatedAt: new Date()
        }
    }
);
print("更新的角色数:", db.roles.countDocuments({isDeleted: false}));

// 6. 检查用户企业关联，确保有角色
db.userCompanies.find({isDeleted: false}).forEach(function(uc) {
    if (!uc.roleIds || uc.roleIds.length === 0) {
        // 找到该企业的第一个角色
        const role = db.roles.findOne({companyId: uc.companyId, isDeleted: false});
        if (role) {
            db.userCompanies.updateOne(
                {_id: uc._id},
                {
                    $set: {
                        roleIds: [role._id.toString()],
                        updatedAt: new Date()
                    }
                }
            );
            print("修复用户:", uc.userId, "添加角色:", role.name);
        }
    }
});

// 7. 验证修复
const users = db.users.find({isActive: true, isDeleted: false}).toArray();
users.forEach(function(user) {
    const uc = db.userCompanies.findOne({
        userId: user._id.toString(),
        companyId: user.currentCompanyId,
        isDeleted: false
    });
    
    if (uc && uc.roleIds && uc.roleIds.length > 0) {
        const role = db.roles.findOne({_id: ObjectId(uc.roleIds[0])});
        print("用户:", user.username, "角色:", role.name, "菜单数:", role.menuIds.length);
    }
});
```

### 方案 3: 检查代码问题

如果以上方案都无效，检查代码：

#### 3.1 确认 DatabaseInitializerService 被调用

查看 `Platform.ApiService/Program.cs`：

```csharp
// 应该有这段代码
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDatabaseInitializerService>();
    await initializer.InitializeAsync();
}
```

#### 3.2 确认 JwtService 包含 CompanyId

查看 `Platform.ApiService/Services/JwtService.cs` Line 51-55：

```csharp
// v3.1: 添加当前企业ID到token
if (!string.IsNullOrEmpty(user.CurrentCompanyId))
{
    claims.Add(new("currentCompanyId", user.CurrentCompanyId));
    claims.Add(new("companyId", user.CurrentCompanyId));  // 兼容性
}
```

#### 3.3 确认 MenuAccessService 查询逻辑

查看 `Platform.ApiService/Services/MenuAccessService.cs` Line 60-61：

```csharp
// 获取用户在当前企业的角色
var companyId = GetCurrentCompanyId();
if (!string.IsNullOrEmpty(companyId))
{
    // ...
}
```

## 📊 诊断工具

### 工具 1: 数据库检查脚本

```bash
# 运行完整检查
cd /Volumes/thinkplus/Projects/aspire-admin
mongosh aspire-admin < check-and-fix-menu-access.js
```

### 工具 2: API 测试脚本

```bash
# 确保服务运行后执行
cd /Volumes/thinkplus/Projects/aspire-admin
./debug-menu-access.sh
```

### 工具 3: 手动检查步骤

```bash
# 1. 检查服务状态
curl http://localhost:15000/apiservice/health

# 2. 注册用户
curl -X POST http://localhost:15000/apiservice/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"test123456","email":"test1@example.com"}'

# 3. 登录
TOKEN=$(curl -s -X POST http://localhost:15000/apiservice/api/login/account \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"test123456"}' \
  | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

echo "Token: $TOKEN"

# 4. 测试角色管理访问
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:15000/apiservice/api/role

# 5. 查看当前用户信息
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:15000/apiservice/api/currentUser
```

## ✅ 验证修复

修复后，应该能够：

1. **登录成功** - 获取包含 `currentCompanyId` 的 JWT Token
2. **访问角色管理** - `GET /api/role` 返回 200
3. **查看数据库**:
   ```javascript
   // 菜单存在
   db.menus.countDocuments({}) >= 6
   
   // 角色有菜单
   db.roles.findOne({}, {menuIds: 1}).menuIds.length > 0
   
   // 用户有角色
   db.userCompanies.findOne({}, {roleIds: 1}).roleIds.length > 0
   ```

## 🎯 预防措施

### 1. 监控初始化日志

启动时注意以下日志：

```
[DatabaseInitializerService] 开始数据库初始化...
[DatabaseInitializerService] 开始创建数据库索引...
[DatabaseInitializerService] 开始创建全局系统菜单...
[DatabaseInitializerService] 全局系统菜单创建完成（6 个）
[DatabaseInitializerService] 所有初始化操作执行完成
```

### 2. 添加启动健康检查

在 `Program.cs` 中添加：

```csharp
// 验证菜单初始化
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    var menus = database.GetCollection<Menu>("menus");
    var menuCount = await menus.CountDocumentsAsync(Builders<Menu>.Filter.Empty);
    
    if (menuCount == 0)
    {
        logger.LogWarning("⚠️  警告：数据库中没有菜单，请检查初始化");
    }
    else
    {
        logger.LogInformation("✅ 菜单初始化正常（{Count} 个）", menuCount);
    }
}
```

### 3. 用户注册时验证

在 `AuthService.CreatePersonalCompanyAsync()` 中添加日志和验证：

```csharp
// 在 Line 379 之后添加
_logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);
if (allMenuIds.Count == 0)
{
    throw new InvalidOperationException("系统菜单未初始化，无法创建角色");
}

// 在 Line 394 之后添加
_logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", 
    adminRole.Id, allMenuIds.Count);

// 验证角色创建
var savedRole = await roles.Find(r => r.Id == adminRole.Id).FirstOrDefaultAsync();
if (savedRole == null || savedRole.MenuIds == null || savedRole.MenuIds.Count == 0)
{
    throw new InvalidOperationException("角色创建失败或菜单分配失败");
}
```

## 📚 相关文档

- [全局菜单架构](../features/GLOBAL-MENU-ARCHITECTURE.md)
- [菜单权限系统](../features/MENU-PERMISSION-SYSTEM.md)
- [用户注册流程](../features/USER-REGISTRATION-FLOW.md)
- [数据库初始化规范](../.cursor/rules/database-initialization.mdc)

## 🎯 核心原则

1. **数据库必须先初始化菜单** - 在用户注册前
2. **角色必须分配菜单** - `Role.MenuIds` 不能为空
3. **用户必须有角色** - `UserCompany.RoleIds` 不能为空
4. **Token必须包含企业ID** - `currentCompanyId` 是权限检查的关键

遵循这些原则，确保新用户注册后能够正常访问系统功能！

