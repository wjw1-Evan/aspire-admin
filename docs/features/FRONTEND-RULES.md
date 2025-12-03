## 前端开发规范（UmiJS & Ant Design Pro）

> 本文档对 `.cursor/rules/rule.mdc` 中的前端规范进行详细展开，包含路由、services、hooks、页面结构和多语言菜单等约定。

### 1. 路由与菜单配置

- **路由文件**：`Platform.Admin/config/routes.ts`
  - 使用 Umi 路由配置定义页面路径、组件与菜单元数据。
  - 推荐为每个路由配置 `name`、`icon`、`access` 等字段，与菜单和权限联动。
- **菜单与国际化**：
  - 各语言菜单名称在 `src/locales/*/menu.ts` 中维护，key 与路由 `name`/菜单标识一致。
  - 新增页面时必须同步更新对应语言的菜单文案，保证菜单在多语言下完整。
- **与后端菜单权限的映射**：
  - 前端路由/菜单 key 应与后端菜单标识保持稳定映射关系（例如统一使用 `rule.list` 或 `rule:list` 风格）。
  - 前端**不再依赖隐藏按钮/菜单实现权限**，最终访问控制以后端 `RequireMenu` 判定为准。

### 2. 服务层封装（services）

- **统一使用 `@umijs/max` 的 `request`**：
  - 所有 HTTP 请求必须通过 `request` 封装，禁止在组件中直接 `fetch`。
  - 服务文件集中放在 `src/services/` 目录，每个领域一个文件（如 `user.ts`、`rule.ts`、`iotService.ts`）。
- **与 ApiResponse 对接**：
  - 后端返回统一的 `ApiResponse<T>`，前端应优先按 `success` / `data` / `errorMessage` 处理，而非旧的 `code` / `msg`。
  - 建议在 `request` 的拦截器或统一错误处理里集中处理 `success=false` 的情况（弹出 message、跳转登录等）。

### 3. 页面与组件结构

- **页面骨架**：
  - 列表页面推荐使用：
    - 外层：`PageContainer`（`@ant-design/pro-components`）
    - 内容：`ProTable` 或 `Table`，配合 `useRequest` 或自定义 hooks 拉取数据。
  - 表单页面推荐使用：
    - `ModalForm` / `DrawerForm` / `ProForm` / `Form` 搭配表单组件，提交通过 service 调用后端。
- **组件拆分**：
  - 复用较高的表单、列表操作栏等拆分为独立组件放在 `src/components/`，避免在页面中堆积过多逻辑。
  - UI 组件不直接调用后端 services，由页面或 hooks 层处理数据与副作用。

### 4. Hooks 与状态管理

- **优先使用 hooks 而非全局状态**：
  - 使用 `ahooks` 的 `useRequest` 管理请求状态（loading/error/data）和刷新逻辑。
  - 使用 Umi 的 `useModel` 管理跨页面共享状态（如当前用户信息、布局配置等）。
- **禁止过度使用第三方全局状态工具**：
  - 除非有明显的性能或架构需求，否则不引入额外的 Redux/MobX 等。

### 5. 错误处理与用户体验

- **加载状态**：
  - 表格、列表、按钮操作都应有 `loading` 状态，避免用户误以为无响应。
- **错误提示**：
  - 对于 `ApiResponse.success=false` 的情况，统一在拦截器或调用处弹出 `message.error(errorMessage)` 或 `notification.error`。
  - 表单校验错误优先使用 Ant Design 的表单校验规则，而不是在提交失败后才整体提示。

### 6. 在 Cursor Rules 总纲中的位置

- `.cursor/rules/rule.mdc` 中只保留以下前端相关**硬规则摘要**：
  - 所有 API 调用必须通过 `src/services` 中的封装 + `request`；
  - 页面结构使用 ProComponents/Ant Design 提供的标准骨架，处理好 loading/错误；
  - 路由/菜单配置与多语言菜单文件必须同步维护；
  - 不再依赖隐藏按钮实现权限，权限控制以后端为准。
- 详细约定与示例请以本文件为准。


