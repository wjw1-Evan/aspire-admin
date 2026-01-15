# Aspire Admin Platform

基于 .NET Aspire 构建的多租户企业管理平台。项目同时交付后端、管理后台与跨平台移动端，覆盖组织协作、权限控制、文件与知识管理、工作流审批、IoT、实时通信与 AI 协同等场景。

## ✨ 关键特性

- **后端服务**：多租户数据访问工厂、JWT + 刷新令牌、图形验证码与登录失败保护、菜单级权限、企业协作与组织架构、任务/项目管理、工作流 + 表单 + 公文审批、云存储/版本/分享/配额、文件协同（版本、外链、权限）、统一通知中心、好友与位置社交、MCP 规则引擎、IoT 平台、密码本（AES-256-GCM）、AI 智能回复与 SSE 实时推送、系统维护脚本与监控。
- **管理后台**：React 19 + Ant Design 6 原生组件（无 ProComponents），动态菜单与统一请求封装，内置用户/角色/企业/组织架构、加入申请、用户活动日志、任务/项目、IoT 平台、规则中心、工作流与表单设计器、公文审批、云存储（文件/版本/分享/回收站/配额）、分享中心、密码本、统一通知、帮助中心、Xiaoke 配置等模块。
- **移动应用**：Expo Router 导航，认证守卫与企业切换，主题切换，实时聊天（SSE）、好友与附近的人、附件上传/预览、AI 智能回复、通知与基础资料管理。
- **基础设施**：Aspire AppHost 编排 MongoDB、数据初始化、ApiService、前端应用，YARP 统一网关，Scalar/OpenAPI 文档，Mongo Express，可观察性与健康检查。

## 🏗 架构总览

```text
Platform/
├── Platform.AppHost/          # Aspire 应用主机与服务编排
├── Platform.DataInitializer/  # 数据初始化微服务（索引 + 全局菜单）
├── Platform.ApiService/       # 多租户 REST API 服务
├── Platform.Admin/            # 管理后台（React 19 + Ant Design 6）
├── Platform.App/              # 移动端（React Native + Expo）
└── Platform.ServiceDefaults/  # 统一的服务发现、观测与安全配置
```

### 服务编排

`Platform.AppHost` 拉起 MongoDB、数据初始化服务、API 服务、管理后台与移动端 Web 预览，并通过 YARP 将 `http://localhost:15000/{service}/**` 重写到后端 `/**`。Aspire Dashboard 默认暴露在 <http://localhost:18888>，可在资源列表中直接打开 Scalar API 文档。

## 🔙 后端服务（Platform.ApiService）

- **多租户数据访问**：统一通过 `IDatabaseOperationFactory<T>` 完成过滤、软删、审计字段与分页，禁止直接注入 `IMongoCollection<T>`。
- **认证与安全**：账户密码 + 刷新令牌、登录失败计数与图形验证码、密码复杂度/历史校验、手机号验证码校验、HSTS/CORS、安全默认值。
- **菜单级权限**：`[RequireMenu("module:resource")]` 绑定菜单权限；角色仅存储 `MenuIds`，前端不做按钮级权限分流。
- **企业与组织协作**：企业创建/切换、成员与角色管理、管理员设置、加入申请审批、组织架构树、成员分配与排序、企业统计。
- **任务与项目管理**：任务树/依赖/执行日志、批量状态更新、项目成员与关联、统计与筛选。
- **工作流 + 表单 + 公文**：流程定义与图形校验、表单设计、实例运行/审批历史、任务拾取/拒绝/转签、公文创建-提交-审批-归档，流程/表单/文档三者快照可回溯。
- **云存储与文件协同**：GridFS 文件/文件夹、回收站、搜索、配额、用量统计；文件版本历史、版本比较/恢复；文件外链与分享中心（权限/过期/提取码/访客审计）。
- **通知与待办**：统一通知中心聚合消息、待办、任务提醒，支持未读计数、批量已读、待办创建/完成。
- **社交与位置**：好友请求/同意/拒绝、直接会话；位置上报、附近的人、位置信息查询。
- **聊天与 AI**：SSE 长连接推送，流式 AI 回复、会话/消息/已读同步，附件上传与 GridFS 下载代理。
- **规则与 MCP**：规则 CRUD/执行，MCP 集成支持上下文编排与自动化。
- **IoT 平台**：网关/设备/数据点/事件告警/统计/数据流监控。
- **密码本**：AES-256-GCM 加密、用户级密钥、分类标签、强度检测、随机生成、软删与审计。
- **运营与监控**：维护脚本、系统资源监控 (`/api/SystemMonitor/resources`)、OpenTelemetry 追踪、统一响应与活动日志中间件。

