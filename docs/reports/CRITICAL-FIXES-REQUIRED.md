# 紧急修复任务清单

## 🚨 P0 - 严重问题（立即修复）

### 1. 企业注册缺少 UserCompany 记录创建

**问题描述**：
企业注册时创建了用户和角色，但没有创建 `UserCompany` 关联记录，导致：
- 用户登录后无法获取角色信息
- `GetCurrentUserAsync` 查询角色失败
- 企业统计信息不准确（无法正确统计用户数量）

**位置**：
- 文件：`Platform.ApiService/Services/CompanyService.cs`
- 方法：`RegisterCompanyAsync`
- 行数：80-120

**当前代码问题**：
```csharp
// 4. 创建管理员用户
var adminUser = new AppUser
{
    Username = request.AdminUsername,
    Email = request.AdminEmail,
    PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
    CurrentCompanyId = company.Id!,
    IsActive = true
};
await _users.InsertOneAsync(adminUser);

// ❌ 问题：缺少 UserCompany 创建
// 导致用户无法获取角色信息

return company;
```

**修复方案**：
```csharp
// 4. 创建管理员用户
var adminUser = new AppUser
{
    Username = request.AdminUsername,
    Email = request.AdminEmail,
    PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
    CurrentCompanyId = company.Id!,
    IsActive = true
};
await _users.InsertOneAsync(adminUser);
LogInformation("为企业 {CompanyId} 创建管理员用户: {Username}", company.Id!, adminUser.Username!);

// ✅ 修复：创建 UserCompany 关联记录
var userCompanies = _database.GetCollection<UserCompany>("user_companies");
var userCompany = new UserCompany
{
    UserId = adminUser.Id!,
    CompanyId = company.Id!,
    RoleIds = new List<string> { adminRole.Id! },
    Status = "active",
    IsDeleted = false,
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};
await userCompanies.InsertOneAsync(userCompany);
LogInformation("为用户 {UserId} 创建企业关联记录，角色: {RoleIds}", 
    adminUser.Id!, string.Join(", ", userCompany.RoleIds));

return company;
```

**验证步骤**：
1. 创建新企业
2. 登录管理员账户
3. 检查 `GET /api/currentUser` 返回的角色信息
4. 查询 MongoDB `user_companies` 集合确认记录存在
5. 检查企业统计信息是否正确

**预计时间**：2小时

---

## ⚠️ P1 - 高优先级问题（本周修复）

### 2. 企业注册缺少事务保护 ✅ 已修复

**问题描述**：
企业注册流程涉及多个数据库操作（创建企业、角色、用户、UserCompany），但没有使用数据库事务，如果中间步骤失败：
- 当前只删除企业记录
- 角色和用户记录可能残留
- 数据不一致

**修复方案**：
由于MongoDB单机模式不支持事务，项目已采用错误回滚机制：

