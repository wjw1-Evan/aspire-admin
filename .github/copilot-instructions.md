# Copilot Instructions for Aspire Admin

## Overview
This document provides essential guidelines for AI coding agents working within the Aspire Admin codebase. Understanding the architecture, workflows, and conventions is crucial for effective contributions.

## Architecture
- **Big Picture**: The architecture consists of several key components:
	- **AppHost** orchestrates the flow between MongoDB, DataInitializer, ApiService, and the YARP gateway (`/apiservice`).
	- **Admin** (React) and **App** (Expo) serve as the front-end interfaces.
	- **Entry Points**: Key files include `Platform.AppHost/AppHost.cs` and `Platform.ApiService/Program.cs`.

## Data Access
- **Hard Rule**: Direct access to `IMongoCollection/IMongoDatabase` is prohibited. Use `IDatabaseOperationFactory<T>` with appropriate builders (e.g., `CreateFilterBuilder`, `SortBuilder`).
- **Entity Implementation**: Entities must implement `IEntity`, `ISoftDeletable`, and `ITimestamped`. Multi-tenant entities should implement `IMultiTenant` to auto-apply filters.

## Developer Workflows
- **Build and Run**: Use `dotnet run --project Platform.AppHost` for full stack or `dotnet run --project Platform.ApiService` for backend only. Admin and mobile development commands are also specified in the existing documentation.
- **Testing**: Run tests using `dotnet test Platform.AppHost.Tests`. Linting for Admin/App can be done via `npm run lint`.

## Project-Specific Conventions
- **Permissions**: Sensitive endpoints require `[RequireMenu("module:resource")]`. Avoid deprecated methods like `HasPermission`.
- **Response Handling**: Controllers should inherit from `BaseApiController` and return `ApiResponse<T>`.
- **Middleware Order**: Maintain the specified order for middleware to ensure proper functionality.

## Integration Points
- **SSE Real-Time Communication**: Handled by `ChatSseConnectionManager` and `ChatBroadcaster`. Events include `ReceiveMessage`, `SessionUpdated`, etc.
- **External Dependencies**: Ensure to manage dependencies through the specified package managers and follow the outlined integration patterns.

## Key Files and Directories
- **Documentation**: Refer to `docs/features/` for detailed API response rules, backend rules, and other critical documentation.
- **Key Docs**: The root `README.md` provides an overview of the architecture and endpoints.

## Conclusion
This document should serve as a foundational guide for AI agents to navigate and contribute effectively to the Aspire Admin codebase. For any unclear sections or additional details needed, please provide feedback for further iterations.
# Copilot Instructions for Aspire Admin

