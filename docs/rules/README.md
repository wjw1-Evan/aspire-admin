# Aspire Admin 开发规则总索引

> 本目录整合了项目所有开发规范，包括后端 (.NET/ASP.NET Core)、管理后台 (React/Ant Design)、移动端 (Expo/微信小程序) 等。

## 目录结构

```
docs/rules/
├── README.md              # 本文件 - 规则总索引
├── 00-通用原则.md         # 核心架构原则、禁用模式、提交规范
├── 00-分页规范.md         # 统一分页规范（前后端通用）
├── backend/               # 后端开发规则
│   ├── 00-总览.md
│   ├── 01-控制器与权限.md
│   ├── 02-数据访问与审计.md
│   ├── 03-中间件与响应.md
│   ├── 04-分页处理规范.md
│   ├── 05-实时通信SSE.md
│   ├── 06-批量查询规范.md
│   └── 07-类型命名规范.md
├── frontend-admin/        # Admin 前端规则
│   ├── README.md
│   ├── 01-路由与菜单.md
│   ├── 02-服务层封装.md
│   ├── 03-页面与组件结构.md
│   ├── 04-TypeScript类型安全.md
│   ├── 05-页面风格统一规范.md
│   └── 06-页面开发标准.md    # ⭐ 开发标准（密码本模块）
├── frontend-app/          # 移动端规则
│   └── 01-路由与API.md
└── CHANGELOG.md           # 规则更新日志
```

## 快速入口

| 模块 | 规则文件 | 说明 |
|------|----------|------|
| 通用原则 | [`00-通用原则.md`](./00-通用原则.md) | 核心架构、数据操作、中间件 |
| 分页规范 | [`00-分页规范.md`](./00-分页规范.md) | 统一分页类型、参数、统计分离 |
| 后端规则 | [`backend/00-总览.md`](./backend/00-总览.md) | .NET/ASP.NET Core 控制器、服务、数据访问 |
| **Admin前端** | **[`frontend-admin/06-页面开发标准.md`](./frontend-admin/06-页面开发标准.md)** | ⭐ 开发标准（密码本模块） |
| 移动端 | [`frontend-app/`](./frontend-app/) | Expo/React Native/微信小程序 |

## 核心原则速查

### 后端
- **数据操作**：必须使用 `DbContext`，严禁直接访问 MongoDB
- **企业上下文**：通过 `ITenantContext` 获取，禁止直读 JWT
- **权限控制**：使用 `[RequireMenu("menu-name")]`
- **响应格式**：返回 `ApiResponse<T>`，统一 camelCase
- **N+1 防护**：严禁循环内单条查询，使用批量查询

### 前端（开发标准）
- **页面标准**：参考 [密码本模块开发标准](./frontend-admin/06-页面开发标准.md)
- **请求封装**：统一使用 `@umijs/max` 的 `request`
- **API 响应**：必须使用 `ApiResponse<T>` 包装
- **类型安全**：禁止 `any` 类型，类型定义在 `@/types/api-response.ts`

## 更新历史

| 日期 | 更新内容 |
|------|---------|
| 2026-04-05 | 新增 [06-页面开发标准.md](./frontend-admin/06-页面开发标准.md)，以密码本模块为开发标准参考 |
| 2026-04-05 | 重构 `unified-api.ts` → `api-response.ts`，完善注释，迁移数据模型到对应服务 |
| 2026-04-03 | 更新分页规范文档，同步 `ToPagedList` 与 `PageParams` 最新代码实现，修复文档 typo，更新数据访问示例 |
| 2026-04-01 | 更新响应方法规范：`Success` 方法 data 必选，操作结果消息使用 `Success(null, "消息")` 格式 |
| 2026-04-02 | 新增 `00-分页规范.md`，统一前后端分页文档 |
| 2026-04-01 | 更新分页处理规范，统一使用 DynamicLinq PageResult |
| 2026-03-22 | 新增批量查询规范、类型命名规范、TypeScript 类型安全规范 |
| 2026-01 | 新增分页处理规范、SSE 实时通信规范 |
| 2025-12 | 初版规则整合 |

## 相关文档

- [`docs/开发规范.md`](../开发规范.md) - 综合开发规范汇总
- [`docs/features/`](../features/) - 功能模块详细文档
- [`README.md`](../../README.md) - 项目总体说明