```csharp
public async Task<Company> RegisterCompanyAsync(RegisterCompanyRequest request)
{
    // 验证企业代码格式
    request.CompanyCode.EnsureValidUsername(nameof(request.CompanyCode));

    // 检查企业代码是否已存在
    var existingCompany = await GetCompanyByCodeAsync(request.CompanyCode);
    if (existingCompany != null)
    {
        throw new InvalidOperationException(CompanyErrorMessages.CompanyCodeExists);
    }

    // ✅ 使用错误回滚机制（兼容MongoDB单机模式）
    Company? company = null;
    Role? adminRole = null;
    AppUser? adminUser = null;
    UserCompany? userCompany = null;

    try
    {
        // 1. 创建企业
        var company = new Company
        {
            Name = request.CompanyName,
            Code = request.CompanyCode.ToLower(),
            Description = request.CompanyDescription,
            Industry = request.Industry,
            ContactName = request.ContactName ?? request.AdminUsername,
            ContactEmail = request.AdminEmail,
            ContactPhone = request.ContactPhone,
            IsActive = true,
            MaxUsers = CompanyConstants.DefaultMaxUsers,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _companies.InsertOneAsync(company);
        LogInformation("企业创建成功: {CompanyName} ({CompanyCode})", company.Name, company.Code);

        // 2. 获取所有全局菜单
        var allMenus = await _menus.Find(m => m.IsEnabled && !m.IsDeleted).ToListAsync();
        var allMenuIds = allMenus.Select(m => m.Id!).ToList();
        LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

        // 3. 创建默认管理员角色
        adminRole = new Role
        {
            Name = "管理员",
            Description = "系统管理员，拥有所有菜单访问权限",
            CompanyId = company.Id!,
            MenuIds = allMenuIds,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _roles.InsertOneAsync(adminRole);
        LogInformation("为企业 {CompanyId} 创建管理员角色: {RoleId}", company.Id!, adminRole.Id!);

        // 4. 创建管理员用户
        adminUser = new AppUser
        {
            Username = request.AdminUsername,
            Email = request.AdminEmail,
            PasswordHash = _passwordHasher.HashPassword(request.AdminPassword),
            CurrentCompanyId = company.Id!,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _users.InsertOneAsync(adminUser);
        LogInformation("为企业 {CompanyId} 创建管理员用户: {Username}", company.Id!, adminUser.Username!);

        // 5. 创建 UserCompany 关联记录
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        userCompany = new UserCompany
        {
            UserId = adminUser.Id!,
            CompanyId = company.Id!,
            RoleIds = new List<string> { adminRole.Id! },
            Status = "active",
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await userCompanies.InsertOneAsync(userCompany);
        LogInformation("为用户 {UserId} 创建企业关联记录", adminUser.Id!);

        return company;
    }
    catch (Exception ex)
    {
        // ✅ 错误回滚：清理已创建的数据
        await RollbackCompanyRegistrationAsync(company, adminRole, adminUser, userCompany);
        LogError("企业注册失败，已执行回滚操作", ex);
        throw new InvalidOperationException($"企业注册失败: {ex.Message}", ex);
    }
}
```

**注意事项**：
- ✅ 已移除MongoDB事务支持，改用错误回滚机制
- ✅ 兼容MongoDB单机模式，无需配置副本集
- ✅ 开发和生产环境统一使用错误回滚机制
- ✅ 确保数据一致性，避免残留数据

**预计时间**：已完成

---

### 3. 实现登录失败次数限制

**问题描述**：
当前登录接口没有失败次数限制，存在暴力破解风险。

**修复方案**：

#### 3.1 添加登录尝试记录模型
```csharp
// Models/LoginAttempt.cs
public class LoginAttempt
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime AttemptTime { get; set; }
    public bool IsSuccess { get; set; }
    public string? FailureReason { get; set; }
}
```

#### 3.2 创建登录限制服务
```csharp
// Services/LoginAttemptService.cs
public interface ILoginAttemptService
{
    Task<bool> IsLockedOutAsync(string username);
    Task RecordSuccessAsync(string username, string ipAddress);
    Task RecordFailureAsync(string username, string ipAddress, string reason);
    Task<int> GetFailedAttemptsCountAsync(string username);
}

public class LoginAttemptService : ILoginAttemptService
{
    private readonly IMongoCollection<LoginAttempt> _attempts;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private const int MaxAttempts = 5;
    private readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public async Task<bool> IsLockedOutAsync(string username)
    {
        var since = DateTime.UtcNow.Subtract(LockoutDuration);
        var failedCount = await _attempts.CountDocumentsAsync(
            a => a.Username == username && 
            !a.IsSuccess && 
            a.AttemptTime >= since
        );
        
        return failedCount >= MaxAttempts;
    }

    public async Task RecordFailureAsync(string username, string ipAddress, string reason)
    {
        var attempt = new LoginAttempt
        {
            Username = username,
            IpAddress = ipAddress,
            AttemptTime = DateTime.UtcNow,
            IsSuccess = false,
            FailureReason = reason
        };
        await _attempts.InsertOneAsync(attempt);
    }

    public async Task RecordSuccessAsync(string username, string ipAddress)
    {
        var attempt = new LoginAttempt
        {
            Username = username,
            IpAddress = ipAddress,
            AttemptTime = DateTime.UtcNow,
            IsSuccess = true
        };
        await _attempts.InsertOneAsync(attempt);
        
        // 清除失败记录
        await _attempts.DeleteManyAsync(
            a => a.Username == username && !a.IsSuccess
        );
    }
}
```

