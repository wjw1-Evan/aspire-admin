# 多企业隶属架构设计方案

## 📋 需求分析

### 核心需求变更

| 特性 | v3.0 设计（旧） | v3.1 设计（新） |
|------|---------------|---------------|
| **用户名唯一性** | 企业内唯一 | ✅ **全局唯一** |
| **用户-企业关系** | 一对一 | ✅ **多对多** |
| **企业归属** | 固定企业 | ✅ **可切换** |
| **用户注册** | 禁用/管理员创建 | ✅ **自助注册** |
| **加入企业** | 管理员创建 | ✅ **申请+审核** |
| **登录方式** | 企业代码+用户名 | ✅ **仅用户名** |
| **初始企业** | 需加入 | ✅ **自动创建** |

---

## 🏗️ 数据模型设计

### 1. User 模型变更

```csharp
// v3.1: 用户不再有单一的 CompanyId
public class AppUser : IEntity, ISoftDeletable, ITimestamped
{
    public string? Id { get; set; }
    public string Username { get; set; } = string.Empty;  // ✅ 全局唯一
    public string? Email { get; set; }  // ✅ 全局唯一
    public string PasswordHash { get; set; } = string.Empty;
    
    // ❌ 移除：public string CompanyId { get; set; }
    // ✅ 新增：当前选中的企业
    public string? CurrentCompanyId { get; set; }
    
    // ✅ 新增：个人企业ID（注册时自动创建）
    public string? PersonalCompanyId { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    // ISoftDeletable, ITimestamped 字段...
}
```

---

### 2. UserCompany 中间表（新增）

```csharp
/// <summary>
/// 用户-企业关联表（多对多关系）
/// </summary>
public class UserCompany : IEntity, ISoftDeletable, ITimestamped
{
    public string? Id { get; set; }
    
    /// <summary>
    /// 用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// 企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
    
    /// <summary>
    /// 用户在该企业的角色列表
    /// </summary>
    [BsonElement("roleIds")]
    public List<string> RoleIds { get; set; } = new();
    
    /// <summary>
    /// 加入状态：pending, active, rejected
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "active";
    
    /// <summary>
    /// 是否是企业管理员
    /// </summary>
    [BsonElement("isAdmin")]
    public bool IsAdmin { get; set; } = false;
    
    /// <summary>
    /// 加入时间
    /// </summary>
    [BsonElement("joinedAt")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// 审核人ID（管理员）
    /// </summary>
    [BsonElement("approvedBy")]
    public string? ApprovedBy { get; set; }
    
    /// <summary>
    /// 审核时间
    /// </summary>
    [BsonElement("approvedAt")]
    public DateTime? ApprovedAt { get; set; }
    
    // ISoftDeletable, ITimestamped 字段...
}
```

---

### 3. CompanyJoinRequest 申请表（新增）

```csharp
/// <summary>
/// 企业加入申请表
/// </summary>
public class CompanyJoinRequest : IEntity, ISoftDeletable, ITimestamped
{
    public string? Id { get; set; }
    
    /// <summary>
    /// 申请人用户ID
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// 目标企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;
    
    /// <summary>
    /// 申请状态：pending, approved, rejected
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "pending";
    
    /// <summary>
    /// 申请理由
    /// </summary>
    [BsonElement("reason")]
    public string? Reason { get; set; }
    
    /// <summary>
    /// 审核人ID（管理员）
    /// </summary>
    [BsonElement("reviewedBy")]
    public string? ReviewedBy { get; set; }
    
    /// <summary>
    /// 审核时间
    /// </summary>
    [BsonElement("reviewedAt")]
    public DateTime? ReviewedAt { get; set; }
    
    /// <summary>
    /// 拒绝原因
    /// </summary>
    [BsonElement("rejectReason")]
    public string? RejectReason { get; set; }
    
    // ISoftDeletable, ITimestamped 字段...
}
```

---

## 🔄 核心业务流程

### 流程1: 用户注册（全新）

```
1. 用户填写注册信息
   - 用户名（全局唯一）
   - 密码
   - 邮箱
   
2. 系统自动创建：
   a. 创建用户
   b. 创建个人企业（名称：用户名的企业）
   c. 创建默认权限、角色、菜单
   d. 在 UserCompany 表添加记录：
      - userId: 新用户ID
      - companyId: 个人企业ID
      - isAdmin: true
      - status: active
   e. 设置 user.CurrentCompanyId = 个人企业ID
   f. 设置 user.PersonalCompanyId = 个人企业ID
   
3. 自动登录
   
4. 用户可以开始使用系统（在自己的企业内）
```

