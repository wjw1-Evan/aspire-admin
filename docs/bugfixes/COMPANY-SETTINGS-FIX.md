# 企业设置页面修复

## 📋 问题概述

修复企业设置页面的三个问题：
1. 菜单显示英文而非中文
2. 用户总数显示为 0
3. 菜单数量显示为 0

## 🐛 问题详情

### 问题 1: 菜单显示英文

**现象**: 左侧菜单栏"企业设置"显示为英文 "company-settings"

**原因**: `Platform.Admin/src/locales/zh-CN/menu.ts` 缺少 `menu.system.company-settings` 的国际化配置

**影响**: 用户体验不佳，菜单显示不一致

### 问题 2: 用户总数显示为 0

**现象**: 企业数据统计中"用户总数"和"活跃用户"显示为 0

**原因**: `CompanyService.GetCompanyStatisticsAsync()` 使用了已废弃的 `AppUser.CompanyId` 字段统计用户

**技术背景**: 
- v3.1 引入了 `UserCompany` 多对多关系表，支持用户隶属多个企业
- 旧的 `AppUser.CompanyId` 字段已标记为 `[Obsolete]`
- 统计逻辑未更新到新的数据模型

### 问题 3: 菜单数量显示为 0

**现象**: 企业数据统计中"菜单数量"显示为 0

**原因**: 代码写死返回 `TotalMenus = 0`，注释说"菜单是全局资源，不再统计"

**技术背景**:
- v5.0 将菜单改为全局系统资源，所有企业共享
- 但企业统计页面仍需要显示系统菜单总数

## ✅ 修复方案

### 修复 1: 添加菜单国际化

**文件**: `Platform.Admin/src/locales/zh-CN/menu.ts`

```typescript
export default {
  // ... 其他配置
  'menu.system.user-log': '用户日志',
  'menu.system.company-settings': '企业设置',  // ✅ 新增
  'menu.account': '个人页',
  // ...
};
```

### 修复 2: 使用 UserCompany 表统计用户

**文件**: `Platform.ApiService/Services/CompanyService.cs`

**修改前**:
```csharp
// ❌ 使用废弃的 AppUser.CompanyId
#pragma warning disable CS0618
var companyFilter = Builders<AppUser>.Filter.Eq(u => u.CompanyId, companyId);
#pragma warning restore CS0618
var totalUsers = await _users.CountDocumentsAsync(companyFilter & notDeletedFilter);
```

**修改后**:
```csharp
// ✅ v3.1: 使用 UserCompany 表统计用户数量
var userCompanies = _database.GetCollection<UserCompany>("userCompanies");

var ucFilter = Builders<UserCompany>.Filter.And(
    Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, companyId),
    Builders<UserCompany>.Filter.Eq(uc => uc.Status, "active"),
    Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
);
var totalUsers = await userCompanies.CountDocumentsAsync(ucFilter);

// 统计活跃用户（需要关联 AppUser 表）
var activeUserIds = await userCompanies
    .Find(ucFilter)
    .Project(uc => uc.UserId)
    .ToListAsync();

var activeUserFilter = Builders<AppUser>.Filter.And(
    Builders<AppUser>.Filter.In(u => u.Id, activeUserIds),
    Builders<AppUser>.Filter.Eq(u => u.IsActive, true),
    Builders<AppUser>.Filter.Eq(u => u.IsDeleted, false)
);
var activeUsers = await _users.CountDocumentsAsync(activeUserFilter);
```

**改进点**:
- ✅ 使用 v3.1 的 `UserCompany` 关系表
- ✅ 正确统计多企业隶属场景下的用户数量
- ✅ 只统计 `status = "active"` 的成员
- ✅ 活跃用户需要关联 `AppUser.IsActive` 字段

### 修复 3: 统计系统菜单数量

**文件**: `Platform.ApiService/Services/CompanyService.cs`

**修改前**:
```csharp
TotalMenus = 0,  // ❌ 菜单是全局资源，不再统计
```

