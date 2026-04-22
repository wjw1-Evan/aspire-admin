# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件定义了 Aspire Admin 项目的最高准则。AI 助手在处理本项目的任何任务时，**必须**优先读取并完全遵守此文档的规范。

## 1. 核心架构与技术栈
本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB`
- **前端后台**：`React 19.2.5` + `Ant Design 6.3.5` + `UmiJS 4.6.42`
- **移动端应用**：`Expo 54.0.31` + `React Native 0.83.1` 跨端 App，内置原生通知
- **微信小程序**：`Platform.MiniApp` 微信原生开发，轻量级多端扩展
- **基础设施**：`OpenAI/MCP` 服务、`JWT/国密算法` 加解密认证；**Redis** 可按需在 AppHost 中接入（当前默认编排未启用）
- **数据库驱动**：MongoDB.EntityFrameworkCore（EF Core MongoDB Provider）+ MongoDB.Driver

**核心项目结构**：
- `Platform.AppHost/AppHost.cs`：微服务、MongoDB、YARP 网关及 OpenAI 等资源的统筹编排入口（按需扩展 Redis 等）
- `Platform.ApiService`：统一的后端核心业务网关与逻辑层。
- `Platform.ServiceDefaults`：共享的扩展、实体基类及 `PlatformDbContext` 基础设施层。
- `Platform.Admin` / `Platform.App` / `Platform.MiniApp`：多端前端应用。

### 后端项目结构

| 层级 | 项目 | 职责 |
|------|------|------|
| **服务编排** | `Platform.AppHost` | Aspire 资源编排，统一入口 |
| **业务网关** | `Platform.ApiService` | API 控制器 + 业务服务层 (48 Controllers, 170+ Services) |
| **基础设施** | `Platform.ServiceDefaults` | DbContext、中间件、基类 |
| **数据初始化** | `Platform.DataInitializer` | 种子数据、菜单配置 |
| **存储服务** | `Platform.ApiService` (内置) | GridFS 文件存储服务 |
| **系统监控** | `Platform.SystemMonitor` | 进程级资源监控 |

### 前端项目结构

| 应用 | 框架 | 版本 | 用途 |
|------|------|------|------|
| `Platform.Admin` | React 19 + UmiJS 4 + Ant Design 6 | 19.2.5 / 4.6.42 / 6.3.5 | 管理后台 |
| `Platform.App` | Expo + React Native | 54.0.31 / 0.83.1 | 移动端 App |
| `Platform.MiniApp` | 微信原生 | - | 微信小程序 |

### 核心业务模块

| 模块 | 后端控制器 | 前端页面 | 说明 |
|------|-----------|---------|------|
| **工作流** | WorkflowController | workflow/ | 流程定义、实例、审批、监控 |
| **IoT 物联网** | IoTController | iot-platform/ | 网关、设备、数据点、告警 |
| **园区管理** | ParkAsset/Tenant/Visit/InvestmentController | park-management/ | 资产、租户、走访、招商 |
| **密码本** | PasswordBookController | password-book/ | 安全密码管理 |
| **知识库** | KnowledgeBase/DocumentController | workflow/knowledge-base/ | 知识库与文档 |
| **文件存储** | FileStorage/CloudStorage/VersionController | cloud-storage/ | 云存储、版本管理、分享 |
| **任务项目** | Task/ProjectController | task-management/ | 任务创建分配、项目管理 |
| **公文管理** | DocumentController | document/ | 公文创建、审批、归档 |
| **小科 AI** | ChatAi/XiaokeConfigController | xiaoke-management/ | AI 对话、配置管理 |
| **网页抓取** | WebScraperController | web-scraper/ | 网页内容抓取、深度爬取、定时任务 |

## 2. 交互与 Git 提交规范

### 🤖 会话与 Git 提交
- **全面中文交互**：所有代码注释、README、给用户的回复、以及 **Git 提交信息**，必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`，`docs: 更新xxx`）。

### 📝 代码修改成功后自动提交与推送
修改代码成功后，**必须**自动执行以下操作：

#### 1. 运行 lint 检查
```bash
cd Platform.Admin && npm run lint
```

#### 2. 检查 Git 状态
```bash
git status
```

#### 3. 如果有变更，提交并推送
```bash
git add -A
git commit -m "<提交信息>"
git push origin main
```

#### 提交信息规范
| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加用户管理功能` |
| `fix` | Bug 修复 | `fix: 修复登录验证问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `refactor` | 重构 | `refactor: 优化数据访问层` |
| `style` | 格式调整 | `style: 格式化代码` |
| `perf` | 性能优化 | `perf: 优化查询性能` |
| `test` | 测试相关 | `test: 添加单元测试` |
| `chore` | 构建/工具 | `chore: 更新依赖` |

> **注意**：如果没有任何变更，不需要执行提交操作。

### 🚀 Aspire 资源调拨
- 修改 `Platform.AppHost/AppHost.cs` 或 `appsettings.json` 后，必须指导用户重启 `aspire run`。
- 请勿向用户推荐使用过时的 Aspire workload。
- 使用 MCP 提供的 `list resources` / `list integrations` 等工具排查微服务拉起问题。
- 各个服务控制台输出均通过 `list structured logs` / `list console logs` 工具获取。
- 调试分布式错误时，优先使用 `list traces` 查找异常链路。

## 3. 后端开发强制红线 (Backend Redlines)

> 以下规则为强制禁止，违反将导致数据污染、跨租户越权或系统安全隐患。

### 🗄️ 数据库操作
- 严禁直接注入或操作 `IMongoCollection<T>` 或 `IMongoDatabase`
- 严禁绕过 `DbContext` 直接操作 MongoDB 集合
- 业务层必须通过注入 `DbContext` 并使用 `_context.Set<T>()` 进行数据操作
- `PlatformDbContext` 自动发现所有 `IEntity` 实现，无需手动注册 `DbSet<T>`

### 📊 审计与软删除
- 严禁手动设置 `CreatedAt/UpdatedAt/UpdatedBy` 审计字段，由 `PlatformDbContext.ApplyAuditInfoCore()` 自动维护
- `CreatedBy` 使用 `??=` 赋值（仅在为 null 时自动填充），允许在保存前手动指定（如系统级创建）
- 严禁手动设置 `IsDeleted` 实现软删除，调用 `DbContext.Remove()` 时自动处理
- 所有继承 `BaseEntity` 的实体自动具备 `IIntegrityTrackable`，`PlatformDbContext` 在每次保存时自动计算 SM3-HMAC 完整性校验

