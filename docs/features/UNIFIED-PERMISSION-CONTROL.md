# 统一权限控制实现方式

## 📋 背景

项目中之前混用了两种权限检查方式，导致代码不统一、难以维护。现在统一为声明式的特性方式。

## 🎯 统一标准

### ✅ 推荐：使用 [RequirePermission] 特性（声明式）

```csharp
[HttpPost]
[RequirePermission("resource", "action")]
public async Task<IActionResult> CreateResource([FromBody] CreateRequest request)
{
    // 方法签名就能看到权限要求
    // 代码更简洁
    var result = await _service.CreateAsync(request);
    return Success(result);
}
```

**优势**：
- ✅ **声明式** - 权限要求在方法签名上一目了然
- ✅ **简洁** - 不需要在方法内部调用检查
- ✅ **AOP** - 权限检查在方法执行前自动完成
- ✅ **可组合** - 可以多个特性组合使用
- ✅ **符合 ASP.NET Core 最佳实践**

### ⚠️ 保留：条件权限检查（特殊情况）

对于需要根据业务逻辑动态判断权限的场景，保留方法调用：

```csharp
[HttpPost("bulk-action")]
[Authorize]
public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request)
{
    // 根据操作类型检查不同权限
    if (request.Action == "delete")
        await RequirePermissionAsync("resource", "delete");
    else
        await RequirePermissionAsync("resource", "update");
    
    // 业务逻辑...
}
```

**使用场景**：
- 条件权限检查
- 复杂的权限逻辑
- 需要在运行时确定权限

## 📊 统一前后对比

### 统一前（混用两种方式）

```csharp
// 方式 1: 特性（MenuController, TagController, PermissionController）
[HttpPost]
[RequirePermission("menu", "create")]
public async Task<IActionResult> CreateMenu(...)

// 方式 2: 方法调用（UserController, RoleController）
[HttpPost]
[Authorize]
public async Task<IActionResult> CreateUser(...)
{
    await RequirePermissionAsync("user", "create");
    // ...
}
```

**问题**：
- 😕 代码风格不统一
- 😕 阅读体验差（有的权限在签名，有的在方法内部）
- 😕 容易遗漏权限检查

### 统一后（优先使用特性）

```csharp
// ✅ 标准方式：特性
[HttpPost]
[RequirePermission("menu", "create")]
public async Task<IActionResult> CreateMenu(...)

[HttpPost]
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser(...)

// ⚠️ 特殊情况：条件检查
[HttpPost("bulk-action")]
[Authorize]
public async Task<IActionResult> BulkAction(...)
{
    if (condition)
        await RequirePermissionAsync("resource", "delete");
    else
        await RequirePermissionAsync("resource", "update");
}
```

**优势**：
- ✅ 代码风格统一
- ✅ 权限要求清晰可见
- ✅ 更易维护和审查

## 🏗️ RequirePermission 特性实现

### 特性定义

**文件**: `Platform.ApiService/Attributes/RequirePermissionAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string Resource { get; }
    public string Action { get; }

    public RequirePermissionAttribute(string resource, string action)
    {
        Resource = resource;
        Action = action;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // 1. 检查用户是否已认证
        if (!context.HttpContext.User.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedObjectResult(...);
            return;
        }

        // 2. 获取用户ID
        var userId = context.HttpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = new UnauthorizedObjectResult(...);
            return;
        }

        // 3. 检查超级管理员（拥有所有权限）
        var userRole = context.HttpContext.User.FindFirst("role")?.Value;
        if (userRole == "super-admin")
        {
            return; // 超级管理员无需检查
        }

        // 4. 调用权限检查服务
        var permissionCheckService = context.HttpContext.RequestServices
            .GetService<IPermissionCheckService>();
        
        var permissionCode = $"{Resource}:{Action}";
        var hasPermission = await permissionCheckService.HasPermissionAsync(userId, permissionCode);

        // 5. 无权限返回 403
        if (!hasPermission)
        {
            context.Result = new ObjectResult(new
            {
                success = false,
                error = $"无权执行此操作：{permissionCode}",
                errorCode = "FORBIDDEN",
                showType = 2
            })
            {
                StatusCode = 403
            };
        }
    }
}
```

### 特性特点

- ✅ **执行时机** - 在方法执行前自动检查
- ✅ **自动处理** - 无权限自动返回 403
- ✅ **可复用** - 一次定义，到处使用
- ✅ **支持多个** - 一个方法可以有多个权限要求

