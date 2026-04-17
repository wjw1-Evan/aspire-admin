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
- **数据库驱动**：MongoDB.Driver + MongoDB.Entities

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

### 📊 审计与软删除
- 严禁手动设置 `CreatedAt/UpdatedAt/CreatedBy/UpdatedBy` 审计字段
- 严禁手动设置 `IsDeleted` 实现软删除
- 调用 `DbContext.Remove()` 时，`PlatformDbContext` 自动处理软删除

### 🏢 多租户与上下文安全
- 严禁直接从 JWT claim 中读取解包 `companyId`、`roles` 等字段
- 企业上下文必须通过 `ITenantContext` 读取

### 🔐 权限控制
- 严禁使用过时的 `HasPermission()` 方法
- 所有敏感操作必须添加 `[RequireMenu("menu-action")]` 注解

### 📡 接口响应
- 严禁返回裸 JSON，必须包装为 `ApiResponse<T>`
- 严禁使用 SignalR 推送实时数据，必须使用 SSE

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

### 6.1 控制器与权限

#### 控制器分层与继承
- **[强制]** 所有业务控制器必须继承 `BaseApiController`，禁止直接继承 `ControllerBase` 或返回裸 JSON。
- 控制器层**只负责**路由、参数校验、权限注解 `[RequireMenu]`、调用服务层、返回统一响应。
- **禁止**在控制器注入/操作 `DbContext`、`IMongoCollection`、`IMongoDatabase`，所有数据访问必须下沉到服务层。

#### 权限注解标准
- **[强制]** 所有敏感操作必须添加 `[RequireMenu("menu-action")]` 注解。
- 菜单名称统一用连字符 `-` 分隔，格式为 `模块-资源`。

```csharp
// ✅ 正确：使用 RequireMenu
[HttpPost("create")]
[RequireMenu("task-management")]
public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request) { }

// ✅ 正确：多个菜单，满足其一即可
[HttpPost("list")]
[RequireMenu("workflow-list", "workflow-monitor")]
public async Task<IActionResult> GetWorkflows() { }
```

#### 用户上下文获取
```csharp
// ✅ 正确：使用基类提供的方法
protected string? CurrentUserId => GetCurrentUserId();
protected string GetRequiredUserId();
protected Task<string?> GetCurrentCompanyIdAsync();

// ✅ 正确：通过 ITenantContext 获取
var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
var isAdmin = await _tenantContext.IsAdminAsync();

// ❌ 禁止：直读 JWT Claims
var companyId = User.FindFirst("companyId")?.Value;
```

### 6.2 数据访问与审计

#### 注入与使用方式
通过 `ServiceExtensions.cs` 的 `builder.AddMongoDbContext<PlatformDbContext>(connectionName)` 注册底层 DbContext，业务层直接注入 `DbContext` 基类即可。

```csharp
// ✅ 正确：服务层注入 DbContext 并使用 Set<T>()
public class UserService
{
    private readonly DbContext _context;
    public UserService(DbContext context) => _context = context;

    public async Task<List<User>> GetUsersAsync()
        => await _context.Set<User>().ToListAsync();
}
```

#### 禁止手动赋值
**禁止**在控制器或服务中手动设置审计字段：
```csharp
// ❌ 禁止：手动设置
entity.CreatedBy = _tenantContext.GetCurrentUserId();
entity.CreatedAt = DateTime.UtcNow;

// ✅ 正确：PlatformDbContext 自动维护
await _context.Set<Entity>().AddAsync(entity);
await _context.SaveChangesAsync();
```

### 6.3 中间件与响应

#### 中间件顺序（固定）
```
UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → UseMiddleware<ActivityLogMiddleware> → UseMiddleware<ResponseFormattingMiddleware> → MapControllers
```

#### 统一响应格式
```json
{
  "success": true,
  "data": { ... },
  "timestamp": 1680000000
}
```

### 6.4 分页规范

#### 统一参数命名

