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
// ✅ 正确：使用基类提供的方法
protected string? CurrentUserId => GetCurrentUserId();
protected string RequiredUserId { get; }

// ✅ 正确：通过 ITenantContext 获取
var companyId = await GetCompanyIdAsync();
var isAdmin = await _tenantContext.IsAdminAsync();

// ❌ 禁止：直读 JWT Claims
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
        _context = context;
        _logger = logger;
    }

    public async Task<XxxEntity> CreateAsync(CreateXxxRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var entity = new XxxEntity
        {
            Name = request.Name,
            UserId = userId
        };

        await _context.Set<XxxEntity>().AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<XxxEntity?> GetByIdAsync(string id, string userId)
    {
        return await _context.Set<XxxEntity>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<PagedResult<XxxEntity>> GetListAsync(ProTableRequest request, string userId)
    {
        var query = _context.Set<XxxEntity>().Where(x => x.UserId == userId);
        return query.ToPagedList(request);
    }

    public async Task<XxxEntity?> UpdateAsync(string id, UpdateXxxRequest request, string userId)
    {
        var entity = await _context.Set<XxxEntity>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        if (entity.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此资源");

        entity.Name = request.Name;
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<bool> DeleteAsync(string id, string userId)
    {
        var entity = await _context.Set<XxxEntity>().FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        if (entity.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此资源");

        _context.Set<XxxEntity>().Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }
}
```

#### 数据访问规范
- 服务层注入 `DbContext` 并使用 `_context.Set<T>()` 进行数据操作
- 禁止在控制器层操作数据库
- 审计字段（CreatedAt/UpdatedAt/CreatedBy/UpdatedBy）由 `PlatformDbContext` 自动维护

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

```csharp
// ✅ 单个菜单
[HttpPost]
[RequireMenu("task-management")]

// ✅ 多个菜单（满足其一即可）
[HttpGet("list")]
[RequireMenu("workflow-list", "workflow-monitor")]
```

### 6.4 分页规范

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

### 6.5 异常处理规范

**[强制]** 控制器和服务层出现错误时，**直接抛出异常**：

```csharp
// ✅ 正确：直接抛出异常
if (entity == null)
    throw new KeyNotFoundException("资源不存在");

if (!hasPermission)
    throw new UnauthorizedAccessException("无权访问此资源");

if (string.IsNullOrEmpty(name))
    throw new ArgumentException("名称不能为空", nameof(name));
```

**原因**：
- 全局异常处理中间件统一捕获并格式化异常
- 避免大量重复的 try-catch 代码
- 保持控制器层职责单一

### 6.6 批量查询规范（N+1 防护）

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

### 6.7 类型命名规范

| 规范 | 示例 |
|------|------|
| 禁止使用 "Dependency" | ✅ `IRelationService` ❌ `IDependencyService` |
| 禁止 using 别名 | ✅ `Set<WorkTask>()` ❌ `using X = WorkTask;` |
| 请求/响应类后缀 | `CreateXxxRequest`、`XxxResponse`、`XxxDto` |
| 实体类后缀 | `XxxEntity`、`PasswordBookEntry` |

### 6.8 统一响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": null,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "traceId": "xxx"
}
```

控制器返回：
```csharp
return Success(entity);           // 返回数据
return Success(true);             // 返回成功
return Success(result, "操作成功"); // 返回数据 + 消息
```

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

### 7.2 API 内联封装

**[强制]** API 直接内联在页面组件中，不单独创建服务文件：

```typescript
import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';

interface Entry {
  id: string;
  platform: string;
  account: string;
  // ...其他字段
}

const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
};
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

> **注意**：分页参数直接使用 `any` 类型，ProTable 会自动传递 `params`、`sort`、`filter` 参数。

### 7.5 列表页面标准结构

参考 `src/pages/password-book/index.tsx`：

```typescript
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { request } from '@umijs/max';
import { Tag, Space, Button, Popconfirm } from 'antd';
import { Drawer, Form, Input } from 'antd';
import { PageContainer, ModalForm, ProDescriptions, ProTable, ProColumns, ActionType, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

interface Entry {
  id: string;
  platform: string;
  account: string;
  url?: string;
  category?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
}

interface Stats {
  totalEntries: number;
  categoryCount: number;
  tagCount: number;
  recentUsedCount: number;
}

const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/password-book/list', { params }),
  get: (id: string) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`),
  delete: (id: string) => request<ApiResponse<void>>(`/apiservice/api/password-book/${id}`, { method: 'DELETE' }),
  create: (data: Partial<Entry>) => request<ApiResponse<Entry>>('/apiservice/api/password-book', { method: 'POST', data }),
  update: (id: string, data: Partial<Entry>) => request<ApiResponse<Entry>>(`/apiservice/api/password-book/${id}`, { method: 'PUT', data }),
  statistics: () => request<ApiResponse<Stats>>('/apiservice/api/password-book/statistics'),
};

const PasswordBook: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [state, setState] = useState({
    statistics: null as Stats | null,
    editingEntry: null as Entry | null,
    formVisible: false,
    detailVisible: false,
    viewingId: '',
    search: '' as string,
  });
  const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

  const loadStatistics = useCallback(() => {
    api.statistics().then(r => { if (r.success && r.data) set({ statistics: r.data }); });
  }, [set]);

  useEffect(() => { loadStatistics(); }, [loadStatistics]);

  const columns: ProColumns<Entry>[] = [
    { title: '平台', dataIndex: 'platform', key: 'platform', sorter: true },
    { title: '账号', dataIndex: 'account', key: 'account', sorter: true },
    { title: '分类', dataIndex: 'category', key: 'category', sorter: true, render: (dom) => dom ? <Tag color="blue">{dom as string}</Tag> : '-' },
    { title: '标签', dataIndex: 'tags', render: (dom) => dom && typeof dom === 'object' && 'length' in dom
      ? <Space size={[0, 4]} wrap>{(dom as string[]).map((t) => <Tag key={t}>{t}</Tag>)}</Space> : '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', sorter: true, valueType: 'dateTime' },
    {
      title: '操作', key: 'action', valueType: 'option', fixed: 'right', width: 180,
      render: (_, r) => (
        <Space size={4}>
          <Button variant="link" color="cyan" size="small" icon={<EyeOutlined />} onClick={() => set({ viewingId: r.id, detailVisible: true })}>查看</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => set({ editingEntry: r, formVisible: true })}>编辑</Button>
          <Popconfirm title={`确定删除「${r.platform}」？`} onConfirm={async () => { await api.delete(r.id); actionRef.current?.reload(); loadStatistics(); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleFinish = async (values: Record<string, any>) => {
    const res = state.editingEntry ? await api.update(state.editingEntry.id, values) : await api.create(values);
    if (res.success) { set({ formVisible: false, editingEntry: null }); actionRef.current?.reload(); loadStatistics(); }
    return res.success;
  };

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        headerTitle={
          <Space size={24}>
            <Space>密码本</Space>
            <Space size={12}>
              <Tag color="blue">总数 {state.statistics?.totalEntries || 0}</Tag>
              <Tag color="green">分类 {state.statistics?.categoryCount || 0}</Tag>
              <Tag color="orange">标签 {state.statistics?.tagCount || 0}</Tag>
            </Space>
          </Space>
        }
        request={async (params: any, sort: any, filter: any) => {
          const res = await api.list({ ...params, search: state.search, sort, filter });
          return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
        }}
        columns={columns}
        rowKey="id"
        search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Input.Search key="search" placeholder="搜索..." allowClear value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            onSearch={(value) => { set({ search: value }); actionRef.current?.reload(); }}
            style={{ width: 260, marginRight: 8 }}
          />,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => set({ editingEntry: null, formVisible: true })}>新建</Button>,
        ]}
      />

      <ModalForm
        key={state.editingEntry?.id || 'create'}
        title={state.editingEntry ? '编辑密码本' : '新建密码本'}
        open={state.formVisible}
        onOpenChange={(open) => { if (!open) set({ formVisible: false, editingEntry: null }); }}
        initialValues={state.editingEntry || undefined}
        onFinish={handleFinish}
        autoFocusFirstInput
        width={600}
      >
        <ProFormText name="platform" label="平台名称" placeholder="请输入平台名称" rules={[{ required: true, message: '请输入平台名称' }]} />
        <ProFormText name="account" label="账号" placeholder="请输入账号" rules={[{ required: true, message: '请输入账号' }]} />
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        <ProFormText name="url" label="网址" placeholder="请输入网址" />
        <ProFormSelect name="category" label="分类" placeholder="选择或输入分类" showSearch allowClear mode="tags" />
        <ProFormSelect name="tags" label="标签" placeholder="输入标签后按回车" mode="tags" />
        <ProFormTextArea name="notes" label="备注" placeholder="请输入备注" />
      </ModalForm>

      <Drawer title="密码本详情" placement="right" open={state.detailVisible}
        onClose={() => set({ detailVisible: false, viewingId: '' })} size="large">
        <DetailContent id={state.viewingId} />
      </Drawer>
    </PageContainer>
  );
};

const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => { if (id) api.get(id).then(r => { if (r.success && r.data) setEntry(r.data); }); }, [id]);
  if (!entry) return null;
  return (
    <ProDescriptions column={1} bordered size="small">
      <ProDescriptions.Item label="平台"><strong>{entry.platform}</strong></ProDescriptions.Item>
      <ProDescriptions.Item label="账号">{entry.account}</ProDescriptions.Item>
      <ProDescriptions.Item label="分类">{entry.category ? <Tag color="blue">{entry.category}</Tag> : '-'}</ProDescriptions.Item>
      <ProDescriptions.Item label="标签">
        {entry.tags?.length ? <Space wrap>{entry.tags.map(t => <Tag key={t}>{t}</Tag>)}</Space> : '-'}
      </ProDescriptions.Item>
      <ProDescriptions.Item label="创建时间">{entry.createdAt}</ProDescriptions.Item>
      {entry.notes && <ProDescriptions.Item label="备注" span={1}>{entry.notes}</ProDescriptions.Item>}
    </ProDescriptions>
  );
};
```

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
| `page` | 当前页码 | 必须显式传递 |
| `pageSize` | 每页数量 | ProTable 自动传递 |
| `search` | 搜索关键词 | 存储在 state 中 |

```typescript
const { current, pageSize, ...filters } = params;
const res = await api.list({ page: current, pageSize, search: state.search });
return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
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
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 前端统一类型 | `Platform.Admin/src/types/api-response.ts` |
| 页面开发标准 | `Platform.Admin/src/pages/password-book/index.tsx` |

## 10. 变更与维护

- **通用规则同步**：当项目代码修改时出现新的通用规则，需同步更新到 AGENTS.md。
- 各子文档如有原则重复，优先合并至本规范。
- 发现实现与本规范不符时，优先以 AGENTS.md 和本规范为准，及时修订文档与代码。
- 所有新功能迭代前，务必查阅本规范以确保架构走向绝不偏离当前轨辙。