### 🏢 多租户与上下文安全
- 控制器和服务层严禁直接从 JWT claim 中读取 `companyId`、`userId` 等字段
- 企业上下文必须通过 `ITenantContext` 或 `BaseApiController` 提供的属性读取（底层由 `TenantContextMiddleware` 从 JWT 解析后写入 `AsyncLocal`）
- 后台任务中必须使用 `ITenantContextSetter.SetContext(companyId, userId)` 手动设置租户上下文

### 🔐 权限控制
- 严禁使用过时的 `HasPermission()` 方法
- 所有敏感操作必须添加 `[RequireMenu("menu-action")]` 注解（支持类级别和方法级别）

### 📡 接口响应
- 严禁返回裸 JSON 或使用 `NotFound()`/`BadRequest()` 等原生响应，必须通过 `Success()` 包装为 `ApiResponse`
- 严禁使用 SignalR 推送实时数据，必须使用 SSE
- 严禁使用 try-catch 包裹异常后重新抛出（丢失堆栈跟踪），直接抛出原始异常即可

### 🚫 N+1 查询
- 严禁在循环内调用单条查询方法
- 严禁手动 `.Skip()` `.Take()` 实现分页，必须使用 `ToPagedList()`

### 🧹 代码整洁
- 严禁使用 `using Xxx = Yyy.Zzz` 类型别名
- 严禁在类型/接口名称中使用 "Dependency" 单词
- 严禁手写 BsonDocument，必须使用 LINQ 构建器

---

## 4. MCP 服务与 AI 能力整合

本项目在 `Platform.ApiService` 中，包含了一个强大的单一类 `McpService.cs`（及 `Mcp/` 下的各 Handler），它通过 Model Context Protocol 向外层 AI（不仅限于本 Copilot）提供系统内深度业务能力投射。

- **不要重复造轮子**：当面临读取【工作流进度】、【IoT设备状态】或【园区资产查询】等复杂任务时，AI 助手应优先分析项目中是否已有现成的 MCP Handlers 支持提取能力。
- 本项目不仅是一个应用，它自身也是一个巨大的 AI 知识源提供者。

### MCP Handler 完整列表 (22 个)

| Handler | 功能领域 |
|---------|---------|
| TaskMcpToolHandler | 任务管理 |
| ProjectMcpToolHandler | 项目管理 |
| UserMcpToolHandler | 用户管理 |
| WorkflowMcpToolHandler | 工作流引擎 |
| IoTMcpToolHandler | 物联网平台 |
| ParkMcpToolHandler | 园区管理 |
| KnowledgeMcpToolHandler | 知识库 |
| DocumentMcpToolHandler | 公文管理 |
| PasswordBookMcpToolHandler | 密码本 |
| NoticeMcpToolHandler | 公告管理 |
| NotificationMcpToolHandler | 通知推送 |
| FileShareMcpToolHandler | 文件分享 |
| FileVersionMcpToolHandler | 文件版本 |
| FormMcpToolHandler | 表单管理 |
| MenuMcpToolHandler | 菜单管理 |
| SocialMcpToolHandler | 社交功能 |
| OrganizationMcpToolHandler | 组织架构 |
| JoinRequestMcpToolHandler | 加入申请 |
| StatisticsMcpToolHandler | 统计分析 |
| SystemMcpToolHandler | 系统管理 |
| WebScraperMcpToolHandler | 网页抓取 |

## 5. 通用开发原则

### 核心架构原则

> 数据操作、权限控制、响应格式等详细规范见第 3 章强制红线与第 6 章开发规范。

| 原则 | 说明 |
|------|------|
| **零警告编译** | 任何警告都是代码"污染"，必须修复 |
| **无冗余代码** | 删除不使用的变量/方法/参数 |
| **DRY 原则** | 相同逻辑不重复，提取为公共方法 |
| **命名即文档** | 变量/方法名清晰表达意图 |
| **删除而非注释** | 不用的代码直接删除，不要注释掉 |
| **文档同步** | 注释/文档与代码保持一致 |

### 禁止模式速查

| 禁用项 | 正确做法 |
|--------|----------|
| 直接访问 MongoDB | 所有操作必须通过 DbContext |
| 硬编码企业 ID | 必须通过 `ITenantContext` |
| 同步等待异步 | 使用 `await` |
| 缺失权限检查 | 必须使用 `[RequireMenu]` |
| 循环内调用单条查询 | 必须使用批量查询方法 |

---

## 6. 后端开发规范

> **开发标准参考**：`PasswordBookController.cs` + `PasswordBookService.cs` 是所有后端模块的开发标准代码。

### 6.1 控制器规范

#### 控制器分层与继承
- **[强制]** 所有业务控制器必须继承 `BaseApiController`，禁止直接继承 `ControllerBase`。
- 控制器层**只负责**路由、参数校验、权限注解 `[RequireMenu]`、调用服务层、返回统一响应。
- **禁止**在控制器注入/操作 `DbContext`，所有数据访问必须下沉到服务层。

#### 标准控制器模板
```csharp
[ApiController]
[Route("api/xxx")]
public class XxxController : BaseApiController
{
    private readonly IXxxService _xxxService;
    private readonly ILogger<XxxController> _logger;

    public XxxController(IXxxService xxxService, ILogger<XxxController> logger)
    {
        _xxxService = xxxService ?? throw new ArgumentNullException(nameof(xxxService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost]
    [RequireMenu("xxx")]
    public async Task<IActionResult> Create([FromBody] CreateXxxRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("名称不能为空");

        var userId = RequiredUserId;
        var result = await _xxxService.CreateAsync(request, userId);
        return Success(result);
    }

    [HttpGet("{id}")]
    [RequireMenu("xxx")]
    public async Task<IActionResult> GetById(string id)
    {
        var userId = RequiredUserId;
        var result = await _xxxService.GetByIdAsync(id, userId);
        if (result == null)
            throw new ArgumentException("资源不存在");
        return Success(result);
    }

    [HttpGet("list")]
    [RequireMenu("xxx")]
    public async Task<IActionResult> GetList([FromQuery] ProTableRequest request)
    {
        var userId = RequiredUserId;
        var result = await _xxxService.GetListAsync(request, userId);
        return Success(result);
    }

    [HttpPut("{id}")]
    [RequireMenu("xxx")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateXxxRequest request)
    {
        var userId = RequiredUserId;
        var result = await _xxxService.UpdateAsync(id, request, userId);
        if (result == null)
            throw new ArgumentException("资源不存在");
        return Success(result);
    }

    [HttpDelete("{id}")]
    [RequireMenu("xxx")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = RequiredUserId;
        var success = await _xxxService.DeleteAsync(id, userId);
        if (!success)
            throw new ArgumentException("资源不存在或无权删除");
        return Success(true);
    }
}
```

