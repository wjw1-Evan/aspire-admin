# 多租户系统变更日志

## v3.0 - 多企业多用户管理系统 (2025-01-13)

### 🎉 重大功能

#### 新增：企业管理系统
- ✅ 企业自助注册功能
- ✅ 企业信息管理
- ✅ 企业统计仪表板
- ✅ 用户配额管理
- ✅ 企业过期控制

#### 新增：多租户架构
- ✅ 基于 CompanyId 的数据隔离
- ✅ 自动租户过滤机制
- ✅ JWT Token 包含企业信息
- ✅ 租户上下文服务

### 🏗️ 后端变更

#### 新增服务和控制器

**新增文件:**
- `Models/CompanyModels.cs` - 企业相关模型
- `Constants/CompanyConstants.cs` - 企业常量
- `Services/ITenantContext.cs` - 租户上下文接口
- `Services/TenantContext.cs` - 租户上下文实现
- `Services/IPasswordHasher.cs` - 密码服务接口
- `Services/CompanyService.cs` - 企业服务
- `Controllers/CompanyController.cs` - 企业控制器
- `Scripts/MigrateToMultiTenant.cs` - 数据迁移脚本
- `Scripts/CreateMultiTenantIndexes.cs` - 索引创建脚本

#### 修改的实体模型

为以下实体添加 `companyId` 字段：
- `AppUser` - 用户
- `Role` - 角色
- `Menu` - 菜单
- `Permission` - 权限
- `NoticeIconItem` - 通知
- `UserActivityLog` - 活动日志
- `User` - 用户（简单模型）

#### 升级的基础设施

**BaseRepository:**
- 添加 `ITenantContext` 依赖
- 实现 `BuildTenantFilter()` 自动租户过滤
- 创建实体时自动设置 `CompanyId`
- 所有查询方法支持租户过滤

**BaseService:**
- 添加 `ITenantContext` 依赖
- 新增 `GetCurrentCompanyId()` 方法
- 新增 `GetRequiredCompanyId()` 方法

**JwtService:**
- Token 中包含 `companyId` claim
- RefreshToken 中包含 `companyId` claim

#### 更新的服务

- `UserService` - 添加用户配额检查
- `RoleService` - 支持多租户
- `MenuService` - 支持多租户
- `NoticeService` - 支持多租户
- `AuthService` - 添加企业状态检查
- `PermissionService` - 添加 GetDefaultPermissions

#### 新增 API 端点

```
POST   /api/company/register          企业注册（匿名）
GET    /api/company/current           获取当前企业信息
PUT    /api/company/current           更新企业信息
GET    /api/company/statistics        获取企业统计
GET    /api/company/check-code        检查企业代码可用性
```

### 🎨 前端变更

#### 新增页面

- `pages/company/register.tsx` - 企业注册页面
- `pages/company/settings.tsx` - 企业设置页面
- `pages/company/components/EditCompanyModal.tsx` - 编辑弹窗

#### 新增 API 服务

- `services/company.ts` - Company API 服务

#### 更新的类型

`services/ant-design-pro/typings.d.ts`:
- `Company` - 企业类型
- `RegisterCompanyRequest` - 注册请求
- `RegisterCompanyResult` - 注册结果
- `UpdateCompanyRequest` - 更新请求
- `CompanyStatistics` - 统计信息
- `RefreshTokenRequest` - 刷新Token请求
- `RefreshTokenResult` - 刷新Token结果

#### 路由更新

`config/routes.ts`:
- 添加 `/company/register` 路由（企业注册）
- 添加 `/system/company-settings` 菜单（企业设置）

#### UI 更新

- 登录页面添加"企业注册"链接
- 系统菜单添加"企业设置"选项

### 🗄️ 数据库变更

#### 新增集合

- `companies` - 企业信息

#### 字段变更

所有业务集合添加 `companyId` 字段：
- `users.companyId`
- `roles.companyId`
- `menus.companyId`
- `permissions.companyId`
- `notices.companyId`
- `user_activity_logs.companyId`

#### 新增索引

**唯一索引:**
- `companies.code` - 企业代码唯一
- `users.(companyId, username)` - 企业内用户名唯一
- `roles.(companyId, name)` - 企业内角色名唯一
- `permissions.(companyId, code)` - 企业内权限代码唯一

