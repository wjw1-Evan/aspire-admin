# 多企业多用户管理系统

## 📋 系统概览

本系统实现了基于共享数据库的多租户架构，通过 `companyId` 字段实现企业间的数据完全隔离。每个企业可以独立管理自己的用户、角色、菜单和权限，实现真正的多租户SaaS应用。

### 核心特性

- ✅ **企业自助注册** - 企业可以自助注册，首个用户自动成为管理员
- ✅ **数据完全隔离** - 通过 CompanyId 实现企业间数据100%隔离
- ✅ **自动租户过滤** - BaseRepository 自动添加租户过滤，防止跨企业数据访问
- ✅ **独立权限管理** - 每个企业独立管理角色、菜单和权限
- ✅ **用户配额管理** - 支持企业用户数量限制
- ✅ **企业过期控制** - 支持企业过期时间设置
- ✅ **数据自动迁移** - 现有数据无缝迁移到默认企业

## 🏗️ 技术架构

### 租户隔离方式

采用 **共享数据库 + CompanyId 字段** 的方式实现数据隔离：

```
用户关系：一个用户 → 一个企业
权限模型：企业级独立管理
隔离范围：AppUser、Role、Menu、Permission、Notice、ActivityLog 等所有业务数据
注册模式：企业自助注册，首个用户自动成为企业管理员
```

### 数据模型

#### Company（企业）

```csharp
public class Company : ISoftDeletable, IEntity, ITimestamped
{
    public string? Id { get; set; }
    public string Name { get; set; }           // 企业名称
    public string Code { get; set; }           // 企业代码（唯一）
    public string? Logo { get; set; }          // 企业Logo
    public string? Description { get; set; }   // 企业描述
    public string? Industry { get; set; }      // 行业
    public string? ContactName { get; set; }   // 联系人
    public string? ContactEmail { get; set; }  // 联系邮箱
    public string? ContactPhone { get; set; }  // 联系电话
    public bool IsActive { get; set; }         // 是否激活
    public int MaxUsers { get; set; }          // 最大用户数
    public DateTime? ExpiresAt { get; set; }   // 过期时间（可选）
    // ISoftDeletable, ITimestamped 字段...
}
```

#### 实体 CompanyId 字段

所有业务实体都添加了 `companyId` 字段：

- `AppUser` - 用户
- `Role` - 角色
- `Menu` - 菜单
- `Permission` - 权限
- `NoticeIconItem` - 通知
- `UserActivityLog` - 用户活动日志
- `User` - 用户（简单模型）

### 租户上下文

#### ITenantContext 接口

```csharp
public interface ITenantContext
{
    string? GetCurrentCompanyId();    // 从 JWT 获取当前企业ID
    string? GetCurrentUserId();       // 从 JWT 获取当前用户ID
    string? GetCurrentUsername();     // 从 JWT 获取当前用户名
}
```

#### TenantContext 实现

从 HttpContext 的 User Claims 中提取租户信息：

```csharp
public string? GetCurrentCompanyId()
{
    return _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;
}
```

### 自动租户过滤

#### BaseRepository 增强

`BaseRepository` 实现了自动租户过滤机制：

```csharp
protected FilterDefinition<T> BuildTenantFilter(FilterDefinition<T>? additionalFilter = null)
{
    var builder = Builders<T>.Filter;
    var filters = new List<FilterDefinition<T>>
    {
        builder.Eq(e => e.IsDeleted, false)  // 自动过滤已删除
    };

    // 如果实体有 CompanyId 属性，自动添加过滤
    if (typeof(T).GetProperty("CompanyId") != null)
    {
        var companyId = _tenantContext.GetCurrentCompanyId();
        if (!string.IsNullOrEmpty(companyId))
        {
            filters.Add(builder.Eq("companyId", companyId));  // 自动租户过滤
        }
    }

    if (additionalFilter != null)
        filters.Add(additionalFilter);
        
    return builder.And(filters);
}
```

**关键特性：**

- ✅ 所有查询自动添加 `CompanyId` 过滤
- ✅ 创建实体时自动设置 `CompanyId`
- ✅ 使用反射检测实体是否有 CompanyId 属性
- ✅ 100% 防止跨企业数据访问

### JWT Token 设计

JWT Token 中包含企业ID：

```csharp
var claims = new List<Claim>
{
    new("userId", user.Id),
    new("username", user.Username),
    new("companyId", user.CompanyId),  // 企业ID
};
```

**安全性：**
- CompanyId 由服务器签名，客户端无法篡改
- 每个请求都携带 CompanyId，确保数据隔离

## 🚀 企业注册流程

### 用户视角

1. 访问企业注册页面
2. 填写企业信息（名称、代码、行业等）
3. 设置管理员账户（用户名、密码、邮箱）
4. 提交注册
5. 自动登录，进入管理后台

### 系统处理流程

```
POST /api/company/register
    ↓
1. 创建企业记录
    ↓
2. 创建默认权限集（32个权限：8个资源 × 4个操作）
    ↓
3. 创建管理员角色（拥有所有权限）
    ↓
4. 创建默认菜单（仪表板、用户管理、角色管理等）
    ↓
5. 创建管理员用户（分配管理员角色）
    ↓
6. 生成 JWT Token（包含 companyId）
    ↓
7. 返回企业信息 + Token
```