#### 用户上下文获取
```csharp
// ✅ 正确：使用 BaseApiController 提供的属性
protected string? CurrentUserId => TenantContext.GetCurrentUserId();
protected string RequiredUserId { get; }  // null 时抛出 UnauthorizedAccessException
protected string? CurrentCompanyId => TenantContext.GetCurrentCompanyId();
protected string RequiredCompanyId { get; }  // null 时抛出 KeyNotFoundException

// ✅ 正确：通过 ITenantContext 获取
var companyId = TenantContext.GetCurrentCompanyId();

// ❌ 禁止：控制器/服务层直读 JWT Claims
var companyId = User.FindFirst("companyId")?.Value;
```

### 6.2 服务层规范

#### 标准服务模板
```csharp
public class XxxService : IXxxService
{
    private readonly DbContext _context;
    private readonly ILogger<XxxService> _logger;

    public XxxService(DbContext context, ILogger<XxxService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<XxxEntry> CreateAsync(CreateXxxRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var entity = new XxxEntry
        {
            Name = request.Name,
            UserId = userId
        };

        await _context.Set<XxxEntry>().AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<XxxEntry?> GetByIdAsync(string id, string userId)
    {
        return await _context.Set<XxxEntry>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<PagedResult<XxxEntry>> GetListAsync(ProTableRequest request, string userId)
    {
        var query = _context.Set<XxxEntry>().Where(x => x.UserId == userId);
        return query.ToPagedList(request);
    }

    public async Task<XxxEntry?> UpdateAsync(string id, UpdateXxxRequest request, string userId)
    {
        var entity = await _context.Set<XxxEntry>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        if (entity.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此资源");

        entity.Name = request.Name;
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<bool> DeleteAsync(string id, string userId)
    {
        var entity = await _context.Set<XxxEntry>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        if (entity.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此资源");

        _context.Set<XxxEntry>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}
```

#### 数据访问规范
- 服务层注入 `DbContext` 并使用 `_context.Set<T>()` 进行数据操作
- 禁止在控制器层操作数据库
- 审计字段（CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/LastOperationAt）由 `PlatformDbContext.ApplyAuditInfoCore()` 自动维护
- `CreatedBy` 使用 `??=` 赋值，仅当为 null 时自动填充，允许在保存前手动指定（如系统级创建）
- `IIntegrityTrackable` 在每次保存时自动计算 SM3-HMAC 完整性校验（所有 `BaseEntity` 子类均具备）
- MongoDB 集合名称使用实体类名（`modelBuilder.Entity(type).ToCollection(type.Name)`）

```csharp
// ✅ 正确
await _context.Set<User>().AddAsync(user);
await _context.SaveChangesAsync();

// ❌ 禁止：手动设置审计字段
user.CreatedBy = userId;
user.CreatedAt = DateTime.UtcNow;
```

### 6.3 权限注解标准

- **[强制]** 所有敏感操作必须添加 `[RequireMenu("menu-name")]` 注解
- 菜单名称统一用连字符 `-` 分隔
- 支持多个菜单名称，满足其一即可访问
- 支持类级别注解（整个控制器统一权限）和方法级别注解

```csharp
// ✅ 类级别注解（整个控制器统一权限）
[ApiController]
[Route("api/iot")]
[RequireMenu("iot-platform")]
public class IoTController : BaseApiController { ... }

// ✅ 方法级别 - 单个菜单
[HttpPost]
[RequireMenu("task-management")]

// ✅ 方法级别 - 多个菜单（满足其一即可）
[HttpGet("list")]
[RequireMenu("workflow-list", "workflow-monitor")]
```

### 6.4 自动依赖注入与命名约定

项目使用 `ServiceDiscoveryExtensions` 自动扫描注册，**无需手动注册服务**。

#### 命名约定控制生命周期

| 命名前缀 | 生命周期 | 示例 |
|----------|---------|------|
| `Singleton*` | Singleton | `SingletonCacheService` |
| `Transient*` | Transient | `TransientEmailSender` |
| (默认) `*Service` | Scoped | `PasswordBookService` |

#### 自动 Options 绑定

类名以 `Options` 结尾 + 含静态字段 `SectionName` → 自动注册 `IOptions<T>`：
```csharp
public class JwtOptions
{
    public static readonly string SectionName = "Jwt";
    public string SecretKey { get; set; } = string.Empty;
    // ...
}
```

#### 接口自动发现

类型实现的 `Platform.*` 命名空间接口自动注册为服务接口。无接口的类注册为自身。

#### IHostedService 自动注册

实现 `IHostedService`（类名不含 "Base"）自动注册为 Singleton 托管服务。

### 6.5 分页规范

#### 请求参数类型
使用 `ProTableRequest` 接收前端分页请求：

```csharp
public sealed class ProTableRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Sort { get; set; }      // JSON: {"fieldName":"ascend"}
    public string? Filter { get; set; }     // JSON 对象筛选
}
```

#### 后端实现
```csharp
// ✅ 正确：使用 ToPagedList
var result = _context.Set<User>()
    .Where(u => u.IsActive)
    .ToPagedList(request);

// ❌ 禁止：手动分页
var paged = query.Skip((page - 1) * pageSize).Take(pageSize);
```

> **[强制]** 必须使用 `ToPagedList()` 扩展方法，禁止手动 `Skip/Take`。

### 6.6 异常处理规范

**[强制]** 控制器和服务层出现错误时，**直接抛出异常**：

