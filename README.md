# Aspire Admin Platform

基于 .NET Aspire 构建的多租户企业管理平台。项目提供统一的后端服务、管理后台与跨平台移动应用，涵盖用户管理、企业协作、菜单级权限控制、审计日志与系统监控等能力。

## ✨ 关键特性

- **后端服务**：多租户数据访问工厂、JWT + 刷新令牌、图形验证码与登录失败保护、菜单级权限控制、加入企业审批、系统维护脚本、系统监控与 OpenTelemetry 采集、SignalR 实时聊天 Hub、GridFS 附件存储与下载代理、AI 智能回复服务编排。
- **管理后台**：Ant Design Pro 动态菜单、企业与成员管理、加入申请审批、用户活动日志、帮助中心、国际化与统一错误处理。
- **移动应用**：Expo Router 导航、深色/浅色主题切换、认证守卫、企业切换、密码修改与基础组件库，内置实时聊天、附件上传 / 预览、AI 智能回复与附近的人推荐体验。
- **基础设施**：Aspire AppHost 服务编排、YARP 统一网关、Scalar API 文档、MongoDB + Mongo Express、健康检查与可观察性。

## 🏗 架构总览

```text
Platform/
├── Platform.AppHost/          # Aspire 应用主机与服务编排
├── Platform.DataInitializer/  # 数据初始化微服务（索引 + 全局菜单）
├── Platform.ApiService/       # 多租户 REST API 服务
├── Platform.Admin/            # 管理后台（React 19 + Ant Design Pro）
├── Platform.App/              # 移动端（React Native + Expo）
└── Platform.ServiceDefaults/  # 统一的服务发现、观测与安全配置
```

### 服务编排

`Platform.AppHost` 会拉起 MongoDB、数据初始化服务、API 服务以及前端应用，并通过 YARP 将 `http://localhost:15000/{service}/**` 重写到后端 `/api/**`。示例配置：

```34:62:Platform.AppHost/AppHost.cs
var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithConfiguration(config =>
    {
        foreach (var service in services)
        {
            var route = $"/{service.Key}/{{**catch-all}}";
            config.AddRoute(route, config.AddCluster(service.Value))
                .WithTransformPathRouteValues("/{**catch-all}");
        }
    });

builder.AddNpmApp("admin", "../Platform.Admin")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none")
    .WithHttpEndpoint(env: "PORT", port: 15001)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile();
```

## 🔙 后端服务（Platform.ApiService）

- **多租户数据访问**：所有实体通过 `IDatabaseOperationFactory<T>` 访问数据库，自动处理企业过滤、软删除、审计字段与批量操作，禁止直接使用 `IMongoCollection<T>`。
- **认证与安全**：支持账户密码登录、刷新令牌、登录失败计数 + 图形验证码、密码复杂度校验、手机号验证码校验与 HSTS/CORS 配置。
- **菜单级权限**：通过 `[RequireMenu("menu-name")]` 声明菜单访问权限，配合全局菜单与角色的 `MenuIds` 实现粗粒度控制。
- **企业协作**：公司注册、个人企业创建、企业成员管理、管理员设置、加入申请审批、企业统计与企业切换。
- **运营能力**：通知中心、规则配置、系统维护脚本（补全缺失关联、数据校验）、系统资源监控 (`/api/SystemMonitor/resources`)。
- **审计与日志**：`ActivityLogMiddleware` 捕获请求轨迹，`UserActivityLog` 记录 CRUD 审计操作，所有异常由统一响应中间件处理。
- **OpenAPI 文档**：基于 .NET 9 原生 OpenAPI + Scalar，所有公共成员已补全 XML 注释，保证文档可读性。

核心启动逻辑集中在 `Program.cs`，完成 CORS、OpenAPI、JWT、健康检查与中间件管线配置：

