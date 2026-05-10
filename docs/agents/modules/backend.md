# 后端开发规范

> **开发标准参考**：`PasswordBookController.cs` + `PasswordBookService.cs` 是所有后端模块的开发标准。

---

## 🧭 目录

- [6.1 控制器规范](#61-控制器规范)
- [6.2 服务层规范](#62-服务层规范)
- [6.3 权限注解标准](#63-权限注解标准)
- [6.4 自动依赖注入与命名约定](#64-自动依赖注入与命名约定)
- [6.5 分页规范](#65-分页规范)
- [6.6 异常处理规范（客户端体验）](#66-异常处理规范客户端体验)
- [6.7 批量查询规范（N+1 防护）](#67-批量查询规范n1-防护)
- [6.8 后台任务与租户上下文](#68-后台任务与租户上下文)
- [6.9 SSE 开发规范](#69-sse-开发规范)
- [6.10 控制器完整列表](#610-控制器完整列表)
- [6.11 用户体验设计考量（新增）](#611-用户体验设计考量新增)

---

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

---

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

---

## 6.3 权限注解标准

- **[强制]** 所有敏感操作必须添加 `[RequireMenu("menu-name")]` 注解
- 菜单名称统一用连字符 `-` 分隔

```csharp
[RequireMenu("iot-platform")]  // 类级别
[RequireMenu("workflow-list", "workflow-monitor")]  // 多个菜单
```

---

## 6.4 自动依赖注入与命名约定

项目使用 `ServiceDiscoveryExtensions` 自动扫描注册，**无需手动注册服务**。

### 命名约定控制生命周期

| 命名前缀 | 生命周期 | 示例 |
|----------|---------|------|
| `Singleton*` | Singleton | `SingletonCacheService` |
| `Transient*` | Transient | `TransientEmailSender` |
| (默认) `*Service` | Scoped | `PasswordBookService` |

---

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

---

## 6.6 异常处理规范（客户端体验）

### 异常抛出方式

**[强制]** 控制器和服务层出现错误时，**直接抛出异常**：

```csharp
// ✅ 正确：使用 ErrorCode 常量
throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
throw new ArgumentException(ErrorCode.InvalidCredentials);

// ✅ 正确：参数校验
if (string.IsNullOrEmpty(name))
    throw new ArgumentException("名称不能为空", nameof(name));
```

### 用户体验考量

异常信息是用户最直接感知的错误反馈，**异常消息应当对用户友好**：

```csharp
// ✅ 好的用户体验：清晰、友好、可操作的错误信息
throw new ArgumentException("请输入任务名称");
throw new AuthenticationException("登录已过期，请重新登录");
throw new UnauthorizedAccessException("您没有权限执行此操作，请联系管理员");

// ❌ 差的用户体验：技术术语堆砌，用户看不懂
throw new ArgumentException("ArgNull: TaskName is required");
throw new Exception("DB connection pool exhausted");
```

### 全局异常映射

`BusinessExceptionFilter` 自动处理异常映射：

| 异常类型 | HTTP 状态码 | 客户端显示建议 |
|---------|-----------|--------------|
| `ArgumentException` | 400 | "请检查输入信息" |
| `AuthenticationException` | 401 | "登录已过期，请重新登录" |
| `UnauthorizedAccessException` | 403 | "暂无权限，请联系管理员" |
| `KeyNotFoundException` | 404 | "数据不存在，可能已被删除" |
| 其他未捕获异常 | 500 | "系统繁忙，请稍后重试" |

### API 响应时间指南（用户体验关键指标）

| 操作类型 | 建议 P95 响应时间 | 超过时限用户感知 |
|---------|-----------------|----------------|
| 列表查询 | ≤ 1000ms | 感觉慢 |
| 单条查询 | ≤ 500ms | 感觉卡 |
| 数据提交（增/改） | ≤ 2000ms | 想退出 |
| 批量操作 | ≤ 5000ms | 怀疑系统卡死 |
| 文件导入 | ≤ 15000ms | 放弃操作 |

> 如果预计操作耗时超过以上时限，**必须使用异步模式**（先返回任务 ID，处理完成后通知）。

---

## 6.7 批量查询规范（N+1 防护）

**[强制]** 严禁在循环内调用单条查询——这是最常见的性能陷阱，直接影响页面渲染速度：

```csharp
// ✅ 正确：批量查询
var userIds = tasks.Select(t => t.CreatedBy).Distinct();
var userMap = await _userService.GetUsersByIdsAsync(userIds);

// ❌ 禁止：N+1 查询 — 100 条数据 = 101 次数据库查询
foreach (var task in tasks)
{
    var user = await _userService.GetUserByIdAsync(task.CreatedBy);
}
```

### 性能 UX 指标

- 页面首次加载推荐时间：**< 2s**
- 每次列表查询推荐时间：**< 1s**
- 操作提交反馈时间：**< 2s**

---

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

---

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

### SSE 用户体验要点

- **连接状态指示**：前端应实时展示 SSE 连接状态（已连接/重连中/已断开）
- **断线重连**：SSE 断开后前端需自动重连，并显示重连提示
- **数据加载提示**：长数据流中应显示当前加载进度

---

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

---

## 6.11 用户体验设计考量（新增）

### API 响应设计原则

| 原则 | 说明 | 反例 |
|------|------|------|
| **快速失败** | 参数校验失败尽早返回，不要让请求到数据库层才报错 | 表单提交 5 秒后才提示"名称不能为空" |
| **一致结构** | 所有 API 返回统一的 `ApiResponse` 格式 | 成功返回 `{data}`，失败返回 `{error}` |
| **明确指引** | 错误信息让用户知道怎么修正 | "操作失败" → "文件大小不能超过 10MB" |
| **数据预热** | 关联数据提前查询，避免前端多次请求 | 获取列表后还要逐个请求详情 |

### 常见后端 API 反模式（影响用户体验）

```csharp
// ❌ 反模式 1：超慢列表 API（没加索引或没分页）
[HttpPost("list")]
public async Task<IActionResult> GetList([FromBody] ProTableRequest request)
{
    var query = _context.Set<Entity>().AsQueryable();
    // 没查索引、没加排序限制、全表扫描
    return Success(query.ToList());
}

// ❌ 反模式 2：过于冗长的错误信息
throw new Exception("System.InvalidOperationException: 违反了并发约束，RowVersion 不匹配，请刷新后重试");
// ✅ 应该简化为："数据已被其他人修改，请刷新后重试"

// ❌ 反模式 3：不必要的空对象返回
return Success(null);  // 前端需要额外判空
// ✅ 应该返回明确的空状态：return Success(new List<Entity>());
```

### 关键用户体验检查清单

开发每个 API 时，问自己：

- [ ] 这个接口最慢的情况下需要多久？用户等不等得起？
- [ ] 如果失败了，用户看到的是什么？他能理解并修正吗？
- [ ] 批量操作需要花多久？是否需要异步+进度通知？
- [ ] 前端能否只调一次就拿到所有需要的数据？
- [ ] 参数校验够早吗？能在 10ms 内返回吗？
