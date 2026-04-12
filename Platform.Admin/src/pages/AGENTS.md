# Platform.Admin 页面模块指南

## OVERVIEW
本目录承载了 20 多个核心业务模块，是管理后台的功能实现核心。

## MODULES
本系统采用模块化架构，涵盖了从基础权限到垂直行业的全栈管理功能：
- **身份与权限**：`user-management` (用户管理), `organization` (组织架构), `company` (企业管理), `account` (个人中心)。
- **项目与任务**：`project-management` (项目管理), `task-management` (任务追踪), `workflow` (工作流引擎), `document` (文档中心)。
- **工业与园区**：`park-management` (园区管理), `iot-platform` (物联网平台), `cloud-storage` (云存储服务)。
- **垂直业务**：`password-book` (密码本), `xiaoke-management` (小课管理), `system-monitor` (系统监控)。

## WHERE TO LOOK
- **API 服务**：所有后端接口定义均存放在 `@/services` 目录，按业务领域进行文件拆分。
- **公共组件**：跨模块复用的 UI 组件位于 `@/components`，页面内部的私有组件应放在模块下的 `components` 文件夹中。
- **业务 Hooks**：复杂的业务逻辑封装在 `@/hooks` 目录下，确保页面组件保持简洁。
- **路径别名**：项目配置了 `@/*` 别名指向 `src` 目录，引用资源时请优先使用别名。

## FRONTEND CONVENTIONS
- **分页处理**：前端发起列表查询时，如果不需要特殊的分页参数，直接传递空对象 `{}`。后端服务会自动填充默认的 `pageSize` 和 `pageIndex`。
- **接口调用**：严禁在页面组件中直接使用底层请求库。必须调用 `@/services` 中封装好的 API 函数，以保证接口定义的唯一性。
- **状态管理**：局部状态使用 React 原生的 `useState`。需要跨组件或跨页面共享的全局状态，请使用框架提供的 `useModel` 机制。
- **国际化适配**：所有展示文本必须通过国际化钩子进行包裹，确保支持多语言切换。
- **代码风格**：优先使用声明式组件构建 UI 界面，保持组件逻辑与视图的分离。
- **路由配置**：页面新增后，需在 `config/routes.ts` 中进行相应配置才能生效。