- **Architecture map**: AppHost orchestrates MongoDB → DataInitializer → ApiService → YARP gateway (`/apiservice`) → Admin (React) → App (Expo). Entry points: `Platform.AppHost/AppHost.cs`, `Platform.ApiService/Program.cs`.
- **Data access (hard rule)**: Never touch `IMongoCollection/IMongoDatabase` directly. Use `IDatabaseOperationFactory<T>` with builders (`CreateFilterBuilder/SortBuilder/UpdateBuilder/ProjectionBuilder`). Entities implement `IEntity` + `ISoftDeletable` + `ITimestamped`; multi-tenant entities implement `IMultiTenant`/`MultiTenantEntity` so `CompanyId` and soft-delete filters auto-apply.
- **Audit & CRUD**: Always use factory atomics: `CreateAsync`, `FindOneAndUpdateAsync`, `FindOneAndSoftDeleteAsync`, `FindOneAndReplaceAsync`; audit fields are auto-managed—do not set manually.
- **Permissions**: Sensitive endpoints require `[RequireMenu("module:resource")]`; avoid deprecated `HasPermission/RequirePermission`. JWT only carries `userId`; resolve enterprise/roles via `ITenantContext`. Menus defined in `Platform.DataInitializer/Services/DataInitializerService.cs` (names with `-`, permissions with `:`).
- **Controllers & responses**: Inherit `BaseApiController`; return `ApiResponse<T>` via `Success/SuccessPaged/ValidationError/...`. JSON camelCase, ignore null, enums camelCase. Pagination params strictly `page/pageSize` (1–10000 / 1–100); pass `page` directly to factory `FindPagedAsync` (no manual skip math).
- **Middleware order (must keep)**: `UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → ActivityLogMiddleware → ResponseFormattingMiddleware → MapControllers`; health/OpenAPI/SSE bypass response formatting. SSE uses `text/event-stream`.
- **SSE real-time**: `/api/chat/sse` handled by `ChatSseConnectionManager` + `ChatBroadcaster`; events include ReceiveMessage/SessionUpdated/MessageDeleted/MessageChunk/keepalive; heartbeat every 30s; cleanup on disconnect.
- **Backend patterns**: See `Platform.ApiService/Controllers/*` + `Services/` + `Middleware/` + `Extensions/` for standard usage; IoT/Rule modules follow same multi-tenant + builder pattern. Keep XML docs for public APIs (Scalar/OpenAPI).
- **Admin (Platform.Admin)**: React 19 + Ant Design 6 (no ProComponents). All HTTP via `src/services` + `@umijs/max` `request` returning `ApiResponse<T>`; use hooks `useMessage/useModal/useNotification`; Modal/Drawer/Popconfirm use `open` + `destroyOnHidden`.
- **Admin layout conventions**: `PageContainer` with `style={{ paddingBlock: 12 }}`; actions in `extra` with `Space wrap` (order: bulk → refresh → secondary → primary). Lists use `DataTable`, `scroll={{ x: 'max-content' }}`, `search={false}` when separate form. Manage search params via `useRef` to avoid duplicate fetch; pagination keys `page/pageSize`; action column fixed right width ~150–200, buttons `type="link" size="small"` with icons; “view” via clickable first column.
- **i18n**: Menu keys in `src/locales/*/menu.ts` as `menu.module.resource`; page titles `pages.xxx.title` with icons (e.g., workflow `PartitionOutlined`, user `UserOutlined`).
- **Mobile App (Platform.App)**: Expo Router; single API client `services/api.ts` (axios) aligned to `ApiResponse<T>`, token refresh via `TokenRefreshManager`; no new fetch clients. SSE via EventSource to `/api/chat/sse?token=...` and close on unmount.
- **Build/run**: Full stack `dotnet run --project Platform.AppHost` (starts Mongo, DataInitializer, ApiService, gateway, frontends). Backend only `dotnet run --project Platform.ApiService`. Admin dev `(cd Platform.Admin && npm install && npm run start)`. Mobile dev `(cd Platform.App && npm install && npm start)`. CI: `dotnet build Platform.sln` / `dotnet publish Platform.sln`.
- **Testing/lint**: `dotnet test Platform.AppHost.Tests`; Admin/App lint via `npm run lint` (Biome/ESLint).
- **Security & safety**: Never hardcode `CompanyId`/permissions; don’t bypass tenant filters except explicit `*WithoutTenantFilter*` with audit logging. Friendly error messages, no raw exceptions. Password book uses AES-256-GCM—treat secrets carefully.
- **Commit style**: Git commits must be Simplified Chinese, conventional format (`feat: ...`, `fix: ...`).
- **Key docs**: `.cursor/rules/*.mdc` (global/backend/admin/app), `docs/features/` (API response, backend rules, menu permission, SSE, database factory), root `README.md` for architecture/endpoints.