| 参数 | 说明 | 禁止使用 |
|------|------|----------|
| `page` | 当前页码（从 1 开始） | `current`、`pageIndex` |
| `pageSize` | 每页数量 | `limit`、`size` |

#### 后端实现
```csharp
var pagedResult = _context.Set<User>()
    .Where(u => u.IsActive)
    .ToPagedList(request);  // 自动搜索 + 排序 + 分页
```

> **[强制]** 分页必须使用 `ToPagedList()`，禁止手动 `.PageResult()` 或手动 `Skip/Take`。

### 6.5 实时通信 SSE

#### SSE 连接建立
```csharp
[HttpGet("sse")]
public async Task SseConnect()
{
    var userId = await _tenantContext.GetCurrentUserIdAsync();
    var connectionId = Guid.NewGuid().ToString();
    await _connectionManager.AddConnectionAsync(userId, connectionId);
    Response.ContentType = "text/event-stream";
    return new EmptyResult();
}
```

#### 事件格式
```
event: Connected\ndata: {"connectionId":"xxx"}\n\n
event: Message\ndata: {"content":"hello"}\n\n
```

### 6.6 批量查询规范（N+1 防护）

**[强制]** 严禁在循环内调用单条查询，必须使用批量查询方法：

```csharp
// ✅ 正确：批量查询
var allUserIds = tasks.SelectMany(t => new[] { t.CreatedBy, t.AssignedTo }).Distinct();
var userMap = await _userService.GetUsersByIdsAsync(allUserIds);
return tasks.Select(t => ConvertWithCache(t, userMap)).ToList();

// ❌ 错误：N+1 查询
foreach (var task in tasks)
{
    var user = await _userService.GetUserByIdAsync(task.CreatedBy);  // N 次查询
}
```

### 6.7 类型命名规范

#### 禁止使用 "Dependency" 单词
```csharp
// ❌ 错误：名称包含 Dependency
public interface ITaskDependencyService { }

// ✅ 正确：使用其他同义词
public interface ITaskRelationService { }
```

#### 禁止 using 别名
```csharp
// ❌ 错误：类型别名
using TaskModel = Platform.ApiService.Models.WorkTask;

// ✅ 正确：直接使用完整类型名
var tasks = await _context.Set<WorkTask>().ToListAsync();
```

### 6.8 异常处理规范

**[强制]** 控制器和服务层出现错误时，**直接抛出异常**，禁止吞掉异常或手动返回错误响应：

```csharp
// ✅ 正确：直接抛出异常
public async Task<User?> GetUserByIdAsync(string id)
{
    var user = await _context.Set<User>().FindAsync(id);
    if (user == null)
        throw new KeyNotFoundException($"用户 {id} 不存在");
    return user;
}

// ❌ 禁止：手动返回错误响应或吞掉异常
public async Task<IActionResult> GetUserById(string id)
{
    try
    {
        var user = await _userService.GetUserByIdAsync(id);
        return Ok(user);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = ex.Message });  // ❌ 禁止
    }
}
```

**原因**：
- 全局异常处理中间件 `UseExceptionHandler` 会统一捕获并格式化异常
- 避免大量重复的 try-catch 代码
- 保持控制器层职责单一

## 7. 前端开发规范（Admin）

### 7.1 路由与菜单

#### 路由配置
```typescript
// config/routes.ts
export default [
  {
    path: '/task-management',
    name: 'task-management', // 必须与后端 RequireMenu 对应
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

### 7.2 服务层封装

**[强制]** 所有 HTTP 请求必须通过 `@umijs/max` 的 `request` 封装：

```typescript
import { request } from '@umijs/max';
import type { ApiResponse, PagedResult, PageParams } from '@/types';

export async function getUsers(params: PageParams) {
  return request<ApiResponse<PagedResult<User>>>('/api/users', { params });
}
```

### 7.3 类型安全

**[强制]** 禁止使用 `any` 类型：

```typescript
// ❌ 禁止
const handleSubmit = (values: any) => {};

