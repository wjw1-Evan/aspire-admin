# 后端开发规范

> **开发标准参考**：`PasswordBookController.cs` + `PasswordBookService.cs` 是所有后端模块的开发标准。

## 6.1 控制器规范

### 控制器分层与继承

- **[强制]** 所有业务控制器必须继承 `BaseApiController`，禁止直接继承 `ControllerBase`。
- 控制器层**只负责**路由、参数校验、权限注解 `[RequireMenu]`、调用服务层、返回统一响应。
- **禁止**在控制器注入/操作 `DbContext`，所有数据访问必须下沉到服务层。

### 标准控制器模板

参考 `Platform.ApiService/Controllers/PasswordBookController.cs`：

```csharp
[ApiController]
[Route("api/password-book")]
public class PasswordBookController : BaseApiController
{
    public PasswordBookController(IPasswordBookService service, ILogger<PasswordBookController> logger)
    {
        _service = service ?? throw new ArgumentNullException(nameof(service));
    }

    [HttpPost]
    [RequireMenu("password-book")]
    public async Task<IActionResult> CreateEntry([FromBody] CreatePasswordBookEntryRequest request)
    {
        var userId = RequiredUserId;
        var entry = await _service.CreateEntryAsync(request, userId);
        return Success(entry);
    }
}
```

### 用户上下文获取

```csharp
// ✅ 正确：使用 BaseApiController 提供的属性
protected string? CurrentUserId => TenantContext.GetCurrentUserId();
protected string RequiredUserId { get; }  // null 时抛出 UnauthorizedAccessException
```

## 6.2 服务层规范

### 标准服务模板

参考 `Platform.ApiService/Services/PasswordBookService.cs`：

```csharp
public class PasswordBookService : IPasswordBookService
{
    private readonly DbContext _context;

    public PasswordBookService(DbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<PasswordBookEntry> CreateEntryAsync(CreatePasswordBookEntryRequest request, string userId)
    {
        var entity = new PasswordBookEntry { ... };
        await _context.Set<PasswordBookEntry>().AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
}
```

### 数据访问规范

- 服务层注入 `DbContext` 并使用 `_context.Set<T>()` 进行数据操作
- 审计字段由 `PlatformDbContext.ApplyAuditInfoCore()` 自动维护
- MongoDB 集合名称使用实体类名

## 6.3 权限注解标准

- **[强制]** 所有敏感操作必须添加 `[RequireMenu("menu-name")]` 注解
- 菜单名称统一用连字符 `-` 分隔

```csharp
[RequireMenu("iot-platform")]  // 类级别
[RequireMenu("workflow-list", "workflow-monitor")]  // 多个菜单
```

## 6.4 自动依赖注入与命名约定

项目使用 `ServiceDiscoveryExtensions` 自动扫描注册，**无需手动注册服务**。

### 命名约定控制生命周期

| 命名前缀 | 生命周期 | 示例 |
|----------|---------|------|
| `Singleton*` | Singleton | `SingletonCacheService` |
| `Transient*` | Transient | `TransientEmailSender` |
| (默认) `*Service` | Scoped | `PasswordBookService` |

## 6.5 分页规范

### 请求参数类型

使用 `ProTableRequest` 接收前端分页请求：

```csharp
public sealed class ProTableRequest
{
    public int Current { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Sort { get; set; }
    public string? Filter { get; set; }
}
```

### 返回类型

使用 `System.Linq.Dynamic.Core.PagedResult<T>` 作为分页返回类型：

```csharp
public async Task<PagedResult<Entity>> GetListAsync(ProTableRequest request)
{
    // 实现...
}
```

### 后端实现

**[强制]** 必须使用 `ToPagedList()` 扩展方法，并直接返回结果：

