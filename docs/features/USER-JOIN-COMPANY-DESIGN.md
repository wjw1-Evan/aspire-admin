# 用户加入企业流程设计

## 🎯 业务需求

在多租户系统中，新用户需要加入某个企业才能使用系统。设计合理的加入流程：

1. ✅ 确保用户与企业正确关联
2. ✅ 支持管理员审核机制
3. ✅ 防止未授权用户加入
4. ✅ 提供良好的用户体验

## 🏗️ 设计方案

### 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **邀请码注册** | 安全、简单、体验好 | 需要管理员生成邀请码 | ⭐⭐⭐⭐⭐ |
| **申请加入** | 用户主动、灵活 | 管理员工作量大 | ⭐⭐⭐ |
| **管理员创建** | 完全可控 | 用户体验一般 | ⭐⭐⭐⭐ |

### 推荐：邀请码注册流程

```
管理员生成邀请码
    ↓
发送邀请链接给新用户
    ↓
新用户点击链接，填写信息
    ↓
系统验证邀请码有效性
    ↓
创建用户，自动加入企业
    ↓
可选：管理员审核后激活
```

## 📊 实现方案

### 方案1：邀请码注册（推荐实施）

#### 数据模型

```csharp
public class InvitationCode : ISoftDeletable, IEntity, ITimestamped
{
    public string? Id { get; set; }
    public string Code { get; set; } = string.Empty;  // 邀请码
    public string CompanyId { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;  // 创建邀请码的管理员
    public List<string>? DefaultRoleIds { get; set; }  // 默认角色
    public int MaxUses { get; set; } = 1;  // 最大使用次数
    public int UsedCount { get; set; } = 0;  // 已使用次数
    public DateTime ExpiresAt { get; set; }  // 过期时间
    public bool RequiresApproval { get; set; } = false;  // 是否需要审核
    // ISoftDeletable, ITimestamped 字段...
}

public class UserJoinRequest : ISoftDeletable, IEntity, ITimestamped
{
    public string? Id { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string InvitationCodeId { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";  // pending, approved, rejected
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectReason { get; set; }
    // ISoftDeletable, ITimestamped 字段...
}
```

#### API 端点

```csharp
// InvitationController
[HttpPost("api/invitation")]
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateInvitationCode([FromBody] CreateInvitationRequest request)
{
    // 生成邀请码
    // 返回邀请链接
}

[HttpGet("api/invitation/verify")]
public async Task<IActionResult> VerifyInvitationCode([FromQuery] string code)
{
    // 验证邀请码有效性
    // 返回企业信息
}

[HttpPost("api/register-with-invitation")]
public async Task<IActionResult> RegisterWithInvitation([FromBody] RegisterWithInvitationRequest request)
{
    // 验证邀请码
    // 创建用户申请或直接创建用户
    // 如果需要审核，创建待审核记录
}

[HttpGet("api/join-requests")]
[RequirePermission("user", "create")]
public async Task<IActionResult> GetJoinRequests()
{
    // 获取待审核的用户申请
}

[HttpPost("api/join-requests/{id}/approve")]
[RequirePermission("user", "create")]
public async Task<IActionResult> ApproveJoinRequest(string id)
{
    // 审核通过，创建用户
}

[HttpPost("api/join-requests/{id}/reject")]
[RequirePermission("user", "create")]
public async Task<IActionResult> RejectJoinRequest(string id, [FromBody] RejectRequest request)
{
    // 拒绝申请
}
```

#### 前端页面

1. **管理员端：**
   - `/system/invitation-management` - 邀请码管理
   - `/system/join-requests` - 用户申请审核

2. **用户端：**
   - `/user/register?inviteCode=xxx` - 通过邀请码注册

### 方案2：当前的临时解决方案

**问题：**
当前的 `/api/register` 端点创建用户时没有设置 `CompanyId`，这会导致：
- 用户不属于任何企业
- 登录时无法获取企业信息
- 数据查询会失败

**临时修复：**
禁用普通用户注册，只允许：
1. 企业注册（自动创建管理员）
2. 管理员创建用户（已实现）

## 🔧 立即实施的解决方案

### 选项A：禁用普通用户注册（快速）

修改 `/api/register` 端点返回提示：

```csharp
public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
{
    // v3.0 多租户：普通用户注册已禁用
    return ApiResponse<AppUser>.ErrorResult(
        "FEATURE_DISABLED",
        "个人注册功能已禁用。请联系企业管理员创建账户，或通过企业注册创建新企业。"
    );
}
```

### 选项B：邀请码注册（完整方案）

实现完整的邀请码系统：
1. 创建 InvitationCode 模型
2. 实现邀请码生成和验证
3. 修改注册流程支持邀请码
4. 可选：添加审核流程

### 选项C：企业代码注册（简化方案）

用户注册时输入企业代码：

```csharp
public class RegisterRequest
{
    public string Username { get; set; }
    public string Password { get; set; }
    public string Email { get; set; }
    public string CompanyCode { get; set; }  // 新增：企业代码
}

public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
{
    // 验证企业代码
    var company = await GetCompanyByCodeAsync(request.CompanyCode);
    if (company == null)
        return ApiResponse<AppUser>.ErrorResult("COMPANY_NOT_FOUND", "企业代码不存在");
    
    if (!company.IsActive)
        return ApiResponse<AppUser>.ErrorResult("COMPANY_INACTIVE", "企业未激活");
    
    // 创建用户
    var newUser = new AppUser
    {
        Username = request.Username,
        PasswordHash = HashPassword(request.Password),
        Email = request.Email,
        CompanyId = company.Id!,  // 设置企业ID
        IsActive = false,  // 需要管理员审核
        RoleIds = new List<string>()
    };
    
    await _users.InsertOneAsync(newUser);
    
    // 创建审核记录
    // ... 
    
    return ApiResponse<AppUser>.SuccessResult(newUser, 
        "注册成功！等待管理员审核后即可登录。");
}
```