```csharp
// ✅ 正确：使用 ErrorCode 常量作为异常消息（BusinessExceptionFilter 自动识别并翻译）
if (user == null)
    throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

if (string.IsNullOrEmpty(companyId))
    throw new UnauthorizedAccessException(ErrorCode.CurrentCompanyNotFound);

if (!await _uniquenessChecker.IsUsernameUniqueAsync(username))
    throw new InvalidOperationException(ErrorCode.UserNameExists);

// ✅ 正确：参数校验等简单场景可使用人类可读消息（走异常类型映射）
if (string.IsNullOrEmpty(name))
    throw new ArgumentException("名称不能为空", nameof(name));
```

**[强制]** 严禁 try-catch 包裹后重新抛出异常（丢失堆栈跟踪）：
```csharp
// ❌ 禁止：包裹异常后重新抛出
catch (Exception ex)
{
    throw new ArgumentException(ex.Message);  // 丢失原始堆栈跟踪
}

// ❌ 禁止：记录日志后替换异常类型
catch (Exception ex)
{
    _logger.LogError(ex, "操作失败");
    throw new ArgumentException("操作失败");  // 丢失异常类型和堆栈
}
```

**全局异常映射**（`BusinessExceptionFilter` 自动处理，处理位置已迁移至 `Platform.ServiceDefaults.Filters`）：

**优先级 1：已知错误码自动识别**

当异常消息是 `ErrorCode.ErrorMessages` 字典中的已知错误码时，`BusinessExceptionFilter` 自动将 `errorCode` 设为该错误码，`message` 设为字典中的中文消息：

```csharp
// 服务层：抛出异常时使用 ErrorCode 常量作为消息
throw new AuthenticationException(ErrorCode.UserNotAuthenticated);
throw new ArgumentException(ErrorCode.InvalidCredentials);
throw new UnauthorizedAccessException(ErrorCode.CurrentCompanyNotFound);

// BusinessExceptionFilter 自动检测：
// exception.Message == "USER_NOT_AUTHENTICATED" → 查字典得到 "未找到用户认证信息"
// 结果: { errorCode: "USER_NOT_AUTHENTICATED", message: "未找到用户认证信息" }
```

**优先级 2：异常类型映射（回退）**

当异常消息不是已知错误码时，按异常类型映射：

| 异常类型 | HTTP 状态码 | errorCode | 说明 |
|---------|-----------|-----------|------|
| `ArgumentException` | 400 | `VALIDATION_ERROR` | 参数校验失败 |
| `KeyNotFoundException` | 404 | `RESOURCE_NOT_FOUND` | 资源不存在 |
| `AuthenticationException` | 401 | `UNAUTHENTICATED` | 未认证 |
| `UnauthorizedAccessException` | 403 | `UNAUTHORIZED_ACCESS` | 无权访问 |
| `InvalidOperationException` | 400 | `INVALID_OPERATION` | 业务规则冲突 |
| `NotImplementedException` | 405 | `OPERATION_NOT_SUPPORTED` | 未实现 |
| `NotSupportedException` | 405 | `OPERATION_NOT_SUPPORTED` | 不支持 |
| `IOException` | 404 | `RESOURCE_NOT_FOUND` | IO 异常 |

**服务层异常类型选择规范**：

| 场景 | 异常类型 | HTTP 状态码 | 说明 |
|------|---------|-----------|------|
| 用户未认证 | `AuthenticationException` | 401 | 语义明确：未登录/Token 无效 |
| 无权操作 | `UnauthorizedAccessException` | 403 | 语义明确：权限不足 |
| 资源不存在 | `KeyNotFoundException` | 404 | 语义明确：找不到目标资源 |
| 参数校验失败 | `ArgumentException` | 400 | 通用参数错误 |
| 业务规则冲突 | `InvalidOperationException` | 400 | 唯一性冲突等 |

**后端消息常量使用规范**：

| 场景 | 使用常量 | 文件 |
|------|---------|------|
| 业务错误码（throw 异常） | `ErrorCode.InvalidCredentials` | `Platform.ServiceDefaults/Models/ErrorCode.cs` |
| 成功消息（Success 返回） | `SuccessMessages.CreateSuccess` | `Platform.ServiceDefaults/Models/SuccessMessages.cs` |
| 格式化验证消息（string.Format） | `string.Format(ErrorMessages.ParameterRequired, "用户名")` | `Platform.ServiceDefaults/Models/UserConstants.cs` |

> **注意**：`ErrorMessages` 类仅保留格式化字符串（含 `{0}`/`{1}` 占位符），固定文本错误消息已统一迁移至 `ErrorCode.ErrorMessages` 字典，成功消息已迁移至 `SuccessMessages` 类。

**错误码优先规范**：
- `ApiResponse` 包含 `errorCode` 和 `message` 两个字段
- **前端应优先读取 `errorCode` 进行 i18n 翻译**，`message` 作为 fallback 显示
- 错误码常量定义见 `Platform.ServiceDefaults/Models/ErrorCode.cs`
- 错误码→消息字典也定义在 `ErrorCode.ErrorMessages`，`BusinessExceptionFilter` 自动查表
- 前端错误码常量定义见 `Platform.Admin/src/constants/errorCodes.ts`
- 所有 locale 的 `request.ts` 应包含完整错误码翻译

**原因**：
- 全局异常处理中间件统一捕获并格式化异常
- 避免大量重复的 try-catch 代码
- 保持控制器层职责单一
- 统一错误信息传递格式，简化前后端错误处理逻辑

### 6.7 批量查询规范（N+1 防护）

**[强制]** 严禁在循环内调用单条查询：

```csharp
// ✅ 正确：批量查询
var allUserIds = tasks.SelectMany(t => new[] { t.CreatedBy, t.AssignedTo }).Distinct();
var userMap = await _userService.GetUsersByIdsAsync(allUserIds);
return tasks.Select(t => ConvertWithCache(t, userMap)).ToList();

// ❌ 禁止：N+1 查询
foreach (var task in tasks)
{
    var user = await _userService.GetUserByIdAsync(task.CreatedBy);  // N 次查询
}
```

### 6.8 后台任务与租户上下文

在后台任务（如 `Task.Run`、后台服务、定时任务）中，无法直接使用 HTTP 请求上下文，需要手动设置租户上下文。

#### ITenantContextSetter 使用场景

