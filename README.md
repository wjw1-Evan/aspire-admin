# Aspire Admin Platform

基于 .NET Aspire 构建的多租户企业管理平台。项目同时交付后端、管理后台与跨平台移动端，覆盖组织协作、国际化多语言支持、权限控制、文件与知识管理、工作流审批、IoT 平台、实时通信与 AI 协同等场景。

## ✨ 关键特性

- **国际化与本地化**：系统全面支持 **18 种国际化语言** (i18n)，适配 RTL 布局（如阿拉伯语、波斯语），支持自动检测浏览器语言并实现全局菜单与界面的即时切换。
- **现代化数据模型**：强制执行 **数据访问工厂 (`IDatabaseOperationFactory<T>`)** 模式，统一处理多租户隔离、软删除、审计追踪与自动分页，禁止绕过工厂直接操作集合。
- **园区管理 (Park Management)**：提供端到端的资产管理（楼宇/房源）、招商辅助（线索/项目/跟进）、租户全生命周期管理（合同/租金/账单）以及企业服务（工单/评价）与 AI 驱动的运营报表。
- **走访管理 (Visit Management)**：完整的走访协同体系，包含任务下发、现场核查、走访考核、知识库沉淀及多维度的走访统计。
- **工作流引擎**：可视化工作流与表单设计器，支持跨租户的公文审批流程，包含任务拾取、转签、驳回、撤回与流程快照回溯。
- **全栈 AI 协同**：内置 AI 助手（小科管理）与 MCP (Model Context Protocol) 规则引擎，支持 SSE 长连接流式输出、消息上下文管理、AI 报告生成、附件协同与附近的人/社交会话。
- **云存储协作**：基于 MongoDB GridFS 的云硬盘系统，支持文件版本管理、外链分享（含权限/审计）、配额控制与实时统计。
- **项目与任务管理**：支持任务依赖链条、执行日志追踪、看板模式、成员权限隔离与全局项目进度统计。
- **IoT 平台**：完整的物联网监控方案，涵盖网关管理、设备状态追踪、数据点采集、事件告警与实时监控面板。
- **基础设施**：采用 .NET Aspire 编排，集成 YARP 网关、Scalar/OpenAPI 文档、OpenTelemetry 观测、安全验证码与登录失败保护。

## 🏗 架构总览

```text
Platform/
├── Platform.AppHost/          # Aspire 应用主机与服务编排 (v10.0)
├── Platform.DataInitializer/  # 数据初始化微服务（索引、全局菜单与多语言同步）
├── Platform.ApiService/       # 多租户 REST API 服务 (MongoDB + IDatabaseOperationFactory)
├── Platform.Admin/            # 管理后台 (React 19 + Ant Design 6 + UmiJS)
├── Platform.App/              # 移动端 (React Native + Expo Router)
├── Platform.MiniApp/          # 微信小程序 (原生开发)
└── Platform.ServiceDefaults/  # 统一的服务发现、观测与安全默认配置
```

### 服务编排

`Platform.AppHost` 自动化拉起 MongoDB 容器、数据初始化服务、后端 API、管理后台与移动端预览，并通过 YARP 将请求统一路由到响应的服务。Aspire Dashboard 提供了实时的指标监控与分布式追踪。

## 🔙 后端服务 (Platform.ApiService)

- **多租户安全**：实体自动附加 `CompanyId`；基于 JWT + 刷新令牌的无感续期；登录失败阶梯式锁定保护。
- **权限模型**：采用高效的**菜单级权限**绑定，角色仅存储菜单 ID，接口访问权随菜单分配自动刷新。
- **SSE 实时通信**：高性能长连接通道，支持系统通知实时下发、在线状态感知与流式 AI 对话。
- **LBS 社交功能**：基于地理位置的“附近的人”搜索、位置上报与城市信息解析。
- **密码本 (Key Vault)**：用户级 AES-256-GCM 高强度加密存储，支持动态生成、强度审计与分类管理。
- **系统监控**：暴露底层资源占用（CPU/内存/磁盘）API，实时监控各微服务状态。

## 🖥 管理后台 (Platform.Admin)

- **底层技术**：React 19, Ant Design 6 (原生组件), @umijs/max, Biome 规范校验。
- **精美仪表盘**：重构的欢迎页面集成统计概览、快捷入口、任务状态、最近活动与系统资源实时监控图表。
- **核心模块**：
  - **协同中心**：公文处理、工作流审批（定义/监控）、项目任务追踪、统计报表。
  - **园区中心**：资产画像、招商管理、租户档案、合同预警、走访管理（任务/考核/统计）。
  - **智能中心**：小科 AI 助手（对话/历史/配置）、MCP 自动化规则。
  - **资源中心**：云存储库（版本/分享/配额）、密码本管理。
  - **系统/IoT**：物联网监控、组织架构、用户/角色权限、日志审计。