- **架构图**: AppHost 协调 MongoDB → DataInitializer → ApiService → YARP 网关 (`/apiservice`) → Admin (React) → App (Expo)。入口点: `Platform.AppHost/AppHost.cs`, `Platform.ApiService/Program.cs`。
- **数据访问（硬性规则）**: 永远不要直接接触 `IMongoCollection/IMongoDatabase`。使用 `IDatabaseOperationFactory<T>` 和构建器（`CreateFilterBuilder/SortBuilder/UpdateBuilder/ProjectionBuilder`）。实体实现 `IEntity` + `ISoftDeletable` + `ITimestamped`；多租户实体实现 `IMultiTenant`/`MultiTenantEntity`，以便 `CompanyId` 和软删除过滤器自动应用。
- **审计与 CRUD**: 始终使用工厂原子操作: `CreateAsync`, `FindOneAndUpdateAsync`, `FindOneAndSoftDeleteAsync`, `FindOneAndReplaceAsync`；审计字段自动管理——请勿手动设置。
- **权限**: 敏感端点需要 `[RequireMenu("module:resource")]`；避免使用已弃用的 `HasPermission/RequirePermission`。JWT 仅携带 `userId`；通过 `ITenantContext` 解析企业/角色。菜单定义在 `Platform.DataInitializer/Services/DataInitializerService.cs`（名称带 `-`，权限带 `:`）。
- **控制器与响应**: 继承 `BaseApiController`；通过 `Success/SuccessPaged/ValidationError/...` 返回 `ApiResponse<T>`。JSON 使用 camelCase，忽略 null，枚举使用 camelCase。分页参数严格为 `page/pageSize`（1–10000 / 1–100）；直接将 `page` 传递给工厂 `FindPagedAsync`（无手动跳过计算）。
- **中间件顺序（必须保持）**: `UseExceptionHandler → UseCors → UseAuthentication → UseAuthorization → ActivityLogMiddleware → ResponseFormattingMiddleware → MapControllers`；健康检查/OpenAPI/SSE 跳过响应格式化。SSE 使用 `text/event-stream`。
- **SSE 实时**: `/api/chat/sse` 由 `ChatSseConnectionManager` + `ChatBroadcaster` 处理；事件包括 ReceiveMessage/SessionUpdated/MessageDeleted/MessageChunk/keepalive；每 30 秒心跳；断开连接时清理。
- **后端模式**: 查看 `Platform.ApiService/Controllers/*` + `Services/` + `Middleware/` + `Extensions/` 以获取标准用法；IoT/规则模块遵循相同的多租户 + 构建器模式。保持公共 API 的 XML 文档（标量/OpenAPI）。
- **管理（Platform.Admin）**: React 19 + Ant Design 6（无 ProComponents）。所有 HTTP 通过 `src/services` + `@umijs/max` `request` 返回 `ApiResponse<T>`；使用钩子 `useMessage/useModal/useNotification`；Modal/Drawer/Popconfirm 使用 `open` + `destroyOnHidden`。
- **管理布局约定**: `PageContainer` 使用 `style={{ paddingBlock: 12 }}`；`extra` 中的操作使用 `Space wrap`（顺序: 批量操作 → 刷新 → 次要操作 → 主要操作）。列表使用 `DataTable`，`scroll={{ x: 'max-content' }}`，当表单分离时 `search={false}`。通过 `useRef` 管理搜索参数以避免重复获取；分页键 `page/pageSize`；操作列固定右侧宽度 ~150–200，按钮 `type="link" size="small"` 带图标；“查看”通过可点击的第一列实现。
- **国际化（i18n）**: 菜单键在 `src/locales/*/menu.ts` 中定义，格式为 `menu.module.resource`；页面标题 `pages.xxx.title` 中带图标（例如，工作流 `PartitionOutlined`，用户 `UserOutlined`）。
- **移动应用（Platform.App）**: Expo Router；单一 API 客户端 `services/api.ts`（axios），与 `ApiResponse<T>` 对齐，通过 `TokenRefreshManager` 刷新令牌；不使用新的获取客户端。通过 EventSource 访问 `/api/chat/sse?token=...`，并在卸载时关闭连接。
- **构建/运行**: 全栈 `dotnet run --project Platform.AppHost` （启动 Mongo、DataInitializer、ApiService、网关、前端）。仅后端 `dotnet run --project Platform.ApiService`。管理员开发 `(cd Platform.Admin && npm install && npm run start)`。移动端开发 `(cd Platform.App && npm install && npm start)`。CI: `dotnet build Platform.sln` / `dotnet publish Platform.sln`。
- **测试/代码检查**: `dotnet test Platform.AppHost.Tests`；管理员/应用程序通过 `npm run lint` 进行代码检查（Biome/ESLint）。
- **安全性与可靠性**: 永远不要硬编码 `CompanyId`/权限；除非明确使用 `*WithoutTenantFilter*` 并记录审计日志，否则不要绕过租户过滤器。友好的错误信息，不显示原始异常。密码本使用 AES-256-GCM 加密——小心处理秘密。
- **提交风格**: Git 提交必须使用简体中文，遵循约定格式（`feat: ...`，`fix: ...`）。
- **关键文档**: `.cursor/rules/*.mdc` （全球/后端/管理/应用），`docs/features/` （API 响应，后端规则，菜单权限，SSE，数据库工厂），根目录 `README.md` 用于架构/端点说明。