**复合索引:**
- `users.(companyId, email)`
- `users.(companyId, isDeleted, isActive)`
- `roles.(companyId, isDeleted)`
- `menus.(companyId, name)`
- `menus.(companyId, parentId)`
- `menus.(companyId, isDeleted, isEnabled)`
- `permissions.(companyId, resourceName)`
- `notices.(companyId, isDeleted)`
- `notices.(companyId, type)`
- `user_activity_logs.(companyId, userId)`
- `user_activity_logs.(companyId, createdAt)`

### 🔄 迁移和升级

#### 自动数据迁移

启动应用时自动执行：
1. 检查并创建默认企业（Code: `default`）
2. 为所有现有数据添加 `companyId` 字段
3. 创建多租户相关索引

**幂等性保证:**
- 迁移脚本可安全地多次执行
- 已迁移的数据不会重复处理

#### 手动迁移（如需要）

```javascript
// 检查未迁移的数据
db.users.find({ companyId: { $exists: false } })

// 手动设置 companyId
db.users.updateMany(
  { companyId: { $exists: false } },
  { $set: { companyId: "default-company-id" } }
)
```

### 📝 配置变更

#### Program.cs

**新增服务注册:**
```csharp
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ICompanyService, CompanyService>();
```

**新增启动脚本:**
```csharp
// 多租户数据迁移
var migrateToMultiTenant = new MigrateToMultiTenant(database, logger);
await migrateToMultiTenant.MigrateAsync();

// 多租户索引创建
await CreateMultiTenantIndexes.ExecuteAsync(database, logger);
```

### 🔐 安全增强

#### 登录增强

- ✅ 检查企业是否存在
- ✅ 检查企业是否激活
- ✅ 检查企业是否过期

#### 用户创建增强

- ✅ 检查企业用户配额
- ✅ 达到配额自动拒绝

#### JWT Token 增强

- ✅ Token 中包含 `companyId` claim
- ✅ 服务器签名，客户端无法篡改

### 📊 性能优化

- ✅ 创建多租户查询索引
- ✅ 使用复合索引优化常用查询
- ✅ 批量操作支持（迁移脚本）
- ✅ 自动过滤减少查询数据量

### 🚨 破坏性变更

#### 构造函数签名变更

**BaseService:**
```csharp
// 旧版本
protected BaseService(
    IMongoDatabase database,
    IHttpContextAccessor httpContextAccessor,
    ILogger logger)

// 新版本（v3.0）
protected BaseService(
    IMongoDatabase database,
    IHttpContextAccessor httpContextAccessor,
    ITenantContext tenantContext,  // 新增
    ILogger logger)
```

**BaseRepository:**
```csharp
// 旧版本
public BaseRepository(
    IMongoDatabase database, 
    string collectionName, 
    IHttpContextAccessor httpContextAccessor)

// 新版本（v3.0）
public BaseRepository(
    IMongoDatabase database, 
    string collectionName, 
    IHttpContextAccessor httpContextAccessor,
    ITenantContext tenantContext)  // 新增
```

**影响范围:**
所有继承 `BaseService` 或使用 `BaseRepository` 的服务都需要更新构造函数。

**迁移方法:**
在服务的构造函数中添加 `ITenantContext` 参数，并传递给基类。

### 📚 文档变更

#### 新增文档

- `docs/features/MULTI-TENANT-SYSTEM.md` - 完整系统文档
- `docs/features/MULTI-TENANT-IMPLEMENTATION-STATUS.md` - 实施状态
- `docs/features/MULTI-TENANT-QUICK-START.md` - 快速开始
- `docs/features/MULTI-TENANT-TESTING-GUIDE.md` - 测试指南
- `docs/features/MULTI-TENANT-CHANGELOG.md` - 本变更日志
- `docs/reports/MULTI-TENANT-IMPLEMENTATION-COMPLETE.md` - 实施完成报告

#### 更新文档

- `docs/INDEX.md` - 添加多租户文档索引

## 🔮 后续版本规划

### v3.1 计划

- 企业Logo上传功能
- 企业成员邀请
- 企业主题定制

### v3.2 计划

- 超级管理员后台
- 企业计费系统
- 企业数据分析

### v4.0 计划

- 用户跨企业切换
- 企业间数据共享
- 高级权限模型

## 📞 技术支持

遇到问题或建议？

1. 查看[快速开始指南](MULTI-TENANT-QUICK-START.md)
2. 查看[测试指南](MULTI-TENANT-TESTING-GUIDE.md)
3. 查看[完整文档](MULTI-TENANT-SYSTEM.md)
4. 查看实施完成报告

---

**版本**: v3.0  
**发布日期**: 2025-01-13  
**类型**: Major Release  
**兼容性**: 向后兼容（通过自动数据迁移）