## 📱 移动应用 (Platform.App)

- **核心场景**：实时移动办公审批、AI 聊天辅助、同事圈/附近的人（LBS）、附件在线预览与统一通知触达。
- **技术特色**：Expo Router 文件式路由、内置多主题系统、地理位置服务与离线 network 缓存。

## 🍵 微信小程序 (Platform.MiniApp)

- **核心场景**：轻量级办公协同、任务即时处理、移动报表查看、云存储文件浏览。
- **核心功能**：
  - **首页概览**：集成统计看板、快捷应用入口。
  - **项目协同**：完整的项目列表、任务树查看与详情追踪，支持移动端任务创建。
  - **智能报表**：AI 驱动的数据统计分析报告。
  - **个人中心**：资料维护、安全设置（密码修改）与权限实时同步。
- **技术特色**：原生原生小程序开发、轻量化 UI 设计、高性能数据加载。

## 🌐 国际化支持 (i18n)

系统内置 18 种语言，支持自动检测与平滑切换：

| 语言代码 | 语言名称 | 本地化名称 | 图标 |
|---|-|---|-|
| `zh-CN` | 简体中文 | 简体中文 | 🇨🇳 |
| `zh-TW` | 繁體中文 | 繁體中文 | 🇹🇼 |
| `en-US` | English | English | 🇺🇸 |
| `ja-JP` | Japanese | 日本語 | 🇯🇵 |
| `ko-KR` | Korean | 한국어 | 🇰🇷 |
| `id-ID` | Indonesian | Bahasa Indonesia | 🇮🇩 |
| `pt-BR` | Portuguese (Brazil) | Português | 🇧🇷 |
| `es-ES` | Spanish | Español | 🇪🇸 |
| `fr-FR` | French | Français | 🇫🇷 |
| `de-DE` | German | Deutsch | 🇩🇪 |
| `it-IT` | Italian | Italiano | 🇮🇹 |
| `ru-RU` | Russian | Русский | 🇷🇺 |
| `ar-EG` | Arabic (RTL) | العربية | 🇪🇬 |
| `th-TH` | Thai | ไทย | 🇹🇭 |
| `vi-VN` | Vietnamese | Tiếng Việt | 🇻🇳 |
| `bn-BD` | Bengali | বাংলা | 🇧🇩 |
| `fa-IR` | Persian (RTL) | فارسی | 🇮🇷 |
| `tr-TR` | Turkish | Türkçe | 🇹🇷 |

## 🚀 快速开始

1. **先决条件**
   - [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
   - [Node.js 20+](https://nodejs.org/)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. **前端准备**
   ```bash
   (cd Platform.Admin && npm install)
   (cd Platform.App && npm install)
   (cd Platform.MiniApp && npm install)
   ```

3. **配置 OpenAI** (可选)
   - 在 `Platform.AppHost` 设置相应的 Endpoint 与 Key 以启用 AI 对话与报告生成功能。

4. **一键启动**
   ```bash
   dotnet run --project Platform.AppHost
   ```

5. **访问入口**
   - 管理后台: <http://localhost:15001>
   - 移动端 Web: <http://localhost:15002>
   - API 文档 (Scalar): 通过 Aspire Dashboard 打开。

## 📂 核心目录结构

- `Platform.ApiService/Controllers/`: 涵盖 Auth, Park, Visit, IoT, Workflow, CloudStorage, Social, Chat 等 40+ 控制器。
- `Platform.Admin/src/pages/`: 包含各核心模块（Park, Project, Visit, Workflow, Xiaoke 等）的所有管理页面与设计器。
- `docs/`: 存放详细的开发规范、API 说明、权限策略与数据工厂使用指南。

## 📚 延伸阅读

### 核心规范与架构
- [docs/开发规范.md](docs/开发规范.md)
- [docs/features/BACKEND-RULES.md](docs/features/BACKEND-RULES.md)
- [docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md](docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md)

### 功能指南
- [docs/features/IOT-MENU-CONFIGURATION.md](docs/features/IOT-MENU-CONFIGURATION.md)
- [docs/features/SSE-REALTIME-COMMUNICATION.md](docs/features/SSE-REALTIME-COMMUNICATION.md)
- [docs/features/TASK-PROJECT-MANAGEMENT.md](docs/features/TASK-PROJECT-MANAGEMENT.md)
- [docs/features/PASSWORD-BOOK-GUIDE.md](docs/features/PASSWORD-BOOK-GUIDE.md)

---

项目遵循最新的企业级开发最佳实践，结合 .NET Aspire 的编排能力与多语言 SaaS 架构，为构建现代化生产力工具提供坚实基础。