```csharp
// ✅ 正确：使用 ToPagedList 并返回
public async Task<PagedResult<PasswordBookEntry>> GetEntriesAsync(
    ProTableRequest request,
    string userId)
{
    if (string.IsNullOrEmpty(userId))
        throw new ArgumentException("用户ID不能为空", nameof(userId));

    var query = _context.Set<PasswordBookEntry>()
        .Where(e => e.UserId == userId || e.IsPublic);

    return query.ToPagedList(request);
}

// ❌ 禁止：手动分页
var paged = query.Skip((page - 1) * pageSize).Take(pageSize);

// ❌ 禁止：不直接返回 ToPagedList 结果
var result = query.ToPagedList(request);
return result;  // 不必要的中间变量
```

## 6.6 异常处理规范

**[强制]** 控制器和服务层出现错误时，**直接抛出异常**：

```csharp
// ✅ 正确：使用 ErrorCode 常量
throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
throw new ArgumentException(ErrorCode.InvalidCredentials);

// ✅ 正确：参数校验
if (string.IsNullOrEmpty(name))
    throw new ArgumentException("名称不能为空", nameof(name));
```

**全局异常映射**（`BusinessExceptionFilter` 自动处理）：

| 异常类型 | HTTP 状态码 | errorCode |
|---------|-----------|-----------|
| `ArgumentException` | 400 | `VALIDATION_ERROR` |
| `AuthenticationException` | 401 | `UNAUTHENTICATED` |
| `UnauthorizedAccessException` | 403 | `UNAUTHORIZED_ACCESS` |
| `KeyNotFoundException` | 404 | `RESOURCE_NOT_FOUND` |

## 6.7 批量查询规范（N+1 防护）

**[强制]** 严禁在循环内调用单条查询：

```csharp
// ✅ 正确：批量查询
var userIds = tasks.Select(t => t.CreatedBy).Distinct();
var userMap = await _userService.GetUsersByIdsAsync(userIds);

// ❌ 禁止：N+1 查询
foreach (var task in tasks)
{
    var user = await _userService.GetUserByIdAsync(task.CreatedBy);
}
```

## 6.8 后台任务与租户上下文

在后台任务中，需要手动设置租户上下文：

```csharp
_ = Task.Run(async () =>
{
    await using var scope = _scopeFactory.CreateAsyncScope();
    var tenantSetter = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
    tenantSetter.SetContext(companyId, userId);
    // 现在查询会自动应用 CompanyId 过滤
});
```

## 6.9 SSE 开发规范

**[强制]** 必须使用轻量级 SSE 实现，禁止 SignalR：

```csharp
// 禁用缓冲
HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();
Response.Headers["X-Accel-Buffering"] = "no";
Response.Headers["Content-Type"] = "text/event-stream";

// 心跳机制（每 15 秒）
await Response.WriteAsync($"event: ping\ndata: {DateTime.UtcNow}\n\n");
```

## 6.10 控制器完整列表

| 控制器 | 功能模块 |
|--------|---------|
| AuthController | 认证管理 |
| UserController, AvatarController | 用户管理 |
| RoleController, MenuController | 角色权限 |
| CompanyController, OrganizationController | 企业管理 |
| TaskController, ProjectController, ProjectStatisticsController | 任务项目 |
| WorkflowController | 工作流 |
| IoTController | IoT 物联网 |
| PasswordBookController | 密码本 |
| ParkAssetController, ParkTenantController, ParkVisitController, ParkInvestmentController, ParkEnterpriseServiceController, ParkStatisticsController | 园区管理 |
| ChatAiController, ChatSessionsController, ChatHistoryController, ChatMessagesController, XiaokeConfigController | 小科 AI |
| McpController | MCP 服务 |
| DocumentController | 公文管理 |
| CloudStorageController, FileShareController, FileVersionController, FileStorageController, StorageQuotaController | 文件存储 |
| KnowledgeBaseController, KnowledgeDocumentController | 知识库 |
| WebScraperController | 网页抓取 |
| FormController, RuleController | 表单规则 |
| SocialController, NotificationController | 社交通知 |
| SystemMonitorController, DashboardController, DashboardVersionController | 系统监控 |
| StreamController, PublicController, QuotaController | 公共设施 |

> 完整 44 个控制器见 `Platform.ApiService/Controllers/` 目录。