// ✅ 正确
interface TaskFormValues {
  taskName: string;
  priority?: number;
}
const handleSubmit = (values: TaskFormValues) => {};
```

> **历史遗留**：现有代码中的 `any` 类型按需逐步替换，新开发代码必须定义具体类型。

### 7.4 统一 API 响应类型

所有 API 相关类型统一定义在 `@/types/api-response.ts`：

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface PagedResult<T> {
  queryable: T[];
  currentPage: number;
  pageSize: number;
  rowCount: number;
  pageCount: number;
}
```

### 7.5 页面风格

#### 列表页面结构
```tsx
<PageContainer>
  {/* 统计卡片 */}
  <Card>...</Card>
  {/* 数据表格 */}
  <ProTable />
</PageContainer>
```

#### ProTable 配置
```tsx
<ProTable
  request={async (params) => {
    const res = await api.list({ page: params.current, pageSize: params.pageSize });
    return { data: res.data?.queryable || [], total: res.data?.rowCount || 0 };
  }}
  columns={columns}
  scroll={{ x: 'max-content' }}
/>
```

### 7.6 分页与前端行为

| 参数 | 后端默认值 | 前端行为 |
|------|-----------|----------|
| `page` | `1` | **必须显式传值** |
| `pageSize` | `10` | **允许前端传值**，ProTable 支持自定义每页数量 |

```typescript
// ✅ 正确：使用空对象（使用后端默认值）
await getUserList({})

// ✅ 正确：只需指定 page
await getUserList({ page: 2 })

// ✅ 正确：ProTable 分页可自定义 pageSize
await getUserList({ page: 1, pageSize: params.pageSize })
```

### 7.6.1 ProTable pageSize 传递规范

**[强制]** 所有使用 ProTable 的列表页面，必须正确提取并传递 `pageSize` 参数：

```typescript
// PageParams 类型定义
export interface PageParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}

// ✅ 正确：从 params 解构并传递给 PageParams
request={async (params: any) => {
  const { current, pageSize } = params;  // 必须解构
  const res = await api.list({ page: current, pageSize } as PageParams);
  return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
}}

// ❌ 错误：解构了 pageSize 但未传递
const { current, pageSize } = params;
const res = await api.list({ page: current } as PageParams);  // pageSize 丢失

// ❌ 错误：直接使用 params 跳过 pageSize
const res = await api.list({ page: params.current } as PageParams);  // pageSize 可能丢失
```

**常见错误模式**：
| 错误写法 | 正确写法 |
|---------|---------|
| `{ page: current }` | `{ page: current, pageSize }` |
| `api.list({ page: current, search })` | `api.list({ page: current, pageSize, search })` |
| 解构后忘记传递 | 解构后必须传递 |

> **检查工具**：使用 grep 搜索 `{ current, pageSize }` 确保所有 ProTable 都正确传递。

### 7.7 前端开发标准（密码本模块）

`src/pages/password-book` 是所有列表页面的**开发标准参考**：

- 使用 `ProTable` + `ModalForm` 组件
- API 直接内联在页面中，不单独创建服务文件
- 状态管理使用 `set()` 辅助函数
- 编辑表单使用 `key` 强制重新挂载

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
| 后端分页类型 | `Platform.ServiceDefaults/Models/PagedResult.cs` |
| 后端分页扩展 | `Platform.ServiceDefaults/Extensions/QueryableExtensions.cs` |
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 前端统一类型 | `Platform.Admin/src/types/api-response.ts` |
| 页面开发标准 | `Platform.Admin/src/pages/password-book/index.tsx` |

## 10. 变更与维护

- **通用规则同步**：当项目代码修改时出现新的通用规则，需同步更新到 AGENTS.md。
- 各子文档如有原则重复，优先合并至本规范。
- 发现实现与本规范不符时，优先以 AGENTS.md 和本规范为准，及时修订文档与代码。
- 所有新功能迭代前，务必查阅本规范以确保架构走向绝不偏离当前轨辙。