#### 3.3 修改登录逻辑
```csharp
// AuthService.LoginAsync
public async Task<LoginResult> LoginAsync(LoginRequest request)
{
    var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
    
    // 1. 检查是否被锁定
    if (await _loginAttemptService.IsLockedOutAsync(request.Username))
    {
        var failedCount = await _loginAttemptService.GetFailedAttemptsCountAsync(request.Username);
        throw new UnauthorizedAccessException(
            $"登录失败次数过多（{failedCount}次），账户已被锁定15分钟。请稍后再试。");
    }
    
    // 2. 查找用户
    var user = await _users.Find(u => u.Username == request.Username).FirstOrDefaultAsync();
    
    // 3. 验证密码
    if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
    {
        await _loginAttemptService.RecordFailureAsync(
            request.Username, ipAddress, "用户名或密码错误");
        throw new UnauthorizedAccessException("用户名或密码错误");
    }
    
    // 4. 检查用户状态
    if (!user.IsActive)
    {
        await _loginAttemptService.RecordFailureAsync(
            request.Username, ipAddress, "用户已被禁用");
        throw new UnauthorizedAccessException("用户已被禁用");
    }
    
    // 5. 记录成功登录
    await _loginAttemptService.RecordSuccessAsync(request.Username, ipAddress);
    
    // 6. 生成 Token
    return GenerateTokens(user);
}
```

**预计时间**：6小时

---

### 4. 实现邀请码注册系统

**问题描述**：
当前用户注册功能被禁用，但没有提供替代方案。文档中提到的邀请码系统未实现。

**修复方案**：

详见 [用户加入流程设计文档](../features/USER-JOIN-COMPANY-DESIGN.md)

**核心实现**：

1. **InvitationCode 模型**
2. **InvitationService 服务**
3. **注册接口修改**
4. **前端邀请码页面**

**预计时间**：16小时（分多个阶段完成）

---

## 📋 修复检查清单

### P0 修复验证

- [ ] 企业注册创建 UserCompany 记录
  - [ ] 代码修改完成
  - [ ] 单元测试通过
  - [ ] 手动测试验证
  - [ ] 数据库记录确认
  - [ ] 文档更新

### P1 修复验证

- [ ] 企业注册事务保护
  - [ ] 事务代码实现
  - [ ] 失败场景测试
  - [ ] 回滚验证
  - [ ] 性能测试
  
- [ ] 登录失败限制
  - [ ] 失败记录模型
  - [ ] 限制服务实现
  - [ ] 集成到登录流程
  - [ ] 测试锁定机制
  - [ ] 前端提示优化

- [ ] 邀请码注册系统
  - [ ] 数据模型设计
  - [ ] 后端 API 实现
  - [ ] 前端页面开发
  - [ ] 邮件通知（可选）
  - [ ] 审核流程（可选）

## 📊 修复时间估算

| 任务 | 优先级 | 预计时间 | 依赖 | 建议完成时间 |
|------|--------|---------|------|-------------|
| UserCompany 创建 | P0 | 2小时 | 无 | 今天 |
| 企业注册事务 | P1 | 4小时 | P0 | 本周五 |
| 登录失败限制 | P1 | 6小时 | 无 | 本周五 |
| 邀请码系统 | P1 | 16小时 | 无 | 下周五 |

**总计**：28小时（约3.5个工作日）

## 🎯 修复顺序建议

### 第1天（今天）
1. **修复 UserCompany 创建**（2小时）
   - 最紧急，影响所有新注册企业
   - 修改 CompanyService.RegisterCompanyAsync
   - 测试验证

2. **数据修复脚本**（2小时）
   - 为已有企业补充 UserCompany 记录
   - 验证数据一致性

### 第2-3天（本周）
3. **添加企业注册事务保护**（4小时）
   - 依赖 P0 修复完成
   - 配置 MongoDB 副本集（开发环境）
   - 实现事务逻辑

4. **实现登录失败限制**（6小时）
   - 独立功能，可并行开发
   - 创建模型和服务
   - 集成到认证流程

### 第4-5天（下周）
5. **实现邀请码注册系统**（16小时）
   - 分阶段实现
   - 第一阶段：基础邀请码功能
   - 第二阶段：审核流程（可选）
   - 第三阶段：邮件通知（可选）

## 📚 相关文档

- [流程设计审查报告](./PROCESS-DESIGN-REVIEW.md)
- [用户加入流程设计](../features/USER-JOIN-COMPANY-DESIGN.md)
- [多租户系统文档](../features/MULTI-TENANT-SYSTEM.md)

---

**创建时间**: 2025-10-19  
**优先级**: 🚨 紧急  
**责任人**: 待分配  
**预计完成**: 2025-10-26

