# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件是 Aspire Admin 项目的**导航入口**。完整的开发规范已拆分为模块化文档，详见下方索引。
> AI 助手在处理任务时，应根据任务类型**按需加载**对应的模块文档，避免一次性加载全部内容。

## 快速导航

| 任务类型 | 应加载的文档 | 说明 |
|---------|-------------|------|
| **了解项目概况** | [核心架构](#1-核心架构与技术栈) | 技术栈、项目结构、业务模块 |
| **后端开发** | [后端规范](docs/agents/modules/backend.md) | 控制器、服务层、数据库操作规范 |
| **前端开发** | [前端规范](docs/agents/modules/frontend.md) | React 页面、API 调用、国际化 |
| **MCP 服务** | [MCP 集成](docs/agents/modules/mcp.md) | MCP Handlers、AI 工具调用 |
| **测试相关** | [测试规范](docs/agents/modules/testing.md) | Playwright 测试、测试账号 |
| **移动端/小程序** | [多端规范](docs/agents/modules/mobile.md) | Expo App、微信小程序 |
| **小科 AI** | [AI 聊天系统](docs/agents/modules/xiaoke.md) | 聊天服务、LLM 集成 |
| **Git 提交** | [交互规范](#2-交互与-git-提交规范) | 提交格式、自动推送 |

## 1. 核心架构与技术栈

本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB`
- **前端后台**：`React 19.2.5` + `Ant Design 6.3.5` + `UmiJS 4.6.42`
- **移动端应用**：`Expo 54.0.31` + `React Native 0.83.1`
- **微信小程序**：`Platform.MiniApp` 微信原生开发
- **数据库**：MongoDB.EntityFrameworkCore + MongoDB.Driver

### 核心项目结构

- `Platform.AppHost/AppHost.cs`：微服务资源编排入口
- `Platform.ApiService`：后端核心业务网关（43 个控制器，213+ 服务文件）
- `Platform.ServiceDefaults`：共享基础设施层
- `Platform.Admin` / `Platform.App` / `Platform.MiniApp`：多端前端应用

### 核心业务模块

| 模块 | 后端控制器 | 前端页面 | 说明 |
|------|-----------|---------|------|
| **工作流** | WorkflowController | workflow/ | 流程定义、实例、审批 |
| **IoT 物联网** | IoTController | iot-platform/ | 网关、设备、数据点 |
| **园区管理** | ParkAsset/Tenant/Visit/InvestmentController | park-management/ | 资产、租户、招商 |
| **密码本** | PasswordBookController | password-book/ | 安全密码管理 |
| **任务项目** | Task/ProjectController | task-management/ | 任务、项目管理 |
| **小科 AI** | ChatAi/XiaokeConfigController | xiaoke-management/ | AI 对话、配置 |

> **完整模块列表**见：[后端规范 - 6.1 控制器规范](docs/agents/modules/backend.md#61-控制器规范)

## 2. 交互与 Git 提交规范

### 🤖 会话与 Git 提交

- **全面中文交互**：所有代码注释、README、回复、Git 提交信息必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`）。

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

> **注意**：如果没有任何变更，不需要执行提交操作。

## 3. 相关代码位置

| 模块 | 位置 |
|------|------|
| 后端分页类型 | `Platform.ServiceDefaults/Models/ProTableRequest.cs` |
| 后端分页扩展 | `Platform.ServiceDefaults/Extensions/QueryableExtensions.cs` |
| 自动 DI 扫描 | `Platform.ServiceDefaults/Extensions/ServiceDiscoveryExtensions.cs` |
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 实体基类 | `Platform.ServiceDefaults/Models/BaseEntity.cs` |
| 错误码常量 | `Platform.ServiceDefaults/Models/ErrorCode.cs` |
| 前端统一类型 | `Platform.Admin/src/types/api-response.ts` |
| 前端错误码常量 | `Platform.Admin/src/constants/errorCodes.ts` |
| 标准页面模板 | `Platform.Admin/src/templates/StandardPageTemplate.tsx` |
| 页面开发标准 | `Platform.Admin/src/pages/password-book/index.tsx` |

## 4. 变更与维护

- **通用规则同步**：当项目代码修改时出现新的通用规则，需同步更新到对应的模块文档。
- 各子文档如有原则重复，优先合并至本规范。
- 发现实现与本规范不符时，优先以模块文档和本规范为准，及时修订文档与代码。
- 所有新功能迭代前，务必查阅相关模块文档以确保架构走向不偏离。

## 附录：模块文档索引

| 文档 | 路径 | 内容 |
|------|------|------|
| **后端开发规范** | `docs/agents/modules/backend.md` | 控制器、服务层、数据库、权限、异常处理、SSE |
| **前端开发规范** | `docs/agents/modules/frontend.md` | React 页面、路由、API、状态管理、表单、国际化 |
| **MCP 服务集成** | `docs/agents/modules/mcp.md` | MCP Handlers、工具调用、AI 能力投射 |
| **测试规范** | `docs/agents/modules/testing.md` | Playwright 测试、测试账号、调试技巧 |
| **移动端与小程序** | `docs/agents/modules/mobile.md` | Expo App、微信小程序、API 对接 |
| **小科 AI 系统** | `docs/agents/modules/xiaoke.md` | 聊天服务、LLM 集成、消息流程 |
| **架构与代码位置** | `docs/agents/modules/architecture.md` | 项目结构、技术栈、已重构页面清单 |

> **使用建议**：AI 助手在处理任务时，先阅读本文档确定任务类型，再加载对应的模块文档，避免一次性加载全部内容导致上下文超限。
