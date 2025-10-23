# 修复新注册用户菜单为空问题

## 📋 问题描述

新注册用户成功登录后无法看到菜单，API 接口返回权限错误：
```json
{
    "success": false,
    "error": "无权访问菜单: user-management",
    "errorCode": "FORBIDDEN",
    "showType": 2
}
```

## 🔍 根本原因

**模型字段不匹配**：DataInitializer 和 ApiService 中的 Menu 模型对软删除字段的处理不一致。

### 问题详情

1. **DataInitializer** 创建的菜单使用 `IsDeleted` 字段
2. **ApiService** 查询时使用 `m.IsDeleted` 条件
3. 但 ApiService 的 Menu 模型实际存储时使用 `DeletedAt` 字段
4. 导致查询条件 `m.IsDeleted` 无效，获取不到菜单数据
5. 新注册用户的角色 `MenuIds` 为空，无法访问任何菜单

## ✅ 修复方案

### 1. 修复 AuthService 菜单查询逻辑

**文件**: `Platform.ApiService/Services/AuthService.cs`

**修改前**:
```csharp
var allMenus = await menus.Find(m => m.IsEnabled && !m.IsDeleted).ToListAsync();
```

**修改后**:
```csharp
// 注意：ApiService 的 Menu 模型使用 DeletedAt 字段而不是 IsDeleted
var allMenus = await menus.Find(m => m.IsEnabled && m.DeletedAt == null).ToListAsync();

// 验证菜单数据完整性
if (allMenuIds.Count == 0)
{
    _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
    throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
}
```

### 2. 确保 DataInitializer 正确设置 IsDeleted 字段

**文件**: `Platform.DataInitializer/Services/DataInitializerService.cs`

**修改**: 在所有菜单创建时明确设置 `IsDeleted = false`

```csharp
var welcomeMenu = new Menu
{
    Name = "welcome",
    Title = "欢迎",
    // ... 其他字段
    IsDeleted = false,  // 明确设置未删除
    CreatedAt = now,
    UpdatedAt = now
};
```

## 🧪 测试验证

### 1. 清空数据库
```bash
mongo aspire-admin
db.menus.deleteMany({})
db.roles.deleteMany({})
db.users.deleteMany({})
db.companies.deleteMany({})
db.user_companies.deleteMany({})
```

### 2. 重新启动服务
```bash
dotnet run --project Platform.AppHost
```

### 3. 检查菜单初始化
在 Aspire Dashboard 中查看 DataInitializer 日志，应该看到：
```
全局系统菜单创建完成，共创建 7 个菜单
```

### 4. 注册新用户并验证

#### 4.1 检查菜单数据
```javascript
db.menus.find({}, {name: 1, isDeleted: 1, isEnabled: 1}).pretty()
```
应该看到 7 个菜单，所有菜单的 `isDeleted: false` 和 `isEnabled: true`。

#### 4.2 检查角色数据
```javascript
db.roles.find().sort({createdAt: -1}).limit(1).pretty()
```
角色的 `menuIds` 数组应该包含 7 个菜单ID，不是空数组。

#### 4.3 测试 API 接口
```bash
# 登录获取 token
curl -X POST http://localhost:15000/apiservice/login/account \
  -H "Content-Type: application/json" \
  -d '{"username": "新用户名", "password": "密码"}'

# 使用 token 测试用户统计接口
curl -H "Authorization: Bearer <token>" \
  http://localhost:15001/api/user/statistics
```

### 5. 验证前端菜单显示
登录后，左侧菜单应该显示：
- 欢迎
- 系统管理
  - 用户管理
  - 角色管理
  - 企业管理
  - 通知管理
  - 标签管理

## 📊 预期结果

- ✅ 新注册用户的角色 `MenuIds` 包含所有 7 个菜单ID
- ✅ 用户登录后能看到所有菜单
- ✅ 用户能正常访问 `/api/user/statistics` 接口
- ✅ 前端菜单正确显示
- ✅ 不再出现 "无权访问菜单" 错误

## 🔧 技术细节

### 模型字段映射

| 服务 | 软删除字段 | 查询条件 |
|------|------------|----------|
| DataInitializer | `IsDeleted` | 直接设置 `IsDeleted = false` |
| ApiService | `DeletedAt` | `m.DeletedAt == null` |

### 关键代码位置

- `Platform.ApiService/Services/AuthService.cs` 第410-421行
- `Platform.DataInitializer/Services/DataInitializerService.cs` 第120-233行

## ⚠️ 注意事项

1. **数据一致性**: 确保 DataInitializer 和 ApiService 使用相同的字段映射
2. **错误处理**: 添加了菜单数据完整性检查，如果菜单为空会抛出明确错误
3. **日志记录**: 增加了详细的日志记录，便于问题诊断

## 📚 相关文档

- [全局菜单架构规范](mdc:docs/features/GLOBAL-MENU-ARCHITECTURE.md)
- [用户注册流程规范](mdc:.cursor/rules/user-registration-flow.mdc)
- [多租户数据隔离规范](mdc:.cursor/rules/no-global-data.mdc)