| 场景 | 使用方法 |
|------|----------|
| **后台异步任务** | 使用 `ITenantContextSetter.SetContext(companyId, userId)` 设置上下文 |
| **定时任务** | 在任务执行体内设置租户上下文 |
| **消息队列消费者** | 消费消息时设置租户上下文 |

#### 标准用法

```csharp
// 1. 注入 IServiceScopeFactory
private readonly IServiceScopeFactory _scopeFactory;

public XxxService(IServiceScopeFactory scopeFactory)
{
    _scopeFactory = scopeFactory;
}

// 2. 在后台任务中创建作用域并设置租户上下文
_ = Task.Run(async () =>
{
    await using var scope = _scopeFactory.CreateAsyncScope();

    // 设置租户上下文（必须在获取 DbContext 之前）
    var tenantSetter = scope.ServiceProvider.GetRequiredService<ITenantContextSetter>();
    tenantSetter.SetContext(companyId, userId);

    // 现在查询会自动应用 CompanyId 过滤
    var context = scope.ServiceProvider.GetRequiredService<DbContext>();
    var entity = await context.Set<MyEntity>().FirstOrDefaultAsync(x => x.Id == id);
});
```

#### 关键点

- **必须先设置上下文再查询**：在调用 `DbContext` 查询之前，必须先调用 `SetContext`
- **作用域隔离**：每个后台任务需要创建独立的 `IServiceScope`
- **自动过滤**：设置上下文后，所有继承 `MultiTenantEntity` 的实体查询会自动应用 `CompanyId` 过滤

### 6.9 类型命名规范

| 规范 | 示例 |
|------|------|
| 禁止使用 "Dependency" | ✅ `IRelationService` ❌ `IDependencyService` |
| 禁止 using 别名 | ✅ `Set<WorkTask>()` ❌ `using X = WorkTask;` |
| 请求/响应类后缀 | `CreateXxxRequest`、`XxxResponse`、`XxxDto` |
| 实体类命名 | 使用领域名称：`PasswordBookEntry`、`WorkTask`、`IoTGateway` |
| 实体+请求共位 | 同模块实体与 Request/DTO 放在同一文件（参考 `PasswordBookEntities.cs`） |
| 错误消息常量 | 错误码用 `ErrorCode.*`，成功消息用 `SuccessMessages.*`，格式化消息用 `ErrorMessages.*` |

### 6.10 统一响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": null,
  "errorCode": null,
  "errors": null,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "traceId": "xxx"
}
```

**错误响应示例**：
```json
{
  "success": false,
  "data": null,
  "message": "用户名或密码错误",
  "errorCode": "INVALID_CREDENTIALS",
  "errors": null,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "traceId": "xxx"
}
```

**字段职责**：

| 字段 | 用途 | 说明 |
|------|------|------|
| `errorCode` | 标准错误分类码，前端优先用于 i18n 翻译 | 1 (优先翻译) |
| `message` | 全局错误提示，当 errors 不存在时显示 | 仅当 errors为空时的兜底显示 |
| `errors` | **字段级别验证错误** `Dictionary<string, string[]>` | 各表单字段的验证错误，优先于 message 显示 |

> **重要**：`errors` 和 `message` 不应同时显示相同内容。errors 包含各字段的具体错误时，message 应为空或仅作为全局兜底。前端 errorInterceptor 的 `extractValidationErrors()` 方法已实现此逻辑：只有当 `errors` 为空时才取 `message`。

控制器返回：
```csharp
return Success(entity);           // 返回数据
return Success(true);             // 返回成功
return Success(result, "操作成功"); // 返回数据 + 消息
```

### 6.11 SSE (Server-Sent Events) 开发规范

**[强制]** 本项目严禁使用框架自带的实时推送中间件（如 SignalR），必须使用轻量级的 SSE 实现。

#### 后端实现准则
1. **禁用缓冲**：必须调用 `IHttpResponseBodyFeature.DisableBuffering()` 确保消息即时下发。
2. **报头控制**：
   - `Content-Type`: `text/event-stream`
   - `Cache-Control`: `no-cache, no-transform`
   - **[关键]** `X-Accel-Buffering`: `no` (确保能穿透 Nginx/YARP 等反向代理)。
3. **心跳机制**：必须实现服务端心跳（建议每 15 秒发送一次 `event: ping`），防止代理层因长连接空闲而将其断开。
4. **响应压缩避让**：在流式连接中必须显式跳过响应压缩中间件（或确保 `text/event-stream` 不在压缩列表中）。
5. **SSE 端点标记**：使用 `[SkipGlobalAuthentication]` 属性跳过全局认证，改由端点自行验证查询参数 `token`。

#### 过滤器与中间件避让
1. **全局过滤器**：在 `ApiResponseWrapperFilter` 等全局过滤器中，必须通过路径排除或检查 `Accept: text/event-stream` 报头来避让，严禁包裹 SSE 响应源。
2. **请求日志**：在 `ApiLoggingMiddleware` 中应排除 SSE 路径，避免记录海量的长连接日志，同时防止日志逻辑干扰流的生命周期。

#### 前端连接准则
1. **认证支持**：SSE 原生不支持 Header 认证。必须在 `JwtBearerEvents.OnMessageReceived` 中支持从查询参数 `token` 中提取令牌。
2. **重连逻辑**：前端钩子必须实现指数退避重连机制，并在连接成功后通过首个消息（如 `Connected` 类型）初始化状态，实现“推送即初始化”。

## 7. 前端开发规范（Admin）

> **开发标准参考**：`src/pages/password-book/index.tsx` 是所有列表页面的开发标准代码。

### 7.1 路由与菜单

#### 路由配置
```typescript
// config/routes.ts
export default [
  {
    path: '/task-management',
    name: 'task-management',
    component: './task-management',
  },
];
```

#### 菜单翻译
```typescript
// src/locales/zh-CN/menu.ts
export default {
  'menu.task-management': '任务管理',
};
```

### 7.2 API 端点规范

#### 后端路由约定
```
api/xxx              - CRUD 主资源
api/xxx/list         - 分页列表
api/xxx/{id}         - 单个资源
api/xxx/categories   - 获取分类列表
api/xxx/tags         - 获取标签列表
api/xxx/statistics   - 获取统计信息
api/xxx/export       - 导出数据
api/xxx/generate     - 生成/计算操作
api/xxx/check-xxx    - 检查/验证操作
```

#### 前端 API 封装
**[推荐]** 简单模块 API 直接内联在页面组件中；**复杂/复用模块**可提取至 `@/services/` 目录：

```typescript
import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