```24:224:Platform.ApiService/Program.cs
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new()
        {
            Title = "Platform API",
            Version = "v1",
            Description = "Aspire Admin Platform API - 企业级管理平台后端服务",
            Contact = new()
            {
                Name = "Platform Team",
                Email = "support@platform.com"
            }
        };

        document.Components ??= new();
        document.Components.SecuritySchemes ??= new Dictionary<string, Microsoft.OpenApi.Models.OpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new()
        {
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Authorization header using the Bearer scheme."
        };

        document.SecurityRequirements ??= new List<Microsoft.OpenApi.Models.OpenApiSecurityRequirement>();
        document.SecurityRequirements.Add(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            [document.Components.SecuritySchemes["Bearer"]] = new string[0]
        });

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        var authorizeAttributes = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>();

        if (authorizeAttributes.Any())
        {
            operation.Security ??= new List<Microsoft.OpenApi.Models.OpenApiSecurityRequirement>();
            operation.Security.Add(new()
            {
                [new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new()
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                }] = Array.Empty<string>()
            });
        }

        return Task.CompletedTask;
    });
});
```

## 🗄 数据初始化（Platform.DataInitializer）

独立微服务负责：

- 创建所有集合索引（用户、企业、角色、日志等）。
- 同步全局菜单（欢迎页 + 系统管理子菜单），按名称识别避免重复。
- 幂等运行，执行完成后记录统计并优雅停止。

菜单是全局资源（无 `CompanyId`），企业通过角色 `MenuIds` 控制可见项。

## 🖥 管理后台（Platform.Admin）

- UmiJS 运行时获取当前用户与动态菜单，直接对接网关 `/apiservice`。
- 功能模块：用户管理、角色管理、企业设置、加入申请（我发起 / 待审批）、我的活动、系统帮助。
- 统一请求封装、自动刷新 token、Ant Design Pro 组件体系、Biome 代码规范。
- 支持多语言、响应式布局、错误提示与细粒度操作验证。

## 📱 移动应用（Platform.App）

- Expo Router 文件路由，`AuthGuard` 保证敏感页面登录可达。
- 提供登录、注册、企业切换、个人资料、密码修改、关于信息等页面。
- 主题切换、Toast/对话框封装、会话管理、网络错误处理。

## 💬 实时聊天与 AI 助手

- **SignalR 实时通道**：`/hubs/chat` 支持自动重连、会话房间、消息/会话摘要/撤回/已读推送，网络受限场景可回退到 REST 轮询。
- **附件能力**：移动端通过统一 `apiService` 上传附件，后端使用 MongoDB GridFS 存储并提供 `/api/chat/messages/{sessionId}/attachments/{storageObjectId}` 下载流，确保链接可直接预览。
- **AI 协同**：整合智能回复、匹配推荐、话题引导 API，可在聊天界面一键插入推荐内容，底层通过 `AiCompletionService` 对接模型服务。
- **附近的人**：内置位置权限检测、地理围栏更新与附近用户列表刷新，支持实时 Beacon 上传。
- 详细文档见：
  - [实时聊天集成说明](docs/features/CHAT-REALTIME-SIGNALR.md)
  - [聊天后端 API 实现说明](docs/features/CHAT-BACKEND-API.md)
  - [聊天 & AI 助手功能说明](Platform.App/docs/features/CHAT-AI-FEATURE.md)

## 🚀 快速开始

