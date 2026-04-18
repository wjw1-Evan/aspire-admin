# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件定义了 Aspire Admin 项目的最高准则。AI 助手在处理本项目的任何任务时，**必须**优先读取并完全遵守此文档的规范。本指南旨在建立通用的开发范式，确保系统各模块的一致性、安全性与可维护性。

## 1. 核心架构与技术栈
本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB` (通过 MongoDB.Entities 与 DbContext 提供基础设施层)
- **前端后台**：`React 19.2.5` + `Ant Design 6.3.5` + `UmiJS 4.6.42`
- **移动端应用**：`Expo 54.0.31` + `React Native 0.83.1` 跨端 App
- **微信小程序**：微信原生开发，轻量级多端扩展
- **基础设施**：OpenAI/MCP 服务、JWT 认证、Redis (可选集成的缓存/消息流)
- **数据库驱动**：MongoDB.Driver + MongoDB.Entities + Entity Framework Core (用于查询抽象)

**核心项目结构**：
- `Platform.AppHost`：Aspire 资源编排中心，统筹微服务、数据库、网关及外部资源。
- `Platform.ApiService`：统一的后端核心业务层，包含所有 Controller、Service 及逻辑 Handler。
- `Platform.ServiceDefaults`：共享的基础设施层，定义了 `BaseEntity`、`BaseApiController` 及通用的扩展方法。
- `Platform.Admin` / `Platform.App` / `Platform.MiniApp`：多端前端应用。

## 2. 交互与 Git 提交规范

### 🤖 会话与项目规范
- **全面中文交互**：所有代码注释、README、给用户的回复，以及 **Git 提交信息**，必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`，`docs: 更新xxx`）。
- **零警告红线**：禁止产生任何编译警告。代码必须整洁，删除未使用的引用、变量和方法。

### 📝 自动化提交流程
修改代码成功后，**必须**自动执行以下操作：
1. **Lint 检查**：`cd Platform.Admin && npm run lint` (前端变动时)
2. **Git 提交**：`git add -A && git commit -m "<类型>: <中文描述>"`
3. **推送代码**：`git push origin main`

## 3. 后端开发强制红线 (Backend Redlines)

### 🗄️ 数据库与模型
- **禁止绕过 DbContext**：所有业务层必须通过注入 `DbContext` 并使用 `_context.Set<T>()` 进行操作。严禁直接注入 MongoDB 原始驱动接口。
- **自动审计**：严禁手动设置 `CreatedAt/UpdatedAt/CreatedBy/UpdatedBy` 或 `IsDeleted`。这些字段由 `PlatformDbContext` 自动维护。
- **零配置软删除**：调用 `DbContext.Remove()` 时，系统会自动执行软删除，业务代码无需关心底层逻辑。

### 🏢 多租户与安全
- **隔离安全**：严禁直读 JWT Claims 中的 `companyId` 或 `roles`。必须通过 `ITenantContext` 获取当前企业上下文。
- **权限校验**：所有敏感或业务操作必须添加 `[RequireMenu("menu-name")]` 注解。
- **用户识别**：优先使用 `BaseApiController` 提供的 `RequiredUserId` 属性。

### 📡 接口与性能
- **响应包装**：所有 API 必须返回 `ApiResponse<T>` 格式数据，使用基类 `Success()` 方法包装。
- **防 N+1 查询**：严禁在循环内调用数据库查询方法。必须通过批量查询（In 查询）并结合内存 Map 进行数据组装。
- **强制分页**：查询列表必须使用 `ToPagedList(request)` 扩展方法。严禁手动使用 `.Skip()` 和 `.Take()`。

## 4. MCP 服务与 AI 投射
本项目内置了 21 个 MCP Tool Handlers，通过 Model Context Protocol 向外提供业务能力。AI 助手在处理复杂跨模块任务时，应优先检查是否有现成的 MCP 工具支持。

| MCP Handler 领域 | 主要功能 |
|-----------------|---------|
| 核心业务 | Task (任务), Project (项目), Workflow (工作流), User (用户) |
| 资源管理 | IoT (物联网), Park (园区), Knowledge (知识库), Document (公文) |
| 系统服务 | System (系统监控), Notification (通知), Notice (公告), Statistics (统计) |
| 工具服务 | PasswordBook (密码本), WebScraper (网页抓取), FileShare/Version (云盘) |
| 组织协作 | Organization (组织), Form (表单), Menu (菜单), Social (社交), JoinRequest (申请) |

## 5. 后端开发标准 (C#)

### 5.1 控制器 (Controller)
- **继承准则**：必须继承 `BaseApiController`。
- **职责范围**：仅负责路由、参数校验、权限描述及服务调用。

```csharp
[ApiController]
[Route("api/xxx")]
public class XxxController : BaseApiController {
    [HttpGet("list")]
    [RequireMenu("xxx-view")]
    public async Task<IActionResult> GetList([FromQuery] ProTableRequest request) {
        var result = await _xxxService.GetListAsync(request);
        return Success(result);
    }
}
```

### 5.2 服务层 (Service)
- **分页逻辑**：使用 `query.ToPagedList(request)`。它的内置逻辑会自动处理 JSON 格式的 `Sort` 和 `Filter`，并支持对所有字符串字段的模糊搜索。

```csharp
public async Task<PagedResult<XxxDto>> GetListAsync(ProTableRequest request) {
    var query = _context.Set<XxxEntity>().AsQueryable();
    var paged = query.ToPagedList(request);
    var dtos = await MapToDtosAsync(await paged.Queryable.ToListAsync());
    return paged.WithData(dtos); // 使用 WithData 扩展保持分页元数据
}
```

## 6. 前端开发标准 (React Admin)

### 6.1 页面开发范式 (Single-File High Cohesion)
对于简单的 CRUD 模块，推荐采用**单文件高内聚**模式（参考 `password-book/index.tsx`），减少文件碎片。
- **API 封装**：在组件文件顶部定义一个 `api` 对象，包含所有请求方法。
- **类型定义**：在页面内定义主要的 `Interface`，并使用 `@/types` 中的全局类型。

### 6.2 列表页标准组件
- **ProTable**：核心组件，统一关闭自带的 `search` 模式。
- **SearchBar**：在 `toolBarRender` 中整合专用的 `SearchBar` 组件或 `Input.Search` 进行全局搜索。
- **ModalForm**：用于新增和编辑，保持 UI 简洁直观。

```typescript
const api = {
  list: (params: any) => request<ApiResponse<PagedResult<Entry>>>('/apiservice/api/xxx/list', { params }),
};

const XxxPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [search, setSearch] = useState('');

  return (
    <ProTable
      actionRef={actionRef}
      request={async (params, sort, filter) => {
        const res = await api.list({ ...params, search, sort, filter });
        return { data: res.data?.queryable || [], total: res.data?.rowCount || 0, success: res.success };
      }}
      search={false} // 强制关闭默认搜索栏
      toolBarRender={() => [
        <Input.Search key="search" onSearch={(v) => { setSearch(v); actionRef.current?.reload(); }} />
      ]}
    />
  );
};
```

## 7. Aspire 与资源管理
- **重启机制**：修改 `Platform.AppHost` 或基础服务的 `appsettings.json` 后，必须告知用户重启 `aspire run`。
- **日志分析**：调试时优先使用 `list traces` 和 `list console logs` 工具。

---
**提示**：本指南为动态文档，应随着项目演进不断优化。如果发现代码库中出现了更优的通用模式，请及时通知并更新本指南。
