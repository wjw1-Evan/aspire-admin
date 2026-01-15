# 用户操作日志（Admin）

面向后台管理（Platform.Admin）的操作日志功能说明。涵盖入口、权限、接口与常见问题。

## 入口与路由

- 菜单：`操作日志`（name: `user-log`，parent: `system`）。
- 路由：`/user-log`（Admin 动态菜单驱动）。已在 `config/routes.ts` 兜底隐藏路由。
- 对应前端页面：`Platform.Admin/src/pages/user-log`。

## 权限要求

- 后端使用 `[RequireMenu("user-log")]` 保护接口。
- 若页面 404/403：需在「系统管理 → 角色管理」为当前角色勾选菜单 `user-log` 后刷新。

## 后端接口

- `GET /api/users/activity-logs`
  - Query: `page`(1-10000), `pageSize`(1-100), `action?`, `startDate?`, `endDate?`, `userId?`（可选，主要用于管理视角）。
  - `action` 允许值：`login, logout, create, update, delete, view, export, import, change_password, refresh_token`。
  - 返回：`ApiResponse<PaginatedResponse<ActivityLogWithUserResponse>>`，字段 `data/total/page/pageSize/totalPages?`，日志包含用户名称映射。

## 前端实现要点

- 页面：`src/pages/user-log/index.tsx`
  - 使用 `DataTable` 展示列表；独立筛选表单（action 下拉、时间范围）；详情抽屉。
  - 请求封装：`src/services/user-log/api.ts#getUserActivityLogs`，返回类型已与后端分页对齐（ApiResponse 包裹）。
- 代理：`/api/**` → API 网关 → `/apiservice/api/**`，无需额外配置。

## 常见排障

- 访问 `/user-log` 404：
  1) 菜单未分配给当前角色；到角色管理勾选 `user-log` 并刷新。
  2) （已兜底）静态路由缺失。当前仓库已在 `config/routes.ts` 添加 `/user-log` 隐藏路由。
- 访问 403：账号缺少 `user-log` 权限，或未登录。
- 无数据：先在系统执行登录/创建/更新等操作产生日志，再刷新列表。

## 后续可选增强

- 新增筛选：`httpMethod/statusCode/userId`，支持服务端排序 `sortBy/sortOrder`。
- 导出 / 批量筛选。
- 角色初始化时默认授予管理员角色 `user-log` 菜单（需确认角色模型与策略）。