1. **安装依赖**
   - [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
   - [Node.js 20+](https://nodejs.org/)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - （移动端调试）[Expo CLI](https://docs.expo.dev/get-started/installation/)

2. **配置 JWT 密钥**（首次运行必需）

   ```bash
   cd Platform.ApiService
   dotnet user-secrets init
   dotnet user-secrets set "Jwt:SecretKey" "请替换为强随机密钥"
   cd ..
   ```

   或设置环境变量 `Jwt__SecretKey`。

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
   - Aspire Dashboard + Scalar：<http://localhost:15003>
   - Mongo Express：<http://localhost:15000/mongo-express>

6. **首次登录**
   - 管理后台/移动端均支持直接注册。
   - 注册成功将自动创建个人企业并赋予管理员菜单权限。

> 如果只需单独调试某个前端，可在对应目录执行 `npm run start`（Admin）或 `npm start`（App）。

## 📘 API 文档

- Aspire Dashboard → “Resources” → “Scalar API Reference” → 打开文档页面。
- 直接访问 `http://localhost:15000/apiservice/openapi/v1.json` 获取 OpenAPI JSON。
- 在 Scalar 页面点击 “Authorize”，填入 `Bearer <token>` 即可在线调试。

## 🧩 多租户与权限模型

- **企业隔离**：实现 `IMultiTenant` 的实体（角色、通知等）自动附加 `CompanyId` 过滤；`AppUser` 通过 `CurrentCompanyId` + `UserCompany` 多对多关联。
- **企业协作**：企业创建、搜索、成员列表、角色分配、管理员设置、成员移除。
- **加入申请**：用户可申请加入其他企业；管理员在“待审核”页面审批或拒绝。
- **菜单级权限**：角色仅包含 `MenuIds`，获得菜单即具备对应 API 访问权限；前端不再隐藏按钮，真实权限由后端控制。

## 🔐 安全与可观测性

- 图形验证码 / 短信验证码（可扩展）、登录失败计数、密码策略、刷新令牌、用户登出。
- 统一异常处理中间件输出一致响应格式，前端根据 `showType` 渲染提示。
- OpenTelemetry 追踪、健康检查端点 `/health`、SystemMonitor 资源信息、Mongo Express 数据查看。
- `Platform.ServiceDefaults` 为所有服务注入服务发现、标准重试策略、日志记录与指标采集。

## 🧪 测试与质量

- 使用 Biome / ESLint（移动端）维持前端代码规范。
- `Platform.AppHost.Tests` 提供 AppHost 集成测试示例，可通过 `dotnet test` 执行。
- 所有公共 C# 类型保持 XML 注释，确保 Scalar 文档完整。

## 📂 目录结构

```text
Platform.ApiService/
├── Controllers/      # Auth、User、Company、Menu、JoinRequest、Maintenance、Monitor 等控制器
├── Services/         # 业务服务层与自动注册
├── Models/           # 实体与 DTO（含 Response 模型）
├── Middleware/       # 活动日志、统一响应
├── Extensions/       # 数据过滤、分页、自动注册等扩展方法
└── Program.cs        # 服务启动入口

Platform.Admin/
├── config/           # UmiJS 配置、路由、代理
├── src/
│   ├── pages/        # 用户管理、角色管理、企业设置、加入申请、活动日志等
│   ├── components/   # 复用组件、帮助弹窗等
│   ├── services/     # API 封装（自动刷新 token）
│   └── utils/        # token 工具、国际化、错误处理

Platform.App/
├── app/              # Expo Router 页面，含认证、标签页、个人中心
├── components/       # 主题化组件、告警、输入校验
└── services/         # 与网关交互的 API 封装
```

## 📚 延伸阅读

- [docs/features/DATA-INITIALIZER-MICROSERVICE.md](docs/features/DATA-INITIALIZER-MICROSERVICE.md) – 数据初始化微服务说明。
- [docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md](docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md) – 数据访问工厂使用指南。
- [docs/features/MENU-LEVEL-PERMISSION-GUIDE.md](docs/features/MENU-LEVEL-PERMISSION-GUIDE.md) – 菜单级权限模型。
- [docs/features/HELP-MODULE-FEATURE.md](docs/features/HELP-MODULE-FEATURE.md) – 管理后台帮助系统介绍。
- [docs/features/HOW-TO-VIEW-API-DOCS.md](docs/features/HOW-TO-VIEW-API-DOCS.md) – Scalar 文档访问指引。

---

欢迎基于此项目探索 .NET Aspire 在多租户 SaaS 场景下的最佳实践，结合前端与移动端快速构建企业级产品。
