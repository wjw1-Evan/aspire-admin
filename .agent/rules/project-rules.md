---
trigger: always_on
---

# Aspire Admin 项目核心开发规范

## 1. 核心指南
- **对话语言**：所有对话和注释优先使用 **中文**。
- **设计美学**：界面必须具备 **视觉冲击力** 和 **高级感**。使用现代配色、动态动画（Framer Motion 等）、玻璃拟态和精致微交互。
- **Git 提交**：提交信息必须使用 **简体中文**，遵循约定式提交（如 `feat:`, `fix:`, `docs:`）。

## 2. 后端开发规则 (C# / .NET / MongoDB)
- **数据访问工厂 (强制)**：严禁直接注入 `IMongoCollection<T>`。必须使用 `IDatabaseOperationFactory<T>`。
- **多租户隔离**：通过 `ITenantContext` 获取企业信息，禁止从 JWT 直接读取。实现 `IMultiTenant` 接口的实体会自动附加过滤。
- **权限控制**：统一使用 `[RequireMenu("menu-name")]` 特性。`HasPermission()` / `RequirePermission()` 已废弃。
- **统一响应格式**：所有 API 必须返回 `ApiResponse<T>`，使用 `BaseApiController` 提供的 `Success/SuccessPaged/ValidationError` 等方法。
- **审计记录**：创建/更新/删除走工厂原子方法（`CreateAsync`, `FindOneAndUpdateAsync`, `FindOneAndSoftDeleteAsync`），审计字段由工厂自动维护。
- **实时通信**：使用 **SSE (Server-Sent Events)** 替代 SignalR。

## 3. 前端开发规则 (React / Ant Design 6 / Umi)
- **Ant Design 6 优先**：强制使用 Ant Design 6 原生组件。禁止使用 ProTable/ProForm 等重度封装组件。
- **列表开发 (强制)**：统一使用 `@/components/DataTable`。
  - 操作按钮必须放在 `PageContainer` 的 `extra` 属性中（右上角）。
  - 查看功能：点击表格首列（名称/标题）链接跳转，操作列不放“查看”按钮。
  - 图标：所有操作按钮必须包含对应的 Ant Design 图标。
- **多语言 (18种)**：严格遵循 `src/locales` 结构。新增翻译键必须同步至所有 18 种语言。
- **移动端适配**：统一使用 `Grid.useBreakpoint()` 检测移动端（`!screens.md`），确保弹窗、表格和搜索栏响应式。
- **日期显示**：统一使用 `YYYY-MM-DD HH:mm:ss` 格式，空值显示 `-`。

## 4. 业务模块特殊规范
- **工作流**：流程图校验使用 `IWorkflowGraphValidator`，审批人解析使用 `IApproverResolver`。
- **IoT**：数据采集遵循多租户隔离，API 绑定 `iot:xxx` 菜单权限。
- **云存储**：文件操作通过 `IGridFSService`，预览需根据文件扩展名动态加载组件（如 `XLSX`）。

## 5. 参考文档
- `.cursor/rules/00-global.mdc`: 全局基础规则
- `.cursor/rules/backend.mdc`: 后端核心规则
- `.cursor/rules/frontend-admin.mdc`: 前端详细规范
- `Platform.Admin/src/locales/zh-CN/pages.ts`: 翻译键参考