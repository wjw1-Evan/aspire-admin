# Cursor Rules 使用指南

本目录收录了 Aspire Admin Platform 在 Cursor 中使用的上下文规则。规则按照领域自动匹配，让编码助手能够遵循统一的项目规范。本指南提供快速索引和维护建议。

---

## 🌟 核心自动应用规则

| 文件 | 作用范围 | 说明 |
|------|----------|------|
| `project-structure.mdc` | 所有目录 | 项目整体架构、服务依赖、启动方式与默认账户信息。 |
| `core-backend-standards.mdc` | `Platform.ApiService/`, `Platform.DataInitializer/`, `Platform.ServiceDefaults/` | 控制器继承、数据库操作工厂、多租户隔离、全局菜单与数据初始化等后端必备规范（原 `baseapicontroller-standard`、`backend-data-access`、`multi-tenant-development`、`no-global-data`、`global-menu-architecture`、`database-initialization` 已合并于此）。 |
| `documentation-standards.mdc` | 所有目录 | 文档存放、命名规则以及代码变更后的帮助文档同步要求（原 `documentation-organization`、`sync-help-documentation` 已合并）。 |
| `openapi-scalar-standard.mdc` | 所有目录 | 移除 Swagger，统一使用 .NET 10 原生 OpenAPI + Scalar，并对 XML 注释提出强制要求。 |

> 其余规则根据 `globs` 自动匹配到对应文件类型；需要时也可在对话中手动提及具体规则名称。

---

## 📚 规则分类速览

### 前端（Web & Mobile）
- `typescript-coding-standards.mdc`
- `frontend-development.mdc`
- `antd-pro-umi.mdc`
- `mobile-development-patterns.mdc`
- `state-management.mdc`
- `theme-system.mdc`

### 后端与服务
- `csharp-backend.mdc` - C# 编码规范、依赖注入、性能优化（XML 注释规范已合并到 `openapi-scalar-standard.mdc`）
- `business-logic.mdc` - 业务逻辑和服务层开发规范
- `auth-system.mdc` - 认证系统开发规范
- `api-integration.mdc` - API 集成和网络请求规范
- `error-handling.mdc` - 统一错误处理与响应格式规范
- `performance-optimization.mdc` - 性能优化和监控规范
- `security-best-practices.mdc` - 安全最佳实践和漏洞防护规范
- `design-patterns-architecture.mdc` - 设计模式和架构原则规范
- `aspire-microservices.mdc` - .NET Aspire 微服务架构和编排规范
- `deployment.mdc` - 部署和运维规范

### 工程与协作
- `code-review-quality.mdc`
- `git-workflow-version-control.mdc`
- `menu-level-permission.mdc`
- `new-entity-checklist.mdc`
- `mongodb-atomic-operations.mdc`
- `openapi-scalar-standard.mdc`

---

## ⚙️ 使用说明

1. **自动匹配**：Cursor 会根据 frontmatter 中的 `globs` 自动加载规则；`alwaysApply: true` 的文件始终生效。
2. **手动引用**：若需要额外提醒，可在对话中请求“请参考 xxx 规则”。
3. **查找路径**：大部分规则都列出了相关的 `docs/` 文档，获取更完整的背景或历史记录。

---

## 🛠️ 维护与新增规则

1. **确定目的**：明确规则希望约束或提醒的场景，避免与现有文件重复。
2. **检查重复**：在创建新规则前，检查是否有重复内容，优先合并到现有规则中。
3. **创建文件**：在 `.cursor/rules/` 下新建 `*.mdc` 文件，使用 frontmatter 声明 `globs`、`alwaysApply`、`description`。
4. **编写内容**：遵循"概述 → 推荐做法 → 禁止事项 → 示例 → 参考"结构，使用中英文混排时尽量保持 ASCII。
5. **引用其他规则**：如果内容与其他规则相关，使用 `mdc:` 链接引用，避免重复。
6. **更新 README**：将新规则加入合适的分类，并在需要时更新 `docs/INDEX.md`。
7. **验证效果**：在对应类型的文件中进行一次编辑，确认 Cursor 能自动引用规则。

### 规则合并原则

- **避免重复**：相同主题的规则应该合并到一个文件中
- **引用优先**：使用 `mdc:` 链接引用其他规则，而不是复制内容
- **核心规则优先**：`alwaysApply: true` 的规则应该包含最核心的规范
- **保持简洁**：每个规则文件应该专注于一个主题领域

---

## 🔗 相关资源

- `docs/INDEX.md` — 文档索引与跳转
- `docs/features/` — 功能说明、数据初始化、菜单架构等专题
- `docs/reports/` — 架构演进与优化总结
  - [Rules 更新总结报告](mdc:docs/reports/RULES-UPDATE-SUMMARY.md) — 最新的规则更新记录
- Cursor 官方文档：[https://docs.cursor.com/context/rules-for-ai](https://docs.cursor.com/context/rules-for-ai)

## 📝 最近更新

**2024-12-19**: 根据当前代码库全面更新和清理了所有规则文件，确保规则与实际实现保持一致。

### 更新内容
- ✅ 更新项目结构规范（访问地址、服务编排）
- ✅ 更新前端开发规范（错误处理、API 集成、token 刷新）
- ✅ 更新移动端开发规范（认证守卫、API 集成、token 缓存、Toast 自定义配置）
- ✅ 更新 API 集成规范（错误处理、token 刷新实现）
- ✅ 更新认证系统规范（前后端统一认证流程）
- ✅ 更新后端开发规范（JSON 序列化、SignalR 配置）

### 清理内容
- ✅ 清理过时的 API 端点示例（`/api/login/account` → `/api/auth/login` 等）
- ✅ 更新所有规则文件中的 API 端点引用，确保与代码库一致
- ✅ 验证并保留已废弃内容的正确标记（BaseService、BaseRepository、PermissionControl 等）

### 最新更新（2024-12-19）
- ✅ **移动端 Toast 自定义配置**：添加了完整的 Toast 自定义样式配置说明
  - Toast 样式参考退出登录 Modal 的设计风格
  - 统一使用 `AppStyles` 常量保持设计一致性
  - 包含完整的样式规范和配置示例

详细内容请参阅：
- [Rules 更新总结报告](mdc:docs/reports/RULES-UPDATE-SUMMARY.md) - 更新内容详情
- [Rules 清理总结报告](mdc:docs/reports/RULES-CLEANUP-SUMMARY.md) - 清理内容详情

如需扩展或调整规则，请在 PR 中一并说明，确保团队成员了解最新规范。祝编码顺利！