**事务性：** 如果任何步骤失败，已创建的企业会被自动删除（回滚）

## 📡 API 接口

### 企业注册

```http
POST /api/company/register
Content-Type: application/json

{
  "companyName": "示例公司",
  "companyCode": "example-company",
  "companyDescription": "一家示例公司",
  "industry": "互联网",
  "adminUsername": "admin",
  "adminPassword": "admin123",
  "adminEmail": "admin@example.com",
  "contactName": "张三",
  "contactPhone": "13800138000"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "company": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-01-14T12:00:00Z"
  },
  "errorMessage": "企业注册成功，已自动登录"
}
```

### 获取当前企业信息

```http
GET /api/company/current
Authorization: Bearer <token>
```

### 更新当前企业信息

```http
PUT /api/company/current
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新企业名称",
  "description": "新的描述",
  "logo": "https://example.com/logo.png"
}
```

### 获取企业统计信息

```http
GET /api/company/statistics
Authorization: Bearer <token>
```

**响应：**

```json
{
  "totalUsers": 15,
  "activeUsers": 12,
  "totalRoles": 3,
  "totalMenus": 8,
  "totalPermissions": 32,
  "maxUsers": 100,
  "remainingUsers": 85,
  "isExpired": false,
  "expiresAt": null
}
```

### 检查企业代码可用性

```http
GET /api/company/check-code?code=my-company
```

## 🔐 安全机制

### 数据隔离保证

1. **JWT 签名保护**
   - CompanyId 存储在 JWT 中，由服务器签名
   - 客户端无法篡改 CompanyId

2. **自动过滤**
   - BaseRepository 自动添加 CompanyId 过滤
   - 所有查询都经过租户过滤

3. **创建时自动设置**
   - 创建实体时自动从 TenantContext 获取 CompanyId
   - 无法手动设置其他企业的 CompanyId

4. **权限检查**
   - 权限系统基于 CompanyId 隔离
   - 每个企业独立的权限配置

### 防止跨企业访问

```csharp
// ❌ 无法访问其他企业的数据
var users = await _userRepository.GetAllAsync();
// 自动过滤：WHERE companyId = currentCompanyId AND isDeleted = false

// ✅ 只能看到自己企业的用户
// Result: [用户A（企业1）, 用户B（企业1）]
```

## 📊 数据迁移

### 迁移策略

系统提供了自动数据迁移脚本 `MigrateToMultiTenant`：

1. 检查是否已存在默认企业
2. 创建默认企业（Code: "default"）
3. 为所有现有数据添加 CompanyId
4. 迁移集合：users, roles, menus, permissions, notices, activity_logs

**迁移特性：**

- ✅ 幂等性：可以安全地多次执行
- ✅ 自动检测：只迁移缺少 CompanyId 的数据
- ✅ 批量操作：使用 MongoDB UpdateMany 提高性能
- ✅ 日志记录：详细的迁移日志

### 执行时机

迁移脚本在应用启动时自动执行（`Program.cs`）：

```csharp
// ⚠️ 重要：多租户数据迁移（v3.0 新增）
// 必须在其他初始化脚本之前执行
var migrateToMultiTenant = new MigrateToMultiTenant(database, logger);
await migrateToMultiTenant.MigrateAsync();
```

## 💡 使用示例

### 企业注册示例

```javascript
// 前端调用示例
const registerCompany = async () => {
  const response = await fetch('/api/company/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: '科技公司',
      companyCode: 'tech-company',
      industry: '互联网',
      adminUsername: 'admin',
      adminPassword: 'Admin@123',
      adminEmail: 'admin@tech.com',
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    // 保存 token
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('refreshToken', result.data.refreshToken);
    
    // 跳转到仪表板
    window.location.href = '/dashboard';
  }
};
```

### 后端服务示例

```csharp
// 创建用户时自动关联到当前企业
public async Task<AppUser> CreateUserAsync(CreateUserRequest request)
{
    var user = new AppUser
    {
        Username = request.Username,
        Email = request.Email,
        // CompanyId 会由 BaseRepository.CreateAsync() 自动设置
    };

    // 自动设置 CompanyId，自动租户隔离
    return await _userRepository.CreateAsync(user);
}

// 查询时自动过滤当前企业
public async Task<List<AppUser>> GetUsersAsync()
{
    // 自动添加: WHERE companyId = currentCompanyId AND isDeleted = false
    return await _userRepository.GetAllAsync();
}
```

## 🎯 最佳实践

### 1. 始终使用 BaseRepository

```csharp
// ✅ 推荐：使用 BaseRepository
private readonly BaseRepository<AppUser> _userRepository;

// ❌ 不推荐：直接使用 IMongoCollection（除非有特殊需求）
private readonly IMongoCollection<AppUser> _users;
```

### 2. 不要手动过滤 CompanyId