## 💡 我的建议

### 推荐实施顺序

#### 阶段1：快速修复（立即）

**禁用普通用户注册，使用现有的"管理员创建用户"功能**

- ✅ 修改 `/api/register` 返回错误提示
- ✅ 隐藏前端的"注册"链接
- ✅ 文档说明：用户由管理员创建

**用户加入流程：**
```
1. 企业管理员在"用户管理"页面创建用户
2. 发送用户名和初始密码给用户
3. 用户登录后修改密码
```

#### 阶段2：邀请码系统（v3.1）

**实现完整的邀请码注册流程**

- 管理员生成邀请码/链接
- 用户通过邀请链接注册
- 自动加入企业
- 可选审核机制

#### 阶段3：高级功能（v3.2+）

- 批量邀请
- 邀请邮件发送
- 自助申请加入
- 企业成员管理

## 🎯 立即行动方案

### 方案：禁用普通注册 + 优化管理员创建

#### 1. 修改注册 API

```csharp
// AuthService.RegisterAsync
public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
{
    return ApiResponse<AppUser>.ErrorResult(
        "REGISTRATION_DISABLED",
        "个人注册功能已禁用。\n\n" +
        "• 如需加入现有企业，请联系企业管理员为您创建账户\n" +
        "• 如需创建新企业，请访问企业注册页面"
    );
}
```

#### 2. 更新前端注册页面

```typescript
// src/pages/user/register/index.tsx
export default function Register() {
  return (
    <Result
      status="info"
      title="个人注册已禁用"
      subTitle="请选择以下方式加入系统："
      extra={[
        <Button type="primary" key="company" onClick={() => history.push('/company/register')}>
          注册新企业
        </Button>,
        <Button key="contact">联系管理员</Button>,
      ]}
    >
      <div>
        <p>• 如果您是企业管理员，请点击"注册新企业"创建您的企业账户</p>
        <p>• 如果您要加入现有企业，请联系企业管理员为您创建账户</p>
      </div>
    </Result>
  );
}
```

#### 3. 优化登录页提示

```typescript
// src/pages/user/login/index.tsx
<div style={{ textAlign: 'center', marginTop: 16 }}>
  <Link to="/company/register">
    还没有企业？立即注册
  </Link>
  <Divider type="vertical" />
  <Popover
    content={
      <div>
        <p>个人注册已禁用</p>
        <p>请联系您的企业管理员创建账户</p>
      </div>
    }
  >
    <span style={{ color: '#00000040', cursor: 'help' }}>
      个人注册
    </span>
  </Popover>
</div>
```

## 📝 推荐的用户加入流程

### 当前可用的流程（v3.0）

**流程1：企业管理员创建用户**

```
1. 管理员登录系统
2. 访问"用户管理"
3. 点击"新建用户"
4. 填写用户信息（用户名、密码、邮箱、角色）
5. 创建成功
6. 将用户名和密码发送给新用户
7. 新用户登录系统
```

**流程2：企业注册（创建新企业）**

```
1. 访问企业注册页面
2. 填写企业信息和管理员信息
3. 注册成功，自动登录
4. 管理员创建其他用户
```

### 未来的流程（v3.1规划）

**流程3：邀请码注册**

```
1. 管理员生成邀请码
2. 发送邀请链接：/user/register?code=xxx
3. 新用户填写信息注册
4. 自动加入企业（可选审核）
5. 审核通过后激活
```

## 🔍 当前问题

### 问题：RegisterAsync 没有设置 CompanyId

**位置：** `Platform.ApiService/Services/AuthService.cs:265-275`

**当前代码：**
```csharp
var newUser = new AppUser
{
    Username = request.Username.Trim(),
    PasswordHash = HashPassword(request.Password),
    Email = request.Email?.Trim(),
    RoleIds = new List<string>(),
    IsActive = true,
    // ❌ 问题：没有设置 CompanyId
};
```

**影响：**
- 用户不属于任何企业
- 登录后无法获取企业信息
- 查询会失败（没有 companyId）

**解决方案：**
见下文的实施计划

## 🚀 立即实施计划

我将实施**选项A：禁用普通注册 + 优化提示**

### 优点
- ✅ 快速实施（30分钟）
- ✅ 避免数据问题
- ✅ 清晰的用户引导
- ✅ 符合多租户最佳实践

### 实施内容

1. **修改 RegisterAsync** - 返回错误提示
2. **更新注册页面** - 显示引导信息
3. **优化登录页** - 突出企业注册
4. **更新文档** - 说明用户加入流程

## 📚 参考文档

- [多租户系统文档](./MULTI-TENANT-SYSTEM.md)
- [API 端点汇总](./API-ENDPOINTS-SUMMARY.md)

---

**设计版本**: v3.0  
**状态**: 设计完成，待实施  
**预计工时**: 1-2小时（完整邀请系统）或 30分钟（禁用方案）

