# Copilot Instructions for Aspire Admin

面向本仓库的 AI 协作速查，聚焦已落地的模式与硬性规范（约 20–50 行，随项目演进更新）。

## 架构与入口
- AppHost 拉起 MongoDB → DataInitializer → ApiService → YARP 网关(`/apiservice`) → Admin(React 19 + AntD6) → App(Expo)。入口：`Platform.AppHost/AppHost.cs`、`Platform.ApiService/Program.cs`。
- 端口：网关 `15000`，后台 `15001`，App Web `15002`，Scalar/OpenAPI `15003`，Mongo Express `/mongo-express`。
- SSE 实时通道 `/api/chat/sse`（`text/event-stream`），`ChatSseConnectionManager` + `ChatBroadcaster`，事件含 ReceiveMessage/SessionUpdated/MessageDeleted/MessageChunk/keepalive。

## 后端强制约束（ApiService/DataInitializer/ServiceDefaults/AppHost）
- 仅用 `IDatabaseOperationFactory<T>` + 构建器（Filter/Sort/Update/Projection）；严禁直接注入 `IMongoCollection/IMongoDatabase` 或手写 BsonDocument。
- 实体必备 `IEntity` + `ISoftDeletable` + `ITimestamped`；多租户继承 `MultiTenantEntity`/实现 `IMultiTenant`，工厂自动附加 `CompanyId` + 软删；审计字段由工厂自动维护。
- CRUD 只走原子方法：`CreateAsync` / `FindOneAndUpdateAsync` / `FindOneAndReplaceAsync` / `FindOneAndSoftDeleteAsync`；跨租户仅用 `*WithoutTenantFilter*` 且记录审计。
- 控制器继承 `BaseApiController`，响应统一 `ApiResponse<T>`（camelCase、忽略 null、枚举 camelCase）。分页参数固定 `page/pageSize`（1–10000 / 1–100），调用 `FindPagedAsync` 直接传 `page`，禁止计算 `skip`。
- 权限用 `[RequireMenu("module:resource")]`（菜单名用 `-`，权限用 `:`）；JWT 仅含 `userId`，租户/角色从 `ITenantContext` 获取。菜单定义在 `Platform.DataInitializer/Services/DataInitializerService.cs` 的 `GetExpectedMenus` + `GetParentMenuNameByChildName`。
- 中间件顺序必须：`UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → ActivityLogMiddleware → ResponseFormattingMiddleware → MapControllers`；健康检查/OpenAPI/SSE 跳过响应格式化。

## 管理后台（Platform.Admin）硬性规范
- 所有请求经 `src/services` + `@umijs/max` 的 `request`，返回 `ApiResponse<T>`；全局拦截错误，组件只处理成功分支。
- 技术栈：React 19 + AntD 6（禁用 ProComponents）。Modal/Drawer/Popconfirm 用 `open`，`destroyOnHidden`；消息/弹窗用 `useMessage/useModal/useNotification` Hook。
- 页面骨架：`PageContainer` 必带 `style={{ paddingBlock: 12 }}`；操作按钮全部放 `extra`，`Space wrap` 排序“批量 → 刷新 → 次要 → 主要”。
- 列表：必须用 `DataTable`，`scroll={{ x: 'max-content' }}`；独立搜索表单时 `search={false}`。搜索参数用 `useRef` 存储避免双请求；请求参数一律 `page/pageSize`。
- 操作列固定右侧，宽度 150–200，按钮 `type="link" size="small"` 搭配图标；“查看”通过首列可点击实现，不在操作列放“查看”。
- i18n：菜单 key `menu.module.resource`，页面标题 `pages.xxx.title`；示例图标：工作流 `PartitionOutlined`，用户 `UserOutlined`。
- SSE：用 `useSseConnection` 连接 `/api/chat/sse?token=...`，卸载时清理。

## 移动端（Platform.App）约定
- 单一 axios 客户端 `services/api.ts` + `TokenRefreshManager`，对齐 `ApiResponse<T>`，禁止新增 fetch 客户端。
- SSE 通过 `EventSource` 连接 `/api/chat/sse?token=...`，组件卸载必须关闭。

## 开发与测试工作流
- 全栈：`dotnet run --project Platform.AppHost`（顺序启动 Mongo → DataInitializer → ApiService → 网关 → 前端）。
- 独立调试：后端 `dotnet run --project Platform.ApiService`；后台 `(cd Platform.Admin && npm install && npm run start)`；App `(cd Platform.App && npm install && npm start)`。
- 测试/构建：`dotnet test Platform.AppHost.Tests`；`dotnet build Platform.sln` / `dotnet publish Platform.sln`；前端 lint `npm run lint`（Biome/ESLint）。

## 安全与提交
- 禁止硬编码 `CompanyId`/权限；密码本使用 AES-256-GCM；错误提示需友好且不暴露堆栈。
- Git 提交信息必须使用简体中文且遵循约定式格式（如 `feat: 添加用户管理功能`、`fix: 修复登录验证问题`）。

## 快速参考
- 规则索引：`.cursor/rules/*.mdc`（global/backend/frontend-admin/frontend-app）。
- 核心文档：`docs/features/`（API 响应、后端规则、菜单权限、SSE、数据库工厂等）、根 `README.md`（架构与端点）。
- 参考实现：分页控制器参数 `[FromQuery] int page/pageSize` → `FindPagedAsync`；权限 `[RequireMenu("project-management-task")]`；菜单定义 `DataInitializerService.GetExpectedMenus`。

如有遗漏或需澄清的细节，请反馈以迭代本页。