---

### 流程2: 加入其他企业（申请+审核）

```
1. 用户搜索企业
   - 输入企业名称关键词
   - 显示匹配的企业列表
   
2. 用户点击"申请加入"
   - 填写申请理由
   - 提交申请
   - 创建 CompanyJoinRequest 记录（status: pending）
   
3. 企业管理员收到通知
   - 查看待审核申请列表
   - 查看申请人信息和理由
   
4. 管理员审核
   - 审核通过：
     * 在 UserCompany 表添加记录
     * status: active
     * 分配默认角色
     * 通知用户
   - 拒绝：
     * 更新申请状态为 rejected
     * 记录拒绝原因
     * 通知用户

5. 用户切换企业
   - 用户可以在多个企业间切换
   - 切换时更新 user.CurrentCompanyId
   - 系统根据当前企业显示对应的数据和菜单
```

---

### 流程3: 企业切换

```
1. 用户点击企业切换器
   - 显示用户所属的所有企业列表
   
2. 选择目标企业
   - 调用切换API
   - 更新 user.CurrentCompanyId
   
3. 刷新界面
   - 重新加载菜单（目标企业的菜单）
   - 重新加载权限（用户在目标企业的权限）
   - 清空页面状态
```

---

## 📊 数据库 Schema

### users 集合