```csharp
// ❌ 不要这样做
var filter = Builders<AppUser>.Filter.Eq(u => u.CompanyId, companyId);
var users = await _users.Find(filter).ToListAsync();

// ✅ 让 BaseRepository 自动处理
var users = await _userRepository.GetAllAsync();
```

### 3. 企业级功能检查

```csharp
// 检查企业是否过期
public async Task CheckCompanyStatusAsync(string companyId)
{
    var company = await _companyService.GetCompanyByIdAsync(companyId);
    
    if (company == null || !company.IsActive)
        throw new InvalidOperationException("企业未激活");
        
    if (company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow)
        throw new InvalidOperationException("企业已过期");
}

// 检查用户配额
public async Task CheckUserQuotaAsync(string companyId)
{
    var stats = await _companyService.GetCompanyStatisticsAsync(companyId);
    
    if (stats.RemainingUsers <= 0)
        throw new InvalidOperationException("已达到最大用户数限制");
}
```

## 🔍 故障排查

### 问题1：无法查询到数据

**原因：** JWT Token 中缺少 CompanyId

**解决：** 确保登录时生成的 Token 包含 CompanyId claim

```csharp
// 检查 JWT 生成
var claims = new List<Claim>
{
    new("companyId", user.CompanyId),  // 必须包含
};
```

### 问题2：看到其他企业的数据

**原因：** 使用了 IMongoCollection 直接查询，绕过了 BaseRepository

**解决：** 改用 BaseRepository

```csharp
// ❌ 绕过了租户过滤
await _users.Find(_ => true).ToListAsync();

// ✅ 自动租户过滤
await _userRepository.GetAllAsync();
```

### 问题3：数据迁移后仍看不到数据

**原因：** 迁移脚本未正确执行或 CompanyId 未设置

**解决：** 检查迁移日志，手动验证数据

```javascript
// MongoDB 手动检查
db.users.find({ companyId: { $exists: false } })  // 应该为空
db.users.find({ companyId: "default-company-id" })  // 应该有数据
```

## 📈 性能优化

### 索引建议

为了优化多租户查询性能，建议创建以下索引：

```javascript
// MongoDB 索引创建脚本

// 企业代码唯一索引
db.companies.createIndex({ code: 1 }, { unique: true })

// 用户相关索引
db.users.createIndex({ companyId: 1, username: 1 }, { unique: true })
db.users.createIndex({ companyId: 1, email: 1 })
db.users.createIndex({ companyId: 1, isDeleted: 1, isActive: 1 })

// 角色相关索引
db.roles.createIndex({ companyId: 1, name: 1 }, { unique: true })
db.roles.createIndex({ companyId: 1, isDeleted: 1 })

// 菜单相关索引
db.menus.createIndex({ companyId: 1, name: 1 })
db.menus.createIndex({ companyId: 1, parentId: 1 })
db.menus.createIndex({ companyId: 1, isDeleted: 1, isEnabled: 1 })

// 权限相关索引
db.permissions.createIndex({ companyId: 1, code: 1 }, { unique: true })
db.permissions.createIndex({ companyId: 1, resourceName: 1 })
```

### 查询优化建议

1. **利用复合索引** - CompanyId 始终作为索引的第一列
2. **避免全表扫描** - 始终包含 CompanyId 过滤
3. **批量操作** - 使用 UpdateMany/InsertMany 提高性能
4. **缓存企业信息** - 企业信息变更频率低，可以缓存

## 📝 开发清单

### 新增业务实体时

- [ ] 实体添加 `CompanyId` 字段（string 类型，BsonElement）
- [ ] 实体实现 `IEntity`, `ISoftDeletable`, `ITimestamped` 接口
- [ ] 使用 BaseRepository 进行数据访问
- [ ] 确保 Service 继承 BaseService（需要 ITenantContext）
- [ ] 测试数据隔离（创建多个企业测试）

### 代码审查清单

- [ ] 所有查询都使用 BaseRepository
- [ ] 没有直接使用 IMongoCollection 绕过过滤
- [ ] 创建实体时没有手动设置 CompanyId
- [ ] JWT Token 包含 CompanyId claim
- [ ] 所有 API 都有适当的权限检查

## 🔗 相关文档

- [实施状态文档](./MULTI-TENANT-IMPLEMENTATION-STATUS.md) - 详细的实施进度
- [CompanyService](mdc:Platform.ApiService/Services/CompanyService.cs) - 企业管理服务
- [TenantContext](mdc:Platform.ApiService/Services/TenantContext.cs) - 租户上下文
- [BaseRepository](mdc:Platform.ApiService/Services/BaseRepository.cs) - 仓储基类
- [MigrateToMultiTenant](mdc:Platform.ApiService/Scripts/MigrateToMultiTenant.cs) - 数据迁移脚本

## 📞 技术支持

如有问题或建议，请联系开发团队或查看：
- 实施状态文档：`docs/features/MULTI-TENANT-IMPLEMENTATION-STATUS.md`
- 项目 README：`README.md`

---

**版本**: v3.0  
**最后更新**: 2025-01-13  
**作者**: Aspire Admin Team

