# Copilot Instructions for Aspire Admin

本指南面向在本仓库中协作的 AI 编码代理，汇总能让你立即高效产出的关键知识与约定。仅记录项目里“已经实现、可验证”的模式与工作流。

## 架构与边界
- AppHost 编排 MongoDB → DataInitializer → ApiService → YARP 网关(`/apiservice`) → Admin(React) → App(Expo)。入口：`Platform.AppHost/AppHost.cs`、`Platform.ApiService/Program.cs`。
- 网关端口与入口：管理后台 `http://localhost:15001`，移动端 Web 预览 `http://localhost:15002`，统一网关 `http://localhost:15000`，Scalar/OpenAPI `http://localhost:15003`。
- SSE 实时通道：`/api/chat/sse` 使用 `text/event-stream`，由 `ChatSseConnectionManager` 与 `ChatBroadcaster` 管理，事件含 `ReceiveMessage/SessionUpdated/MessageDeleted/MessageChunk/keepalive`。

## 后端硬性规则（ApiService）
- 禁止直接使用 `IMongoCollection/IMongoDatabase`。统一通过 `IDatabaseOperationFactory<T>` + 构建器(`CreateFilterBuilder/SortBuilder/UpdateBuilder/ProjectionBuilder`)访问。
- 实体实现：`IEntity`、`ISoftDeletable`、`ITimestamped`；多租户实现 `IMultiTenant`/`MultiTenantEntity`，自动应用 `CompanyId` 与软删过滤。
- 原子 CRUD：`CreateAsync`、`FindOneAndUpdateAsync`、`FindOneAndSoftDeleteAsync`、`FindOneAndReplaceAsync`；审计字段由工厂自动维护，业务代码不得手动赋值。
- 控制器与响应：继承 `BaseApiController`；统一返回 `ApiResponse<T>`（JSON camelCase、忽略 null、枚举 camelCase）。分页参数严格使用 `page/pageSize`（1–10000/1–100），调用分页时直接传 `page` 给 `FindPagedAsync`，不要计算 `skip`。
- 权限模型：敏感接口使用 `[RequireMenu("module:resource")]`（如 `[RequireMenu("workflow:list")]`）；JWT 仅携带 `userId`，企业/角色信息通过 `ITenantContext` 解析。系统菜单在 `Platform.DataInitializer/Services/DataInitializerService.cs` 维护（名称用 `-`，权限用 `:`）。
- 中间件顺序（必须保持）：`UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → ActivityLogMiddleware → ResponseFormattingMiddleware → MapControllers`。健康检查/OpenAPI/SSE 跳过响应格式化。

## 前端管理台（Platform.Admin）约定
- 所有 HTTP 必须通过 `src/services` + `@umijs/max` 的 `request`，返回类型与后端 `ApiResponse<T>` 对齐；统一错误拦截，组件仅处理成功分支。
- 组件与 API：React 19 + Ant Design 6（不使用 ProComponents）。使用 `useMessage/useModal/useNotification` Hook；`Modal/Drawer/Popconfirm` 使用 `open` 与 `destroyOnHidden`。
- 页面骨架：`PageContainer` 统一 `style={{ paddingBlock: 12 }}`；操作按钮放在 `extra`，用 `Space wrap`（顺序：批量 → 刷新 → 次要 → 主要）。列表使用 `DataTable`，必须 `scroll={{ x: 'max-content' }}`；分离搜索表单时设置 `search={false}`。
- 搜索与分页：用 `useRef` 管理搜索参数避免重复请求；向后端传参固定 `page/pageSize`。操作列固定右侧，宽度约 150–200，按钮 `type="link" size="small"` 带图标；“查看”通过可点击的第一列实现。
- i18n：菜单翻译键 `src/locales/*/menu.ts` 采用 `menu.module.resource`；页面标题 `pages.xxx.title`，图标示例：工作流 `PartitionOutlined`、用户 `UserOutlined`。

## 移动端（Platform.App）约定
- 单一 API 客户端 `services/api.ts`（axios），与 `ApiResponse<T>` 对齐；`TokenRefreshManager` 负责刷新与并发控制；不要新增 fetch 客户端。
- SSE 通过 `EventSource` 连接 `/api/chat/sse?token=...`，组件卸载时必须关闭连接以避免泄漏。

## 开发工作流
- 启动全栈：`dotnet run --project Platform.AppHost`（依次启动 Mongo → DataInitializer → ApiService → 网关 → 前端）。
- 单独后端：`dotnet run --project Platform.ApiService`。管理台：`(cd Platform.Admin && npm install && npm run start)`；移动端：`(cd Platform.App && npm install && npm start)`。
- 测试与构建：`dotnet test Platform.AppHost.Tests`；CI 构建/发布：`dotnet build Platform.sln` / `dotnet publish Platform.sln`；前端代码检查：`npm run lint`（Biome/ESLint）。

## 安全与提交
- 禁止硬编码 `CompanyId`/权限；仅在极少运维场景使用 `*WithoutTenantFilter*` 方法并记录审计日志。
- 密码本使用 AES-256-GCM 加密存储；输出友好错误消息，不暴露底层异常。
- Git 提交信息必须使用简体中文，遵循约定式格式（如 `feat: 添加用户管理功能`、`fix: 修复登录验证问题`）。

## 关键参考与示例
- 文档索引：`.cursor/rules/*.mdc`（global/backend/admin/app）、`docs/features/*`（API 响应、后端规则、菜单权限、SSE、数据库工厂）、根 `README.md`（端点与架构）。
- 示例约定：
  - 分页：控制器接收 `[FromQuery] int page, [FromQuery] int pageSize`，调用工厂 `FindPagedAsync(filter, sort, page, pageSize)` 并返回 `SuccessPaged`。
  - 权限：在控制器方法上标注 `[RequireMenu("project-management-task")]` 或 `[RequireMenu("iot:device:list")]`。
  - 菜单定义：新增菜单在 `DataInitializerService.GetExpectedMenus`，子菜单映射在 `GetParentMenuNameByChildName`。

若以上有不清晰或遗漏之处，请直接反馈，我会迭代补充到本页（保持 20–50 行的精炼原则）。
