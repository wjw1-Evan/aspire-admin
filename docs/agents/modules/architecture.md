# 架构与代码位置

## 核心架构与技术栈

本项目是一个基于 **.NET 10 (后端) + React 19 (前端 Admin) + Expo 54 (移动 App) + 微信原生 (小程序 MiniApp)** 的企业级多租户闭环管理系统。

### 技术栈详情

| 技术栈 | 版本 | 用途 |
|--------|------|------|
| **后端** | .NET 10 | 核心业务服务 |
| **微服务编排** | Aspire | 服务发现、资源编排 |
| **数据库** | MongoDB | 文档数据库 |
| **前端后台** | React 19.2.5 | 管理后台 UI |
| **UI 框架** | Ant Design 6.3.5 | 组件库 |
| **前端框架** | UmiJS 4.6.42 | 应用框架 |
| **移动端** | Expo 54.0.31 | 跨平台 App |
| **小程序** | 微信原生 | 轻量级多端扩展 |
| **加密算法** | 国密 SM2/SM3/SM4 | 数据安全传输 |

### 项目结构

```
aspire-admin/
├── Platform.AppHost/              # 微服务编排入口
│   └── AppHost.cs                # Aspire 资源定义
├── Platform.ApiService/           # 后端核心业务网关
│   ├── Controllers/              # API 控制器（43 个）
│   ├── Services/                 # 业务服务层（213+ 文件）
│   │   └── Mcp/                 # MCP Handlers（20 个）
│   └── Attributes/               # 自定义属性（如 RequireMenu）
├── Platform.ServiceDefaults/      # 共享基础设施层
│   ├── Controllers/             # BaseApiController
│   ├── Models/                  # 基类、错误码、请求类型
│   ├── Services/                # DbContext、中间件
│   └── Extensions/              # 扩展方法（DI、查询）
├── Platform.DataInitializer/      # 数据初始化服务
│   └── Menus.json               # 菜单配置
├── Platform.Admin/              # React 管理后台
│   ├── src/pages/              # 业务页面（23 个模块）
│   ├── src/services/           # API 服务层
│   └── src/locales/            # 国际化翻译（18 种语言）
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

### 关键代码位置

#### 后端核心文件

| 功能 | 路径 |
|------|------|
| 分页请求类型 | `Platform.ServiceDefaults/Models/ProTableRequest.cs` |
| 分页扩展方法 | `Platform.ServiceDefaults/Extensions/QueryableExtensions.cs` |
| 自动 DI 扫描 | `Platform.ServiceDefaults/Extensions/ServiceDiscoveryExtensions.cs` |
| DbContext | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` |
| 实体基类 | `Platform.ServiceDefaults/Models/BaseEntity.cs` |
| 错误码常量 | `Platform.ServiceDefaults/Models/ErrorCode.cs` |
| 审计信息 | `Platform.ServiceDefaults/Services/PlatformDbContext.cs` (ApplyAuditInfoCore) |
| 多租户过滤 | `Platform.ServiceDefaults/Services/TenantContextMiddleware.cs` |
| JWT 服务 | `Platform.ServiceDefaults/Services/JwtService.cs` |
| SM 加密 | `Platform.ServiceDefaults/Services/SM4EncryptionProvider.cs` |

#### 前端核心文件

| 功能 | 路径 |
|------|------|
| API 响应类型 | `Platform.Admin/src/types/api-response.ts` |
| 错误码常量 | `Platform.Admin/src/constants/errorCodes.ts` |
| Token 工具 | `Platform.Admin/src/utils/token.ts` |
| 错误拦截器 | `Platform.Admin/src/utils/errorInterceptor.ts` |
| SSE Hook | `Platform.Admin/src/hooks/useSseConnection.ts` |
| 标准页面模板 | `Platform.Admin/src/templates/StandardPageTemplate.tsx` |
| 开发标准页面 | `Platform.Admin/src/pages/password-book/index.tsx` |

### 已重构页面清单

以下页面已完成统一开发规范重构：

| 页面 | 路径 | 完成项 |
|------|------|--------|
| 密码本 | `src/pages/password-book/index.tsx` | ✅ 国际化、移动端适配、统计信息 |
| 任务管理 | `src/pages/task-management/index.tsx` | ✅ ModalForm、国际化 |
| IoT 平台 | `src/pages/iot-platform/index.tsx` | ✅ 国际化、移动端适配 |
| 用户管理 | `src/pages/user-management/index.tsx` | ✅ 统一状态管理、国际化 |
| 工作流表单 | `src/pages/workflow/forms/index.tsx` | ✅ ModalForm、国际化 |
| 项目管理 | `src/pages/project-management/index.tsx` | ✅ 国际化、统计信息 |
| 云存储文件 | `src/pages/cloud-storage/files/index.tsx` | ✅ 国际化 |
| 园区租户 | `src/pages/park-management/tenant/index.tsx` | ✅ 国际化 |
| 组织架构 | `src/pages/organization/index.tsx` | ✅ 国际化 |
| 网页抓取 | `src/pages/web-scraper/index.tsx` | ✅ 国际化 |
| 分享页面 | `src/pages/share/index.tsx` | ✅ 国际化 |

### 架构特性

#### 多租户支持

- **数据隔离**：所有实体继承 `MultiTenantEntity`，自动按 `CompanyId` 过滤
- **上下文传递**：`ITenantContext` + `ITenantContextSetter`
- **后台任务**：使用 `ITenantContextSetter.SetContext()` 手动设置

#### 安全机制

- **认证**：JWT Bearer Token + SM2 密码加密传输
- **权限**：`[RequireMenu("menu-name")]` 属性标注
- **加密**：SM2（非对称）、SM3（摘要）、SM4（对称）
- **审计**：自动记录 `CreatedBy`/`CreatedAt`/`UpdatedBy`/`UpdatedAt`

#### 微服务编排（Aspire）

```csharp
// Platform.AppHost/AppHost.cs
var mongo = builder.AddMongoDB("mongo");
var redis = builder.AddRedis("redis");
var apiService = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithReplicas(3);  // 支持多副本
var admin = builder.AddJavaScriptApp("admin", "../Platform.Admin");
```

#### API 网关（YARP）

- 统一入口：`http://localhost:15000`
- 路由规则：`/{service}/{**catch-all}`
- 前端代理：`/apiservice/` → `Platform.ApiService`

### 开发流程

#### 新增业务模块

1. **后端**：创建 Controller + Service + Entity
2. **前端**：创建页面 + API + 路由 + 菜单
3. **菜单**：在 `Menus.json` 中添加配置
4. **翻译**：添加 i18n 翻译文件
5. **测试**：编写 Playwright E2E 测试

#### 代码修改后

1. 运行 lint 检查：`cd Platform.Admin && npm run lint`
2. 检查 Git 状态：`git status`
3. 提交并推送：`git add -A && git commit -m "feat: xxx" && git push origin main`