核心启动逻辑位于 `Program.cs`，按 `UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → ActivityLogMiddleware → ResponseFormattingMiddleware → MapControllers` 顺序配置。

## 🗄 数据初始化（Platform.DataInitializer）

独立微服务负责：

- 创建所有集合索引（用户、企业、角色、日志等）。
- 同步全局菜单（欢迎页 + 系统管理子菜单），按名称识别避免重复。
- 幂等运行，执行完成后记录统计并优雅停止。

菜单是全局资源（无 `CompanyId`），企业通过角色 `MenuIds` 控制可见项。

## 🖥 管理后台（Platform.Admin）

- UmiJS 运行时获取当前用户与动态菜单，直接对接网关 `/apiservice`。
- **功能模块**：
  - **基础管理**：用户、角色、企业设置、加入申请（我发起/待审批）、组织架构、我的活动、密码本、系统帮助。
  - **任务与项目**：任务树/依赖/执行日志、项目成员与关联。
  - **工作流与公文**：流程定义与表单设计、运行/审批监控、公文创建/提交/审批/归档。
  - **云存储与协作**：文件/文件夹、版本历史、分享中心、回收站、配额管理、分享记录（我分享/分享给我）。
  - **IoT 平台**：网关、设备、数据点、事件告警、数据流监控与统计。
  - **规则与 MCP**：规则配置、MCP 集成与自动化工作流。
  - **通知与配置**：统一通知中心、Xiaoke 配置管理。
- **技术栈与规范**：React 19 + Ant Design 6 原生组件、@umijs/max、统一请求封装 + token 自动刷新、Biome 规范；PageContainer 统一内边距，表格统一使用 DataTable。
- 支持多语言、响应式布局、细粒度错误提示与校验。

## 📱 移动应用（Platform.App）

- Expo Router 文件路由，`AuthGuard` 保障敏感页面访问。
- 登录/注册、企业切换、个人资料/密码修改、关于、通知。
- 实时聊天（SSE）、附件上传与预览、AI 智能回复、好友会话与附近的人、主题切换、网络错误处理。

## 💬 实时聊天与 AI 助手

- **SSE 通道**：`/api/chat/sse` 长连接 + 心跳保活，事件含 ReceiveMessage/SessionUpdated/MessageDeleted/MessageChunk/keepalive，支持自动重连。
- **流式 AI 回复**：增量推送消息块，前端实时渲染；后台通过 `OpenAIClient` + `AiCompletionOptions` 统一配置模型与提示词。
- **附件**：GridFS 存储与下载代理 `/api/chat/messages/{sessionId}/attachments/{storageObjectId}`，支持移动端/管理端直接预览。
- **好友与附近的人**：好友请求、直接会话、位置上报、附近用户检索。

## 📊 IoT 平台

- **网关管理**：网关创建、配置、状态监控、统计信息（设备数、数据点、在线状态）。
- **设备管理**：设备注册、状态跟踪（在线/离线/故障/维护）、设备统计、按网关筛选。
- **数据点管理**：数据点配置（数值/布尔/字符串/枚举/JSON 类型）、数据点查询、按设备筛选。
- **数据采集**：支持单条和批量数据上报、数据记录查询、最新数据获取、数据统计（时间范围内统计）。
- **事件告警**：设备事件创建、事件查询、告警处理、未处理事件统计。
- **平台统计**：网关/设备/数据点/事件统计、设备在线状态统计、数据流监控。

详细文档见：

- [IoT 平台菜单配置说明](docs/features/IOT-MENU-CONFIGURATION.md)

## 🚀 快速开始