// ✅ 简单模块：内联 api 对象（参考 password-book）
const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  statistics: () => request<ApiResponse<Stats>>('/apiservice/api/password-book/statistics'),
  categories: () => request<ApiResponse<string[]>>('/apiservice/api/password-book/categories'),
  tags: () => request<ApiResponse<string[]>>('/apiservice/api/password-book/tags'),
};

// ✅ 复杂模块：提取至 @/services/xxx/api.ts（参考 task、workflow、document、iot）
// 页面中通过 import { type TaskDto, TaskStatus } from '@/services/task/api' 引用类型和函数
```

### 7.3 类型安全

**[强制]** 禁止使用 `any` 类型，定义具体接口：

```typescript
// ✅ 正确
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
const handleSubmit = (values: TaskFormValues) => {};
```

### 7.4 统一 API 响应类型

所有 API 相关类型统一定义在 `@/types/api-response.ts`：

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  errors?: any;
  timestamp?: string;
  traceId?: string;
}

export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

> **注意**：分页参数直接使用 `any` 类型，ProTable 会自动传递 `params`、`sort`、`filter` 参数。

### 7.5 列表页面关键结构

完整代码参考 `src/pages/password-book/index.tsx`，以下为关键片段：

```typescript
// api 对象定义
const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
};

// request 回调（必须 current→page 映射）
request={async (params: any, sort: any, filter: any) => {
  const { current, pageSize } = params;
  const res = await api.list({ page: current, pageSize, search: state.search, sort, filter });
  return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
}}

// columns 定义
const columns: ProColumns<Entry>[] = [
  { title: '平台', dataIndex: 'platform', key: 'platform', sorter: true },
  { title: '账号', dataIndex: 'account', key: 'account', sorter: true },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
  {
    title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180,
    render: (_, r) => (
      <Space size={4}>
        <Button variant="link" color="cyan" size="small" onClick={() => set({ viewingId: r.id, detailVisible: true })}>查看</Button>
        <Button type="link" size="small" onClick={() => set({ editingEntry: r, formVisible: true })}>编辑</Button>
        <Popconfirm title={`确定删除？`} onConfirm={async () => { await api.delete(r.id); actionRef.current?.reload(); }}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    ),
  },
];

// ModalForm 表单
<ModalForm
  key={state.editingEntry?.id || 'create'}
  title={state.editingEntry ? '编辑' : '新建'}
  open={state.formVisible}
  onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
  initialValues={state.editingEntry || undefined}
  onFinish={handleFinish}
>
  <ProFormText name="platform" label="平台名称" rules={[{ required: true }]} />
  <ProFormText name="account" label="账号" rules={[{ required: true }]} />
</ModalForm>

### 7.6 状态管理模式

#### 状态集中管理
```typescript
const [state, setState] = useState({
  formVisible: false,
  editingEntry: null as Entry | null,
  search: '' as string,
});
const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);
```

#### 状态更新模式
```typescript
// 设置单个状态
set({ formVisible: true });

// 依赖前一状态
set(prev => ({ ...prev, editingEntry: newValue }));
```

### 7.7 表单处理规范

#### 新建/编辑组件
使用 `@ant-design/pro-components` 的 `ModalForm` 组件：

```typescript
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
```

#### ModalForm 关键配置
| 属性 | 说明 | 示例 |
|------|------|------|
| `key` | 强制重新挂载，区分新建和编辑 | `key={editingEntry?.id \|\| 'create'}` |
| `title` | 弹窗标题 | `title={editingEntry ? '编辑' : '新建'}` |
| `open` | 控制显示 | `open={state.formVisible}` |
| `onOpenChange` | 关闭时重置状态 | `onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}` |
| `initialValues` | 编辑时回填数据 | `initialValues={editingEntry \|\| undefined}` |
| `onFinish` | 表单提交回调 | `onFinish={handleFinish}` |
| `autoFocusFirstInput` | 自动聚焦首输入框 | `autoFocusFirstInput` |
| `width` | 弹窗宽度 | `width={600}` |

#### 表单字段组件
| 组件 | 用途 | 示例 |
|------|------|------|
| `ProFormText` | 单行文本输入 | `<ProFormText name="name" label="名称" rules={[{ required: true }]} />` |
| `ProFormSelect` | 下拉选择 | `<ProFormSelect name="category" mode="tags" />` |
| `ProFormTextArea` | 多行文本 | `<ProFormTextArea name="notes" />` |
| `Form.Item` + `Input.Password` | 密码输入 | `<Form.Item name="password"><Input.Password /></Form.Item>` |

#### ModalForm 配置
- 使用 `key={editingEntry?.id || 'create'}` 强制重新挂载，区分新建和编辑
- `onOpenChange` 中重置编辑状态
- 编辑时设置 `initialValues`

```typescript
<ModalForm
  key={state.editingEntry?.id || 'create'}
  title={state.editingEntry ? '编辑' : '新建'}
  open={state.formVisible}
  onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
  initialValues={state.editingEntry || undefined}
  onFinish={handleFinish}
>
```

#### 表单提交
```typescript
const handleFinish = async (values: Record<string, any>) => {
  const res = state.editingEntry
    ? await api.update(state.editingEntry.id, values)
    : await api.create(values);
  if (res.success) {
    set({ formVisible: false, editingEntry: null });
    actionRef.current?.reload();
  }
  return res.success;
};
```

### 7.8 分页与搜索规范

| 参数 | 说明 | 备注 |
|------|------|------|
| `page` | 当前页码 | 必须显式传递（ProTable 传入 `current`，需映射为 `page`） |
| `pageSize` | 每页数量 | ProTable 自动传递 |
| `search` | 搜索关键词 | 存储在 state 中 |
| `sort` | 排序规则 | 如 `{"fieldName":"ascend"}`，UmiJS 自动序列化 |
| `filter` | 筛选规则 | 如 `{"category":["work"]}`，UmiJS 自动序列化 |