```javascript
{
  _id: ObjectId("..."),
  username: "john",  // ✅ 全局唯一索引
  email: "john@example.com",  // ✅ 全局唯一索引
  passwordHash: "...",
  currentCompanyId: "company-123",  // 当前选中的企业
  personalCompanyId: "company-personal-001",  // 个人企业
  isActive: true,
  isDeleted: false,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### user_companies 集合（新增）

```javascript
{
  _id: ObjectId("..."),
  userId: "user-001",  // 索引
  companyId: "company-123",  // 索引
  roleIds: ["role-001", "role-002"],
  status: "active",  // pending, active, rejected
  isAdmin: false,
  joinedAt: ISODate("..."),
  approvedBy: "admin-user-id",
  approvedAt: ISODate("..."),
  isDeleted: false,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### company_join_requests 集合（新增）

```javascript
{
  _id: ObjectId("..."),
  userId: "user-002",  // 索引
  companyId: "company-456",  // 索引
  status: "pending",  // pending, approved, rejected
  reason: "我想加入贵公司的开发团队",
  reviewedBy: null,
  reviewedAt: null,
  rejectReason: null,
  isDeleted: false,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🔧 核心技术实现

### 1. 用户注册自动创建企业

```csharp
public async Task<RegisterResult> RegisterAsync(RegisterRequest request)
{
    // 1. 验证用户名全局唯一
    var existingUser = await _users.Find(u => u.Username == request.Username)
        .FirstOrDefaultAsync();
    if (existingUser != null)
        throw new InvalidOperationException("用户名已存在");
    
    // 2. 创建用户
    var user = new AppUser
    {
        Username = request.Username,
        Email = request.Email,
        PasswordHash = HashPassword(request.Password),
        IsActive = true
    };
    await _users.InsertOneAsync(user);
    
    // 3. 创建个人企业
    var personalCompany = new Company
    {
        Name = $"{request.Username}的企业",
        Code = $"personal-{user.Id}",  // 自动生成唯一代码
        IsActive = true,
        MaxUsers = 50
    };
    await _companies.InsertOneAsync(personalCompany);
    
    // 4. 创建默认权限、角色、菜单
    var permissions = await CreateDefaultPermissionsAsync(personalCompany.Id);
    var adminRole = await CreateAdminRoleAsync(personalCompany.Id, permissions);
    var menus = await CreateDefaultMenusAsync(personalCompany.Id);
    
    // 5. 创建用户-企业关联
    var userCompany = new UserCompany
    {
        UserId = user.Id,
        CompanyId = personalCompany.Id,
        RoleIds = new List<string> { adminRole.Id },
        IsAdmin = true,
        Status = "active",
        JoinedAt = DateTime.UtcNow
    };
    await _userCompanies.InsertOneAsync(userCompany);
    
    // 6. 更新用户的企业信息
    await _users.UpdateOneAsync(
        u => u.Id == user.Id,
        Builders<AppUser>.Update
            .Set(u => u.CurrentCompanyId, personalCompany.Id)
            .Set(u => u.PersonalCompanyId, personalCompany.Id)
    );
    
    return new RegisterResult { UserId = user.Id, CompanyId = personalCompany.Id };
}
```

---

### 2. 企业搜索

```csharp
public async Task<List<CompanySearchResult>> SearchCompaniesAsync(string keyword)
{
    var filter = Builders<Company>.Filter.And(
        Builders<Company>.Filter.Regex(c => c.Name, new BsonRegularExpression(keyword, "i")),
        Builders<Company>.Filter.Eq(c => c.IsActive, true),
        Builders<Company>.Filter.Eq(c => c.IsDeleted, false)
    );
    
    var companies = await _companies.Find(filter)
        .Limit(20)
        .ToListAsync();
    
    var userId = GetCurrentUserId();
    var results = new List<CompanySearchResult>();
    
    foreach (var company in companies)
    {
        // 检查用户是否已在该企业
        var userCompany = await _userCompanies.Find(uc => 
            uc.UserId == userId && 
            uc.CompanyId == company.Id &&
            uc.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        // 检查是否有待审核的申请
        var pendingRequest = await _joinRequests.Find(jr =>
            jr.UserId == userId &&
            jr.CompanyId == company.Id &&
            jr.Status == "pending" &&
            jr.IsDeleted == false
        ).FirstOrDefaultAsync();
        
        results.Add(new CompanySearchResult
        {
            Company = company,
            IsMember = userCompany != null && userCompany.Status == "active",
            HasPendingRequest = pendingRequest != null,
            MemberStatus = userCompany?.Status
        });
    }
    
    return results;
}
```

---

### 3. 申请加入企业

```csharp
public async Task<CompanyJoinRequest> ApplyToJoinCompanyAsync(ApplyToJoinRequest request)
{
    var userId = GetRequiredUserId();
    var companyId = request.CompanyId;
    
    // 1. 验证企业存在且活跃
    var company = await _companies.Find(c => 
        c.Id == companyId && 
        c.IsActive == true &&
        c.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (company == null)
        throw new KeyNotFoundException("企业不存在或已停用");
    
    // 2. 检查是否已是成员
    var existingMembership = await _userCompanies.Find(uc =>
        uc.UserId == userId &&
        uc.CompanyId == companyId &&
        uc.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (existingMembership != null)
    {
        if (existingMembership.Status == "active")
            throw new InvalidOperationException("您已是该企业的成员");
        if (existingMembership.Status == "pending")
            throw new InvalidOperationException("您的加入申请正在审核中");
    }
    
    // 3. 检查是否有待审核的申请
    var existingRequest = await _joinRequests.Find(jr =>
        jr.UserId == userId &&
        jr.CompanyId == companyId &&
        jr.Status == "pending" &&
        jr.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (existingRequest != null)
        throw new InvalidOperationException("您已提交过申请，请等待审核");
    
    // 4. 创建申请记录
    var joinRequest = new CompanyJoinRequest
    {
        UserId = userId,
        CompanyId = companyId,
        Reason = request.Reason,
        Status = "pending"
    };
    
    await _joinRequests.InsertOneAsync(joinRequest);
    
    // 5. TODO: 通知企业管理员
    
    return joinRequest;
}
```

---

### 4. 审核加入申请

```csharp
public async Task<bool> ApproveJoinRequestAsync(string requestId)
{
    var adminUserId = GetRequiredUserId();
    
    // 1. 获取申请记录
    var request = await _joinRequests.Find(jr => 
        jr.Id == requestId &&
        jr.Status == "pending" &&
        jr.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (request == null)
        throw new KeyNotFoundException("申请不存在或已处理");
    
    // 2. 验证审核人是否是该企业的管理员
    var adminMembership = await _userCompanies.Find(uc =>
        uc.UserId == adminUserId &&
        uc.CompanyId == request.CompanyId &&
        uc.IsAdmin == true &&
        uc.Status == "active" &&
        uc.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (adminMembership == null)
        throw new UnauthorizedAccessException("您不是该企业的管理员");
    
    // 3. 检查企业用户配额
    var currentMemberCount = await _userCompanies.CountDocumentsAsync(uc =>
        uc.CompanyId == request.CompanyId &&
        uc.Status == "active" &&
        uc.IsDeleted == false
    );
    
    var company = await _companies.Find(c => c.Id == request.CompanyId)
        .FirstOrDefaultAsync();
    
    if (company != null && currentMemberCount >= company.MaxUsers)
        throw new InvalidOperationException("企业用户数已达上限");
    
    // 4. 获取默认角色（非管理员角色）
    var defaultRole = await _roles.Find(r =>
        r.CompanyId == request.CompanyId &&
        r.Name == "员工" &&
        r.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    // 5. 创建用户-企业关联
    var userCompany = new UserCompany
    {
        UserId = request.UserId,
        CompanyId = request.CompanyId,
        RoleIds = defaultRole != null ? new List<string> { defaultRole.Id } : new(),
        IsAdmin = false,
        Status = "active",
        JoinedAt = DateTime.UtcNow,
        ApprovedBy = adminUserId,
        ApprovedAt = DateTime.UtcNow
    };
    await _userCompanies.InsertOneAsync(userCompany);
    
    // 6. 更新申请状态
    await _joinRequests.UpdateOneAsync(
        jr => jr.Id == requestId,
        Builders<CompanyJoinRequest>.Update
            .Set(jr => jr.Status, "approved")
            .Set(jr => jr.ReviewedBy, adminUserId)
            .Set(jr => jr.ReviewedAt, DateTime.UtcNow)
            .Set(jr => jr.UpdatedAt, DateTime.UtcNow)
    );
    
    // 7. TODO: 通知用户申请已通过
    
    return true;
}
```

---

### 5. 切换企业

```csharp
public async Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId)
{
    var userId = GetRequiredUserId();
    
    // 1. 验证用户是该企业的成员
    var membership = await _userCompanies.Find(uc =>
        uc.UserId == userId &&
        uc.CompanyId == targetCompanyId &&
        uc.Status == "active" &&
        uc.IsDeleted == false
    ).FirstOrDefaultAsync();
    
    if (membership == null)
        throw new UnauthorizedAccessException("您不是该企业的成员");
    
    // 2. 更新用户当前企业
    await _users.UpdateOneAsync(
        u => u.Id == userId,
        Builders<AppUser>.Update
            .Set(u => u.CurrentCompanyId, targetCompanyId)
            .Set(u => u.UpdatedAt, DateTime.UtcNow)
    );
    
    // 3. 获取新企业的菜单和权限
    var menus = await GetUserMenusInCompanyAsync(userId, targetCompanyId);
    var permissions = await GetUserPermissionsInCompanyAsync(userId, targetCompanyId);
    
    return new SwitchCompanyResult
    {
        CompanyId = targetCompanyId,
        Menus = menus,
        Permissions = permissions
    };
}
```

---

## 🔧 TenantContext 调整

### 获取当前企业ID

```csharp
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IMongoDatabase _database;

    public string? GetCurrentCompanyId()
    {
        // v3.1: 从用户的 CurrentCompanyId 获取
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return null;
        
        var users = _database.GetCollection<AppUser>("users");
        var user = users.Find(u => u.Id == userId)
            .Project(u => new { u.CurrentCompanyId })
            .FirstOrDefault();
        
        return user?.CurrentCompanyId;
    }
    
    // 缓存优化：避免每次请求都查数据库
    private string? _cachedCompanyId;
    private string? _cachedUserId;
    
    public string? GetCurrentCompanyIdCached()
    {
        var currentUserId = GetCurrentUserId();
        
        if (_cachedUserId == currentUserId && _cachedCompanyId != null)
            return _cachedCompanyId;
        
        _cachedUserId = currentUserId;
        _cachedCompanyId = GetCurrentCompanyId();
        
        return _cachedCompanyId;
    }
}
```

---

## 📊 API 端点设计

### 用户注册和登录

```
POST   /api/register                    用户注册（自动创建个人企业）
POST   /api/login/account               登录（仅用户名+密码）
GET    /api/currentUser                 获取当前用户信息
POST   /api/login/outLogin              登出
```

### 企业管理

```
GET    /api/companies/search            搜索企业
GET    /api/companies/my-companies      获取我加入的所有企业
POST   /api/companies/switch            切换当前企业
GET    /api/companies/current           获取当前企业信息
PUT    /api/companies/current           更新当前企业信息（需要管理员权限）
```

### 加入申请

```
POST   /api/join-requests               申请加入企业
GET    /api/join-requests/my-requests   我的申请列表
GET    /api/join-requests/pending       待审核申请（管理员）
POST   /api/join-requests/{id}/approve  审核通过
POST   /api/join-requests/{id}/reject   拒绝申请
DELETE /api/join-requests/{id}          撤回申请
```

### 企业成员管理

```
GET    /api/companies/{id}/members      获取企业成员列表（管理员）
PUT    /api/companies/{id}/members/{userId}/roles  分配角色（管理员）
DELETE /api/companies/{id}/members/{userId}        移除成员（管理员）
PUT    /api/companies/{id}/members/{userId}/admin  设置管理员（管理员）
```

---

## 🎨 前端UI设计

### 1. 注册页面

```
┌────────────────────────────────┐
│         用户注册                │
├────────────────────────────────┤
│  👤 用户名: [            ]     │
│  📧 邮箱:   [            ]     │
│  🔒 密码:   [            ]     │
│  🔒 确认:   [            ]     │
├────────────────────────────────┤
│  [       立即注册       ]      │
└────────────────────────────────┘

注册成功后自动：
✅ 创建您的个人企业
✅ 您将成为企业管理员
✅ 可以邀请其他成员
```

### 2. 登录页面

```
┌────────────────────────────────┐
│         用户登录                │
├────────────────────────────────┤
│  👤 用户名: [            ]     │  ← 不需要企业代码
│  🔒 密码:   [            ]     │
├────────────────────────────────┤
│  □ 自动登录                    │
│  [       登   录       ]       │
├────────────────────────────────┤
│  还没有账号？立即注册           │
└────────────────────────────────┘
```

### 3. 企业切换器

```
┌────────────────────────────────┐
│  🏢 我的企业                    │
├────────────────────────────────┤
│  ● 我的个人企业 (管理员)        │ ← 当前选中
│  ○ ABC科技有限公司 (员工)      │
│  ○ XYZ公司 (开发)              │
├────────────────────────────────┤
│  [+] 加入其他企业               │
└────────────────────────────────┘
```

### 4. 企业搜索页面

```
┌────────────────────────────────┐
│  搜索企业                       │
├────────────────────────────────┤
│  🔍 [输入企业名称]              │
├────────────────────────────────┤
│  搜索结果：                     │
│                                │
│  📋 ABC科技有限公司             │
│     成员: 25人 | 行业: 互联网   │
│     [已加入] [查看]             │
│                                │
│  📋 XYZ公司                     │
│     成员: 10人 | 行业: 制造业   │
│     [待审核]                    │
│                                │
│  📋 测试企业                    │
│     成员: 5人                   │
│     [申请加入]                  │
└────────────────────────────────┘
```

### 5. 审核管理页面（管理员）

```
┌────────────────────────────────┐
│  加入申请审核                   │
├────────────────────────────────┤
│  待审核 (3)  已通过  已拒绝    │
├────────────────────────────────┤
│  👤 张三                        │
│     申请时间: 2024-01-13        │
│     申请理由: 我想加入开发团队  │
│     [通过] [拒绝]               │
├────────────────────────────────┤
│  👤 李四                        │
│     申请时间: 2024-01-12        │
│     申请理由: 技术支持          │
│     [通过] [拒绝]               │
└────────────────────────────────┘
```

---

## 🔄 数据迁移策略

### v3.0 → v3.1 迁移

```csharp
public async Task MigrateToMultiCompanyAsync()
{
    var users = await _users.Find(u => u.IsDeleted == false).ToListAsync();
    
    foreach (var user in users)
    {
        // 1. 创建 UserCompany 记录（从旧的 CompanyId）
        if (!string.IsNullOrEmpty(user.CompanyId))
        {
            var userCompany = new UserCompany
            {
                UserId = user.Id,
                CompanyId = user.CompanyId,  // 使用旧的 CompanyId
                RoleIds = user.RoleIds ?? new(),
                IsAdmin = user.RoleIds?.Any(rid => IsAdminRole(rid)) ?? false,
                Status = "active",
                JoinedAt = user.CreatedAt
            };
            
            await _userCompanies.InsertOneAsync(userCompany);
            
            // 2. 设置当前企业和个人企业
            await _users.UpdateOneAsync(
                u => u.Id == user.Id,
                Builders<AppUser>.Update
                    .Set(u => u.CurrentCompanyId, user.CompanyId)
                    .Set(u => u.PersonalCompanyId, user.CompanyId)
                    // 移除旧的 CompanyId 字段
                    .Unset("companyId")
                    // 移除旧的 RoleIds 字段（现在在 UserCompany 中）
                    .Unset("roleIds")
            );
        }
    }
}
```

---

## 📊 对比表

### 架构对比

| 特性 | v3.0 单企业 | v3.1 多企业 |
|------|-----------|-----------|
| 用户-企业关系 | 一对一 | 多对多 |
| 用户名唯一性 | 企业内 | 全局 |
| 登录方式 | 企业代码+用户名 | 仅用户名 |
| 角色管理 | user.RoleIds | userCompany.RoleIds |
| 数据隔离 | user.CompanyId | user.CurrentCompanyId |
| 加入企业 | 管理员创建 | 申请+审核 |
| 企业切换 | 不支持 | 支持 |

### 优缺点对比

**v3.0 单企业模型**:
- ✅ 简单直接
- ✅ 性能更好
- ❌ 用户不能加入多个企业
- ❌ 需要为每个企业创建不同账户

**v3.1 多企业模型**:
- ✅ 灵活性高
- ✅ 用户体验更好
- ✅ 更符合现代SaaS标准
- ❌ 实现复杂度高
- ❌ 需要更多的查询和验证

---

## 🚀 实施计划

### 阶段1: 数据模型和迁移（2天）

1. 创建新的数据模型
   - UserCompany
   - CompanyJoinRequest
   
2. 修改 User 模型
   - 移除 CompanyId
   - 添加 CurrentCompanyId
   - 添加 PersonalCompanyId
   
3. 创建数据迁移脚本
   - 迁移现有数据到新模型
   
4. 创建数据库索引

---

### 阶段2: 后端API实现（3天）

1. 修改认证服务
   - 用户注册自动创建企业
   - 登录逻辑调整（不需要企业代码）
   
2. 实现企业搜索
   
3. 实现加入申请流程
   - 申请API
   - 审核API
   - 拒绝API
   
4. 实现企业切换
   
5. 修改 TenantContext
   - 从 user.CurrentCompanyId 获取
   
6. 实现成员管理API

---

### 阶段3: 前端UI实现（3天）

1. 修改注册页面
   - 简化表单（不需要企业信息）
   - 提示自动创建企业
   
2. 修改登录页面
   - 移除企业代码输入框
   
3. 实现企业切换器组件
   
4. 实现企业搜索页面
   
5. 实现加入申请管理
   - 我的申请列表
   - 待审核列表（管理员）
   
6. 实现企业成员管理（管理员）

---

### 阶段4: 测试和文档（1天）

1. 端到端测试
2. 性能测试
3. 更新文档
4. 创建用户指南

---

## ⚠️ 注意事项

### Breaking Changes

**这是一个重大的架构变更**：

1. **用户名唯一性**：从企业内 → 全局
2. **登录方式**：需要企业代码 → 不需要
3. **数据模型**：user.CompanyId → user.CurrentCompanyId
4. **角色管理**：user.RoleIds → userCompany.RoleIds

### 影响评估

**优点**:
- ✅ 更好的用户体验
- ✅ 更灵活的企业协作
- ✅ 符合现代SaaS标准

**缺点**:
- ❌ 实施周期长（约1周）
- ❌ 需要数据迁移
- ❌ 增加系统复杂度
- ❌ 性能开销增加（需要join查询）

---

## 📝 技术挑战

### 挑战1: 性能优化

**问题**: UserCompany join查询可能影响性能

**解决方案**:
- 使用缓存（user.CurrentCompanyId缓存企业信息）
- 创建合适的索引
- 考虑使用反范式设计（冗余部分数据）

### 挑战2: 角色权限管理

**问题**: 同一用户在不同企业有不同角色

**解决方案**:
- UserCompany 表记录用户在每个企业的角色
- 切换企业时重新加载权限

### 挑战3: 数据一致性

**问题**: 删除企业时如何处理成员关系

**解决方案**:
- 软删除企业
- 保留 UserCompany 记录（标记为 inactive）
- 用户切换时过滤已删除的企业

---

## 🎯 我的建议

### 选项A: 全面实施 v3.1（推荐长期）

**优点**: 功能完善，用户体验好  
**缺点**: 开发周期长（约1周）  
**适用**: 项目长期规划，有充足时间

### 选项B: 保持 v3.0 设计（推荐当前）

**优点**: 已实现完成，可立即使用  
**缺点**: 功能相对简单  
**适用**: 快速上线，后续迭代

### 选项C: 混合方案

**阶段1**: 使用 v3.0（单企业）上线  
**阶段2**: v3.2 逐步迁移到多企业模型  

---

## 📚 参考案例

### 类似产品

**Slack**: 一个用户可以加入多个工作区  
**GitHub**: 一个用户可以属于多个组织  
**Notion**: 一个用户可以在多个工作区切换

---

**设计状态**: ✅ 方案完成  
**实施评估**: 需要约 7-9 天  
**建议**: 根据项目紧急程度选择实施方案

