# 企业切换JWT Token未更新修复

## 📋 问题概述

**问题**: 企业切换后 JWT Token 没有更新，导致前端无法获取新的企业数据

**错误表现**:
- 用户切换企业后，前端调用 API 时仍然使用旧的 `companyId` claim
- 菜单获取失败或返回错误的企业数据
- 前端企业切换后需要手动刷新页面才能正常工作

**根本原因**: `SwitchCompanyAsync` 方法中未重新生成 JWT Token

## 🔍 问题分析

### 当前实现的问题

**`UserCompanyService.SwitchCompanyAsync` 方法（修复前）**:

```csharp
public async Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId)
{
    // ... 验证和更新用户当前企业 ...
    
    // 4. 获取用户在该企业的菜单
    var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);
    
    // 5. 生成新的JWT Token（包含新的企业信息）
    string? newToken = null;
    if (updatedUser != null)
    {
        // ❌ 这里应该注入 IJwtService 来生成新token
        // 暂时返回null，实际实现需要在构造函数中注入服务
    }
    
    return new SwitchCompanyResult
    {
        CompanyId = targetCompanyId,
        CompanyName = company.Name,
        Menus = menus,
        Token = newToken  // ❌ 返回 null
    };
}
```

### 问题影响

1. **Token 未更新**: 前端收到 `Token: null`，无法更新本地存储的 token
2. **企业上下文错误**: 后续请求仍使用旧的 `companyId` claim
3. **数据不一致**: 用户在界面看到的是新企业，但后端仍按旧企业过滤数据
4. **用户体验差**: 需要手动刷新页面才能正常使用

### 正确的流程应该是

```
1. 用户选择目标企业
2. 调用 /api/company/switch 切换企业
3. 后端更新用户 CurrentCompanyId
4. 后端重新生成包含新企业信息的 JWT Token
5. 返回新的 Token 给前端
6. 前端更新本地 token 存储
7. 前端刷新用户信息和菜单数据
```

## ✅ 解决方案

### 1. 注入 JWT 服务

**修改 `UserCompanyService` 构造函数**:

```csharp
public class UserCompanyService : IUserCompanyService
{
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IMenuService _menuService;
    private readonly ITenantContext _tenantContext;
    private readonly IJwtService _jwtService;  // ✅ 新增

    public UserCompanyService(
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        IMenuService menuService,
        ITenantContext tenantContext,
        IJwtService jwtService)  // ✅ 新增参数
    {
        _userCompanyFactory = userCompanyFactory;
        _userFactory = userFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _menuFactory = menuFactory;
        _menuService = menuService;
        _tenantContext = tenantContext;
        _jwtService = jwtService;  // ✅ 注入 JWT 服务
    }
}
```

### 2. 重新生成 JWT Token

**修改 `SwitchCompanyAsync` 方法**:

```csharp
public async Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId)
{
    // ... 验证和更新用户当前企业 ...
    
    // 4. 获取用户在该企业的菜单
    var menus = await _menuService.GetUserMenusAsync(membership.RoleIds);
    
    // 5. 生成新的JWT Token（包含新的企业信息）
    // ✅ 使用注入的 JWT 服务生成包含新企业信息的新 Token
    var newToken = _jwtService.GenerateToken(updatedUser);
    
    return new SwitchCompanyResult
    {
        CompanyId = targetCompanyId,
        CompanyName = company.Name,
        Menus = menus,
        Token = newToken  // ✅ 返回新生成的 Token
    };
}
```

### 3. JWT Token 内容

**`JwtService.GenerateToken` 方法会包含**:

```csharp
var claims = new List<Claim>
{
    new(ClaimTypes.NameIdentifier, user.Id ?? string.Empty),
    new(ClaimTypes.Name, user.Username),
    new(ClaimTypes.Email, user.Email ?? string.Empty),
    new("userId", user.Id ?? string.Empty),
    new("username", user.Username)
};

// v3.1: 添加当前企业ID到token
if (!string.IsNullOrEmpty(user.CurrentCompanyId))
{
    claims.Add(new("currentCompanyId", user.CurrentCompanyId));
    claims.Add(new("companyId", user.CurrentCompanyId));  // 兼容性
}
```

## 🔧 修复效果

### 修复前的问题

```typescript
// 前端接收到的响应
{
  "success": true,
  "data": {
    "companyId": "target_company_id",
    "companyName": "目标企业",
    "menus": [...],
    "token": null  // ❌ 没有新 token
  }
}

// 前端无法更新 token
if (response.data.token) {
  localStorage.setItem('token', response.data.token);  // ❌ 不会执行
}

// 后续请求仍使用旧的 token（包含旧的企业ID）
```

### 修复后的效果

```typescript
// 前端接收到的响应
{
  "success": true,
  "data": {
    "companyId": "target_company_id",
    "companyName": "目标企业",
    "menus": [...],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // ✅ 新的 token
  }
}

// 前端更新本地 token
if (response.data.token) {
  localStorage.setItem('token', response.data.token);  // ✅ 执行
}

// 后续请求使用新的 token（包含新的企业ID）
```

## 📋 验证步骤

### 1. 启动服务

```bash
dotnet run --project Platform.AppHost
```

### 2. 测试企业切换

1. 登录一个拥有多个企业的用户账户
2. 在 Header 右侧点击企业切换器
3. 选择目标企业
4. 检查网络请求中返回的 `token` 字段

**期望结果**:
- 后端返回新的 JWT Token
- Token 中包含新的 `companyId` claim
- 前端自动更新本地 token 存储
- 菜单和用户信息自动刷新

### 3. 验证 Token 内容

解码 JWT Token，确认包含正确的企业 ID：

```bash
# 使用 jwt.io 或其他工具解码 token
# 应该看到包含新的 companyId claim
{
  "userId": "user_id",
  "username": "username",
  "currentCompanyId": "target_company_id",  // ✅ 新的企业ID
  "companyId": "target_company_id"          // ✅ 新的企业ID
}
```

### 4. 验证数据隔离

切换企业后，调用 API 获取数据：

```bash
# 使用新的 token 调用 API
curl -H "Authorization: Bearer <new_token>" \
  http://localhost:15000/apiservice/api/menu/user-menus
```

**期望结果**:
- 返回目标企业的菜单数据
- 不包含其他企业的菜单

## 📚 相关文档

- [多企业关联逻辑审查报告](mdc:docs/reports/MULTI-COMPANY-ASSOCIATION-LOGIC-REVIEW.md)
- [企业切换功能说明](mdc:docs/features/MULTI-TENANT-SYSTEM.md)
- [JWT Token 生成服务](mdc:Platform.ApiService/Services/JwtService.cs)

## ✅ 修复总结

通过在企业切换后重新生成包含新企业信息的 JWT Token，确保：

1. **Token 及时更新**: 前端能够获取并使用新的 token
2. **企业上下文一致**: 后端和前端使用相同的企业ID
3. **数据隔离正确**: 自动过滤到正确的企业数据
4. **用户体验流畅**: 无需手动刷新页面

企业切换功能现在能够正常工作，用户可以无缝切换企业并访问对应的数据。