```typescript
// ✅ 正确：映射 current→page + sort/filter
const { current, pageSize } = params;
const res = await api.list({
  page: current,
  pageSize,
  search: state.search,
  sort,
  filter,
});
return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };

// ❌ 禁止：直接展开 params（current 不映射为 page，分页永远在第1页）
const res = await api.list({ ...params, sort, filter });
```

### 7.9 列渲染规范

```typescript
const columns: ProColumns<Entry>[] = [
  { title: '名称', dataIndex: 'name', sorter: true },
  {
    title: '状态',
    dataIndex: 'status',
    render: (dom) => dom ? <Tag color="blue">{dom as string}</Tag> : '-',
  },
  {
    title: '标签',
    dataIndex: 'tags',
    render: (dom) => dom && typeof dom === 'object' && 'length' in dom
      ? <Space wrap>{(dom as string[]).map(t => <Tag key={t}>{t}</Tag>)}</Space>
      : '-',
  },
];
```

### 7.10 详情抽屉规范

```typescript
const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    if (id) api.get(id).then(r => { if (r.success && r.data) setData(r.data); });
  }, [id]);
  if (!data) return null;
  return <ProDescriptions column={1} bordered size="small">{/* ... */}</ProDescriptions>;
};

// 使用 Drawer 包裹
<Drawer title="详情" placement="right" open={state.detailVisible}
  onClose={() => set({ detailVisible: false })} size="large">
  <DetailContent id={state.viewingId} />
</Drawer>
```

### 7.11 初始化数据加载

```typescript
useEffect(() => {
  loadStatistics();
}, [loadStatistics]); // 依赖项数组包含回调函数

// 或直接执行
useEffect(() => {
  api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
}, []);
```

### 7.12 代理配置

开发环境代理配置（`config/proxy.ts`）包含三个目标：

| 前缀 | 目标 | 用途 |
|------|------|------|
| `/apiservice/` | `http://localhost:15000` | 主要 API 后端 |
| `/systemmonitor/` | `http://localhost:15000` | 系统监控端点 |
| `/storage/` | `http://localhost:15000` | 文件存储端点 |

所有业务 API 请求统一使用 `/apiservice/` 前缀。

### 7.13 认证与 Token 管理

- **Token 存储**：`localStorage`，键名 `auth_token`、`refresh_token`、`token_expires_at`
- **Token 工具**：`src/utils/token.ts`（`tokenUtils`），提供 `setTokens()`、`getToken()`、`clearAllTokens()`、`isTokenExpired()`
- **自动刷新**：`src/utils/tokenRefreshManager.ts`（`TokenRefreshManager` 单例），401 时自动调用 `/apiservice/api/auth/refresh-token` 刷新并重试
- **密码加密**：登录密码使用 `src/utils/encryption.ts`（RSA/JSEncrypt）+ `sm-crypto`（国密算法）加密传输

### 7.14 SSE 连接管理

- **核心 Hook**：`src/hooks/useSseConnection.ts`（426 行），全局单例 EventSource，支持指数退避重连、HMR 热更新、通知状态管理
- **Context Provider**：`src/hooks/useGlobalSse.tsx`（`GlobalSseProvider`），任何组件可通过 `useGlobalSse()` 订阅 SSE 事件
- **认证方式**：SSE 不支持 Header，通过查询参数 `?token=` 传递 JWT
- **连接端点**：`/apiservice/api/stream/sse?token=<jwt>`

### 7.15 文件上传与下载

- **上传**：使用 Ant Design `Upload` 组件，`action` 指向 `/apiservice/api/cloud-storage/upload`，手动设置 `Authorization` Header
- **下载**：使用原生 `fetch()` + 手动 `Authorization` Header，绕过 UmiJS `request()` 以处理 Blob 响应

```typescript
// 下载文件示例
const token = tokenUtils.getToken();
const response = await fetch(`/apiservice/api/cloud-storage/items/${fileId}/download`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
const blob = await response.blob();
```

### 7.16 路由与菜单系统

- 所有业务路由配置 `hideInMenu: true`，菜单完全由数据库动态驱动
- 静态路由文件（`config/routes.ts`）仅用于组件映射，不控制菜单显示
- 菜单翻译键生成逻辑在 `app.tsx` 中，支持多种命名风格（连字符、冒号分隔、路径分隔）

### 7.17 国际化 (i18n)

- **配置**：默认 `zh-CN`，支持 18 种语言
- **翻译文件**：`src/locales/zh-CN/` 目录（menu.ts、pages.ts、component.ts 等）
- **使用方式**：通过 `useIntl().formatMessage({ id: 'key' })` 获取翻译文本
- **[注意]** 当前代码中 i18n 使用不一致：部分页面（task-management、iot-platform、workflow）全面使用 `intl.formatMessage`，部分页面（password-book、document/list、cloud-storage）使用硬编码中文字符串。新代码应优先使用 `intl.formatMessage`

### 7.18 Lint 检查

前端 `lint` 脚本实际运行 TypeScript 类型检查：

```bash
cd Platform.Admin && npm run lint  # 实际执行 tsc --noEmit
```

### 7.19 错误处理与 errorCode 翻译优先规范

**[强制]** 前端显示错误信息时，必须优先使用 `errorCode` 进行 i18n 翻译，`message` 作为 fallback：

```typescript
// ✅ 正确：使用 getErrorMessage 工具函数
import { getErrorMessage } from '@/utils/getErrorMessage';
message.error(getErrorMessage(response, 'pages.xxx.operationFailed'));

// ✅ 正确：手动优先翻译 errorCode
const errorMsg = response.errorCode
  ? intl.formatMessage({ id: response.errorCode, defaultMessage: response.message || '操作失败' })
  : (response.message || intl.formatMessage({ id: 'pages.xxx.operationFailed' }));
message.error(errorMsg);

// ❌ 禁止：直接使用 response.message，跳过 errorCode 翻译
message.error(response.message || intl.formatMessage({ id: 'pages.xxx.operationFailed' }));
```

#### getErrorMessage 工具函数

`src/utils/getErrorMessage.ts` 提供统一的错误消息翻译：

```typescript
import { getIntl } from '@umijs/max';

export function getErrorMessage(
  response: { errorCode?: string; message?: string },
  fallbackId: string,
): string {
  const intl = getIntl();
  if (response.errorCode) {
    return intl.formatMessage({ id: response.errorCode, defaultMessage: response.message || intl.formatMessage({ id: fallbackId }) });
  }
  return response.message || intl.formatMessage({ id: fallbackId });
}
```

