# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件定义了 Aspire Admin 项目的最高准则。AI 助手在处理本项目的任何任务时，**必须**优先读取并完全遵守此文档的规范。

## 1. 核心架构与技术栈
本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB`
- **前端后台**：`React 19` + `Ant Design 6` + `UmiJS 4`
- **移动端应用**：`Expo 54` 跨端 App，内置原生通知
- **微信小程序**：`Platform.MiniApp` 微信原生开发，轻量级多端扩展
- **基础设施**：`Redis` 缓存、`OpenAI/MCP` 服务、`JWT/国密算法` 加解密认证

**核心项目结构**：
- `Platform.AppHost/AppHost.cs`：所有微服务、数据库、Redis 资源的统筹编排入口。
- `Platform.ApiService`：统一的后端核心业务网关与逻辑层。
- `Platform.ServiceDefaults`：共享的扩展、实体基类及 `IDataFactory` 数据工厂层。
- `Platform.Admin` / `Platform.App` / `Platform.MiniApp`：多端前端应用。

## 2. 交互与代码流基础纪律

### 🤖 会话与 Git 提交
- **全面中文交互**：所有代码注释、README、给用户的回复、以及 **Git 提交信息**，必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`，`docs: 更新xxx`）。

### 🚀 Aspire 资源调拨
- 修改 `Platform.AppHost/AppHost.cs` 或 `appsettings.json` 后，必须指导用户重启 `aspire run`。
- 请勿向用户推荐使用过时的 Aspire workload。
- 使用 MCP 提供的 `list resources` / `list integrations` 等工具排查微服务拉起问题。
- 各个服务控制台输出均通过 `list structured logs` / `list console logs` 工具获取。
- 调试分布式错误时，优先使用 `list traces` 查找异常链路。

## 3. 后端开发强制红线 (Backend Redlines)

### 🗄️ 数据库操作：IDataFactory 铁律
- **严禁**直接注入或操作 `IMongoCollection<T>` 或 `IMongoDatabase`。
- 所有数据的新增、查询、修改、删除**必须**通过注入 `IDatabaseOperationFactory<T>` 来完成。
- **原因**：工厂模式底层封装了多租户（`CompanyId`）自动过滤、`CreatedAt/UpdatedAt` 等审计字段的自动填充以及软删除机制。如果绕过，将导致数据污染或跨租户越权。

### 🏢 多租户与上下文安全
- 除了用户身份主键 `userId` 以外，任何企业级上下文（企业的 `companyId` / 用户拥有的菜单权限 / 角色），**严禁**直接从 JWT claim 中读取解包。
- **正确获取方式**：统一通过注入 `ITenantContext` 读取当前操作人在当前企业下的属性约束。

### 🔐 鉴权策略
- **移除旧版判断**：禁止在控制器层再使用过时的 `HasPermission()` 等方法。
- **唯一正确手段**：全部 API 操作需打上 `[RequireMenu("menu-action-name")]` 属性（来自 `Platform.ApiService.Attributes`）来进行基于菜单按钮层级的鉴权。

### 📡 接口与实时通信
- 所有常规 HTTP 接口返回数据，必须被包装为 `ApiResponse<T>`，并默认开启 camelCase （首字母小写）且忽略 Null 返回。
- 后端不再向前端使用 SignalR 发送实时数据或通知事件，必须改为使用 **SSE (Server-Sent Events)** 推送（连接管理器为 `IChatSseConnectionManager`）。对于 SSE 响应管道，需注意跳过中间件格式化。

## 4. MCP 服务与 AI 能力整合

本项目在 `Platform.ApiService` 中，包含了一个强大的单一类 `McpService.cs`（及 `Mcp/` 下的各 Handler），它通过 Model Context Protocol 向外层 AI（不仅限于本 Copilot）提供系统内深度业务能力投射。

- **不要重复造轮子**：当面临读取【工作流进度】、【IoT设备状态】或【园区资产查询】等复杂任务时，AI 助手应优先分析项目中是否已有现成的 MCP Handlers 支持提取能力。
- 本项目不仅是一个应用，它自身也是一个巨大的 AI 知识源提供者。

## 5. 更多领域专项规范参阅

如果需要深入到前端、微服务或移动端的开发，请务必提前通过工具读取 `docs/rules/` 目录下的规则卡片：

| 分类 | 路径 | 说明 |
|------|------|------|
| 通用原则 | `docs/rules/00-通用原则.md` | 全局开发准则 |
| 后端规范 | `docs/rules/backend/` | API 服务开发规范 |
| Admin 前端 | `docs/rules/frontend-admin/` | React Admin 后台规范 |
| 移动端 | `docs/rules/frontend-app/` | Expo 移动端规范 |

> 每次开展复杂的新功能迭代前，务必查阅上述规则卡以确保架构走向绝不偏离当前轨辙。