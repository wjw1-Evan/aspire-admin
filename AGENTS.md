# AI 助手 / Copilot 全局指南

> [!IMPORTANT]
> 本文件是 Aspire Admin 项目的**导航入口**。完整的开发规范已拆分为模块化文档，详见下方索引。
> AI 助手在处理任务时，应根据任务类型**按需加载**对应的模块文档，避免一次性加载全部内容。

---

## 🚀 快速开始：常用任务路径

不知道从哪开始？根据你的目标直接跳转：

| 你的目标 | 需要加载的文档 | 参考示例 |
|----------|-------------|---------|
| **新做一个页面** | [前端规范](docs/agents/modules/frontend.md) + [架构规范](docs/agents/modules/architecture.md) | `密码本页面` → `src/pages/password-book/index.tsx`（支持点击行弹详情） |
| **新增一个 API** | [后端规范](docs/agents/modules/backend.md) | `PasswordBookController.cs` |
| **给页面加国际化** | [前端规范 → 7.8](docs/agents/modules/frontend.md#78-国际化-i18n) | `src/locales/zh-CN/modules/` |
| **写一个测试** | [测试规范](docs/agents/modules/testing.md) | `tests/e2e/task/` |
| **对接移动端** | [多端规范](docs/agents/modules/mobile.md) | `Platform.App/services/api.ts` |
| **给 AI 加个工具** | [MCP 集成](docs/agents/modules/mcp.md) + [后端规范](docs/agents/modules/backend.md) | `McpToolHandler` 模板 |
| **改小科 AI 行为** | [小科 AI 系统](docs/agents/modules/xiaoke.md) | `ChatAiService.cs` |
| **做跨模块功能** | [架构规范](docs/agents/modules/architecture.md) | 理解服务之间的调用关系 |
| **审查代码质量** | [测试规范](docs/agents/modules/testing.md) | 跑 Playwright E2E |

---

## 💡 UX 设计原则（所有功能的通用要求）

以下原则适用于项目中**所有**功能模块的开发。每个模块文档中会有更具体的 UX 指导。

### 1. 状态可见性

用户在任何时候都应该知道系统在做什么：

| 状态 | 必须呈现 | 示例 |
|------|---------|------|
| **加载中** | Skeleton / Spin + 文案提示 | `Skeleton` 组件 + "正在加载..." |
| **空状态** | 插图 + 引导文案 + 操作按钮 | "还没有数据，点击新建" |
| **错误状态** | 友好提示 + 重试按钮 | "网络异常，请稍后重试" |
| **成功状态** | 轻提示 + 下一步引导 | "创建成功，是否继续添加？" |
| **无权限** | 说明原因 + 联系管理员指引 | "暂无权限，请联系管理员开通" |

### 2. 操作反馈

每个用户操作必须有即时反馈：

- **点击** → 0.1s 内给出视觉反馈（按钮 loading、颜色变化）
- **提交** → 显示进度或成功/失败提示
- **删除** → 二次确认（`Popconfirm`），可撤销
- **批量操作** → 显示处理进度和结果统计

### 3. 容错与恢复

- 表单输入：实时校验（失焦时触发，不打断输入）
- 网络异常：自动重试机制（Token 刷新、请求重试）
- 误操作：提供撤销/恢复能力
- 数据保存：关键操作支持自动草稿

### 4. 一致性

- 同一类操作在全局使用相同的交互模式
- 列表页、详情页、表单页的布局风格统一
- 错误提示的用语和位置保持一致
- **操作按钮统一命名**：表格行的操作按钮统一使用"编辑"和"删除"，不带"确认"前缀（确认由 `Popconfirm` 弹窗负责）。确保全局按钮文案一致，不因模块不同而出现"编辑文档"/"编辑知识库"等差异化文案。

### 5. 效率优先

- 高频操作提供快捷键或批量能力
- 列表页支持自定义列、排序、筛选
- 搜索支持模糊匹配和最近记录
- 分页记住用户的页码偏好
- **查看详情请求独立 API**：列表 API 仅返回摘要/最小字段集，点击行查看详情时请求单独的详情 API 获取完整数据，降低列表接口负载、提升加载性能

### 6. 无障碍（a11y）

- 所有操作按钮需要有可访问的名称（`aria-label`）
- 颜色不能作为唯一的信息传达方式
- 表单字段需要有明确的 label 关联
- 焦点顺序符合视觉阅读顺序

---

## 快速导航

| 任务类型 | 应加载的文档 | 说明 |
|---------|-------------|------|
| **📖 了解项目概况** | [核心架构](#1-核心架构与技术栈) | 技术栈、项目结构、业务模块 |
| **⚙️ 后端开发** | [后端规范](docs/agents/modules/backend.md) | 控制器、服务层、数据库操作规范 |
| **🎨 前端开发** | [前端规范](docs/agents/modules/frontend.md) | React 页面、API 调用、国际化 |
| **🤖 MCP 服务** | [MCP 集成](docs/agents/modules/mcp.md) | MCP Handlers、AI 工具调用 |
| **🧪 测试相关** | [测试规范](docs/agents/modules/testing.md) | Playwright 测试、测试账号 |
| **📱 移动端/小程序** | [多端规范](docs/agents/modules/mobile.md) | Expo App、微信小程序 |
| **💬 小科 AI** | [AI 聊天系统](docs/agents/modules/xiaoke.md) | 聊天服务、LLM 集成 |
| **🏗️ 架构与代码位置** | [架构规范](docs/agents/modules/architecture.md) | 项目结构、技术栈、已重构页面清单 |
| **🔄 Git 提交** | [交互规范](#2-交互与-git-提交规范) | 提交格式、自动推送 |

---

## 1. 核心架构与技术栈

本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

- **后端**：`.NET 10` + `Aspire` 微服务编排 + `MongoDB`
- **前端后台**：`React 19.2.6` + `Ant Design 6.3.7` + `UmiJS 4.6.42`（Ant Design Pro V6 模式）
- **移动端应用**：`Expo 54.0.31` + `React Native 0.83.1`
- **微信小程序**：`Platform.MiniApp` 微信原生开发
- **数据库**：MongoDB.EntityFrameworkCore + MongoDB.Driver

### 核心项目结构

```
aspire-admin/
├── Platform.AppHost/             # 微服务编排入口
├── Platform.ApiService/          # 后端核心业务网关
│   ├── Controllers/             # 44 个 API 控制器
│   ├── Services/                # 215+ 服务文件
│   └── Attributes/              # RequireMenu 等自定义属性
├── Platform.ServiceDefaults/     # 共享基础设施层
├── Platform.DataInitializer/     # 数据初始化 + 菜单配置
├── Platform.Admin/              # React 管理后台
├── Platform.App/                # Expo 移动端 App
└── Platform.MiniApp/            # 微信小程序
```

### 核心业务模块

| 模块 | 后端控制器 | 前端页面 | 说明 |
|------|-----------|---------|------|
| **工作流** | WorkflowController | workflow/ | 流程定义、实例、审批 |
| **IoT 物联网** | IoTController | iot-platform/ | 网关、设备、数据点 |
| **园区管理** | ParkAsset/Tenant/Visit/InvestmentController | park-management/ | 资产、租户、招商 |
| **密码本** | PasswordBookController | password-book/ | 安全密码管理 |
| **知识库** | KnowledgeBase/DocumentController | workflow/knowledge-base/ | 知识库与文档 |
| **文件存储** | FileStorage/CloudStorage/VersionController | cloud-storage/ | 云存储、版本管理 |
| **任务项目** | Task/ProjectController | task-management/ | 任务、项目管理 |
| **公文管理** | DocumentController | document/ | 公文创建、审批 |
| **小科 AI** | ChatAi/XiaokeConfigController | xiaoke-management/ | AI 对话、配置 |
| **网页抓取** | WebScraperController | web-scraper/ | 网页内容抓取 |

> **完整模块与控制器列表**见：[架构规范 - 核心业务模块](docs/agents/modules/architecture.md#核心业务模块) 或 [后端规范 - 控制器完整列表](docs/agents/modules/backend.md#610-控制器完整列表)

---

## 2. 交互与 Git 提交规范

### 会话与 Git 提交

- **全面中文交互**：所有代码注释、README、回复、Git 提交信息必须使用**简体中文**。
- **Commit 格式**：遵循约定式提交（如 `feat: 添加xxx`，`fix: 修复xxx`）。

### 代码修改前先制定规划

在接到开发需求后、实际修改代码前，**必须**先执行以下步骤：

1. **分析需求** — 理解用户意图，识别涉及的后端/前端/数据库模块，评估 UX 影响
2. **制定计划** — 列出需修改的文件、具体的变更内容、依赖关系和复杂度评估
3. **确认计划** — 将修改计划呈现给用户确认，确保方向正确
4. **分步执行** — 计划确认后，按步骤逐步修改，每完成一步标记进度

> 无论任务大小，先停下来想清楚再动手——**UX 不是后加的装饰，而是从一开始就设计进去的。**

### 代码修改后自动审查与提交

代码修改完成后，**必须**自动执行以下操作：

#### 0. 执行代码审查（Code Review）
```bash
# 使用 review-work 技能对修改进行质量审查
# 检查点：架构合规性、类型安全、边界情况、代码风格一致性、UX 完整性
```

审查通过后方可进入下一步。如审查发现问题，需修复后重新审查。

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
git push origin HEAD
```

#### 提交信息规范

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加用户管理功能` |
| `fix` | Bug 修复 | `fix: 修复登录验证问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `refactor` | 重构 | `refactor: 优化数据访问层` |

> **注意**：如果没有任何变更，不需要执行提交操作。

---

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
| 标准页面模板 | `Platform.Admin/src/templates/StandardPageTemplate.tsx` | 点击行弹详情，columns 用普通数组，handleView 为普通函数，DetailContent 无 isMobile |
| 页面开发标准 | `Platform.Admin/src/pages/password-book/index.tsx` | 页面开发风格参考（`onRow`、`handleView`、普通数组 columns 等模式） |

---

## 4. 变更与维护

- **通用规则同步**：当项目代码修改时出现新的通用规则，需同步更新到对应的模块文档。
- 各子文档如有原则重复，优先合并至本规范。
- 发现实现与本规范不符时，优先以模块文档和本规范为准，及时修订文档与代码。
- 所有新功能迭代前，务必查阅相关模块文档以确保架构走向不偏离。
- **UX 规则同步**：当发现新的 UX 模式或用户反馈问题时，及时更新到对应的模块文档。

---

## 5. 开发规范

以下模块文档是各领域的具体开发规范，由 AGENTS.md 统一索引：

| 编号 | 规范文档 | 覆盖范围 |
|------|---------|---------|
| 6 | [后端开发规范](docs/agents/modules/backend.md) | 控制器、服务层、数据库、权限、异常处理、SSE |
| 7 | [前端开发规范](docs/agents/modules/frontend.md) | React 页面、路由、API、状态管理、表单、国际化 |
| 8 | [移动端与小程序](docs/agents/modules/mobile.md) | Expo App、微信小程序、API 对接 |
| 9 | [测试规范](docs/agents/modules/testing.md) | Playwright 测试、测试账号、调试技巧 |
| 10 | [MCP 集成](docs/agents/modules/mcp.md) | MCP Handlers、AI 工具调用 |
| 11 | [小科 AI 系统](docs/agents/modules/xiaoke.md) | 聊天服务、LLM 集成、消息流程 |

> 各模块的内部小节编号（如 `6.1`、`7.1`）与上表对应。

---

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