#### ErrorInfo 接口说明

`errorInterceptor.ts` 中 `ErrorInfo` 接口的关键字段：

| 字段 | 用途 | 说明 |
|------|------|------|
| `errorCode` | 标准错误分类码 | 优先用于 i18n 翻译 |
| `httpCode` | HTTP 状态码或 ProblemDetails type | 来自 `HTTP_{status}` 或 `problemDetails.type` |
| `message` | 错误消息文本 | fallback 显示 |
| `debugData` | 原始错误负载 | 用于调试日志 |

## 8. 移动端开发规范（Expo）

### 8.1 路由与导航

- 使用 React Navigation 进行路由管理
- 路由配置文件：`app/(tabs)/_layout.tsx` 等
- Tab 导航使用 `@ant-design/icons` 图标

### 8.2 API 对接

- 使用 `fetch` 或 `axios` 进行网络请求
- 统一处理响应结构 `ApiResponse<T>`
- 错误处理统一 message 提示

### 8.3 状态管理

- 使用 React Context / Zustand
- 数据持久化使用 AsyncStorage

## 9. 相关代码位置

| 模块 | 位置 |
|------|------|
| 后端分页类型 | `Platform.ServiceDefaults/Models/ProTableRequest.cs` |
| 后端分页扩展 | `Platform.ServiceDefaults/Extensions/QueryableExtensions.cs` |
| 自动 DI 扫描 | `Platform.ServiceDefaults/Extensions/ServiceDiscoveryExtensions.cs` |
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 实体基类 | `Platform.ServiceDefaults/Models/BaseEntity.cs` |
| 审计接口 | `Platform.ServiceDefaults/Models/OperationTracking.cs` |
| 错误码常量与消息字典 | `Platform.ServiceDefaults/Models/ErrorCode.cs` |
| 成功消息常量 | `Platform.ServiceDefaults/Models/SuccessMessages.cs` |
| 格式化错误消息 | `Platform.ServiceDefaults/Models/UserConstants.cs`（`ErrorMessages` 类） |
| 权限注解 | `Platform.ApiService/Attributes/RequireMenuAttribute.cs` |
| 响应包装 | `Platform.ApiService/Filters/ApiResponseWrapperFilter.cs` |
| 异常过滤 | `Platform.ServiceDefaults/Filters/BusinessExceptionFilter.cs` |
| SSE 控制器 | `Platform.ApiService/Controllers/StreamController.cs` |
| 租户中间件 | `Platform.ServiceDefaults/Services/TenantContextMiddleware.cs` |
| 前端统一类型 | `Platform.Admin/src/types/api-response.ts` |
| 前端错误码常量 | `Platform.Admin/src/constants/errorCodes.ts` |
| 前端错误消息工具 | `Platform.Admin/src/utils/getErrorMessage.ts` |
| 错误拦截器 | `Platform.Admin/src/utils/errorInterceptor.ts` |
| 错误配置 | `Platform.Admin/src/request-error-config.ts` |
| 页面开发标准 | `Platform.Admin/src/pages/password-book/index.tsx` |
| SSE Hook | `Platform.Admin/src/hooks/useSseConnection.ts` |
| Token 工具 | `Platform.Admin/src/utils/token.ts` |
| Token 刷新 | `Platform.Admin/src/utils/tokenRefreshManager.ts` |
| 加密工具 | `Platform.Admin/src/utils/encryption.ts` |
| 代理配置 | `Platform.Admin/config/proxy.ts` |
| 路由配置 | `Platform.Admin/config/routes.ts` |

## 10. 小科 AI 聊天系统

### 10.1 技术架构

| 组件 | 技术 | 说明 |
|------|------|------|
| LLM | OpenAI (gpt-4o-mini) | 大语言模型供应商 |
| 流式输出 | `IChatClient.GetStreamingResponseAsync` | 流式调用 OpenAI |
| 实时推送 | SSE (Server-Sent Events) | 通过 ChatBroadcaster 推送 |
| Fallback | 内置配置 | 数据库无配置时使用内置 gpt-4o-mini |

### 10.2 消息流程

```
用户发送消息 → ChatService.SendMessageAsync() → 保存消息到数据库
                    ↓
            后台 Task.Run() → RespondAsAssistantAsync()
                    ↓
            GetXiaokeConfig() → 获取/构建配置 (含 fallback)
                    ↓
            GetStreamingResponseAsync() → 流式调用 OpenAI
                    ↓
            BroadcastMessageChunkAsync() → SSE 推送 token 到前端
                    ↓
            BroadcastMessageCompleteAsync() → 完成广播
```

### 10.3 关键代码位置

| 文件 | 行号 | 职责 |
|------|------|------|
| `ChatService.cs` | 第 69 行 | 触发后台 AI 回复任务 |
| `ChatAiService.cs` | 第 52 行 | `RespondAsAssistantAsync` 主入口 |
| `ChatAiService.cs` | 第 195 行 | `GetStreamingResponseAsync` 流式请求 |
| `ChatBroadcaster.cs` | 第 71 行 | `BroadcastMessageChunkAsync` 推送 |
| `ChatAiService.cs` | 第 259 行 | `Get XiaokeConfig` fallback |

### 10.4 配置说明

**Fallback 配置**（数据库无配置时使用）：
```csharp
Model = "gpt-4o-mini",
IsEnabled = true,
Temperature = 0.7,
MaxTokens = 2000,
SystemPrompt = "你是小科，请使用简体中文提供简洁、专业且友好的回复。"
```

### 10.5 调试日志

在 Aspire Dashboard 搜索 `【小科调试]` 可查看完整调试信息：
- 触发：`RespondAsAssistantAsync 触发`
- 配置：`小科配置 | Model= | IsEnabled=`
- 流式：`发起 LLM 流式请求`
- 完成：`LLM 生成完毕`

---

## 11. 变更与维护

- **通用规则同步**：当项目代码修改时出现新的通用规则，需同步更新到 AGENTS.md。
- 各子文档如有原则重复，优先合并至本规范。
- 发现实现与本规范不符时，优先以 AGENTS.md 和本规范为准，及时修订文档与代码。
- 所有新功能迭代前，务必查阅本规范以确保架构走向绝不偏离当前轨辙。