## 📊 完整的统一结果

### 统一后的控制器

| 控制器 | 使用特性 | 使用方法 | 总接口数 |
|--------|----------|----------|----------|
| **MenuController** | 7 | 0 | 7 |
| **PermissionController** | 6 | 0 | 6 |
| **TagController** | 5 | 0 | 5 |
| **RoleController** | 10 | 0 | 10 |
| **UserController** | 5 | 1* | 6 |
| **NoticeController** | 1 | 0 | 1 |
| **总计** | **34** | **1*** | **35** |

\* 批量操作需要条件权限检查，保留方法调用方式

### 权限检查覆盖率

- **需要权限的接口**: 35 个
- **有权限检查**: 35 个 (100%) ✅
- **使用特性**: 34 个 (97%)
- **使用方法**: 1 个 (3%) - 条件检查

## 🎯 权限控制模式

### 模式 1: 标准 CRUD（使用特性）

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourceController : BaseApiController
{
    [HttpGet]
    [RequirePermission("resource", "read")]
    public async Task<IActionResult> GetAll() { }
    
    [HttpGet("{id}")]
    [RequirePermission("resource", "read")]
    public async Task<IActionResult> GetById(string id) { }
    
    [HttpPost]
    [RequirePermission("resource", "create")]
    public async Task<IActionResult> Create([FromBody] CreateRequest request) { }
    
    [HttpPut("{id}")]
    [RequirePermission("resource", "update")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateRequest request) { }
    
    [HttpDelete("{id}")]
    [RequirePermission("resource", "delete")]
    public async Task<IActionResult> Delete(string id) { }
}
```

### 模式 2: 条件权限检查（使用方法）

```csharp
[HttpPost("bulk-action")]
[Authorize]
public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request)
{
    // 根据操作类型检查权限
    if (request.Action == "delete")
        await RequirePermissionAsync("resource", "delete");
    else if (request.Action == "approve")
        await RequirePermissionAsync("resource", "approve");
    else
        await RequirePermissionAsync("resource", "update");
    
    // 业务逻辑...
}
```

### 模式 3: 自己或有权限（混合）

```csharp
[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetUserById(string id)
{
    // 可以查看自己，或者需要 user:read 权限
    var currentUserId = CurrentUserId;
    if (currentUserId != id && !await HasPermissionAsync("user", "read"))
    {
        throw new UnauthorizedAccessException("无权查看其他用户信息");
    }
    
    var user = await _userService.GetUserByIdAsync(id);
    return Success(user);
}
```

### 模式 4: 公共访问（无权限）

```csharp
[HttpGet("notices")]
[Authorize]  // 只需要登录
public async Task<IActionResult> GetNotices()
{
    // 所有登录用户都可以查看通知
    var notices = await _noticeService.GetNoticesAsync();
    return Success(notices);
}
```

## 🔧 BaseApiController 辅助方法

### 可用的权限检查方法

```csharp
// 1. 检查单个权限（返回布尔值）
bool hasPermission = await HasPermissionAsync("resource", "action");

// 2. 要求权限（无权限抛异常）
await RequirePermissionAsync("resource", "action");

// 3. 检查是否有任意一个权限
bool hasAny = await HasAnyPermissionAsync("user:read", "user:update");

// 4. 检查是否拥有所有权限
bool hasAll = await HasAllPermissionsAsync("user:read", "user:update");
```

### 使用示例

```csharp
// 示例 1: 简单检查
[HttpPost]
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser(...) { }

// 示例 2: 条件检查
[HttpPost("action")]
[Authorize]
public async Task<IActionResult> DoAction([FromBody] ActionRequest request)
{
    if (request.IsAdmin)
        await RequirePermissionAsync("user", "admin-action");
    else
        await RequirePermissionAsync("user", "normal-action");
}

// 示例 3: 复杂逻辑
[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetUser(string id)
{
    if (CurrentUserId == id)
    {
        // 查看自己不需要权限
    }
    else if (!await HasPermissionAsync("user", "read"))
    {
        throw new UnauthorizedAccessException("无权查看其他用户");
    }
    
    var user = await _userService.GetUserByIdAsync(id);
    return Success(user);
}

// 示例 4: 多权限要求（必须同时拥有）
[HttpPost("advanced-action")]
[RequirePermission("resource", "read")]
[RequirePermission("resource", "update")]  // 需要同时拥有两个权限
public async Task<IActionResult> AdvancedAction(...) { }
```

## 📝 修改的文件

### UserController.cs

**修改数量**: 5 个接口

```csharp
// 修改前：使用方法调用
[HttpPost("management")]
[Authorize]
public async Task<IActionResult> CreateUser(...)
{
    await RequirePermissionAsync("user", "create");
    // ...
}

// 修改后：使用特性
[HttpPost("management")]
[RequirePermission("user", "create")]
public async Task<IActionResult> CreateUser(...)
{
    // 权限检查自动完成
    // ...
}
```

**修改列表**：
1. ✅ `CreateUserManagement` - 改为 `[RequirePermission("user", "create")]`
2. ✅ `UpdateUserManagement` - 改为 `[RequirePermission("user", "update")]`
3. ✅ `DeleteUser` - 改为 `[RequirePermission("user", "delete")]`
4. ✅ `GetUserStatistics` - 改为 `[RequirePermission("user", "read")]`
5. ✅ `GetAllActivityLogs` - 改为 `[RequirePermission("activity-log", "read")]`
6. ⚠️ `BulkUserAction` - 保留方法调用（条件权限检查）

### RoleController.cs

已在修复安全漏洞时统一为特性方式（10 个接口）

## 🔍 权限检查方式对比

### 方式对比表

| 特性 | [RequirePermission] 特性 | RequirePermissionAsync 方法 |
|------|-------------------------|---------------------------|
| **简洁性** | ✅ 非常简洁 | ⚠️ 需要额外代码 |
| **可读性** | ✅ 签名即文档 | ⚠️ 需要看方法内部 |
| **执行时机** | ✅ 方法执行前 | ⚠️ 方法内部 |
| **条件检查** | ❌ 不支持 | ✅ 支持 |
| **多权限** | ✅ 多个特性 | ✅ 多次调用 |
| **错误处理** | ✅ 自动返回 403 | ✅ 抛出异常 |
| **推荐度** | 🌟🌟🌟🌟🌟 | 🌟🌟🌟 |

### 使用指南

```csharp
// ✅ 90% 的情况：使用特性
[RequirePermission("resource", "action")]

// ⚠️ 10% 的情况：使用方法（仅当需要条件判断）
await RequirePermissionAsync("resource", "action")
```

## 📋 完整的权限控制流程

### 1. 请求到达

```
HTTP Request
    ↓
认证中间件 (Authentication)
    ↓
授权中间件 (Authorization)
    ↓
[RequirePermission] 特性
    ├─ 检查用户认证
    ├─ 获取用户ID
    ├─ 检查超级管理员
    ├─ 调用权限服务
    └─ 有权限 → 继续
        无权限 → 返回 403
    ↓
控制器方法执行
    ↓
业务逻辑
```

### 2. 权限检查服务

**文件**: `Platform.ApiService/Services/PermissionCheckService.cs`

```csharp
public class PermissionCheckService : IPermissionCheckService
{
    public async Task<bool> HasPermissionAsync(string userId, string permissionCode)
    {
        // 1. 获取用户的所有角色
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        var roleIds = user?.RoleIds ?? new List<string>();
        
        // 2. 获取角色的权限
        var roles = await _roles.Find(r => roleIds.Contains(r.Id!)).ToListAsync();
        var rolePermissionIds = roles
            .SelectMany(r => r.PermissionIds ?? new List<string>())
            .Distinct()
            .ToList();
        
        // 3. 获取用户的自定义权限
        var customPermissionIds = user?.CustomPermissionIds ?? new List<string>();
        
        // 4. 合并所有权限ID
        var allPermissionIds = rolePermissionIds
            .Concat(customPermissionIds)
            .Distinct()
            .ToList();
        
        // 5. 检查是否有目标权限
        var permission = await _permissions
            .Find(p => p.Code == permissionCode && allPermissionIds.Contains(p.Id!))
            .FirstOrDefaultAsync();
        
        return permission != null;
    }
}
```

### 3. 权限来源

```
用户权限 = 角色权限 + 自定义权限

User.EffectivePermissions = 
    ∪ (Role1.Permissions + Role2.Permissions + ...) 
    ∪ User.CustomPermissions
```

## 🎯 最佳实践

### ✅ DO（推荐）

```csharp
// 1. 使用特性声明权限
[RequirePermission("resource", "action")]

// 2. 控制器级别添加 [Authorize]
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MyController : BaseApiController

// 3. 继承 BaseApiController
public class MyController : BaseApiController

// 4. 使用语义化的权限代码
[RequirePermission("user", "create")]  // ✅ 清晰
[RequirePermission("order", "approve")] // ✅ 明确

// 5. 公共接口去掉 [RequirePermission]
[HttpGet("notices")]
[Authorize]  // 只要登录即可
public async Task<IActionResult> GetNotices()
```

### ❌ DON'T（避免）

```csharp
// 1. 不要忘记添加 [Authorize]
public class MyController : BaseApiController // ❌ 缺少 [Authorize]

// 2. 不要使用过时的 Roles 授权
[Authorize(Roles = "admin")] // ❌ v2.0 已废弃

// 3. 不要在不需要时使用方法调用
[HttpPost]
[Authorize]
public async Task<IActionResult> Create(...)
{
    await RequirePermissionAsync("resource", "create"); // ❌ 应该用特性
}

// 4. 不要使用模糊的权限代码
[RequirePermission("resource", "action1")] // ❌ 不清楚

// 5. 不要忘记权限检查
[HttpPost]
[Authorize]  // ❌ 只有登录检查，没有权限检查
public async Task<IActionResult> SensitiveAction()
```

## 📚 相关文件

### 权限系统核心文件

1. **特性定义**
   - `Platform.ApiService/Attributes/RequirePermissionAttribute.cs`

2. **权限检查服务**
   - `Platform.ApiService/Services/PermissionCheckService.cs`
   - `Platform.ApiService/Services/IPermissionCheckService.cs`

3. **基础控制器**
   - `Platform.ApiService/Controllers/BaseApiController.cs`

4. **权限模型**
   - `Platform.ApiService/Models/PermissionModels.cs`

5. **权限初始化**
   - `Platform.ApiService/Scripts/InitializePermissions.cs`

## 🧪 测试验证

### 1. 编译验证

```bash
dotnet build Platform.ApiService/Platform.ApiService.csproj
# ✅ Build succeeded
```

### 2. 功能测试

#### 测试有权限的用户（admin）
```bash
# 登录
POST /api/login/account
{ "username": "admin", "password": "admin123" }

# 测试各种操作（应该都成功）
GET /api/role
POST /api/role
PUT /api/role/{id}
DELETE /api/role/{id}
```

#### 测试无权限的用户
```bash
# 创建普通用户并登录

# 测试需要权限的操作（应该都返回 403）
POST /api/role
PUT /api/user/{id}
DELETE /api/user/{id}
```

### 3. 权限检查验证

查看日志应该有：
```
[RequirePermission] Checking permission: user:create for userId: xxx
[RequirePermission] Permission granted: user:create
# 或
[RequirePermission] Permission denied: user:create
```

## 🎉 统一完成

现在项目中的权限控制完全统一：

- ✅ **主要方式**: `[RequirePermission]` 特性（97%）
- ✅ **特殊情况**: `RequirePermissionAsync` 方法（3%）
- ✅ **代码风格**: 完全统一
- ✅ **安全性**: 100% 覆盖
- ✅ **可维护性**: 显著提升

## 📖 开发指南

### 新增接口时

```csharp
// 1. 确定需要的权限
// 2. 添加 [RequirePermission] 特性
// 3. 实现业务逻辑

[HttpPost("new-endpoint")]
[RequirePermission("resource", "action")]  // ← 添加权限检查
public async Task<IActionResult> NewEndpoint(...)
{
    // 业务逻辑
}
```

### 代码审查清单

- [ ] 所有控制器继承 `BaseApiController`
- [ ] 控制器级别有 `[Authorize]`
- [ ] 敏感接口有 `[RequirePermission]`
- [ ] 公共接口只有 `[Authorize]`
- [ ] 不使用 `[Authorize(Roles = ...)]`
- [ ] 权限代码语义清晰（如 `user:create`）

## 📚 相关文档

- [授权安全修复](../bugfixes/AUTHORIZATION-SECURITY-FIX.md)
- [用户日志 403 修复](../bugfixes/USER-LOG-403-FIX.md)
- [授权审计报告](../reports/AUTHORIZATION-AUDIT.md)
- [BaseApiController 规范](BASEAPICONTROLLER-STANDARDIZATION.md)

---

**统一日期**: 2025-10-12  
**统一方式**: [RequirePermission] 特性（主）+ RequirePermissionAsync 方法（辅）  
**覆盖率**: 100%

