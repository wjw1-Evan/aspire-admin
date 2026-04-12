# AI 助手开发规则指南 (docs/rules)

## OVERVIEW
本目录定义了 Aspire Admin 项目各端开发的核心规范、反模式规避及业务逻辑红线。

## STRUCTURE
- **通用原则**：全局适用的开发准则，包括代码风格、命名约定及通用的分页标准。
- **后端规范 (backend/)**：
  - 01-控制器与权限：API 定义与基于菜单的鉴权。
  - 02-数据访问与审计：DbContext 使用规范与审计字段自动填充。
  - 03-中间件与响应：统一响应格式与异常处理。
  - 04-分页处理规范：后端分页逻辑实现。
  - 05-实时通信SSE：基于 SSE 的消息推送机制。
  - 06-批量查询规范：高效处理批量数据的准则。
  - 07-类型命名规范：后端 DTO 与实体命名建议。
- **Admin 前端 (frontend-admin/)**：
  - 01-路由与菜单：UmiJS 路由配置与动态菜单。
  - 02-服务层封装：API 请求的统一封装与拦截。
  - 03-页面与组件结构：标准页面布局与组件拆分。
  - 04-TypeScript 类型安全：禁止 any，严格类型定义。
  - 05-页面风格统一规范：Ant Design 6 主题与样式准则。
  - 06-页面开发标准：以密码本模块为核心参考的开发范式。
- **移动端 (frontend-app/)**：Expo 移动应用的跨端开发、原生功能调用与通知规范。

## KEY RULES
- **后端数据访问**：必须注入 `DbContext` 操作数据，严禁直接使用 `IMongoCollection`。
- **多租户安全**：统一通过 `ITenantContext` 获取企业上下文，禁止从 JWT Claim 直接读取。
- **鉴权机制**：API 必须使用 `[RequireMenu("name")]` 属性进行菜单级权限控制。
- **实时通信**：统一使用 **SSE (Server-Sent Events)** 推送，不再使用 SignalR。
- **分页处理**：后端使用 `ToPagedList()` 扩展；前端调用分页接口时禁止传递 `pageSize` 参数。
- **统计解耦**：列表统计信息必须通过独立接口获取，不得耦合在分页列表接口中。
- **审计字段**：CreatedAt/UpdatedAt 等字段由 DbContext 自动维护，手动赋值将被覆盖。
- **前端请求**：统一使用 `@umijs/max` 的 `request`，响应必须使用 `ApiResponse<T>` 包装。

## WHERE TO LOOK
- **全局/分页**：`00-通用原则.md`, `00-分页规范.md`
- **后端核心**：`backend/01-控制器与权限.md`, `backend/02-数据访问与审计.md`
- **后端通信**：`backend/05-实时通信SSE.md`, `backend/06-批量查询规范.md`
- **前端 Admin**：`frontend-admin/06-页面开发标准.md` (核心参考)
- **移动端 App**：`frontend-app/01-路由与API.md`

## CHANGELOG
- 2026-04-12: 初始化 docs/rules/AGENTS.md，整合各端开发规范索引。