1. **安装依赖**
   - [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
   - [Node.js 20+](https://nodejs.org/)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - （移动端调试）[Expo CLI](https://docs.expo.dev/get-started/installation/)

2. **配置机密**（首次运行必需）
   - `Platform.ApiService`：设置 `Jwt:SecretKey`（或环境变量 `Jwt__SecretKey`）。
   - `Platform.AppHost`：配置 OpenAI 相关参数（`Parameters:openai-openai-endpoint`、`Parameters:openai-openai-apikey`、`Parameters:openai-openai-model`）；可用用户机密或环境变量覆盖。

3. **安装前端依赖**

   ```bash
   (cd Platform.Admin && npm install)
   (cd Platform.App && npm install)
   ```

4. **启动全栈环境**

   ```bash
   dotnet run --project Platform.AppHost
   ```

   AppHost 会依次启动 MongoDB → DataInitializer → ApiService → 网关 → 前端应用。

5. **访问入口**
   - 管理后台：<http://localhost:15001>
   - 移动应用（Web 预览）：<http://localhost:15002>
   - 网关与 API：<http://localhost:15000>
   - Aspire Dashboard（含 Scalar）：<http://localhost:18888>
   - Mongo Express：<http://localhost:15000/mongo-express>

6. **首次登录**
   - 管理后台/移动端均支持直接注册。
   - 注册成功将自动创建个人企业并赋予管理员菜单权限。

> 如需单独调试某个前端，可在对应目录执行 `npm run start`（Admin）或 `npm start`（App）。

## 📘 API 文档

- Aspire Dashboard → “Resources” → “Scalar API Reference” → 打开文档页面。
- 直接访问 `http://localhost:15000/apiservice/openapi/v1.json` 获取 OpenAPI JSON。
- 在 Scalar 页面点击 “Authorize”，填入 `Bearer <token>` 即可在线调试。

## ⚙️ 工作流与公文审批

- 流程定义：节点、连线、图形校验、分类/搜索/统计，支持启用/禁用，记录使用次数与最近使用时间。
- 表单设计：字段定义、版本与启用状态，流程引用时自动绑定字段校验。
- 实例运行：任务拾取/完成/转签/驳回/撤回，审批历史与执行日志可追溯。
- 公文管理：创建/更新/删除/提交，绑定流程定义后自动启动审批流，支持快照回溯。

## ☁️ 云存储、版本与分享

- **文件管理**：上传/下载、文件夹、搜索、回收站、批量操作、GridFS 存储与多租户隔离。
- **版本历史**：版本创建、列表、详情、比较、恢复/回滚。
- **分享与外链**：权限/过期时间/提取码/访问密码，分享记录（我分享/分享给我），访问审计与禁用。
- **配额与统计**：用户/企业配额设置、用量统计、排行榜、阈值告警、重新计算。

## 🔐 密码本管理

- AES-256-GCM 加密存储，用户级密钥。
- 条目 CRUD、分类/标签、强度检测、随机生成、导出、统计，软删除与活动日志过滤敏感字段。

## 🧩 多租户与权限模型

- **企业隔离**：实现 `IMultiTenant` 的实体自动附加 `CompanyId`；`AppUser` 通过 `CurrentCompanyId` + `UserCompany` 关联。
- **加入申请**：跨企业申请、审批/拒绝。
- **菜单级权限**：角色仅含 `MenuIds`，拥有菜单即具备 API 访问权；前端不做额外按钮屏蔽。

## 🔐 安全与可观测性

- 图形/短信验证码、登录失败防护、密码策略、刷新令牌、登出。
- 统一异常与响应格式化中间件，活动日志记录敏感操作（过滤敏感字段）。
- OpenTelemetry、健康检查 `/health`、SystemMonitor 资源信息、Mongo Express。
- `Platform.ServiceDefaults` 注入服务发现、重试、日志与指标。

## 🧪 测试与质量

- 前端 Biome/ESLint 规范。
- `Platform.AppHost.Tests`、`Platform.ApiService.Tests` 提供集成与单元测试，可通过 `dotnet test` 运行。
- 公共 C# 类型保持 XML 注释，保障 Scalar 文档完整。

## 📂 目录结构

```text
Platform.ApiService/
├── Controllers/      # Auth/User/Company/Menu/Organization/JoinRequest/Task/Project/IoT/Rule/Mcp/Workflow/Form/Document/Chat(Sse)/PasswordBook/CloudStorage/FileVersion/FileShare/StorageQuota/UnifiedNotification/Friends/Social/Notice/SystemMonitor/Maintenance/XiaokeConfig 等
├── Services/         # 业务服务（含 WorkflowEngine、ChatBroadcaster、ChatSseConnectionManager、FileVersion/Share、PasswordBook、CloudStorage、StorageQuota、UnifiedNotification 等）
├── Models/           # 实体与 DTO
├── Middleware/       # 活动日志、统一响应
├── Extensions/       # 数据过滤、分页、自动注册等扩展方法
└── Program.cs        # 服务启动入口

Platform.Admin/
├── config/           # UmiJS 配置、路由、代理
├── src/
│   ├── pages/        # 用户/角色/企业/加入申请/组织架构/活动日志/任务/项目/IoT/规则/工作流/公文/云存储(文件/版本/分享/回收站)/分享中心/密码本/通知/Xiaoke 管理等
│   ├── components/   # 复用组件、帮助弹窗、AI 助手、统一通知等
│   ├── services/     # API 封装（自动刷新 token）
│   ├── hooks/        # 自定义 Hooks（如 useSseConnection）
│   └── utils/        # token 工具、国际化、错误处理

Platform.App/
├── app/              # Expo Router 页面，含认证、标签页、聊天、好友/附近的人、通知、个人中心
├── components/       # 主题化组件、告警、输入校验
└── services/         # 与网关交互的 API 封装
```

## 📚 延伸阅读

### 开发规范与规则

- [docs/开发规范.md](docs/开发规范.md) – 汇总后端/前端/移动端开发规则与链接。
- [.cursor/rules/](.cursor/rules/) – Cursor AI 开发规则文件（模块化规则索引）。
  - `.cursor/rules/00-global.mdc` – 通用架构原则与规范。
  - `.cursor/rules/backend.mdc` – 后端/API/ServiceDefaults/数据初始化规范。
  - `.cursor/rules/frontend-admin.mdc` – 管理后台（Platform.Admin）开发规范。
  - `.cursor/rules/frontend-app.mdc` – 移动端（Platform.App）开发规范。

### 核心架构

- [docs/features/BACKEND-RULES.md](docs/features/BACKEND-RULES.md) – 后端核心与中间件规范。
- [docs/features/API-RESPONSE-RULES.md](docs/features/API-RESPONSE-RULES.md) – 统一 API 响应与控制器规范。
- [docs/features/MENU-LEVEL-PERMISSION-GUIDE.md](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md) – 菜单级权限模型。
- [docs/features/FRONTEND-RULES.md](docs/features/FRONTEND-RULES.md) – 前端开发规范。
- [docs/features/USER-ACTIVITY-LOG.md](docs/features/USER-ACTIVITY-LOG.md) – 用户活动日志规范。

### 功能模块

- [docs/features/IOT-MENU-CONFIGURATION.md](docs/features/IOT-MENU-CONFIGURATION.md) – IoT 平台菜单配置说明。
- [docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md](docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md) – 数据访问工厂使用指南。
- [docs/features/DATA-INITIALIZER-MICROSERVICE.md](docs/features/DATA-INITIALIZER-MICROSERVICE.md) – 数据初始化微服务说明。
- [docs/features/SSE-REALTIME-COMMUNICATION.md](docs/features/SSE-REALTIME-COMMUNICATION.md) – SSE 实时通信指南。
- [docs/features/PASSWORD-BOOK-GUIDE.md](docs/features/PASSWORD-BOOK-GUIDE.md) – 密码本功能使用指南。
- [docs/features/TASK-PROJECT-MANAGEMENT.md](docs/features/TASK-PROJECT-MANAGEMENT.md) – 任务与项目管理指南。

### 安全与审计

- [docs/security/PASSWORD-BOOK-SECURITY-AUDIT.md](docs/security/PASSWORD-BOOK-SECURITY-AUDIT.md) – 密码本安全审计报告。

---

欢迎基于本项目探索 .NET Aspire 在多租户 SaaS 场景下的最佳实践，结合前后端与移动端快速构建企业级产品。