**修改后**:
```csharp
// ✅ 菜单统计：统计系统中所有启用的菜单
var menuFilter = Builders<Menu>.Filter.And(
    Builders<Menu>.Filter.Eq(m => m.IsEnabled, true),
    Builders<Menu>.Filter.Eq(m => m.IsDeleted, false)
);
var totalMenus = await _menus.CountDocumentsAsync(menuFilter);

return new CompanyStatistics
{
    // ...
    TotalMenus = (int)totalMenus,  // ✅ 返回实际菜单数量
    // ...
};
```

**改进点**:
- ✅ 统计系统中所有启用的菜单
- ✅ 虽然菜单是全局资源，但企业统计页面仍需显示数量
- ✅ 只统计 `IsEnabled = true` 且未删除的菜单

## 🧪 测试验证

### 测试步骤

1. **重启后端服务**
   ```bash
   dotnet run --project Platform.AppHost
   ```

2. **清空浏览器缓存并刷新前端**

3. **检查企业设置页面**
   - 访问路径: `/system/company-settings`
   - 检查左侧菜单显示: "企业设置" ✅
   - 检查用户总数: 应显示实际数字（非 0）✅
   - 检查活跃用户: 应显示实际数字 ✅
   - 检查菜单数量: 应显示系统菜单总数（例如 6）✅

### 预期结果

```
企业数据统计:
┌─────────────────────────┐
│ 用户总数: 2 / 1000      │  ✅ 显示实际用户数
│ [进度条]                 │
│                         │
│ 活跃用户: 2             │  ✅ 显示活跃用户数
│                         │
│ 角色数量: 2             │  ✅ 显示角色数
└─────────────────────────┘

┌─────────────────────────┐
│ 菜单数量: 6             │  ✅ 显示系统菜单总数
│                         │
│ 权限数量: 24            │  ✅ 显示权限数
│                         │
│ 企业状态: 正常          │  ✅ 显示状态
└─────────────────────────┘
```

## 📝 技术说明

### UserCompany 数据模型

```csharp
public class UserCompany : BaseEntity
{
    public string UserId { get; set; }      // 用户ID
    public string CompanyId { get; set; }   // 企业ID
    public List<string> RoleIds { get; set; } // 角色列表
    public bool IsAdmin { get; set; }       // 是否管理员
    public string Status { get; set; }      // 状态: active, pending, inactive
    public DateTime JoinedAt { get; set; }  // 加入时间
}
```

### 统计逻辑说明

1. **用户总数**: 统计 `UserCompany` 表中 `status = "active"` 且未删除的记录数
2. **活跃用户**: 在用户总数基础上，进一步筛选 `AppUser.IsActive = true` 的用户
3. **菜单数量**: 统计 `Menu` 表中 `IsEnabled = true` 且未删除的菜单数

### 多企业隶属支持

- v3.1 引入了多企业隶属功能
- 一个用户可以加入多个企业，每个企业有独立的角色和权限
- `UserCompany` 表记录用户与企业的关联关系
- 废弃了 `AppUser.CompanyId` 字段

## 📚 相关文档

- [多租户系统架构](mdc:docs/features/MULTI-TENANT-SYSTEM.md)
- [UserCompany 数据模型](mdc:Platform.ApiService/Models/UserCompanyModels.cs)
- [全局菜单架构](mdc:docs/features/GLOBAL-MENU-ARCHITECTURE.md)
- [企业服务实现](mdc:Platform.ApiService/Services/CompanyService.cs)

## 🎯 总结

本次修复解决了企业设置页面的三个显示问题：

1. ✅ **国际化**: 菜单正确显示中文"企业设置"
2. ✅ **用户统计**: 使用 v3.1 的 UserCompany 表正确统计用户数量
3. ✅ **菜单统计**: 显示系统启用的菜单总数

修复确保了：
- 用户体验一致性（中文界面）
- 数据准确性（使用正确的数据源）
- 架构兼容性（支持 v3.1 多企业隶属）

